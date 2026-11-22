import type { Waypoint } from './addressStore';

export interface ExtractedFrame {
  base64: string;
  dataUrl: string;
  timestampSec: number;
}

const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

function drawVideoFrame(video: HTMLVideoElement, maxWidth: number, quality: number): ExtractedFrame {
  const vw = video.videoWidth || 480;
  const vh = video.videoHeight || 360;
  const scale = Math.min(1, maxWidth / vw);
  const w = Math.max(1, Math.round(vw * scale));
  const h = Math.max(1, Math.round(vh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0, w, h);
  }
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  return {
    dataUrl,
    base64: dataUrl.split(',')[1] || '',
    timestampSec: Number((video.currentTime || 0).toFixed(1))
  };
}

export async function extractKeyFramesFromVideo(
  blob: Blob,
  maxFrames = 5
): Promise<ExtractedFrame[]> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Unable to read video file'));
      };
      const cleanup = () => {
        video.removeEventListener('loadeddata', onLoaded);
        video.removeEventListener('error', onError);
      };
      video.addEventListener('loadeddata', onLoaded);
      video.addEventListener('error', onError);
    });

    // Chrome MediaRecorder WebM blobs often report duration === Infinity until sought
    let duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      await new Promise<void>(resolve => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = 1e6;
      });
      duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 4;
      await new Promise<void>(resolve => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = 0;
      });
    }

    const count = Math.max(2, Math.min(maxFrames, Math.ceil(duration / 2) + 1));
    const startT = duration * 0.06;
    const endT = duration * 0.92;
    const step = count > 1 ? (endT - startT) / (count - 1) : 0;

    const frames: ExtractedFrame[] = [];
    for (let i = 0; i < count; i++) {
      const targetTime = Math.min(duration - 0.05, Math.max(0, startT + step * i));
      await new Promise<void>(resolve => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = targetTime;
      });
      frames.push(drawVideoFrame(video, 360, 0.7));
    }

    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function resizePhotoToFrame(blob: Blob): Promise<ExtractedFrame> {
  const url = URL.createObjectURL(blob);
  const img = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Unable to load image'));
      img.src = url;
    });

    const scale = Math.min(1, 420 / (img.naturalWidth || 420));
    const w = Math.max(1, Math.round((img.naturalWidth || 420) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || 315) * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, w, h);
    }
    const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
    return {
      dataUrl,
      base64: dataUrl.split(',')[1] || '',
      timestampSec: 0
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildSimulatedWaypoints(frames: ExtractedFrame[], macroAnchor: string): Waypoint[] {
  const presets: Array<Pick<Waypoint, 'title' | 'cue' | 'turnDirection' | 'targetObject'>> = [
    {
      title: macroAnchor ? `${macroAnchor.split('(')[0].trim()} Entry` : 'Corner Landmark',
      cue: 'Turn into the lane beside the main landmark',
      turnDirection: 'right',
      targetObject: 'corner shop or temple or gate'
    },
    {
      title: 'Street Lamp Post',
      cue: 'Walk straight past the lamp post and brown wall',
      turnDirection: 'straight',
      targetObject: 'yellow lamp post or electric pole'
    },
    {
      title: 'Brown Stairs Turn',
      cue: 'Take a left at the steps toward the inner lane',
      turnDirection: 'left',
      targetObject: 'brown stairs or narrow alley entrance'
    },
    {
      title: 'Doorstep Entrance',
      cue: 'Final gate straight ahead at the end of the lane',
      turnDirection: 'straight',
      targetObject: 'house gate or main door'
    }
  ];

  const total = Math.min(Math.max(frames.length, 2), presets.length);
  const baseId = Date.now();
  return Array.from({ length: total }, (_, idx) => {
    const p = presets[idx] || presets[presets.length - 1];
    const isLast = idx === total - 1;
    const remainingMeters = Math.max(15, (total - 1 - idx) * 35);
    const frame = frames[Math.min(idx, frames.length - 1)];
    return {
      id: baseId + idx,
      title: p.title,
      cue: p.cue,
      distance: isLast ? 'Doorstep' : `${remainingMeters} m`,
      targetObject: p.targetObject,
      turnDirection: p.turnDirection,
      screenPosition: { top: '38%', left: '50%' },
      thumbnail: frame?.dataUrl
    };
  });
}

export async function extractWaypointsFromFrames(
  frames: ExtractedFrame[],
  apiKey: string,
  mode: 'gemini' | 'sim',
  macroAnchor: string
): Promise<Waypoint[]> {
  if (frames.length === 0) return [];

  if (mode === 'gemini' && apiKey) {
    const prompt = `You are PataVision Route Extractor for unmapped last-200m Indian streets, alleys, and PGs.
The user walked from "${macroAnchor || 'the main road anchor'}" to their doorstep and captured ${frames.length} chronological frames (frameIndex 0 to ${frames.length - 1}).

Identify 2 to ${Math.min(frames.length, 5)} distinct physical landmark milestones from these frames (e.g., red gate, yellow lamp post, corner shop, brown stairs, green door).
For each milestone return:
- "frameIndex": integer 0..${frames.length - 1} matching the best frame for that milestone
- "title": short 2-4 word landmark name
- "cue": concise 1-sentence walking instruction without trailing period
- "distance": estimated distance from this point like "80 m", "35 m", or "Doorstep" for the final stop
- "turnDirection": "left" | "straight" | "right"
- "targetObject": short visual description for camera detection (e.g. "red iron gate or signboard")

Output strictly valid JSON:
{
  "waypoints": [
    {
      "frameIndex": 0,
      "title": "Corner Tea Stall",
      "cue": "Turn right into the lane behind the shop",
      "distance": "80 m",
      "turnDirection": "right",
      "targetObject": "tea stall or corner shop"
    }
  ]
}`;

    const parts: any[] = [{ text: prompt }];
    frames.forEach((f, i) => {
      parts.push({ text: `Frame ${i} (${f.timestampSec}s):` });
      parts.push({ inline_data: { mime_type: 'image/jpeg', data: f.base64 } });
    });

    for (const model of GEMINI_MODELS) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.2
              }
            })
          }
        );

        if (res.ok) {
          const data = await res.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed?.waypoints) && parsed.waypoints.length > 0) {
              const baseId = Date.now();
              return parsed.waypoints.map((wp: any, idx: number) => {
                const frameIdx = Math.min(
                  frames.length - 1,
                  Math.max(0, Number(wp.frameIndex ?? idx))
                );
                const dir =
                  wp.turnDirection === 'left' || wp.turnDirection === 'right'
                    ? wp.turnDirection
                    : 'straight';
                return {
                  id: baseId + idx,
                  title: String(wp.title || `Landmark ${idx + 1}`).slice(0, 48),
                  cue: String(wp.cue || 'Follow path ahead').replace(/\.+$/, ''),
                  distance: String(
                    wp.distance || (idx === parsed.waypoints.length - 1 ? 'Doorstep' : '30 m')
                  ),
                  targetObject: String(wp.targetObject || wp.title || 'landmark'),
                  turnDirection: dir,
                  screenPosition: { top: '38%', left: '50%' },
                  thumbnail: frames[frameIdx]?.dataUrl
                };
              });
            }
          }
        }
      } catch (err) {
        console.warn(`Route extraction failed on ${model}:`, err);
      }
    }
  }

  return buildSimulatedWaypoints(frames, macroAnchor);
}

