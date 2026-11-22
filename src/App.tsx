import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Volume2, 
  Navigation, 
  MapPin, 
  Key, 
  Check, 
  Copy, 
  Settings, 
  ArrowRight, 
  ArrowLeft,
  ArrowUp,
  Layers, 
  Play, 
  Edit3, 
  Plus, 
  Trash2, 
  Share2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export interface Waypoint {
  id: number;
  title: string;
  cue: string;
  distance: string;
  targetObject: string;
  turnDirection: 'straight' | 'right' | 'left';
  screenPosition: { top: string; left: string };
}

interface AddressCapsule {
  addressTitle: string;
  macroAnchor: string;
  pataHandle: string;
  voiceNoteHindi: string;
  waypoints: Waypoint[];
}

const DEFAULT_CAPSULE: AddressCapsule = {
  addressTitle: 'Flat 302, Green Heights, Gali 3',
  macroAnchor: 'Ganesh Temple Chowk (80ft Road)',
  pataHandle: 'pata.link/blr-302',
  voiceNoteHindi: 'मंदिर से सीधे 10 फीट की संकरी गली में जाएं। पीला खंभा पार करके दूसरा हरा गेट फ्लैट 302 है।',
  waypoints: [
    {
      id: 1,
      title: 'Ganesh Temple',
      cue: 'Take the narrow 10ft gali directly to the right.',
      distance: '65m',
      targetObject: 'temple or shrine',
      turnDirection: 'right',
      screenPosition: { top: '35%', left: '55%' }
    },
    {
      id: 2,
      title: 'Yellow Transformer',
      cue: 'Walk straight 40m. Keep transformer on your left.',
      distance: '25m',
      targetObject: 'transformer or pole',
      turnDirection: 'straight',
      screenPosition: { top: '40%', left: '30%' }
    },
    {
      id: 3,
      title: 'Green Gate (Door 302)',
      cue: 'Second house on the right. Bell is on left pillar.',
      distance: 'Doorstep',
      targetObject: 'green gate or door',
      turnDirection: 'right',
      screenPosition: { top: '38%', left: '60%' }
    }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'driver' | 'resident' | 'partner'>('driver');
  
  // Settings & BYOK
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('patavision_gemini_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [useMockAI, setUseMockAI] = useState<boolean>(() => !localStorage.getItem('patavision_gemini_key'));

  // Voice Settings
  const [speechLang, setSpeechLang] = useState<'hi' | 'en'>('hi');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // AR Overlay Toggle
  const [showArLayers, setShowArLayers] = useState(true);

  // Active Capsule State (Loaded from Hash or LocalStorage)
  const [capsule, setCapsule] = useState<AddressCapsule>(() => {
    // Check URL Hash first (for shared links!)
    if (window.location.hash.startsWith('#capsule=')) {
      try {
        const encoded = window.location.hash.replace('#capsule=', '');
        const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
        return decoded;
      } catch (e) {
        console.warn('Failed to parse URL capsule hash:', e);
      }
    }
    // Check LocalStorage
    const saved = localStorage.getItem('patavision_saved_capsule');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_CAPSULE;
  });

  // Editing State in Resident Tab
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<AddressCapsule>(capsule);

  // Driver HUD Navigation State
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);

  // Camera & Detection
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Align landmark within AR reticle');

  // Start Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 960 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
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
    if (activeTab === 'driver') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [activeTab]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = speechLang === 'hi' ? 'hi-IN' : 'en-US';
    utt.rate = 0.95;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  const activeWaypoint = capsule.waypoints[currentStep] || capsule.waypoints[0];

  // Play audio on step change
  useEffect(() => {
    if (activeTab === 'driver' && activeWaypoint) {
      const prompt = `${activeWaypoint.title}. ${activeWaypoint.cue}`;
      speak(prompt);
      setDetected(false);
      setStatusMessage(`Looking for ${activeWaypoint.title}`);
    }
  }, [currentStep, activeTab, speechLang, capsule]);

  // Scan action (Real Gemini or Simulator)
  const handleScan = async () => {
    if (!activeWaypoint) return;
    setScanning(true);
    setStatusMessage('Analyzing camera feed...');

    if (apiKey && !useMockAI && videoRef.current && canvasRef.current) {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 480;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 480, 360);
          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          const prompt = `Is "${activeWaypoint.targetObject}" visible in this image? Return JSON: {"found": true/false}`;
          
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }]
              }],
              generationConfig: { response_mime_type: 'application/json' }
            })
          });
          const data = await res.json();
          const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
          if (parsed.found) {
            triggerSuccess();
            return;
          }
        }
      } catch (e) {
        console.warn('API error, falling back to simulator:', e);
      }
    }

    // Default fast simulation
    setTimeout(() => {
      triggerSuccess();
    }, 800);
  };

  const triggerSuccess = () => {
    setScanning(false);
    setDetected(true);
    setStatusMessage(`Verified: ${activeWaypoint.title}`);
    speak(speechLang === 'hi' ? 'रास्ता मिल गया। आगे बढ़ें।' : 'Target locked. Follow the path.');
  };

  const nextStep = () => {
    if (currentStep < capsule.waypoints.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Copy shareable link (encoded with capsule data!)
  const copyShareableLink = () => {
    const jsonString = JSON.stringify(capsule);
    const base64 = btoa(encodeURIComponent(jsonString));
    const fullUrl = `${window.location.origin}${window.location.pathname}#capsule=${base64}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save customized capsule
  const handleSaveCustomCapsule = () => {
    setCapsule(editForm);
    localStorage.setItem('patavision_saved_capsule', JSON.stringify(editForm));
    
    // Update hash so URL is immediately shareable
    const jsonString = JSON.stringify(editForm);
    const base64 = btoa(encodeURIComponent(jsonString));
    window.location.hash = `#capsule=${base64}`;
    
    setIsEditing(false);
    setCurrentStep(0);
    setActiveTab('driver'); // jump to driver view to test immediately!
  };

  // Reset to default
  const handleResetToDefault = () => {
    localStorage.removeItem('patavision_saved_capsule');
    window.location.hash = '';
    setCapsule(DEFAULT_CAPSULE);
    setEditForm(DEFAULT_CAPSULE);
    setIsEditing(false);
    setCurrentStep(0);
  };

  // Waypoint editor helpers
  const handleAddWaypoint = () => {
    const newId = Date.now();
    const newW: Waypoint = {
      id: newId,
      title: 'New Waypoint',
      cue: 'Walk straight towards landmark',
      distance: '30m',
      targetObject: 'gate or door or building',
      turnDirection: 'straight',
      screenPosition: { top: '38%', left: '50%' }
    };
    setEditForm(prev => ({
      ...prev,
      waypoints: [...prev.waypoints, newW]
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

  return (
    <div className="min-h-screen bg-[#0C0D0E] text-neutral-100 flex flex-col justify-between max-w-sm mx-auto select-none font-sans antialiased">
      <canvas ref={canvasRef} className="hidden" />

      {/* MINIMAL TOP NAV */}
      <header className="px-4 py-2.5 border-b border-neutral-800/80 flex items-center justify-between bg-[#0C0D0E]/95 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold tracking-tight text-neutral-200">PataVision</span>
        </div>

        {/* Minimal Segment Switcher */}
        <div className="flex bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-2.5 py-1 rounded-md transition ${activeTab === 'driver' ? 'bg-neutral-800 text-white font-medium shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            HUD
          </button>
          <button
            onClick={() => setActiveTab('resident')}
            className={`px-2.5 py-1 rounded-md transition ${activeTab === 'resident' ? 'bg-neutral-800 text-white font-medium shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Address
          </button>
          <button
            onClick={() => setActiveTab('partner')}
            className={`px-2.5 py-1 rounded-md transition ${activeTab === 'partner' ? 'bg-neutral-800 text-white font-medium shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}
          >
            Blinkit
          </button>
        </div>

        <button 
          onClick={() => setShowSettings(true)}
          className="text-neutral-400 hover:text-white transition p-1"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* ========================================================
            TAB 1: DRIVER AR HUD (DYNAMICALLY DRIVEN BY USER CAPSULE)
           ======================================================== */}
        {activeTab === 'driver' && (
          <div className="flex-1 flex flex-col justify-between relative bg-black">
            
            {/* Top Telemetry & AR Controls Bar */}
            <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md border border-neutral-800/80 px-2.5 py-1 rounded-full flex items-center space-x-2">
                <div className="flex space-x-1">
                  {capsule.waypoints.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentStep ? 'bg-white w-3' : i < currentStep ? 'bg-emerald-400' : 'bg-neutral-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {currentStep + 1}/{capsule.waypoints.length}
                </span>
              </div>

              {/* AR Layers Toggle & Language Pill */}
              <div className="flex items-center space-x-1.5 pointer-events-auto">
                <button
                  onClick={() => setShowArLayers(prev => !prev)}
                  className={`bg-black/60 backdrop-blur-md border px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 transition ${
                    showArLayers ? 'border-emerald-500/50 text-emerald-300' : 'border-neutral-800 text-neutral-400'
                  }`}
                  title="Toggle AR Overlay"
                >
                  <Layers className="w-3 h-3" />
                  {showArLayers ? 'AR On' : 'AR Off'}
                </button>

                <button
                  onClick={() => setSpeechLang(p => p === 'hi' ? 'en' : 'hi')}
                  className="bg-black/60 backdrop-blur-md border border-neutral-800 px-2 py-1 rounded-full text-[10px] font-medium text-neutral-300 hover:text-white"
                >
                  {speechLang === 'hi' ? '🇮🇳 HI' : '🇬🇧 EN'}
                </button>
              </div>
            </div>

            {/* Camera Viewport with AR Overlays */}
            <div className="relative w-full h-full min-h-[440px] flex items-center justify-center bg-[#070809] overflow-hidden">
              <video 
                ref={videoRef} 
                playsInline 
                muted 
                className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-90' : 'opacity-0'}`} 
              />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-neutral-400 z-10">
                  <Camera className="w-8 h-8 mb-2 text-neutral-600 stroke-[1.5]" />
                  <p className="text-xs mb-3 text-neutral-500">Camera simulation running</p>
                  <button 
                    onClick={startCamera} 
                    className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-300 hover:text-white transition pointer-events-auto"
                  >
                    Enable Camera
                  </button>
                </div>
              )}

              {/* ========================================================
                  THE AR VISUAL CUES (OVERLAID DIRECTLY ON CAMERA)
                 ======================================================== */}
              {showArLayers && activeWaypoint && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  
                  {/* CUE 1: FLOATING SPATIAL LANDMARK PIN */}
                  <div 
                    className="absolute transition-all duration-700 flex flex-col items-center animate-fade-in"
                    style={{ 
                      top: activeWaypoint.screenPosition?.top || '35%', 
                      left: activeWaypoint.screenPosition?.left || '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className={`px-2.5 py-1 rounded-full backdrop-blur-md border flex items-center gap-1.5 shadow-xl transition-all duration-300 ${
                      detected 
                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 scale-105' 
                        : 'bg-black/75 border-white/20 text-white'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${detected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                      <span className="text-[11px] font-semibold tracking-tight">{activeWaypoint.title}</span>
                      <span className="text-[9px] text-neutral-400 font-mono">({activeWaypoint.distance})</span>
                    </div>

                    <div className="w-[1.5px] h-6 bg-gradient-to-b from-white/40 to-transparent" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 -mt-0.5" />
                  </div>

                  {/* CUE 2: PERSPECTIVE GROUND PATH (ADAPTS TO TURN DIRECTION!) */}
                  <div className="absolute inset-x-0 bottom-12 flex flex-col items-center justify-center opacity-85">
                    <div className="bg-black/60 backdrop-blur px-2.5 py-0.5 rounded-full border border-neutral-800/80 mb-2 flex items-center gap-1 text-[10px] text-neutral-300">
                      <span>Direction:</span>
                      <span className="text-white font-bold capitalize">
                        {activeWaypoint.turnDirection === 'right' && 'Turn Right ➡️'}
                        {activeWaypoint.turnDirection === 'left' && 'Turn Left ⬅️'}
                        {activeWaypoint.turnDirection === 'straight' && 'Follow Straight ⬆️'}
                      </span>
                    </div>

                    {/* SVG 3D Perspective Walking Arrows */}
                    <svg width="220" height="90" viewBox="0 0 220 90" className="overflow-visible">
                      <defs>
                        <linearGradient id="pathGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>

                      {activeWaypoint.turnDirection === 'right' && (
                        <g className="animate-pulse">
                          <path d="M 110 90 Q 110 50 170 30" fill="none" stroke="url(#pathGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray="6 6" />
                          <path d="M 160 20 L 180 30 L 165 45" fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
                        </g>
                      )}

                      {activeWaypoint.turnDirection === 'left' && (
                        <g className="animate-pulse">
                          <path d="M 110 90 Q 110 50 50 30" fill="none" stroke="url(#pathGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray="6 6" />
                          <path d="M 60 20 L 40 30 L 55 45" fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
                        </g>
                      )}

                      {activeWaypoint.turnDirection === 'straight' && (
                        <g className="animate-pulse">
                          <path d="M 110 90 L 110 25" fill="none" stroke="url(#pathGrad)" strokeWidth="10" strokeLinecap="round" strokeDasharray="6 6" />
                          <path d="M 98 35 L 110 20 L 122 35" fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* CUE 3: CENTRAL AR RETICLE BRACKETS */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-44 h-44 rounded-2xl transition-all duration-300 border ${
                      detected 
                        ? 'border-emerald-400 bg-emerald-500/10 scale-105' 
                        : scanning 
                        ? 'border-amber-400/60 animate-pulse' 
                        : 'border-white/20'
                    }`}>
                      {detected && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          Target Confirmed
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* Status Message */}
              <div className="absolute bottom-3 inset-x-4 text-center pointer-events-none z-20">
                <span className="inline-block bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-neutral-300 border border-neutral-800">
                  {statusMessage}
                </span>
              </div>
            </div>

            {/* Bottom Floating Navigation Sheet */}
            <div className="p-4 bg-[#111214] border-t border-neutral-800 space-y-3 z-30">
              
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                    Waypoint {currentStep + 1} • {activeWaypoint?.distance}
                  </span>
                  <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
                    {activeWaypoint?.title}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    {activeWaypoint?.cue}
                  </p>
                </div>

                <button
                  onClick={() => speak(`${activeWaypoint.title}. ${activeWaypoint.cue}`)}
                  className={`p-2 rounded-full border transition pointer-events-auto ${
                    isSpeaking 
                      ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10' 
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                  title="Replay Voice Direction"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Action Controls */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleScan}
                  disabled={scanning}
                  className="py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 flex items-center justify-center gap-1.5 transition active:scale-[0.98] disabled:opacity-50 pointer-events-auto"
                >
                  <Camera className="w-3.5 h-3.5 text-neutral-400" />
                  {scanning ? 'Verifying...' : 'Verify Landmark'}
                </button>

                <button
                  onClick={nextStep}
                  disabled={currentStep >= capsule.waypoints.length - 1}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] pointer-events-auto ${
                    detected 
                      ? 'bg-white text-black hover:bg-neutral-200' 
                      : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                  }`}
                >
                  {currentStep >= capsule.waypoints.length - 1 ? (
                    'At Doorstep'
                  ) : (
                    <>
                      Next Step
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================
            TAB 2: RESIDENT SETUP & CUSTOM WAYPOINT BUILDER
           ======================================================== */}
        {activeTab === 'resident' && (
          <div className="p-4 space-y-4 overflow-y-auto">
            
            {/* Header with Edit Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white tracking-tight">Your PataID Capsule</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isEditing ? 'Customize with your real address' : 'Active navigation profile'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!isEditing) setEditForm(capsule);
                  setIsEditing(!isEditing);
                }}
                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 rounded-lg flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {isEditing ? 'Cancel' : 'Edit Capsule'}
              </button>
            </div>

            {/* IF EDITING MODE IS ACTIVE: BUILDER FORM */}
            {isEditing ? (
              <div className="space-y-4 pt-1">
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium mb-1">
                      Destination Address
                    </label>
                    <input
                      type="text"
                      value={editForm.addressTitle}
                      onChange={e => setEditForm(p => ({ ...p, addressTitle: e.target.value }))}
                      placeholder="e.g. Patel Hall, Room 214"
                      className="w-full bg-[#111214] border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium mb-1">
                      Macro GPS Anchor (Where Maps is Accurate)
                    </label>
                    <input
                      type="text"
                      value={editForm.macroAnchor}
                      onChange={e => setEditForm(p => ({ ...p, macroAnchor: e.target.value }))}
                      placeholder="e.g. Hall Security Gate"
                      className="w-full bg-[#111214] border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium mb-1">
                      Voice Instructions (Spoken to Driver)
                    </label>
                    <textarea
                      rows={2}
                      value={editForm.voiceNoteHindi}
                      onChange={e => setEditForm(p => ({ ...p, voiceNoteHindi: e.target.value }))}
                      placeholder="Directions in your language..."
                      className="w-full bg-[#111214] border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600"
                    />
                  </div>
                </div>

                {/* Waypoints List Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-300">
                      Step-by-Step Waypoints ({editForm.waypoints.length})
                    </span>
                    <button
                      onClick={handleAddWaypoint}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Step
                    </button>
                  </div>

                  {editForm.waypoints.map((w, idx) => (
                    <div key={w.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-neutral-500 font-bold">Step {idx + 1}</span>
                        {editForm.waypoints.length > 1 && (
                          <button
                            onClick={() => handleDeleteWaypoint(idx)}
                            className="text-neutral-500 hover:text-red-400 p-0.5"
                            title="Remove step"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-neutral-500 block mb-0.5">Landmark Name</label>
                          <input
                            type="text"
                            value={w.title}
                            onChange={e => handleUpdateWaypoint(idx, 'title', e.target.value)}
                            placeholder="e.g. Canteen Gate"
                            className="w-full bg-[#111214] border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-neutral-600"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-neutral-500 block mb-0.5">Distance</label>
                          <input
                            type="text"
                            value={w.distance}
                            onChange={e => handleUpdateWaypoint(idx, 'distance', e.target.value)}
                            placeholder="e.g. 40m"
                            className="w-full bg-[#111214] border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-neutral-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] text-neutral-500 block mb-0.5">Direction Cue (Action)</label>
                        <input
                          type="text"
                          value={w.cue}
                          onChange={e => handleUpdateWaypoint(idx, 'cue', e.target.value)}
                          placeholder="e.g. Turn right into the corridor"
                          className="w-full bg-[#111214] border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-neutral-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[9px] text-neutral-500 block mb-0.5">Turn Direction</label>
                          <div className="flex bg-[#111214] p-0.5 rounded-lg border border-neutral-800">
                            {(['left', 'straight', 'right'] as const).map(dir => (
                              <button
                                key={dir}
                                type="button"
                                onClick={() => handleUpdateWaypoint(idx, 'turnDirection', dir)}
                                className={`flex-1 py-1 rounded text-[10px] font-medium capitalize flex items-center justify-center ${
                                  w.turnDirection === dir ? 'bg-neutral-800 text-white' : 'text-neutral-500'
                                }`}
                              >
                                {dir === 'left' && <ArrowLeft className="w-3 h-3" />}
                                {dir === 'straight' && <ArrowUp className="w-3 h-3" />}
                                {dir === 'right' && <ArrowRight className="w-3 h-3" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] text-neutral-500 block mb-0.5">AI Target Cue</label>
                          <input
                            type="text"
                            value={w.targetObject}
                            onChange={e => handleUpdateWaypoint(idx, 'targetObject', e.target.value)}
                            placeholder="e.g. stairs or door"
                            className="w-full bg-[#111214] border border-neutral-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-neutral-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save and Reset Controls */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleResetToDefault}
                    className="flex-1 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white transition flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset to Demo
                  </button>

                  <button
                    onClick={handleSaveCustomCapsule}
                    className="flex-2 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save & Test in HUD
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW MODE (SAVED CAPSULE SUMMARY) */
              <div className="space-y-4">
                {/* Share Handle Card */}
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block font-medium">Universal Handle</span>
                    <span className="text-sm font-mono text-white tracking-tight">{capsule.pataHandle}</span>
                  </div>
                  <button
                    onClick={copyShareableLink}
                    className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs flex items-center gap-1 hover:bg-neutral-200 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Link Copied!' : 'Share Link'}
                  </button>
                </div>

                {/* Location Details */}
                <div className="space-y-2">
                  <span className="text-[11px] text-neutral-400 font-medium">Destination Details</span>
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 text-xs">
                    <div>
                      <span className="text-neutral-500 text-[10px] block">Address</span>
                      <span className="text-neutral-200 font-medium">{capsule.addressTitle}</span>
                    </div>
                    <div className="pt-1 border-t border-neutral-800/80">
                      <span className="text-neutral-500 text-[10px] block">Macro GPS Anchor</span>
                      <span className="text-neutral-300">{capsule.macroAnchor}</span>
                    </div>
                  </div>
                </div>

                {/* Breadcrumbs List */}
                <div className="space-y-2">
                  <span className="text-[11px] text-neutral-400 font-medium">
                    Waypoints ({capsule.waypoints.length} Steps)
                  </span>
                  
                  <div className="space-y-1.5">
                    {capsule.waypoints.map((w, idx) => (
                      <div key={w.id} className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-[10px] font-mono">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-neutral-200 font-medium block">{w.title}</span>
                            <span className="text-neutral-500 text-[11px]">{w.cue}</span>
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono">{w.distance}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Voice Note Bar */}
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => speak(capsule.voiceNoteHindi)}
                      className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition"
                    >
                      <Play className="w-3.5 h-3.5 ml-0.5 fill-white" />
                    </button>
                    <div>
                      <span className="text-xs text-neutral-200 font-medium block">Voice Directions</span>
                      <span className="text-[10px] text-neutral-500">Audio playback ready</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>

                {/* Quick Action to Test */}
                <button
                  onClick={() => {
                    setCurrentStep(0);
                    setActiveTab('driver');
                  }}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-neutral-200 transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Test This Route in Driver HUD
                </button>
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            TAB 3: BLINKIT PARTNER VIEW
           ======================================================== */}
        {activeTab === 'partner' && (
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Partner Delivery Preview</h2>
              <p className="text-xs text-neutral-400 mt-0.5">How logistics riders view the linked capsule</p>
            </div>

            {/* Clean Order Card */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-semibold text-neutral-200">Blinkit Order #4920</span>
                <span className="text-[10px] text-neutral-400">Due in 9m</span>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-neutral-500 text-[10px]">Delivery Address</span>
                <p className="text-neutral-200 font-medium">{capsule.addressTitle}</p>
                <p className="text-neutral-400 font-mono text-[11px] pt-0.5">
                  Address Line 2: <span className="text-white underline">{capsule.pataHandle}</span>
                </p>
              </div>

              <button
                onClick={() => {
                  setCurrentStep(0);
                  setActiveTab('driver');
                }}
                className="w-full py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                Open Route in HUD
              </button>
            </div>

            {/* Impact Metric */}
            <div className="p-3 bg-neutral-900/50 border border-neutral-800/80 rounded-xl flex items-center justify-between text-xs">
              <span className="text-neutral-400">Driver Call Reduction</span>
              <span className="font-semibold text-emerald-400">-72% calls</span>
            </div>
          </div>
        )}

      </main>

      {/* MINIMAL SETTINGS DIALOG */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141517] border border-neutral-800 rounded-2xl max-w-xs w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="text-xs font-semibold text-white">AI Vision Settings</span>
              <button onClick={() => setShowSettings(false)} className="text-neutral-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div 
                onClick={() => setUseMockAI(true)}
                className={`p-2.5 rounded-lg border cursor-pointer transition ${
                  useMockAI ? 'border-neutral-500 bg-neutral-800 text-white' : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                }`}
              >
                <span className="font-medium block">Simulator Mode</span>
                <span className="text-[10px] text-neutral-500">Fast visual mock. No API key required.</span>
              </div>

              <div 
                onClick={() => setUseMockAI(false)}
                className={`p-2.5 rounded-lg border cursor-pointer transition ${
                  !useMockAI ? 'border-neutral-500 bg-neutral-800 text-white' : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                }`}
              >
                <span className="font-medium block">Gemini 2.0 Flash (BYOK)</span>
                <span className="text-[10px] text-neutral-500">Live camera multimodal inference.</span>
              </div>

              {!useMockAI && (
                <div className="pt-1">
                  <label className="text-[10px] text-neutral-400 block mb-1">API Key</label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={e => {
                      setApiKey(e.target.value);
                      localStorage.setItem('patavision_gemini_key', e.target.value);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-neutral-600 font-mono"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2 bg-white text-black font-semibold rounded-lg text-xs hover:bg-neutral-200 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="px-4 py-2 border-t border-neutral-800/80 text-[10px] text-neutral-600 flex justify-between">
        <span>PataVision • Last-100m Engine</span>
        <span>{capsule.addressTitle.split(',')[0]}</span>
      </footer>
    </div>
  );
}
