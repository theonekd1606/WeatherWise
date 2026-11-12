/**
 * WeatherWise – Real-Time Weather Dashboard
 * Desktop Weather Application & Interactive Web Dashboard
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { ErrorBanner } from './components/ErrorBanner';
import { CurrentWeatherCard } from './components/CurrentWeatherCard';
import { HourlyForecast } from './components/HourlyForecast';
import { DailyForecast } from './components/DailyForecast';
import { LocationModal } from './components/LocationModal';
import { SettingsModal } from './components/SettingsModal';
import { PythonExplorerModal } from './components/PythonExplorerModal';
import {
  fetchWeather,
  detectLocationViaIP,
  type WeatherData,
} from './services/weatherService';
import { CloudRain, Compass, Loader2 } from 'lucide-react';

const RECENT_KEY = 'weatherwise_recent_searches';
const API_KEY_STORAGE = 'weatherwise_owm_api_key';

export default function App() {
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState<string>('');

  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState<boolean>(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(false);

  // Initialize from storage & load default city
  useEffect(() => {
    try {
      const savedRecent = localStorage.getItem(RECENT_KEY);
      if (savedRecent) {
        setRecentSearches(JSON.parse(savedRecent));
      } else {
        setRecentSearches(['London', 'Tokyo', 'New York', 'Paris']);
      }

      const savedKey = localStorage.getItem(API_KEY_STORAGE);
      if (savedKey) {
        setApiKey(savedKey);
      }
    } catch {
      setRecentSearches(['London', 'Tokyo', 'New York', 'Paris']);
    }

    // Initial weather load
    loadWeather('London');
  }, []);

  const saveRecentSearch = (city: string) => {
    const formatted = city.trim();
    if (!formatted) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((c) => c.toLowerCase() !== formatted.toLowerCase());
      const updated = [formatted, ...filtered].slice(0, 8);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Could not save recent search:', err);
      }
      return updated;
    });
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {}
  };

  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    try {
      localStorage.setItem(API_KEY_STORAGE, newKey);
    } catch {}
    // Reload current city with new key
    if (weatherData) {
      loadWeather(weatherData.current.city, newKey);
    }
  };

  const loadWeather = async (query: string, keyOverride?: string) => {
    setIsLoading(true);
    setErrorMessage('');
    const effectiveKey = keyOverride !== undefined ? keyOverride : apiKey;

    try {
      const data = await fetchWeather(query, effectiveKey);
      setWeatherData(data);
      saveRecentSearch(data.current.city);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch weather data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (cityQuery: string) => {
    if (!cityQuery || !cityQuery.trim()) {
      setErrorMessage('Please enter a city name or ZIP code.');
      return;
    }
    loadWeather(cityQuery);
  };

  const handleConfirmLocationDetection = async () => {
    setIsDetectingLocation(true);
    setErrorMessage('');
    try {
      const loc = await detectLocationViaIP();
      setIsLocationModalOpen(false);
      await loadWeather(loc.city);
    } catch (err: any) {
      setErrorMessage(`Location detection failed: ${err.message}. You can enter your city manually.`);
      setIsLocationModalOpen(false);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const toggleUnit = () => {
    setUnit((prev) => (prev === 'C' ? 'F' : 'C'));
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* App Header & Window Title */}
      <Header
        unit={unit}
        onToggleUnit={toggleUnit}
        onOpenPythonModal={() => setIsPythonModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        activeTab="dashboard"
        setActiveTab={() => {}}
        dataSource={weatherData?.current.source || 'Weather API'}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Error notification banner */}
        <ErrorBanner
          message={errorMessage}
          onDismiss={() => setErrorMessage('')}
        />

        {/* Search & Location Bar */}
        <section aria-label="Search controls">
          <SearchBar
            onSearch={handleSearch}
            onDetectLocation={() => setIsLocationModalOpen(true)}
            recentSearches={recentSearches}
            onSelectRecent={(city) => loadWeather(city)}
            onClearRecent={handleClearRecent}
            isLoading={isLoading}
          />
        </section>

        {/* Content State: Loading Skeleton or Weather Dashboard */}
        {isLoading && !weatherData ? (
          <div className="space-y-4 py-12 animate-pulse">
            <div className="h-64 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-cyan-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm font-semibold tracking-wide">
                  Retrieving Real-Time Meteorological Data...
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-900/60 border border-slate-800" />
              ))}
            </div>
            <div className="h-36 rounded-xl bg-slate-900/60 border border-slate-800" />
            <div className="h-64 rounded-xl bg-slate-900/60 border border-slate-800" />
          </div>
        ) : weatherData ? (
          <div className="space-y-6 animate-fade-in">
            {/* Hero Current Weather & 4 Detail Metric Cards */}
            <section aria-label="Current Weather Conditions">
              <CurrentWeatherCard weather={weatherData.current} unit={unit} />
            </section>

            {/* 6-Hour Hourly Forecast */}
            <section aria-label="Hourly Weather Forecast">
              <HourlyForecast entries={weatherData.hourly} unit={unit} />
            </section>

            {/* 5-Day Daily Forecast */}
            <section aria-label="5-Day Weather Forecast">
              <DailyForecast days={weatherData.daily} unit={unit} />
            </section>
          </div>
        ) : (
          <div className="text-center py-20 space-y-3">
            <CloudRain className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-lg font-bold text-slate-300">No Weather Data Loaded</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Please enter a city or postal code above to fetch current atmospheric conditions.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950/60 py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            WeatherWise Desktop Engine • Powered by OpenWeatherMap API & High-Precision Meteorological Models
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              type="button"
              onClick={() => setIsPythonModalOpen(true)}
              className="hover:text-cyan-400 transition underline cursor-pointer"
            >
              Python Source & Architecture
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="hover:text-cyan-400 transition underline cursor-pointer"
            >
              API Configuration
            </button>
          </div>
        </div>
      </footer>

      {/* Location Permission Modal */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onConfirm={handleConfirmLocationDetection}
        isDetecting={isDetectingLocation}
      />

      {/* API Key Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      {/* Python Source Code Explorer Modal */}
      <PythonExplorerModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
      />
    </div>
  );
}
