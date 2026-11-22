import { Check, X } from 'lucide-react';
import { FOCUS_RING } from './shared';

interface SettingsModalProps {
  appMode: 'gemini' | 'sim';
  apiKey: string;
  embeddedApiKey: string;
  testApiStatus: string | null;
  testConnPhase: 'idle' | 'loading' | 'tick' | 'model' | 'error';
  onSetMode: (mode: 'gemini' | 'sim') => void;
  onChangeApiKey: (value: string) => void;
  onResetApiKey: () => void;
  onTestApiKey: () => void;
  onClose: () => void;
}

export function SettingsModal({
  appMode,
  apiKey,
  embeddedApiKey,
  testApiStatus,
  testConnPhase,
  onSetMode,
  onChangeApiKey,
  onResetApiKey,
  onTestApiKey,
  onClose
}: SettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#19191b] border border-[#ededed]/[0.08] rounded-[16px] max-w-sm w-full p-5 space-y-4 animate-fade-rise">
        <div className="flex items-center justify-between pb-3 border-b border-[#ededed]/[0.08]">
          <span className="text-base font-medium text-[#ededed]">Vision & API settings</span>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-[#a1a1a6] hover:text-[#ededed] hover:bg-[#232325] transition-colors duration-150 ${FOCUS_RING}`}
            aria-label="Close settings"
          >
            <X className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => onSetMode('gemini')}
            className={`w-full p-3 rounded-[10px] border text-left transition-colors duration-150 ${FOCUS_RING} ${
              appMode === 'gemini'
                ? 'border-[#ededed]/20 bg-[#232325] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'border-[#ededed]/[0.08] bg-[#141415] hover:bg-[#232325]/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[#ededed]">Gemini Vision</span>
              {appMode === 'gemini' && (
                <span className="w-2 h-2 rounded-full bg-[#eab308] shrink-0" />
              )}
            </div>
            <span className="text-xs text-[#a1a1a6] block mt-1">
              Multimodal inference on live camera frames using configured key
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSetMode('sim')}
            className={`w-full p-3 rounded-[10px] border text-left transition-colors duration-150 ${FOCUS_RING} ${
              appMode === 'sim'
                ? 'border-[#ededed]/20 bg-[#232325] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'border-[#ededed]/[0.08] bg-[#141415] hover:bg-[#232325]/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-[#ededed]">Simulator</span>
              {appMode === 'sim' && (
                <span className="w-2 h-2 rounded-full bg-[#eab308] shrink-0" />
              )}
            </div>
            <span className="text-xs text-[#a1a1a6] block mt-1">
              Simulated landmark detection for offline testing
            </span>
          </button>

          {/* API Key BYOK */}
          <div className="pt-3 border-t border-[#ededed]/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-[#a1a1a6]">Gemini API key</label>
              <span className="text-xs font-mono text-[#85858b]">
                {apiKey === embeddedApiKey ? 'Pre-configured' : 'Custom key'}
              </span>
            </div>
            <input
              type="password"
              placeholder="AQ.Ab8..."
              value={apiKey}
              onChange={e => onChangeApiKey(e.target.value)}
              className={`w-full h-9 bg-[#141415] border border-[#ededed]/[0.1] rounded-[8px] px-3 text-xs font-mono text-[#ededed] ${FOCUS_RING}`}
            />

            <div className="flex gap-2 pt-1">
              <div className="flex-1 flex items-center justify-center h-9">
                <button
                  onClick={onTestApiKey}
                  disabled={testConnPhase !== 'idle'}
                  aria-label="Test connection"
                  className={`h-9 border text-xs font-medium flex items-center justify-center gap-2 overflow-hidden transition-[width,border-radius,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${FOCUS_RING} ${
                    testConnPhase === 'loading' || testConnPhase === 'tick'
                      ? 'w-9 rounded-full px-0'
                      : 'w-full rounded-[8px] px-3'
                  } ${
                    testConnPhase === 'tick' || testConnPhase === 'model'
                      ? 'bg-[#4cc38a]/15 border-[#4cc38a]/60 text-[#4cc38a]'
                      : testConnPhase === 'error'
                        ? 'bg-[#e5484d]/15 border-[#e5484d]/50 text-[#e5484d]'
                        : 'bg-[#232325] hover:bg-[#2c2c2f] border-[#ededed]/[0.08] text-[#ededed]'
                  }`}
                >
                  {testConnPhase === 'idle' && (
                    <span className="animate-morph-fade whitespace-nowrap">Test connection</span>
                  )}

                  {testConnPhase === 'loading' && (
                    <svg
                      className="w-4 h-4 shrink-0 animate-spin text-[#ededed]"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="8"
                        cy="8"
                        r="6"
                        stroke="currentColor"
                        strokeOpacity="0.2"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M14 8a6 6 0 0 0-6-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}

                  {testConnPhase === 'tick' && (
                    <svg
                      className="w-4 h-4 shrink-0 text-[#4cc38a]"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3.5 8.5 6.5 11.5 12.5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-check-draw"
                      />
                    </svg>
                  )}

                  {testConnPhase === 'model' && (
                    <span className="animate-morph-fade flex items-center gap-2 whitespace-nowrap">
                      <Check className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>Gemini 3.5 Flash Lite</span>
                    </span>
                  )}

                  {testConnPhase === 'error' && (
                    <span className="animate-morph-fade flex items-center gap-2 whitespace-nowrap">
                      <X className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                      <span>Connection failed</span>
                    </span>
                  )}
                </button>
              </div>
              {apiKey !== embeddedApiKey && (
                <button
                  onClick={onResetApiKey}
                  className={`h-9 px-3 bg-[#141415] hover:bg-[#232325] border border-[#ededed]/[0.08] text-xs font-medium text-[#a1a1a6] hover:text-[#ededed] rounded-[8px] transition-colors duration-150 ${FOCUS_RING}`}
                >
                  Reset
                </button>
              )}
            </div>

            {testApiStatus && (
              <p
                className={`text-xs font-mono pt-1 ${
                  testApiStatus === 'Reset to embedded key' ? 'text-[#85858b]' : 'text-[#e5484d]'
                }`}
              >
                {testApiStatus}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className={`w-full h-10 bg-[#ededed] hover:bg-white text-[#141415] font-medium rounded-[10px] text-sm transition-[background-color,transform] duration-150 active:scale-[0.98] ${FOCUS_RING}`}
        >
          Done
        </button>
      </div>
    </div>
  );
}
