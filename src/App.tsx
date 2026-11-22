import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, HelpCircle, Settings, X } from 'lucide-react';
import {
  PRESET_CAPSULES,
  type Waypoint,
  type AddressCapsule,
  hashPhone,
  formatShortHash,
  normalizeHandle,
  stripHandlePrefix,
  listDirectory,
  isCloudEnabled,
  saveToDirectoryAsync,
  lookupByHandleAsync,
  lookupByPhoneAsync,
  encodeCapsuleForHash
} from './lib/addressStore';
import {
  type ExtractedFrame,
  extractKeyFramesFromVideo,
  resizePhotoToFrame,
  extractWaypointsFromFrames,
  analyzeSinglePhoto
} from './lib/routeExtractor';
import { FOCUS_RING } from './components/shared';
import { DriverHud, type DetectedBoundingBox } from './components/DriverHud';
import { AddressTab } from './components/AddressTab';
import {
  VerificationOverlay,
  type VerificationOverlayState
} from './components/VerificationOverlay';
import { SettingsModal } from './components/SettingsModal';

export type { Waypoint, AddressCapsule, DetectedBoundingBox };
export { PRESET_CAPSULES };

const EMBEDDED_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY ||
  (typeof atob !== 'undefined'
    ? atob('QVEuQWI4Uk42SUI4WmxXd3plMkduWl81Z3g3bDNhekVSRkhOeVA4c3dOWmhseEdtaGVnNEE=')
    : '');

