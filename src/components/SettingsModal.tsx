import React, { useState } from 'react';
import { Key, CheckCircle, Info, ExternalLink, X, Save, ShieldAlert } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}) => {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [statusMessage, setStatusMessage] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    setStatusMessage('Settings saved successfully!');
    setTimeout(() => {
      setStatusMessage('');
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-700/60 flex items-center justify-center text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">API Configuration</h3>
              <p className="text-xs text-slate-400">Manage OpenWeatherMap integration</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            OpenWeatherMap API Key (Optional)
          </label>
          <input
            type="text"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="e.g. 9b12a87c32def90123456789abcdef01"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>

        {/* Info Card */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-cyan-400">
            <Info className="w-4 h-4 shrink-0" />
            <span>Automatic Keyless Fallback Active</span>
          </div>
          <p className="leading-relaxed text-slate-400">
            If no API key is specified, WeatherWise seamlessly fetches real-time meteorological conditions and 5-day forecasts via open global weather services, so the application works out-of-the-box!
          </p>
          <div className="pt-1">
            <a
              href="https://home.openweathermap.org/users/sign_up"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium underline"
            >
              Get a free OpenWeatherMap API key
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-xl">
            <CheckCircle className="w-4 h-4" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              setKeyInput('');
              onSaveApiKey('');
            }}
            className="text-xs text-slate-400 hover:text-red-400 underline cursor-pointer"
          >
            Clear key
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-500/20 active:scale-98 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
