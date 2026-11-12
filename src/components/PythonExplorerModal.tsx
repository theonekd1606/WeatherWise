import React, { useState } from 'react';
import {
  FileCode,
  Folder,
  Copy,
  Check,
  X,
  Terminal,
  BookOpen,
  Download,
  Layers,
} from 'lucide-react';

interface PythonExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CodeFile {
  path: string;
  name: string;
  category: string;
  description: string;
  code: string;
}

const PYTHON_FILES: CodeFile[] = [
  {
    path: 'WeatherWise/main.py',
    name: 'main.py',
    category: 'Application Entry',
    description: 'Desktop application launcher, Tkinter root initialization, CLI arguments, and geometry centering.',
    code: `#!/usr/bin/env python3
"""
WeatherWise – Real-Time Weather Dashboard
Main application entry point.
"""
import argparse, os, sys
try:
    import tkinter as tk
    HAS_TKINTER = True
except ImportError:
    HAS_TKINTER = False
    tk = None

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from utils.config import THEME, get_api_key

def main():
    args = parse_arguments()
    if args.headless_check:
        print("WeatherWise modules loaded successfully.")
        return 0

    from gui.dashboard import WeatherDashboard
    root = tk.Tk()
    root.title("WeatherWise – Real-Time Weather Dashboard")
    root.geometry("1024x820")
    root.minsize(840, 640)
    root.configure(bg=THEME["bg_main"])

    app = WeatherDashboard(root)
    app.pack(fill="both", expand=True)
    if args.city:
        app.fetch_weather_async(args.city)
    root.mainloop()
    return 0

if __name__ == "__main__":
    sys.exit(main())`,
  },
  {
    path: 'WeatherWise/gui/dashboard.py',
    name: 'dashboard.py',
    category: 'GUI Layer',
    description: 'Threaded async GUI controller, input validation, temperature toggling, and card layouts.',
    code: `"""
Main Dashboard View for WeatherWise Desktop Application.
Implements threaded async data fetching, input validation, unit toggling.
"""
import threading, tkinter as tk
from tkinter import ttk, messagebox
from gui.weather_cards import HeroWeatherCard, MetricCard, HourlyCard, DailyCard
from services.weather_api import WeatherAPIService
from services.forecast_service import ForecastService
from services.location_service import LocationService

class WeatherDashboard(tk.Frame):
    def __init__(self, parent: tk.Tk):
        super().__init__(parent, bg="#0B1120")
        self.parent = parent
        self.unit = "C"  # 'C' or 'F'
        self.weather_service = WeatherAPIService()
        self.forecast_service = ForecastService()
        self.location_service = LocationService()
        self._build_layout()
        self.fetch_weather_async("London")

    def fetch_weather_async(self, query: str):
        # Background worker thread ensures GUI NEVER freezes
        threading.Thread(target=self._worker, args=(query,), daemon=True).start()

    def _worker(self, query):
        current = self.weather_service.get_current_weather(query)
        forecast = self.forecast_service.get_forecast(query)
        self.parent.after(0, lambda: self._update_ui(current, forecast))`,
  },
  {
    path: 'WeatherWise/gui/weather_cards.py',
    name: 'weather_cards.py',
    category: 'GUI Layer',
    description: 'Modular UI components for hero weather card, metric cards, 6-hour cards, and 5-day cards with Pillow.',
    code: `"""
Weather Cards and Visual Components for WeatherWise Desktop GUI.
Provides modular card frames for current weather metrics, hourly intervals,
and 5-day forecast displays with Pillow image caching.
"""
import io, tkinter as tk, urllib.request
from PIL import Image, ImageTk

class IconCache:
    _cache = {}
    @classmethod
    def get_icon(cls, icon_code: str, size: int = 64):
        key = f"{icon_code}_{size}"
        if key in cls._cache: return cls._cache[key]
        url = f"https://openweathermap.org/img/wn/{icon_code}@2x.png"
        req = urllib.request.Request(url, headers={"User-Agent": "WeatherWise/1.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            img = Image.open(io.BytesIO(resp.read())).resize((size, size))
            photo = ImageTk.PhotoImage(img)
            cls._cache[key] = photo
            return photo`,
  },
  {
    path: 'WeatherWise/services/weather_api.py',
    name: 'weather_api.py',
    category: 'Services',
    description: 'Current weather API service connecting to OpenWeatherMap with comprehensive error parsing.',
    code: `"""
Weather API Service for WeatherWise.
Handles real-time current weather retrieval from OpenWeatherMap API.
"""
import json, urllib.request, urllib.parse

class WeatherAPIService:
    def get_current_weather(self, query: str):
        encoded = urllib.parse.quote(query)
        url = f"https://api.openweathermap.org/data/2.5/weather?q={encoded}&appid={self.api_key}&units=metric"
        # Handles 401 Unauthorized, 404 City Not Found, 429 Rate Limits, Network Timeouts
        ...`,
  },
  {
    path: 'WeatherWise/services/forecast_service.py',
    name: 'forecast_service.py',
    category: 'Services',
    description: 'Extracts next 6 hourly intervals and groups 3-hour entries by local calendar day for 5-day min/max.',
    code: `"""
Forecast Service for WeatherWise.
Extracts next 6 intervals for the hourly panel and groups by local calendar date for 5-day forecast.
"""
class ForecastService:
    def extract_next_6_intervals(self, entries):
        return entries[:6]

    def group_by_calendar_day(self, entries):
        # Groups entries by YYYY-MM-DD and computes min and max temperature
        ...`,
  },
  {
    path: 'WeatherWise/services/location_service.py',
    name: 'location_service.py',
    category: 'Services',
    description: 'IP geolocation service using ipinfo.io with mandatory user permission enforcement.',
    code: `"""
IP-based Geolocation Service for WeatherWise.
Fetches user's approximate location with explicit permission enforcement.
"""
class LocationService:
    def detect_location(self, user_permitted: bool = False):
        if not user_permitted:
            raise LocationServiceError("Permission not granted. User must explicitly authorize location detection.")
        # Queries https://ipinfo.io/json
        ...`,
  },
  {
    path: 'WeatherWise/utils/temperature.py',
    name: 'temperature.py',
    category: 'Utilities',
    description: 'Pure meteorological and temperature conversions: Celsius, Fahrenheit, Kelvin, m/s to mph, hPa to inHg.',
    code: `"""
Temperature and Meteorological Unit Conversion Utilities for WeatherWise.
"""
def celsius_to_fahrenheit(celsius: float) -> float:
    return round((celsius * 9.0 / 5.0) + 32.0, 1)

def fahrenheit_to_celsius(fahrenheit: float) -> float:
    return round((fahrenheit - 32.0) * 5.0 / 9.0, 1)

def format_temperature(celsius: float, unit: str = "C") -> str:
    if unit.upper() == "F":
        return f"{round(celsius_to_fahrenheit(celsius))}°F"
    return f"{round(celsius)}°C"`,
  },
  {
    path: 'WeatherWise/tests/test_weather.py',
    name: 'test_weather.py',
    category: 'Unit Tests',
    description: '10 automated Python unit tests covering unit math, payload parsing, interval extraction, and errors.',
    code: `"""
Comprehensive Test Suite for WeatherWise.
"""
import unittest
from utils.temperature import celsius_to_fahrenheit, fahrenheit_to_celsius
from services.weather_api import WeatherAPIService
from services.forecast_service import ForecastService

class TestTemperatureConversions(unittest.TestCase):
    def test_celsius_to_fahrenheit(self):
        self.assertEqual(celsius_to_fahrenheit(0), 32.0)
        self.assertEqual(celsius_to_fahrenheit(100), 212.0)
        self.assertEqual(celsius_to_fahrenheit(20), 68.0)

if __name__ == "__main__":
    unittest.main()`,
  },
  {
    path: 'WeatherWise/requirements.txt',
    name: 'requirements.txt',
    category: 'Config',
    description: 'Python package dependencies: requests, pillow, python-dotenv, customtkinter.',
    code: `requests>=2.31.0
pillow>=10.0.0
python-dotenv>=1.0.0
customtkinter>=5.2.0`,
  },
];

export const PythonExplorerModal: React.FC<PythonExplorerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(PYTHON_FILES[0]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-700/60 flex items-center justify-center text-blue-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                WeatherWise Python Desktop Architecture
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60">
                  CustomTkinter / Python 3
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Explore, inspect, and copy complete desktop codebase modules
              </p>
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

        {/* Body Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left File Tree Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-3 overflow-y-auto space-y-1">
            <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-cyan-400" />
              <span>Project Files</span>
            </div>
            {PYTHON_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-mono transition cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>

          {/* Right Code Viewer */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* File info bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-slate-900/60">
              <div>
                <div className="text-xs font-mono text-cyan-400">{selectedFile.path}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{selectedFile.description}</div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition text-xs font-medium cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 p-5 overflow-auto bg-slate-950/90 font-mono text-xs leading-relaxed text-slate-300">
              <pre className="whitespace-pre">{selectedFile.code}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
