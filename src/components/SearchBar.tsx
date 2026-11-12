import React, { useState, FormEvent } from 'react';
import { Search, MapPin, X, History, Trash2, Loader2 } from 'lucide-react';

interface SearchBarProps {
  onSearch: (city: string) => void;
  onDetectLocation: () => void;
  recentSearches: string[];
  onSelectRecent: (city: string) => void;
  onClearRecent: () => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onDetectLocation,
  recentSearches,
  onSelectRecent,
  onClearRecent,
  isLoading,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="w-full space-y-3">
      {/* Primary Search Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter city name or ZIP code (e.g. New York, Tokyo, 90210, Paris)..."
            disabled={isLoading}
            className="w-full pl-10 pr-10 py-3 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition shadow-inner"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="Clear search input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Get Weather Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-cyan-500/20 active:scale-98 disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Fetching...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4 text-slate-950" />
              <span>Get Weather</span>
            </>
          )}
        </button>

        {/* Detect Location Button */}
        <button
          type="button"
          onClick={onDetectLocation}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/90 hover:bg-slate-700/90 text-cyan-300 hover:text-cyan-200 border border-slate-700 rounded-xl text-sm font-semibold transition active:scale-98 disabled:opacity-60 cursor-pointer"
          title="Detect approximate location via IP"
        >
          <MapPin className="w-4 h-4 text-cyan-400" />
          <span className="hidden md:inline">Detect Location</span>
          <span className="md:hidden">My Location</span>
        </button>
      </form>

      {/* Recent Searches Row */}
      {recentSearches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-slate-400 pr-1">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Recent:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 flex-1">
            {recentSearches.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => {
                  setQuery(city);
                  onSelectRecent(city);
                }}
                className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer text-xs"
              >
                {city}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClearRecent}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-red-400 transition cursor-pointer ml-auto text-[11px]"
            title="Clear search history"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      )}
    </div>
  );
};
