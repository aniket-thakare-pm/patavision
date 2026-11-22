import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Camera, Volume2 } from 'lucide-react';
import type { AddressCapsule, Waypoint } from '../lib/addressStore';
import { FOCUS_RING, TurnIcon, formatDistance } from './shared';

export interface VerificationOverlayState {
  status: 'verified' | 'failed';
  confidence?: string;
  reasoning?: string;
  guidance?: string;
}

interface VerificationOverlayProps {
  overlay: VerificationOverlayState;
  capsule: AddressCapsule;
  activeWaypoint: Waypoint;
  currentStep: number;
  isLastStep: boolean;
  onDismiss: () => void;
  onNextStep: () => void;
  onRestartRoute: () => void;
  onSpeak: (text: string) => void;
}

export function VerificationOverlay({
  overlay,
  capsule,
  activeWaypoint,
  currentStep,
  isLastStep,
  onDismiss,
  onNextStep,
  onRestartRoute,
  onSpeak
}: VerificationOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[#0f0f10]/92 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-overlay-veil">
      <div className="w-full max-w-sm h-full max-h-[760px] flex flex-col items-center justify-between py-2">
        {/* Top meta */}
        <div className="w-full flex items-center justify-between">
          <span className="text-xs font-mono tabular-nums text-[#85858b]">
            Waypoint {currentStep + 1} of {capsule.waypoints.length}
          </span>
          <span
            className={`text-xs font-mono capitalize ${
              overlay.status === 'verified' ? 'text-[#4cc38a]' : 'text-[#e5484d]'
            }`}
          >
            {overlay.status === 'verified'
              ? `Confidence · ${overlay.confidence || 'high'}`
              : 'No match'}
          </span>
        </div>

        {/* Centerpiece Lottie */}
        <div className="flex items-center justify-center shrink-0">
          <DotLottieReact
            src={overlay.status === 'verified' ? '/success-check.lottie' : '/tomato-error.lottie'}
            autoplay
            style={{
              width: overlay.status === 'verified' ? 250 : 230,
              height: overlay.status === 'verified' ? 250 : 230
            }}
          />
        </div>

        {/* Result Copy & Actions */}
        {overlay.status === 'verified' ? (
          <div className="w-full space-y-3 animate-fade-rise">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-medium text-[#ededed]">
                {isLastStep ? 'Doorstep reached' : `${activeWaypoint.title} verified`}
              </h2>
              <p className="text-xs text-[#a1a1a6]">
                {overlay.reasoning || activeWaypoint.cue}
              </p>
            </div>

            <div className="h-10 px-3 rounded-[10px] bg-[#19191b] border border-[#ededed]/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isLastStep ? (
                  <span className="w-2 h-2 rounded-full bg-[#4cc38a] shrink-0" />
                ) : (
                  <TurnIcon direction={activeWaypoint.turnDirection} />
                )}
                <span className="text-sm font-medium text-[#ededed] truncate">
                  {isLastStep ? capsule.addressTitle : activeWaypoint.cue}
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#eab308] shrink-0">
                {isLastStep
                  ? `${capsule.waypoints.length}/${capsule.waypoints.length}`
                  : formatDistance(activeWaypoint.distance)}
              </span>
            </div>

            {!isLastStep && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono text-[#85858b]">
                  <span>Advancing to Waypoint {currentStep + 2}</span>
                  <span>1.2s</span>
                </div>
                <div className="h-1 w-full rounded-full bg-[#232325] overflow-hidden">
                  <div className="h-full w-full bg-[#4cc38a] animate-auto-advance" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onDismiss}
                className={`h-11 px-4 rounded-[10px] bg-[#232325] hover:bg-[#2c2c2f] border border-[#ededed]/[0.08] text-xs font-medium text-[#ededed] transition-colors duration-150 ${FOCUS_RING}`}
              >
                Stay on HUD
              </button>
              <button
                type="button"
                onClick={() => {
                  onDismiss();
                  if (isLastStep) {
                    onRestartRoute();
                  } else {
                    onNextStep();
                  }
                }}
                className={`h-11 px-4 rounded-[10px] bg-[#ededed] hover:bg-white text-[#141415] text-xs font-medium transition-colors duration-150 ${FOCUS_RING}`}
              >
                {isLastStep ? 'Restart route' : 'Next step now'}
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-3 animate-fade-rise">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-medium text-[#ededed]">Landmark not matched</h2>
              <p className="text-xs text-[#a1a1a6]">
                {overlay.guidance || 'Pan camera toward the landmark'}
              </p>
            </div>

            <div className="p-3 rounded-[12px] bg-[#19191b] border border-[#ededed]/[0.08] flex items-center gap-3">
              {activeWaypoint.thumbnail ? (
                <img
                  src={activeWaypoint.thumbnail}
                  alt={activeWaypoint.title}
                  className="w-14 h-11 rounded-[8px] object-cover border border-[#ededed]/[0.1] shrink-0"
                />
              ) : (
                <div className="w-14 h-11 rounded-[8px] bg-[#232325] border border-[#ededed]/[0.1] shrink-0 flex items-center justify-center">
                  <Camera className="w-4 h-4 text-[#85858b]" strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-xs text-[#85858b] block">Look for this landmark</span>
                <span className="text-sm font-medium text-[#ededed] block truncate">
                  {activeWaypoint.title}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onDismiss}
                  className={`h-11 px-4 rounded-[10px] bg-[#ededed] hover:bg-white text-[#141415] text-xs font-medium transition-colors duration-150 ${FOCUS_RING}`}
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => onSpeak(`${activeWaypoint.title}. ${activeWaypoint.cue}`)}
                  className={`h-11 px-4 rounded-[10px] bg-[#232325] hover:bg-[#2c2c2f] border border-[#ededed]/[0.08] text-xs font-medium text-[#ededed] flex items-center justify-center gap-2 transition-colors duration-150 ${FOCUS_RING}`}
                >
                  <Volume2 className="w-4 h-4 shrink-0 text-[#eab308]" strokeWidth={1.5} />
                  <span>Play voice cue</span>
                </button>
              </div>
              {!isLastStep && (
                <button
                  type="button"
                  onClick={() => {
                    onDismiss();
                    onNextStep();
                  }}
                  className={`w-full h-8 text-xs text-[#85858b] hover:text-[#ededed] transition-colors duration-150 ${FOCUS_RING}`}
                >
                  Skip to next step →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
