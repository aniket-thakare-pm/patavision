import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  Copy,
  Edit3,
  Navigation,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  Trash2,
  Upload,
  Video
} from 'lucide-react';
import {
  PRESET_CAPSULES,
  type AddressCapsule,
  type Waypoint,
  formatShortHash
} from '../lib/addressStore';
import type { ExtractedFrame } from '../lib/routeExtractor';
import { FOCUS_RING, formatDistance, formatTimer } from './shared';

function WaypointRouteList({ capsule }: { capsule: AddressCapsule }) {
  return (
    <div className="space-y-0">
      {/* Macro Anchor Origin */}
      <div className="flex gap-3">
        <div className="w-6 flex flex-col items-center shrink-0">
          <div className="w-6 h-6 rounded-[6px] border border-[#eab308]/60 bg-[#141415] flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-[#eab308]" />
          </div>
          <div className="w-px flex-1 bg-[#ededed]/[0.12] my-1 min-h-3" />
        </div>
        <div className="flex-1 min-w-0 pb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-xs text-[#85858b] block">Macro GPS anchor</span>
            <span className="text-sm text-[#a1a1a6] block">{capsule.macroAnchor}</span>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#85858b] shrink-0">Start</span>
        </div>
      </div>

      {/* Waypoint Stops */}
      {capsule.waypoints.map((w, idx) => {
        const isLast = idx === capsule.waypoints.length - 1;
        return (
          <div key={w.id} className="flex gap-3">
            <div className="w-6 flex flex-col items-center shrink-0">
              <div
                className={`w-6 h-6 rounded-[6px] border flex items-center justify-center text-xs font-mono tabular-nums ${
                  isLast
                    ? 'border-[#eab308]/60 bg-[#232325] text-[#ededed]'
                    : 'border-[#ededed]/[0.12] bg-[#232325] text-[#a1a1a6]'
                }`}
              >
                {idx + 1}
              </div>
              {!isLast && <div className="w-px flex-1 bg-[#ededed]/[0.12] my-1 min-h-3" />}
            </div>
            <div
              className={`flex-1 min-w-0 flex items-start justify-between gap-2 ${
                isLast ? 'pb-0' : 'pb-3'
              }`}
            >
              <div className="flex items-start gap-2 min-w-0">
                {w.thumbnail && (
                  <img
                    src={w.thumbnail}
                    alt={w.title}
                    className="w-12 h-9 rounded-[6px] object-cover border border-[#ededed]/[0.08] shrink-0 mt-0.5"
                  />
                )}
                <div className="min-w-0">
                  <span className="text-sm font-medium text-[#ededed] block truncate">
                    {w.title}
                  </span>
                  <span className="text-xs text-[#a1a1a6] block mt-0.5">{w.cue}</span>
                </div>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#85858b] shrink-0">
                {formatDistance(w.distance)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AddressTabProps {
  capsule: AddressCapsule;
  selectedPreset: string;
  isEditing: boolean;
  onToggleEdit: () => void;
  lookupQuery: string;
  onChangeLookupQuery: (value: string) => void;
  onLookup: (e: React.FormEvent) => void;
  lookupStatus: { type: 'found' | 'miss' | 'info'; text: string } | null;
  onApplyPreset: (key: string) => void;
  cloudActive: boolean;
  cloudNotice: string | null;
  copied: boolean;
  onCopyLink: () => void;
  speechLang: 'hi' | 'en';
  onSpeak: (text: string) => void;
  onTestRouteInHud: () => void;
  editForm: AddressCapsule;
  onChangeEditForm: React.Dispatch<React.SetStateAction<AddressCapsule>>;
  editSlug: string;
  onChangeEditSlug: (value: string) => void;
  editPhone: string;
  onChangeEditPhone: (value: string) => void;
  editPhonePreviewHash: string;
  isRecordingWalkthrough: boolean;
  recordingSeconds: number;
  processingVideo: boolean;
  videoExtractStatus: string | null;
  extractedFrames: ExtractedFrame[];
  analyzingStepIdx: number | null;
  walkthroughVideoRef: React.RefObject<HTMLVideoElement | null>;
  videoUploadInputRef: React.RefObject<HTMLInputElement | null>;
  onStartWalkthroughRecording: () => void;
  onStopWalkthroughRecording: () => void;
  onVideoFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStepPhotoCapture: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddWaypoint: () => void;
  onUpdateWaypoint: (index: number, field: keyof Waypoint, value: any) => void;
  onDeleteWaypoint: (index: number) => void;
  onResetToDefault: () => void;
  onSaveCustomCapsule: () => void;
}

export function AddressTab({
  capsule,
  selectedPreset,
  isEditing,
  onToggleEdit,
  lookupQuery,
  onChangeLookupQuery,
  onLookup,
  lookupStatus,
  onApplyPreset,
  cloudActive,
  cloudNotice,
  copied,
  onCopyLink,
  speechLang,
  onSpeak,
  onTestRouteInHud,
  editForm,
  onChangeEditForm,
  editSlug,
  onChangeEditSlug,
  editPhone,
  onChangeEditPhone,
  editPhonePreviewHash,
  isRecordingWalkthrough,
  recordingSeconds,
  processingVideo,
  videoExtractStatus,
  extractedFrames,
  analyzingStepIdx,
  walkthroughVideoRef,
  videoUploadInputRef,
  onStartWalkthroughRecording,
  onStopWalkthroughRecording,
  onVideoFileUpload,
  onStepPhotoCapture,
  onAddWaypoint,
  onUpdateWaypoint,
  onDeleteWaypoint,
  onResetToDefault,
  onSaveCustomCapsule
}: AddressTabProps) {
  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium text-[#ededed]">Address capsule</h2>
          <p className="text-xs text-[#a1a1a6] mt-1">
            {isEditing
              ? 'Record path video or capture landmark steps'
              : 'Directory lookup and active route'}
          </p>
        </div>
        <button
          onClick={onToggleEdit}
          className={`h-9 px-3 rounded-[8px] bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-xs font-medium text-[#ededed] flex items-center gap-2 shrink-0 transition-colors duration-150 ${FOCUS_RING}`}
        >
          <Edit3 className="w-4 h-4 shrink-0 text-[#a1a1a6]" strokeWidth={1.5} />
          <span>{isEditing ? 'Cancel' : 'Edit'}</span>
        </button>
      </div>

      {/* Directory Lookup Bar */}
      {!isEditing && (
        <form
          onSubmit={onLookup}
          className="p-3 bg-[#19191b] border border-[#ededed]/[0.08] rounded-[14px] space-y-2"
        >
          <label className="text-xs text-[#85858b] block">
            Lookup by phone or short handle
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-[#85858b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                strokeWidth={1.5}
              />
              <input
                type="text"
                value={lookupQuery}
                onChange={e => onChangeLookupQuery(e.target.value)}
                placeholder="9876543210 or pata.in/blr-302"
                className={`w-full h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] pl-9 pr-3 text-xs font-mono text-[#ededed] placeholder:text-[#85858b] ${FOCUS_RING}`}
              />
            </div>
            <button
              type="submit"
              className={`h-9 px-3 rounded-[8px] bg-[#232325] hover:bg-[#2c2c2f] border border-[#ededed]/[0.08] text-xs font-medium text-[#ededed] shrink-0 transition-colors duration-150 ${FOCUS_RING}`}
            >
              Find
            </button>
          </div>
          {lookupStatus && (
            <p
              className={`text-xs font-mono ${
                lookupStatus.type === 'found' ? 'text-[#4cc38a]' : 'text-[#a1a1a6]'
              }`}
            >
              {lookupStatus.text}
            </p>
          )}
        </form>
      )}

      {/* Saved Presets */}
      <div className="p-4 bg-[#19191b] border border-[#ededed]/[0.08] rounded-[14px] space-y-3">
        <span className="text-xs text-[#85858b] block">Saved presets</span>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'gali', label: 'Gali 3' },
            { key: 'hostel', label: 'Hostel Hall' },
            { key: 'office', label: 'Tech Park' }
          ].map(item => {
            const isSelected = selectedPreset === item.key;
            const stopCount = PRESET_CAPSULES[item.key].waypoints.length;
            return (
              <button
                key={item.key}
                onClick={() => onApplyPreset(item.key)}
                className={`p-3 rounded-[10px] border text-left transition-colors duration-150 ${FOCUS_RING} ${
                  isSelected
                    ? 'bg-[#232325] border-[#ededed]/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'bg-[#141415] border-[#ededed]/[0.08] hover:bg-[#232325]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium text-[#ededed]">{item.label}</span>
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#eab308] shrink-0" />
                  )}
                </div>
                <span className="text-xs font-mono tabular-nums text-[#85858b] block mt-1">
                  {stopCount} stops
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          {/* Video Walkthrough Key-Frame Extractor */}
          <div className="p-4 bg-[#19191b] border border-[#ededed]/[0.08] rounded-[14px] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-sm font-medium text-[#ededed] block">
                  Video walkthrough
                </span>
                <span className="text-xs text-[#85858b] block mt-0.5">
                  Extracts key frames client-side to auto-build steps
                </span>
              </div>
              {isRecordingWalkthrough && (
                <span className="text-xs font-mono tabular-nums text-[#e5484d] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e5484d]" />
                  {formatTimer(recordingSeconds)}
                </span>
              )}
            </div>

            {isRecordingWalkthrough && (
              <div className="rounded-[10px] overflow-hidden border border-[#ededed]/[0.1] bg-[#0f0f10] aspect-[4/3]">
                <video
                  ref={walkthroughVideoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {!isRecordingWalkthrough ? (
                <button
                  type="button"
                  onClick={onStartWalkthroughRecording}
                  disabled={processingVideo}
                  className={`h-9 px-3 rounded-[8px] bg-[#232325] hover:bg-[#2c2c2f] border border-[#ededed]/[0.08] text-xs font-medium text-[#ededed] flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50 ${FOCUS_RING}`}
                >
                  <Video className="w-4 h-4 shrink-0 text-[#eab308]" strokeWidth={1.5} />
                  <span>Record video</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStopWalkthroughRecording}
                  className={`h-9 px-3 rounded-[8px] bg-[#e5484d]/15 border border-[#e5484d]/50 text-xs font-medium text-[#e5484d] flex items-center justify-center gap-2 transition-colors duration-150 ${FOCUS_RING}`}
                >
                  <Square className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  <span>Stop & extract</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => videoUploadInputRef.current?.click()}
                disabled={processingVideo || isRecordingWalkthrough}
                className={`h-9 px-3 rounded-[8px] bg-[#232325] hover:bg-[#2c2c2f] border border-[#ededed]/[0.08] text-xs font-medium text-[#ededed] flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50 ${FOCUS_RING}`}
              >
                <Upload className="w-4 h-4 shrink-0 text-[#a1a1a6]" strokeWidth={1.5} />
                <span>Upload video</span>
              </button>
              <input
                ref={videoUploadInputRef}
                type="file"
                accept="video/*"
                onChange={onVideoFileUpload}
                className="hidden"
              />
            </div>

            {videoExtractStatus && (
              <p className="text-xs font-mono text-[#a1a1a6]">{videoExtractStatus}</p>
            )}

            {extractedFrames.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pt-1">
                {extractedFrames.map((frame, i) => (
                  <div key={i} className="shrink-0 space-y-1">
                    <img
                      src={frame.dataUrl}
                      alt={`Key frame ${i + 1}`}
                      className="w-16 h-12 rounded-[6px] object-cover border border-[#ededed]/[0.1]"
                    />
                    <span className="text-xs font-mono tabular-nums text-[#85858b] block text-center">
                      {frame.timestampSec}s
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Address, Short Handle & Phone Hash */}
          <div className="p-4 bg-[#19191b] border border-[#ededed]/[0.08] rounded-[14px] space-y-3">
            <div>
              <label className="text-xs text-[#85858b] block mb-1">Destination address</label>
              <input
                type="text"
                value={editForm.addressTitle}
                onChange={e =>
                  onChangeEditForm(p => ({ ...p, addressTitle: e.target.value }))
                }
                placeholder="Flat 401, Sai Residency"
                className={`w-full h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] px-3 text-sm text-[#ededed] placeholder:text-[#85858b] ${FOCUS_RING}`}
              />
            </div>

            <div>
              <label className="text-xs text-[#85858b] block mb-1">Macro GPS anchor</label>
              <input
                type="text"
                value={editForm.macroAnchor}
                onChange={e => onChangeEditForm(p => ({ ...p, macroAnchor: e.target.value }))}
                placeholder="Main Gate / Society Corner"
                className={`w-full h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] px-3 text-sm text-[#ededed] placeholder:text-[#85858b] ${FOCUS_RING}`}
              />
            </div>

            <div>
              <label className="text-xs text-[#85858b] block mb-1">Short handle</label>
              <div className="flex items-center h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] overflow-hidden">
                <span className="px-3 text-xs font-mono text-[#85858b] border-r border-[#ededed]/[0.08] h-full flex items-center bg-[#19191b]">
                  pata.in/
                </span>
                <input
                  type="text"
                  value={editSlug}
                  onChange={e => onChangeEditSlug(e.target.value)}
                  placeholder="blr-302"
                  className="flex-1 h-full bg-transparent px-3 text-xs font-mono text-[#ededed] placeholder:text-[#85858b] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[#85858b]">Phone number (hashed locally)</label>
                {(editPhonePreviewHash || editForm.phoneHash) && (
                  <span className="text-xs font-mono text-[#4cc38a]">
                    {formatShortHash(editPhonePreviewHash || editForm.phoneHash || '')}
                  </span>
                )}
              </div>
              <input
                type="tel"
                value={editPhone}
                onChange={e => onChangeEditPhone(e.target.value)}
                placeholder={
                  editForm.phoneHash
                    ? 'Linked — enter new number to update'
                    : '9876543210 (optional)'
                }
                className={`w-full h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] px-3 text-xs font-mono text-[#ededed] placeholder:text-[#85858b] ${FOCUS_RING}`}
              />
            </div>

            <div>
              <label className="text-xs text-[#85858b] block mb-1">Voice note</label>
              <textarea
                rows={2}
                value={editForm.voiceNoteHindi}
                onChange={e =>
                  onChangeEditForm(p => ({ ...p, voiceNoteHindi: e.target.value }))
                }
                placeholder="Directions in your language"
                className={`w-full bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] px-3 py-2 text-sm text-[#ededed] placeholder:text-[#85858b] ${FOCUS_RING}`}
              />
            </div>
          </div>

          {/* Waypoints List Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#ededed] font-mono tabular-nums">
                Waypoints ({editForm.waypoints.length})
              </span>
              <button
                onClick={onAddWaypoint}
                className={`h-8 px-3 rounded-[8px] bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-xs font-medium text-[#ededed] flex items-center gap-2 transition-colors duration-150 ${FOCUS_RING}`}
              >
                <Plus className="w-4 h-4 shrink-0 text-[#eab308]" strokeWidth={1.5} />
                <span>Add step</span>
              </button>
            </div>

            {editForm.waypoints.map((w, idx) => (
              <div
                key={w.id}
                className="p-4 bg-[#19191b] border border-[#ededed]/[0.08] rounded-[14px] space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-xs text-[#85858b]">
                      Step {idx + 1}
                    </span>
                    {w.thumbnail && (
                      <img
                        src={w.thumbnail}
                        alt={w.title}
                        className="w-12 h-9 rounded-[6px] object-cover border border-[#ededed]/[0.08]"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      className="h-8 px-2 rounded-[8px] bg-[#232325] hover:bg-[#2c2c2f] border border-[#ededed]/[0.08] text-xs font-medium text-[#ededed] flex items-center gap-1 cursor-pointer transition-colors duration-150"
                      title="Capture or upload photo for this landmark"
                    >
                      <Camera className="w-4 h-4 shrink-0 text-[#eab308]" strokeWidth={1.5} />
                      <span>{analyzingStepIdx === idx ? 'Analyzing' : 'Photo'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={e => onStepPhotoCapture(idx, e)}
                        className="hidden"
                      />
                    </label>
                    {editForm.waypoints.length > 1 && (
                      <button
                        onClick={() => onDeleteWaypoint(idx)}
                        className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-[#85858b] hover:text-[#e5484d] hover:bg-[#232325] transition-colors duration-150 ${FOCUS_RING}`}
                        title="Remove step"
                        aria-label="Remove step"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#85858b] block mb-1">Landmark name</label>
                    <input
                      type="text"
                      value={w.title}
                      onChange={e => onUpdateWaypoint(idx, 'title', e.target.value)}
                      placeholder="Iron Gate"
                      className={`w-full h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] px-3 text-sm text-[#ededed] placeholder:text-[#85858b] ${FOCUS_RING}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#85858b] block mb-1">Distance</label>
                    <input
                      type="text"
                      value={w.distance}
                      onChange={e => onUpdateWaypoint(idx, 'distance', e.target.value)}
                      placeholder="40 m"
                      className={`w-full h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] px-3 text-sm font-mono tabular-nums text-[#ededed] placeholder:text-[#85858b] ${FOCUS_RING}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#85858b] block mb-1">Direction cue</label>
                  <input
                    type="text"
                    value={w.cue}
                    onChange={e => onUpdateWaypoint(idx, 'cue', e.target.value)}
                    placeholder="Turn right past the transformer"
                    className={`w-full h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] px-3 text-sm text-[#ededed] placeholder:text-[#85858b] ${FOCUS_RING}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#85858b] block mb-1">Turn direction</label>
                    <div className="flex bg-[#141415] p-1 rounded-[8px] border border-[#ededed]/[0.1] h-9">
                      {(['left', 'straight', 'right'] as const).map(dir => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => onUpdateWaypoint(idx, 'turnDirection', dir)}
                          className={`flex-1 rounded-[4px] flex items-center justify-center transition-colors duration-150 ${FOCUS_RING} ${
                            w.turnDirection === dir
                              ? 'bg-[#232325] text-[#ededed]'
                              : 'text-[#85858b] hover:text-[#ededed]'
                          }`}
                          aria-label={`Turn ${dir}`}
                        >
                          {dir === 'left' && (
                            <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                          )}
                          {dir === 'straight' && (
                            <ArrowUp className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                          )}
                          {dir === 'right' && (
                            <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-[#85858b] block mb-1">Vision target cue</label>
                    <input
                      type="text"
                      value={w.targetObject}
                      onChange={e => onUpdateWaypoint(idx, 'targetObject', e.target.value)}
                      placeholder="gate or door"
                      className={`w-full h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] px-3 text-sm text-[#ededed] placeholder:text-[#85858b] ${FOCUS_RING}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Save and Reset Controls */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onResetToDefault}
              className={`flex-1 h-11 px-4 rounded-[10px] bg-[#19191b] hover:bg-[#232325] border border-[#ededed]/[0.08] text-sm font-medium text-[#a1a1a6] hover:text-[#ededed] flex items-center justify-center gap-2 transition-colors duration-150 ${FOCUS_RING}`}
            >
              <RotateCcw className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>Reset</span>
            </button>

            <button
              onClick={onSaveCustomCapsule}
              className={`flex-[2] h-11 px-4 rounded-[10px] bg-[#ededed] hover:bg-white text-[#141415] text-sm font-medium flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] ${FOCUS_RING}`}
            >
              <Check className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              <span>Save and test in HUD</span>
            </button>
          </div>
        </div>
      ) : (
        /* VIEW MODE (DISPATCH PASS) */
        <div className="space-y-4">
          <div className="p-4 bg-[#19191b] border border-[#ededed]/[0.08] rounded-[14px] space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#85858b]">Short handle</span>
                  <span
                    className={`text-xs font-mono ${
                      cloudActive ? 'text-[#4cc38a]' : 'text-[#85858b]'
                    }`}
                  >
                    {cloudActive ? '· Cloud sync' : '· Local'}
                  </span>
                </div>
                <span className="text-sm font-mono text-[#ededed] block mt-1 truncate">
                  {capsule.pataHandle}
                </span>
              </div>
              <button
                onClick={onCopyLink}
                className={`h-9 px-3 rounded-[8px] bg-[#ededed] hover:bg-white text-[#141415] text-xs font-medium flex items-center gap-2 shrink-0 transition-[background-color,transform] duration-150 active:scale-[0.98] ${FOCUS_RING}`}
              >
                {copied ? (
                  <Check className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                ) : (
                  <Copy className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                )}
                <span>{copied ? 'Link copied' : 'Copy link'}</span>
              </button>
            </div>

            {cloudNotice && <p className="text-xs font-mono text-[#e5484d]">{cloudNotice}</p>}

            <div className="pt-3 border-t border-[#ededed]/[0.08]">
              <span className="text-xs text-[#85858b] block">Destination address</span>
              <span className="text-sm font-medium text-[#ededed] block mt-1">
                {capsule.addressTitle}
              </span>
            </div>

            {capsule.phoneHash && (
              <div className="pt-3 border-t border-[#ededed]/[0.08] flex items-center justify-between gap-2">
                <span className="text-xs text-[#85858b]">Phone linked</span>
                <span className="text-xs font-mono text-[#4cc38a]">
                  {formatShortHash(capsule.phoneHash)}
                </span>
              </div>
            )}
          </div>

          {/* Signature Connected Vertical Route Line */}
          <div className="p-4 bg-[#19191b] border border-[#ededed]/[0.08] rounded-[14px] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#85858b]">Route waypoints</span>
              <span className="text-xs font-mono tabular-nums text-[#85858b]">
                {capsule.waypoints.length} stops
              </span>
            </div>
            <WaypointRouteList capsule={capsule} />
          </div>

          {/* Voice Note Bar */}
          <div className="h-14 px-4 bg-[#19191b] border border-[#ededed]/[0.08] rounded-[12px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => onSpeak(capsule.voiceNoteHindi)}
                className={`w-9 h-9 rounded-[8px] bg-[#232325] hover:bg-[#2c2c2f] border border-[#ededed]/[0.08] text-[#ededed] flex items-center justify-center shrink-0 transition-colors duration-150 ${FOCUS_RING}`}
                aria-label="Play voice directions"
              >
                <Play className="w-4 h-4 shrink-0" strokeWidth={1.5} />
              </button>
              <div className="min-w-0">
                <span className="text-sm font-medium text-[#ededed] block">Voice directions</span>
                <span className="text-xs text-[#85858b] block truncate">
                  {speechLang === 'hi' ? 'Hindi audio' : 'English audio'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action to Test */}
          <button
            onClick={onTestRouteInHud}
            className={`w-full h-11 px-4 rounded-[10px] bg-[#ededed] hover:bg-white text-[#141415] text-sm font-medium flex items-center justify-center gap-2 transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] ${FOCUS_RING}`}
          >
            <Navigation className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>Test route in HUD</span>
          </button>
        </div>
      )}
    </div>
  );
}
