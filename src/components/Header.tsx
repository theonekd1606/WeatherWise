import React from 'react';
import { CloudLightning, Terminal, Key, Sun, Thermometer } from 'lucide-react';

interface HeaderProps {
  unit: 'C' | 'F';
  onToggleUnit: () => void;
  onOpenPythonModal: () => void;
  onOpenSettingsModal: () => void;
  activeTab: 'dashboard' | 'python' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'python' | 'settings') => void;
  dataSource: string;
}

export const Header: React.FC<HeaderProps> = ({
  unit,
  onToggleUnit,
  onOpenPythonModal,
  onOpenSettingsModal,
  activeTab,
  setActiveTab,
  dataSource,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      {/* Desktop OS Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/70 border-b border-slate-800/60 text-xs text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors inline-block cursor-pointer" title="Close" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors inline-block cursor-pointer" title="Minimize" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors inline-block cursor-pointer" title="Expand" />
          </div>
          <span className="font-mono text-slate-400">WeatherWise Desktop Dashboard</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Feed
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 font-mono hidden sm:inline">Source: {dataSource}</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">v1.0.0</span>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white">
            <CloudLightning className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">WeatherWise</h1>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                Desktop
              </span>
            </div>
            <p className="text-xs text-slate-400">Real-Time Weather Dashboard</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Unit Toggle Button */}
          <button
            type="button"
            onClick={onToggleUnit}
            aria-label={`Toggle temperature unit to ${unit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 transition shadow-sm text-xs font-semibold cursor-pointer active:scale-95"
          >
            <Thermometer className="w-4 h-4 text-cyan-400" />
            <span>Unit:</span>
            <span className="font-mono text-cyan-300 font-bold">°{unit}</span>
            <span className="text-slate-400 text-[10px]">({unit === 'C' ? 'Metric' : 'Imperial'})</span>
          </button>

          {/* Python Code & Docs Button */}
          <button
            type="button"
            onClick={onOpenPythonModal}
            aria-label="View Python source code and architecture"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 transition shadow-sm text-xs font-medium cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Python Desktop Code</span>
            <span className="sm:hidden">Python</span>
          </button>

          {/* API Key Settings Button */}
          <button
            type="button"
            onClick={onOpenSettingsModal}
            aria-label="Open API settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 transition shadow-sm text-xs font-medium cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">API Key</span>
          </button>
        </div>
      </div>
    </header>
  );
};
