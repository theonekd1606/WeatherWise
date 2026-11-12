import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div className="w-full bg-red-950/70 border border-red-500/50 rounded-xl p-4 shadow-lg text-sm text-red-200 flex items-start justify-between gap-3 animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-red-300">Weather Request Notice</h4>
          <p className="text-red-200 text-xs sm:text-sm mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error banner"
        className="text-red-400 hover:text-red-100 p-1 rounded-lg hover:bg-red-900/50 transition cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
