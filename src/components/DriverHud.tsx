import React from 'react';
import {
  ArrowRight,
  Camera,
  Crosshair,
  Layers,
  RefreshCw,
  Volume2
} from 'lucide-react';
import type { AddressCapsule, Waypoint } from '../lib/addressStore';
import { FOCUS_RING, TurnIcon, formatDistance, turnLabel } from './shared';

export interface DetectedBoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
  label: string;
  confidence: string;
}

interface DriverHudProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  onStartCamera: () => void;
  capsule: AddressCapsule;
  activeWaypoint: Waypoint;
  currentStep: number;
  isLastStep: boolean;
  appMode: 'gemini' | 'sim';
  autoTrack: boolean;
  onToggleAutoTrack: () => void;
  showArLayers: boolean;
  onToggleArLayers: () => void;
  speechLang: 'hi' | 'en';
  onToggleSpeechLang: () => void;
  scanning: boolean;
  detected: boolean;
  detectedBox: DetectedBoundingBox | null;
  statusMessage: string;
  aiReasoning: string | null;
  isSpeaking: boolean;
  onSpeak: (text: string) => void;
  onScan: () => void;
  onNextStep: () => void;
}

export function DriverHud({
  videoRef,
  cameraActive,
  onStartCamera,
  capsule,
  activeWaypoint,
  currentStep,
  isLastStep,
  appMode,
  autoTrack,
  onToggleAutoTrack,
  showArLayers,
  onToggleArLayers,
  speechLang,
  onToggleSpeechLang,
  scanning,
  detected,
  detectedBox,
  statusMessage,
  aiReasoning,
  isSpeaking,
  onSpeak,
  onScan,
  onNextStep
}: DriverHudProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0f0f10]">
      {/* Camera Viewfinder with AR Overlays */}
      <div className="flex-1 relative w-full bg-[#0f0f10] overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            cameraActive ? 'opacity-90' : 'opacity-0'
          }`}
        />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <Camera className="w-4 h-4 mb-2 text-[#85858b]" strokeWidth={1.5} />
            <p className="text-xs mb-3 text-[#85858b]">Camera feed standby</p>
            <button
              onClick={onStartCamera}
              className={`h-9 px-3 bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] rounded-[8px] text-xs font-medium text-[#ededed] transition-colors duration-150 ${FOCUS_RING}`}
            >
              Enable camera
            </button>
          </div>
        )}

        {/* Top Telemetry & AR Controls Bar */}
        <div className="absolute top-3 inset-x-4 z-30 flex items-center justify-between gap-2 pointer-events-none">
          <div className="h-8 px-3 rounded-[8px] bg-[#141415]/85 backdrop-blur-sm border border-[#ededed]/[0.08] flex items-center gap-2">
            <div className="flex items-center gap-1">
              {capsule.waypoints.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i === currentStep
                      ? 'bg-[#eab308]'
                      : i < currentStep
                        ? 'bg-[#4cc38a]'
                        : 'bg-[#ededed]/20'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-mono tabular-nums text-[#ededed]">
              {currentStep + 1}/{capsule.waypoints.length}
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onToggleAutoTrack}
              className={`h-8 px-2 rounded-[8px] bg-[#141415]/85 backdrop-blur-sm border text-xs font-medium flex items-center gap-2 transition-colors duration-150 ${FOCUS_RING} ${
                autoTrack
                  ? 'border-[#eab308]/50 text-[#ededed]'
                  : 'border-[#ededed]/[0.08] text-[#a1a1a6] hover:text-[#ededed]'
              }`}
              title="Toggle continuous frame analysis"
            >
              <RefreshCw
                className={`w-4 h-4 shrink-0 ${
                  scanning && autoTrack ? 'animate-spin text-[#eab308]' : ''
                }`}
                strokeWidth={1.5}
              />
              {autoTrack && <span className="w-1.5 h-1.5 rounded-full bg-[#eab308]" />}
              <span>Auto</span>
            </button>

            <button
              onClick={onToggleArLayers}
              className={`h-8 px-2 rounded-[8px] bg-[#141415]/85 backdrop-blur-sm border text-xs font-medium flex items-center gap-2 transition-colors duration-150 ${FOCUS_RING} ${
                showArLayers
                  ? 'border-[#ededed]/25 text-[#ededed]'
                  : 'border-[#ededed]/[0.08] text-[#85858b] hover:text-[#ededed]'
              }`}
              title="Toggle AR overlay"
            >
              <Layers className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>AR</span>
            </button>

            <button
              onClick={onToggleSpeechLang}
              className={`h-8 px-3 rounded-[8px] bg-[#141415]/85 backdrop-blur-sm border border-[#ededed]/[0.08] text-xs font-mono font-medium text-[#ededed] hover:bg-[#19191b] transition-colors duration-150 ${FOCUS_RING}`}
              title="Switch voice language"
            >
              {speechLang === 'hi' ? 'HI' : 'EN'}
            </button>
          </div>
        </div>

        {/* AR OVERLAYS */}
        {showArLayers && activeWaypoint && (
          <div className="absolute inset-0 pt-14 pb-3 px-4 flex flex-col justify-between gap-2 pointer-events-none z-20">
            {/* CUE 1: FLOATING SPATIAL LANDMARK PIN */}
            <div className="shrink-0 flex flex-col items-center">
              <div
                className={`h-8 px-3 rounded-[8px] bg-[#141415]/90 backdrop-blur-sm border flex items-center gap-2 whitespace-nowrap transition-colors duration-150 ${
                  detected ? 'border-[#4cc38a]/60' : 'border-[#ededed]/[0.12]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    detected ? 'bg-[#4cc38a]' : 'bg-[#eab308]'
                  }`}
                />
                <span className="text-xs font-medium text-[#ededed]">{activeWaypoint.title}</span>
                <span className="text-xs font-mono tabular-nums text-[#a1a1a6]">
                  {formatDistance(activeWaypoint.distance)}
                </span>
              </div>
              <div className="w-px h-2 bg-[#ededed]/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#ededed]/60" />
            </div>

            {/* CUE 2: CALIBRATED RETICLE OR DYNAMIC BOUNDING BOX */}
            <div className="flex-1 min-h-0 relative flex items-center justify-center">
              {detectedBox ? (
                <div
                  className="absolute pointer-events-none flex flex-col justify-between p-1 rounded-[10px] border-2 border-[#4cc38a] bg-[#4cc38a]/[0.08] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    top: `${Math.min(55, Math.max(18, detectedBox.ymin / 10))}%`,
                    left: `${Math.min(68, Math.max(8, detectedBox.xmin / 10))}%`,
                    height: `${Math.min(62, Math.max(24, (detectedBox.ymax - detectedBox.ymin) / 10))}%`,
                    width: `${Math.min(76, Math.max(24, (detectedBox.xmax - detectedBox.xmin) / 10))}%`
                  }}
                >
                  <div className="self-start -mt-7 h-6 px-2 rounded-[6px] bg-[#141415]/95 border border-[#4cc38a]/60 text-[#4cc38a] text-xs font-medium flex items-center gap-2 whitespace-nowrap">
                    <span>{detectedBox.label}</span>
                    <span className="font-mono tabular-nums text-[#a1a1a6]">
                      {detectedBox.confidence}
                    </span>
                  </div>

                  <div className="flex justify-between w-full">
                    <div className="w-3 h-3 border-t-2 border-l-2 border-[#4cc38a]" />
                    <div className="w-3 h-3 border-t-2 border-r-2 border-[#4cc38a]" />
                  </div>

                  <div className="self-center w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />

                  <div className="flex justify-between w-full">
                    <div className="w-3 h-3 border-b-2 border-l-2 border-[#4cc38a]" />
                    <div className="w-3 h-3 border-b-2 border-r-2 border-[#4cc38a]" />
                  </div>
                </div>
              ) : (
                <div className="relative w-28 h-28 pointer-events-none transition-colors duration-150">
                  <div
                    className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-[4px] ${
                      scanning ? 'border-[#eab308]' : 'border-[#ededed]/35'
                    }`}
                  />
                  <div
                    className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 rounded-tr-[4px] ${
                      scanning ? 'border-[#eab308]' : 'border-[#ededed]/35'
                    }`}
                  />
                  <div
                    className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 rounded-bl-[4px] ${
                      scanning ? 'border-[#eab308]' : 'border-[#ededed]/35'
                    }`}
                  />
                  <div
                    className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-[4px] ${
                      scanning ? 'border-[#eab308]' : 'border-[#ededed]/35'
                    }`}
                  />
                  {scanning ? (
                    <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-px bg-[#eab308]/75" />
                  ) : (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#ededed]/30" />
                  )}
                </div>
              )}
            </div>

            {/* CUE 3: GROUND PERSPECTIVE TURN PATH + SINGLE STATUS BAR */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <svg
                width="120"
                height="40"
                viewBox="0 0 120 40"
                className="overflow-visible"
                aria-hidden="true"
              >
                {activeWaypoint.turnDirection === 'right' && (
                  <g>
                    <path
                      d="M 60 38 Q 60 18 96 10"
                      fill="none"
                      stroke="#eab308"
                      strokeOpacity="0.85"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="5 5"
                    />
                    <path
                      d="M 88 5 L 99 10 L 91 18"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}

                {activeWaypoint.turnDirection === 'left' && (
                  <g>
                    <path
                      d="M 60 38 Q 60 18 24 10"
                      fill="none"
                      stroke="#eab308"
                      strokeOpacity="0.85"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="5 5"
                    />
                    <path
                      d="M 32 5 L 21 10 L 29 18"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}

                {activeWaypoint.turnDirection === 'straight' && (
                  <g>
                    <path
                      d="M 60 38 L 60 8"
                      fill="none"
                      stroke="#eab308"
                      strokeOpacity="0.85"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="5 5"
                    />
                    <path
                      d="M 53 15 L 60 6 L 67 15"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )}
              </svg>

              <div className="h-7 px-3 rounded-[8px] bg-[#141415]/85 backdrop-blur-sm border border-[#ededed]/[0.08] flex items-center gap-2 text-xs font-medium text-[#ededed]">
                <TurnIcon direction={activeWaypoint.turnDirection} />
                <span>{turnLabel(activeWaypoint.turnDirection)}</span>
              </div>

              <div
                className={`px-3 py-1 rounded-[8px] bg-[#141415]/90 border text-xs max-w-full truncate flex items-center gap-2 ${
                  detected
                    ? 'border-[#4cc38a]/40 text-[#ededed]'
                    : 'border-[#ededed]/[0.08] text-[#a1a1a6]'
                }`}
              >
                {detected && <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a] shrink-0" />}
                <span className="truncate">{aiReasoning || statusMessage}</span>
              </div>
            </div>
          </div>
        )}

        {!showArLayers && (
          <div className="absolute bottom-3 inset-x-4 z-20 flex justify-center pointer-events-none">
            <div className="px-3 py-1 rounded-[8px] bg-[#141415]/90 border border-[#ededed]/[0.08] text-xs text-[#a1a1a6] max-w-full truncate">
              {aiReasoning || statusMessage}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Sheet */}
      <div className="bg-[#19191b] border-t border-[#ededed]/[0.08] p-4 space-y-4 shrink-0 z-30">
        {/* Connected Horizontal Route Progress */}
        <div className="flex items-center gap-1" aria-label="Route progress">
          {capsule.waypoints.map((w, i) => {
            const isDone = i < currentStep;
            const isCurrent = i === currentStep;
            return (
              <React.Fragment key={w.id}>
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isDone
                      ? 'bg-[#4cc38a]'
                      : isCurrent
                        ? 'bg-[#eab308]'
                        : 'bg-[#232325] border border-[#ededed]/20'
                  }`}
                />
                {i < capsule.waypoints.length - 1 && (
                  <div
                    className={`h-px flex-1 ${
                      isDone ? 'bg-[#4cc38a]/70' : 'bg-[#ededed]/[0.12]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Current Waypoint Info + Reference Thumbnail + Voice Replay */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {activeWaypoint?.thumbnail && (
              <img
                src={activeWaypoint.thumbnail}
                alt={activeWaypoint.title}
                className="w-11 h-11 rounded-[8px] object-cover border border-[#ededed]/[0.1] shrink-0 mt-0.5"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-mono tabular-nums text-[#85858b]">
                Waypoint {currentStep + 1} of {capsule.waypoints.length} ·{' '}
                {formatDistance(activeWaypoint?.distance || '')}
              </div>
              <h2 className="text-lg font-medium text-[#ededed] mt-1 truncate">
                {activeWaypoint?.title}
              </h2>
              <p className="text-sm text-[#a1a1a6] mt-1 leading-5">{activeWaypoint?.cue}</p>
            </div>
          </div>

          <button
            onClick={() => onSpeak(`${activeWaypoint.title}. ${activeWaypoint.cue}`)}
            className={`w-9 h-9 rounded-[8px] border flex items-center justify-center shrink-0 transition-colors duration-150 ${FOCUS_RING} ${
              isSpeaking
                ? 'border-[#eab308]/60 text-[#eab308] bg-[#232325]'
                : 'border-[#ededed]/[0.08] bg-[#232325] text-[#a1a1a6] hover:text-[#ededed]'
            }`}
            title="Replay voice direction"
            aria-label="Replay voice direction"
          >
            <Volume2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onScan}
            disabled={scanning}
            className={`h-11 px-4 rounded-[10px] bg-[#232325] hover:bg-[#2c2c2f] border border-[#ededed]/[0.08] text-sm font-medium text-[#ededed] flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] disabled:opacity-50 ${FOCUS_RING}`}
          >
            {appMode === 'gemini' ? (
              <Crosshair className="w-4 h-4 shrink-0 text-[#eab308]" strokeWidth={1.5} />
            ) : (
              <Camera className="w-4 h-4 shrink-0 text-[#a1a1a6]" strokeWidth={1.5} />
            )}
            <span>
              {scanning
                ? 'Scanning'
                : appMode === 'gemini'
                  ? 'Lock landmark'
                  : 'Verify landmark'}
            </span>
          </button>

          <button
            onClick={onNextStep}
            disabled={isLastStep}
            className={`h-11 px-4 rounded-[10px] text-sm font-medium flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] ${FOCUS_RING} ${
              isLastStep
                ? 'bg-[#232325]/60 border border-[#ededed]/[0.06] text-[#85858b] cursor-default'
                : detected
                  ? 'bg-[#ededed] text-[#141415] hover:bg-white'
                  : 'bg-[#232325] border border-[#ededed]/[0.08] text-[#ededed] hover:bg-[#2c2c2f]'
            }`}
          >
            {isLastStep ? (
              <span>At doorstep</span>
            ) : (
              <>
                <span>Next step</span>
                <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