export async function analyzeSinglePhoto(
  frame: ExtractedFrame,
  apiKey: string,
  mode: 'gemini' | 'sim'
): Promise<Partial<Waypoint>> {
  if (mode === 'gemini' && apiKey) {
    const prompt = `Identify the most recognizable physical landmark in this street/building photo for last-100m delivery navigation (e.g., red gate, yellow lamp post, corner shop, brown stairs).
Output strictly valid JSON:
{
  "title": "short 2-4 word landmark name",
  "cue": "short 1-sentence direction cue without trailing period",
  "turnDirection": "left" | "straight" | "right",
  "targetObject": "visual object description for AR detection"
}`;

    for (const model of GEMINI_MODELS) {
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
                    { text: prompt },
                    { inline_data: { mime_type: 'image/jpeg', data: frame.base64 } }
                  ]
                }
              ],
              generationConfig: {
                response_mime_type: 'application/json',
                temperature: 0.2
              }
            })
          }
        );

        if (res.ok) {
          const data = await res.json();
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            const dir =
              parsed.turnDirection === 'left' || parsed.turnDirection === 'right'
                ? parsed.turnDirection
                : 'straight';
            return {
              title: String(parsed.title || 'Captured Landmark'),
              cue: String(parsed.cue || 'Walk past this landmark').replace(/\.+$/, ''),
              turnDirection: dir,
              targetObject: String(parsed.targetObject || parsed.title || 'landmark'),
              thumbnail: frame.dataUrl
            };
          }
        }
      } catch (err) {
        console.warn(`Photo analysis failed on ${model}:`, err);
      }
    }
  }

  return {
    title: 'Captured Landmark',
    cue: 'Proceed straight past this milestone',
    turnDirection: 'straight',
    targetObject: 'gate or shop or pole',
    thumbnail: frame.dataUrl
  };
}