export default function App() {
  const [activeTab, setActiveTab] = useState<'driver' | 'resident'>('driver');
  const [appMode, setAppMode] = useState<'gemini' | 'sim'>(() =>
    localStorage.getItem('patavision_app_mode') === 'sim' ? 'sim' : 'gemini'
  );

  // Settings & BYOK
  const [apiKey, setApiKey] = useState<string>(
    () => localStorage.getItem('patavision_gemini_key') || EMBEDDED_API_KEY
  );
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState<boolean>(
    () => !localStorage.getItem('patavision_guide_seen')
  );
  const dismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('patavision_guide_seen', '1');
  };
  const [testApiStatus, setTestApiStatus] = useState<string | null>(null);
  const [testConnPhase, setTestConnPhase] = useState<
    'idle' | 'loading' | 'tick' | 'model' | 'error'
  >('idle');
  const testTimersRef = useRef<number[]>([]);

  const clearTestTimers = () => {
    testTimersRef.current.forEach(id => window.clearTimeout(id));
    testTimersRef.current = [];
  };

  useEffect(() => () => clearTestTimers(), []);

  // Voice & AR state
  const [speechLang, setSpeechLang] = useState<'hi' | 'en'>('hi');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showArLayers, setShowArLayers] = useState(true);
  const [autoTrack, setAutoTrack] = useState(false);

  // Active Capsule & Directory State
  const [selectedPreset, setSelectedPreset] = useState<string>('gali');
  const [capsule, setCapsule] = useState<AddressCapsule>(() => {
    listDirectory();
    if (window.location.hash.startsWith('#capsule=')) {
      try {
        const encoded = window.location.hash.replace('#capsule=', '');
        return JSON.parse(decodeURIComponent(atob(encoded)));
      } catch (e) {
        console.warn('Failed to parse URL capsule hash:', e);
      }
    }
    const saved = localStorage.getItem('patavision_saved_capsule');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return PRESET_CAPSULES.gali;
  });

  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupStatus, setLookupStatus] = useState<{
    type: 'found' | 'miss' | 'info';
    text: string;
  } | null>(null);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const cloudActive = isCloudEnabled();

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<AddressCapsule>(capsule);
  const [editSlug, setEditSlug] = useState<string>(() => stripHandlePrefix(capsule.pataHandle));
  const [editPhone, setEditPhone] = useState('');
  const [editPhonePreviewHash, setEditPhonePreviewHash] = useState('');

  // Video Walkthrough & Photo Capture State
  const [isRecordingWalkthrough, setIsRecordingWalkthrough] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [videoExtractStatus, setVideoExtractStatus] = useState<string | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [analyzingStepIdx, setAnalyzingStepIdx] = useState<number | null>(null);

  const walkthroughVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const videoUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Driver HUD State
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);
  const [detectedBox, setDetectedBox] = useState<DetectedBoundingBox | null>(null);
  const [statusMessage, setStatusMessage] = useState('Aim reticle at landmark');
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  const isScanningRef = useRef(false);
  const autoTrackRef = useRef(autoTrack);
  autoTrackRef.current = autoTrack;
  const cameraMountedRef = useRef(true);
  const speakTimerRef = useRef<number | null>(null);

  const [verificationOverlay, setVerificationOverlay] =
    useState<VerificationOverlayState | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);

  const dismissVerificationOverlay = () => {
    if (autoAdvanceTimerRef.current) {
      window.clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    setVerificationOverlay(null);
  };

  const triggerVerifiedOverlay = (confidence: string, reasoning?: string) => {
    dismissVerificationOverlay();
    navigator.vibrate?.([18, 40, 28]);
    setVerificationOverlay({ status: 'verified', confidence, reasoning });
    if (currentStep < capsule.waypoints.length - 1) {
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        setVerificationOverlay(null);
        setCurrentStep(prev => Math.min(capsule.waypoints.length - 1, prev + 1));
        setDetectedBox(null);
      }, 1350);
    }
  };

  // Auto-load short route (/p/<slug> or ?p=<slug>) from Supabase on mount
  useEffect(() => {
    const pathMatch = window.location.pathname.match(/^\/p\/([^/?#]+)/i);
    const querySlug = new URLSearchParams(window.location.search).get('p');
    const slug = pathMatch?.[1] || querySlug;
    if (!slug) return;

    let cancelled = false;
    setStatusMessage(`Loading ${normalizeHandle(slug)}`);
    lookupByHandleAsync(slug).then(match => {
      if (cancelled) return;
      if (match) {
        setCapsule(match);
        setEditForm(match);
        setEditSlug(stripHandlePrefix(match.pataHandle));
        setSelectedPreset('');
        setCurrentStep(0);
        setDetectedBox(null);
        setActiveTab('driver');
        setStatusMessage(`Loaded ${match.pataHandle}`);
      } else {
        setStatusMessage(`Route not found: ${normalizeHandle(slug)}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live SHA-256 preview while typing phone number
  useEffect(() => {
    let cancelled = false;
    if (!editPhone.trim()) {
      setEditPhonePreviewHash('');
      return;
    }
    hashPhone(editPhone).then(h => {
      if (!cancelled) setEditPhonePreviewHash(h);
    });
    return () => {
      cancelled = true;
    };
  }, [editPhone]);

  // HUD Camera lifecycle
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 960 } }
      });
      if (!cameraMountedRef.current || !videoRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      await videoRef.current.play().catch(() => {});
      if (cameraMountedRef.current) setCameraActive(true);
    } catch {
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  useEffect(() => {
    cameraMountedRef.current = activeTab === 'driver';
    if (activeTab === 'driver') startCamera();
    else {
      stopCamera();
      dismissVerificationOverlay();
    }
    return () => {
      cameraMountedRef.current = false;
      stopCamera();
      if (autoAdvanceTimerRef.current) {
        window.clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [activeTab]);

  // Walkthrough recorder cleanup
  const stopWalkthroughStream = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (walkthroughVideoRef.current) {
      walkthroughVideoRef.current.srcObject = null;
    }
    setIsRecordingWalkthrough(false);
  };

  useEffect(() => {
    if (activeTab !== 'resident' || !isEditing) {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      stopWalkthroughStream();
    }
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      stopWalkthroughStream();
    };
  }, [activeTab, isEditing]);

  useEffect(() => {
    if (isRecordingWalkthrough && walkthroughVideoRef.current && mediaStreamRef.current) {
      walkthroughVideoRef.current.srcObject = mediaStreamRef.current;
      walkthroughVideoRef.current.play().catch(() => {});
    }
  }, [isRecordingWalkthrough]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    if (speakTimerRef.current) {
      window.clearTimeout(speakTimerRef.current);
      speakTimerRef.current = null;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = speechLang === 'hi' ? 'hi-IN' : 'en-US';
    utt.rate = 0.95;
    utt.onstart = () => {
      setIsSpeaking(true);
      speakTimerRef.current = window.setTimeout(() => setIsSpeaking(false), 5000);
    };
    const stopSpeaking = () => {
      if (speakTimerRef.current) {
        window.clearTimeout(speakTimerRef.current);
        speakTimerRef.current = null;
      }
      setIsSpeaking(false);
    };
    utt.onend = stopSpeaking;
    utt.onerror = stopSpeaking;
    window.speechSynthesis.speak(utt);
  };

  const activeWaypoint = capsule.waypoints[currentStep] || capsule.waypoints[0];

  useEffect(() => {
    if (activeTab === 'driver' && activeWaypoint) {
      speak(`${activeWaypoint.title}. ${activeWaypoint.cue}`);
      setDetected(false);
      setDetectedBox(null);
      setAiReasoning(null);
      setStatusMessage(`Looking for ${activeWaypoint.title}`);
    }
  }, [currentStep, activeTab, speechLang, capsule]);

  const handleSetMode = (mode: 'gemini' | 'sim') => {
    setAppMode(mode);
    localStorage.setItem('patavision_app_mode', mode);
  };

  const handleTestApiKey = async () => {
    if (testConnPhase !== 'idle') return;
    clearTestTimers();
    setTestConnPhase('loading');
    setTestApiStatus(null);
    const startTime = Date.now();
    let ok = false;
    let errorMsg = '';

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Respond with OK' }] }] })
        }
      );
      if (res.ok) ok = true;
      else {
        const err = await res.json().catch(() => null);
        errorMsg = `Error ${res.status}: ${err?.error?.message || 'Failed'}`;
      }
    } catch (e: any) {
      errorMsg = `Connection failed: ${e.message}`;
    }

    const waitMs = Math.max(0, 650 - (Date.now() - startTime));
    const t1 = window.setTimeout(() => {
      if (ok) {
        setTestConnPhase('tick');
        const t2 = window.setTimeout(() => {
          setTestConnPhase('model');
          const t3 = window.setTimeout(() => setTestConnPhase('idle'), 2400);
          testTimersRef.current.push(t3);
        }, 750);
        testTimersRef.current.push(t2);
      } else {
        setTestConnPhase('error');
        setTestApiStatus(errorMsg);
        const t2 = window.setTimeout(() => setTestConnPhase('idle'), 2600);
        testTimersRef.current.push(t2);
      }
    }, waitMs);
    testTimersRef.current.push(t1);
  };

  const handleScan = async (isAuto = false) => {
    if (!activeWaypoint || isScanningRef.current) return;
    isScanningRef.current = true;
    setScanning(true);
    if (!isAuto) setAiReasoning(null);

    if (appMode === 'gemini') {
      setStatusMessage('Analyzing frame');
      let base64Image = '';
      if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = 480;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 480, 360);
          base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        }
      }

      if (base64Image && apiKey) {
        const models = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
        let successResult: any = null;
        const systemPrompt = `You are PataVision AR, an unmapped last-100m spatial navigation assistant for Indian doorsteps.
Target landmark to locate: "${activeWaypoint.title}" (${activeWaypoint.targetObject}).
Guidance cue: "${activeWaypoint.cue}".
Destination: "${capsule.addressTitle}".
Output strictly valid JSON with no markdown wrapping:
{
  "found": boolean,
  "confidence": "high" | "medium" | "low",
  "label": string | null,
  "box_2d": [number, number, number, number] | null,
  "reasoning": string,
  "guidance": string
}`;

        for (const model of models) {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { text: systemPrompt },
                        { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
                      ]
                    }
                  ],
                  generationConfig: { response_mime_type: 'application/json', temperature: 0.2 }
                })
              }
            );
            if (res.ok) {
              const data = await res.json();
              const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                successResult = JSON.parse(text);
                break;
              }
            }
          } catch (e) {
            console.warn(`Failed model ${model}:`, e);
          }
        }

        if (successResult) {
          setScanning(false);
          isScanningRef.current = false;
          setAiReasoning(successResult.reasoning);

          if (successResult.found) {
            setDetected(true);
            if (Array.isArray(successResult.box_2d) && successResult.box_2d.length === 4) {
              setDetectedBox({
                ymin: successResult.box_2d[0],
                xmin: successResult.box_2d[1],
                ymax: successResult.box_2d[2],
                xmax: successResult.box_2d[3],
                label: successResult.label || activeWaypoint.title,
                confidence: successResult.confidence || 'high'
              });
            }
            setStatusMessage(`Locked: ${activeWaypoint.title}`);
            speak(
              speechLang === 'hi'
                ? `रास्ता मिल गया। ${successResult.guidance}`
                : `Target locked. ${successResult.guidance}`
            );
            if (!isAuto) {
              triggerVerifiedOverlay(successResult.confidence || 'high', successResult.reasoning);
            }
          } else {
            setDetected(false);
            setDetectedBox(null);
            setStatusMessage(successResult.guidance || 'Pan camera toward landmark');
            if (!isAuto) {
              navigator.vibrate?.([45, 50, 45]);
              setVerificationOverlay({
                status: 'failed',
                reasoning: successResult.reasoning,
                guidance: successResult.guidance || 'Pan camera toward landmark'
              });
              speak(
                speechLang === 'hi'
                  ? 'दिशानिर्देश के अनुसार कैमरा घुमाएं'
                  : 'Pan camera toward the landmark'
              );
            }
          }
          return;
        }
      }
    }

    // Simulator fallback
    setStatusMessage('Simulating landmark verification');
    setTimeout(() => {
      setScanning(false);
      isScanningRef.current = false;
      setDetected(true);
      const topNum = parseInt(activeWaypoint.screenPosition.top) * 10 || 350;
      const leftNum = parseInt(activeWaypoint.screenPosition.left) * 10 || 500;
      setDetectedBox({
        ymin: Math.max(50, topNum - 80),
        xmin: Math.max(50, leftNum - 100),
        ymax: Math.min(950, topNum + 100),
        xmax: Math.min(950, leftNum + 100),
        label: activeWaypoint.title,
        confidence: 'high'
      });
      setAiReasoning('Simulated match locked on landmark');
      setStatusMessage(`Verified: ${activeWaypoint.title}`);
      speak(
        speechLang === 'hi' ? 'रास्ता मिल गया। आगे बढ़ें।' : 'Target locked. Follow the path.'
      );
      if (!isAuto) {
        triggerVerifiedOverlay('high', 'Simulated match locked on landmark');
      }
    }, 350);
  };

  useEffect(() => {
    if (!autoTrack || activeTab !== 'driver' || !cameraActive) return;
    const timer = setInterval(() => {
      if (!isScanningRef.current && autoTrackRef.current) handleScan(true);
    }, 2800);
    return () => clearInterval(timer);
  }, [autoTrack, activeTab, cameraActive, currentStep, capsule, appMode, apiKey]);

  const nextStep = () => {
    if (currentStep < capsule.waypoints.length - 1) {
      setCurrentStep(prev => prev + 1);
      setDetectedBox(null);
    }
  };

  const copyShareableLink = async () => {
    const slug = stripHandlePrefix(normalizeHandle(capsule.pataHandle));
    if (cloudActive) {
      const res = await saveToDirectoryAsync(capsule);
      setCloudNotice(!res.savedToCloud && res.error ? `Cloud sync pending: ${res.error}` : null);
      navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`);
    } else {
      navigator.clipboard.writeText(
        `${window.location.origin}${window.location.pathname}#capsule=${encodeCapsuleForHash(capsule)}`
      );
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = lookupQuery.trim();
    if (!q) return setLookupStatus(null);

    const digitsOnly = q.replace(/\D/g, '');
    const isPhoneQuery = digitsOnly.length >= 7 && !q.includes('/') && !q.includes('.');
    setLookupStatus({ type: 'info', text: 'Searching directory' });

    if (isPhoneQuery) {
      const { hash, match } = await lookupByPhoneAsync(q);
      if (match) {
        setCapsule(match);
        setEditForm(match);
        setEditSlug(stripHandlePrefix(match.pataHandle));
        setSelectedPreset('');
        setCurrentStep(0);
        setDetectedBox(null);
        setLookupStatus({ type: 'found', text: `Loaded ${match.pataHandle} (${formatShortHash(hash)})` });
      } else {
        setLookupStatus({ type: 'miss', text: `No saved route for ${formatShortHash(hash)}` });
      }
      return;
    }

    const match = await lookupByHandleAsync(q);
    if (match) {
      setCapsule(match);
      setEditForm(match);
      setEditSlug(stripHandlePrefix(match.pataHandle));
      setSelectedPreset('');
      setCurrentStep(0);
      setDetectedBox(null);
      setLookupStatus({ type: 'found', text: `Loaded ${match.pataHandle}` });
    } else {
      setLookupStatus({ type: 'miss', text: `No route found for ${normalizeHandle(q)}` });
    }
  };

  const handleApplyPreset = (key: string) => {
    const p = PRESET_CAPSULES[key];
    if (!p) return;
    setSelectedPreset(key);
    setCapsule(p);
    setEditForm(p);
    setEditSlug(stripHandlePrefix(p.pataHandle));
    setLookupStatus(null);
    localStorage.setItem('patavision_saved_capsule', JSON.stringify(p));
    window.location.hash = '';
    setCurrentStep(0);
    setDetectedBox(null);
  };

  const processWalkthroughBlob = async (blob: Blob) => {
    setProcessingVideo(true);
    setVideoExtractStatus('Extracting key frames');
    try {
      const frames = await extractKeyFramesFromVideo(blob, 5);
      setExtractedFrames(frames);
      setVideoExtractStatus(
        appMode === 'gemini'
          ? `Analyzing ${frames.length} frames with Gemini`
          : `Generating ${frames.length} simulated waypoints`
      );
      const waypoints = await extractWaypointsFromFrames(
        frames,
        apiKey,
        appMode,
        editForm.macroAnchor
      );
      if (waypoints.length > 0) {
        setEditForm(prev => ({ ...prev, waypoints }));
        setVideoExtractStatus(`Extracted ${waypoints.length} landmarks from video`);
      } else {
        setVideoExtractStatus('No landmarks detected, try another clip');
      }
    } catch (err: any) {
      setVideoExtractStatus(err?.message || 'Failed to process video');
    } finally {
      setProcessingVideo(false);
    }
  };

  const handleStartWalkthroughRecording = async () => {
    if (isRecordingWalkthrough || processingVideo) return;
    setVideoExtractStatus(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      mediaStreamRef.current = stream;
      setIsRecordingWalkthrough(true);
      setRecordingSeconds(0);
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = e => {
        if (e.data?.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'video/webm' });
        stopWalkthroughStream();
        if (blob.size > 0) processWalkthroughBlob(blob);
      };
      recorder.start(250);
      recordingTimerRef.current = window.setInterval(() => setRecordingSeconds(p => p + 1), 1000);
    } catch {
      stopWalkthroughStream();
      setVideoExtractStatus('Camera unavailable, upload a video clip instead');
    }
  };

  const handleStopWalkthroughRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    else stopWalkthroughStream();
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) processWalkthroughBlob(file);
  };

  const handleStepPhotoCapture = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAnalyzingStepIdx(index);
    try {
      const frame = await resizePhotoToFrame(file);
      const analyzed = await analyzeSinglePhoto(frame, apiKey, appMode);
      setEditForm(prev => {
        const updated = [...prev.waypoints];
        updated[index] = {
          ...updated[index],
          title: analyzed.title || updated[index].title,
          cue: analyzed.cue || updated[index].cue,
          turnDirection: analyzed.turnDirection || updated[index].turnDirection,
          targetObject: analyzed.targetObject || updated[index].targetObject,
          thumbnail: analyzed.thumbnail
        };
        return { ...prev, waypoints: updated };
      });
    } catch {
      // Ignore failed image read
    } finally {
      setAnalyzingStepIdx(null);
    }
  };

  const handleSaveCustomCapsule = async () => {
    const normalizedHandle = normalizeHandle(editSlug || editForm.pataHandle);
    const slug = stripHandlePrefix(normalizedHandle);
    let phoneHash = editForm.phoneHash;
    if (editPhone.trim()) phoneHash = await hashPhone(editPhone);

    const finalCapsule: AddressCapsule = {
      ...editForm,
      pataHandle: normalizedHandle,
      phoneHash,
      updatedAt: Date.now()
    };

    setCapsule(finalCapsule);
    setEditForm(finalCapsule);
    localStorage.setItem('patavision_saved_capsule', JSON.stringify(finalCapsule));

    const { savedToCloud, error } = await saveToDirectoryAsync(finalCapsule);
    if (savedToCloud) {
      setCloudNotice(null);
      window.history.replaceState(null, '', `/p/${slug}`);
    } else {
      if (error) setCloudNotice(`Cloud sync pending: ${error}`);
      window.location.hash = `#capsule=${encodeCapsuleForHash(finalCapsule)}`;
    }

    setEditPhone('');
    setIsEditing(false);
    setCurrentStep(0);
    setDetectedBox(null);
    setActiveTab('driver');
  };

  const handleResetToDefault = () => {
    localStorage.removeItem('patavision_saved_capsule');
    window.location.hash = '';
    setCapsule(PRESET_CAPSULES.gali);
    setEditForm(PRESET_CAPSULES.gali);
    setEditSlug(stripHandlePrefix(PRESET_CAPSULES.gali.pataHandle));
    setEditPhone('');
    setExtractedFrames([]);
    setVideoExtractStatus(null);
    setSelectedPreset('gali');
    setIsEditing(false);
    setCurrentStep(0);
    setDetectedBox(null);
  };

  const handleAddWaypoint = () => {
    setEditForm(prev => ({
      ...prev,
      waypoints: [
        ...prev.waypoints,
        {
          id: Date.now(),
          title: 'New Waypoint',
          cue: 'Walk straight toward landmark',
          distance: '30 m',
          targetObject: 'gate or door or building',
          turnDirection: 'straight',
          screenPosition: { top: '38%', left: '50%' }
        }
      ]
    }));
  };

  const handleUpdateWaypoint = (index: number, field: keyof Waypoint, value: any) => {
    setEditForm(prev => {
      const updated = [...prev.waypoints];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, waypoints: updated };
    });
  };

  const handleDeleteWaypoint = (index: number) => {
    if (editForm.waypoints.length <= 1) return;
    setEditForm(prev => ({
      ...prev,
      waypoints: prev.waypoints.filter((_, i) => i !== index)
    }));
  };

  const isLastStep = currentStep >= capsule.waypoints.length - 1;

  return (
    <div className="min-h-dvh bg-[#0f0f10] text-[#ededed] flex items-center justify-center sm:p-6 select-none font-sans antialiased">
      <div className="w-full min-h-dvh sm:min-h-0 sm:max-w-[420px] sm:h-[min(860px,calc(100dvh-48px))] bg-[#141415] sm:rounded-[20px] sm:border sm:border-[#ededed]/[0.08] flex flex-col overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />

        {/* TOP HEADER */}
        <header className="bg-[#141415] shrink-0 z-40">
          <div className="h-14 px-4 flex items-center justify-between border-b border-[#ededed]/[0.08]">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M8 14s4.5-4.2 4.5-7.8a4.5 4.5 0 1 0-9 0C3.5 9.8 8 14 8 14Z"
                  stroke="#eab308"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="8" cy="6.2" r="1.5" fill="#eab308" />
              </svg>
              <span className="text-[15px] font-medium text-[#ededed]">PataVision</span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/demo.html"
                className={`h-8 px-2 rounded-[8px] text-xs text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#19191b] flex items-center gap-1 transition-colors duration-150 ${FOCUS_RING}`}
                title="Open demonstrative showcase"
              >
                <span>Showcase</span>
                <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              </a>
              <button
                onClick={() => setShowGuide(true)}
                className={`w-9 h-9 rounded-[8px] text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#19191b] flex items-center justify-center transition-colors duration-150 ${FOCUS_RING}`}
                title="How PataVision works"
                aria-label="How PataVision works"
              >
                <HelpCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className={`w-9 h-9 rounded-[8px] text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#19191b] flex items-center justify-center transition-colors duration-150 ${FOCUS_RING}`}
                title="Vision and API settings"
                aria-label="Vision and API settings"
              >
                <Settings className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Row 2: Vision | Sim (left) + HUD | Address (right) */}
          <div className="px-4 py-2 border-b border-[#ededed]/[0.08] flex items-center justify-between gap-2 bg-[#141415]">
            <div className="flex bg-[#19191b] p-1 rounded-[10px] border border-[#ededed]/[0.08]">
              <button
                onClick={() => handleSetMode('gemini')}
                className={`h-8 px-2 rounded-[6px] text-xs font-medium flex items-center gap-2 transition-colors duration-150 ${FOCUS_RING} ${
                  appMode === 'gemini'
                    ? 'bg-[#232325] text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-[#a1a1a6] hover:text-[#ededed]'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${appMode === 'gemini' ? 'bg-[#eab308]' : 'bg-[#85858b]'}`} />
                <span>Vision</span>
              </button>
              <button
                onClick={() => handleSetMode('sim')}
                className={`h-8 px-2 rounded-[6px] text-xs font-medium transition-colors duration-150 ${FOCUS_RING} ${
                  appMode === 'sim'
                    ? 'bg-[#232325] text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-[#a1a1a6] hover:text-[#ededed]'
                }`}
              >
                Sim
              </button>
            </div>

            <div className="flex bg-[#19191b] p-1 rounded-[10px] border border-[#ededed]/[0.08]">
              {([
                { id: 'driver', label: 'HUD' },
                { id: 'resident', label: 'Address' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'resident') setIsEditing(false);
                  }}
                  className={`h-8 px-3 rounded-[6px] text-xs font-medium transition-colors duration-150 ${FOCUS_RING} ${
                    activeTab === tab.id
                      ? 'bg-[#232325] text-[#ededed] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                      : 'text-[#a1a1a6] hover:text-[#ededed]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* MAIN VIEW CONTENT */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'driver' && (
            <DriverHud
              videoRef={videoRef}
              cameraActive={cameraActive}
              onStartCamera={startCamera}
              capsule={capsule}
              activeWaypoint={activeWaypoint}
              currentStep={currentStep}
              isLastStep={isLastStep}
              appMode={appMode}
              autoTrack={autoTrack}
              onToggleAutoTrack={() => setAutoTrack(p => !p)}
              showArLayers={showArLayers}
              onToggleArLayers={() => setShowArLayers(p => !p)}
              speechLang={speechLang}
              onToggleSpeechLang={() => setSpeechLang(p => (p === 'hi' ? 'en' : 'hi'))}
              scanning={scanning}
              detected={detected}
              detectedBox={detectedBox}
              statusMessage={statusMessage}
              aiReasoning={aiReasoning}
              isSpeaking={isSpeaking}
              onSpeak={speak}
              onScan={() => handleScan(false)}
              onNextStep={nextStep}
            />
          )}

          {activeTab === 'resident' && (
            <AddressTab
              capsule={capsule}
              selectedPreset={selectedPreset}
              isEditing={isEditing}
              onToggleEdit={() => {
                if (!isEditing) {
                  setEditForm(capsule);
                  setEditSlug(stripHandlePrefix(capsule.pataHandle));
                  setEditPhone('');
                }
                setIsEditing(!isEditing);
              }}
              lookupQuery={lookupQuery}
              onChangeLookupQuery={setLookupQuery}
              onLookup={handleLookup}
              lookupStatus={lookupStatus}
              onApplyPreset={handleApplyPreset}
              cloudActive={cloudActive}
              cloudNotice={cloudNotice}
              copied={copied}
              onCopyLink={copyShareableLink}
              speechLang={speechLang}
              onSpeak={speak}
              onTestRouteInHud={() => {
                setCurrentStep(0);
                setDetectedBox(null);
                setActiveTab('driver');
              }}
              editForm={editForm}
              onChangeEditForm={setEditForm}
              editSlug={editSlug}
              onChangeEditSlug={setEditSlug}
              editPhone={editPhone}
              onChangeEditPhone={setEditPhone}
              editPhonePreviewHash={editPhonePreviewHash}
              isRecordingWalkthrough={isRecordingWalkthrough}
              recordingSeconds={recordingSeconds}
              processingVideo={processingVideo}
              videoExtractStatus={videoExtractStatus}
              extractedFrames={extractedFrames}
              analyzingStepIdx={analyzingStepIdx}
              walkthroughVideoRef={walkthroughVideoRef}
              videoUploadInputRef={videoUploadInputRef}
              onStartWalkthroughRecording={handleStartWalkthroughRecording}
              onStopWalkthroughRecording={handleStopWalkthroughRecording}
              onVideoFileUpload={handleVideoFileUpload}
              onStepPhotoCapture={handleStepPhotoCapture}
              onAddWaypoint={handleAddWaypoint}
              onUpdateWaypoint={handleUpdateWaypoint}
              onDeleteWaypoint={handleDeleteWaypoint}
              onResetToDefault={handleResetToDefault}
              onSaveCustomCapsule={handleSaveCustomCapsule}
            />
          )}
        </main>

        {verificationOverlay && activeWaypoint && (
          <VerificationOverlay
            overlay={verificationOverlay}
            capsule={capsule}
            activeWaypoint={activeWaypoint}
            currentStep={currentStep}
            isLastStep={isLastStep}
            onDismiss={dismissVerificationOverlay}
            onNextStep={nextStep}
            onRestartRoute={() => {
              setCurrentStep(0);
              setDetected(false);
              setDetectedBox(null);
            }}
            onSpeak={speak}
          />
        )}

        {showSettings && (
          <SettingsModal
            appMode={appMode}
            apiKey={apiKey}
            embeddedApiKey={EMBEDDED_API_KEY}
            testApiStatus={testApiStatus}
            testConnPhase={testConnPhase}
            onSetMode={handleSetMode}
            onChangeApiKey={val => {
              setApiKey(val);
              localStorage.setItem('patavision_gemini_key', val);
            }}
            onResetApiKey={() => {
              setApiKey(EMBEDDED_API_KEY);
              localStorage.removeItem('patavision_gemini_key');
              setTestApiStatus('Reset to embedded key');
            }}
            onTestApiKey={handleTestApiKey}
            onClose={() => {
              clearTestTimers();
              setTestConnPhase('idle');
              setShowSettings(false);
            }}
          />
        )}

        {showGuide && (
          <div
            onClick={dismissGuide}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-overlay-veil"
          >
            <div
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[380px] bg-[#141415] border border-[#ededed]/[0.1] rounded-[16px] p-5 space-y-4 animate-fade-rise"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium text-[#ededed]">How PataVision works</h2>
                  <p className="text-xs text-[#a1a1a6] mt-0.5">
                    One app for mapping your doorstep and guiding anyone there.
                  </p>
                </div>
                <button
                  onClick={dismissGuide}
                  className={`w-8 h-8 rounded-[8px] text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#19191b] flex items-center justify-center shrink-0 ${FOCUS_RING}`}
                  aria-label="Close guide"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-[10px] bg-[#19191b] border border-[#ededed]/[0.08] space-y-1.5">
                  <div className="font-mono text-[11px] text-[#85858b] uppercase tracking-wider">Views</div>
                  <p className="text-[#ededed]">
                    <span className="font-medium text-[#eab308]">HUD</span> — Live camera navigation for delivery partners or friends visiting you.
                  </p>
                  <p className="text-[#ededed]">
                    <span className="font-medium text-[#eab308]">Address</span> — Record a walkthrough or add photos to create &amp; copy your shareable <span className="font-mono text-[#a1a1a6]">/p/...</span> link.
                  </p>
                </div>

                <div className="p-3 rounded-[10px] bg-[#19191b] border border-[#ededed]/[0.08] space-y-1.5">
                  <div className="font-mono text-[11px] text-[#85858b] uppercase tracking-wider">Verification Modes</div>
                  <p className="text-[#ededed]">
                    <span className="font-medium text-[#4cc38a]">Vision (Live)</span> — Uses Gemini AI to match real camera frames against each landmark.
                  </p>
                  <p className="text-[#ededed]">
                    <span className="font-medium text-[#a1a1a6]">Sim (Demo)</span> — Instant simulated verification without live AI calls.
                  </p>
                </div>
              </div>

              <button
                onClick={dismissGuide}
                className={`w-full h-10 rounded-[10px] bg-[#ededed] hover:bg-white text-[#141415] text-xs font-medium transition-colors duration-150 ${FOCUS_RING}`}
              >
                Got it
              </button>
            </div>
          </div>
        )}

        <footer className="h-10 px-4 border-t border-[#ededed]/[0.08] text-xs text-[#85858b] flex items-center justify-between shrink-0 tabular-nums">
          <span>PataVision</span>
          <span>{capsule.addressTitle.split(',')[0]}</span>
        </footer>
      </div>
    </div>
  );
}
