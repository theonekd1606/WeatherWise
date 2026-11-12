import React from 'react';
import { Clock, Droplets } from 'lucide-react';
import type { ForecastEntry } from '../utils/weatherMath';
import { formatTemp } from '../utils/weatherMath';

interface HourlyForecastProps {
  entries: ForecastEntry[];
  unit: 'C' | 'F';
}

export const HourlyForecast: React.FC<HourlyForecastProps> = ({ entries, unit }) => {
  if (!entries || entries.length === 0) return null;

  // Format hour label (e.g., "12 PM", "3 PM")
  const formatHour = (dt: number, txt?: string) => {
    const d = new Date(dt * 1000);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          6-Hour Forecast
        </h3>
        <span className="text-xs text-slate-400 font-mono">Next 6 intervals</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {entries.slice(0, 6).map((item, idx) => {
          const hourLabel = formatHour(item.dt, item.dt_txt);
          const iconUrl = `https://openweathermap.org/img/wn/${item.icon}.png`;

          return (
            <div
              key={item.dt || idx}
              className="group relative flex flex-col items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/80 transition shadow-sm text-center"
            >
              {/* Time header */}
              <div className="text-xs font-semibold text-slate-300">
                {idx === 0 ? 'Now' : hourLabel}
              </div>

              {/* Weather icon */}
              <div className="my-2 w-12 h-12 flex items-center justify-center">
                <img
                  src={iconUrl}
                  alt={item.description || item.condition}
                  className="w-10 h-10 object-contain filter drop-shadow group-hover:scale-110 transition"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Temperature */}
              <div className="text-lg font-bold text-white">
                {formatTemp(item.temp, unit)}
              </div>

              {/* Condition / Precipitation */}
              <div className="mt-1 text-[11px] text-slate-400 truncate max-w-full">
                {item.pop && item.pop > 0 ? (
                  <span className="text-cyan-400 flex items-center justify-center gap-0.5">
                    <Droplets className="w-2.5 h-2.5" />
                    {item.pop}%
                  </span>
                ) : (
                  <span className="capitalize">{item.condition}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
