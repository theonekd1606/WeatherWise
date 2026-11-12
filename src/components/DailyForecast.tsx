import React from 'react';
import { Calendar } from 'lucide-react';
import type { DailySummary } from '../utils/weatherMath';
import { formatTemp } from '../utils/weatherMath';

interface DailyForecastProps {
  days: DailySummary[];
  unit: 'C' | 'F';
}

export const DailyForecast: React.FC<DailyForecastProps> = ({ days, unit }) => {
  if (!days || days.length === 0) return null;

  // Find global min and max for the 5 days to scale visual temperature bars
  const allMins = days.map((d) => d.tempMin);
  const allMaxs = days.map((d) => d.tempMax);
  const minBound = Math.min(...allMins);
  const maxBound = Math.max(...allMaxs);
  const range = maxBound - minBound || 1;

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          5-Day Forecast
        </h3>
        <span className="text-xs text-slate-400 font-mono">Aggregated daily min/max</span>
      </div>

      <div className="space-y-2">
        {days.slice(0, 5).map((day, idx) => {
          const isToday = idx === 0;
          const iconCode = day.icon.endsWith('n') ? `${day.icon.slice(0, -1)}d` : day.icon;
          const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;

          // Percentage offsets for temperature bar
          const leftPercent = Math.max(0, Math.min(100, ((day.tempMin - minBound) / range) * 100));
          const rightPercent = Math.max(0, Math.min(100, ((day.tempMax - minBound) / range) * 100));
          const barWidth = Math.max(8, rightPercent - leftPercent);

          return (
            <div
              key={day.date}
              className="flex items-center justify-between gap-3 p-3.5 sm:px-5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition"
            >
              {/* Day & Date */}
              <div className="w-24 sm:w-28 shrink-0">
                <div className="font-bold text-sm text-white">
                  {isToday ? 'Today' : day.dayName}
                </div>
                <div className="text-[11px] text-slate-400">{formatDateLabel(day.date)}</div>
              </div>

              {/* Condition & Icon */}
              <div className="flex items-center gap-2 flex-1 min-w-[120px]">
                <img
                  src={iconUrl}
                  alt={day.description}
                  className="w-8 h-8 object-contain shrink-0"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="text-xs text-slate-300 font-medium capitalize truncate">
                  {day.description || day.condition}
                </span>
              </div>

              {/* Visual Temperature Bar (visible on md screens) */}
              <div className="hidden sm:flex items-center gap-2 w-48 shrink-0">
                <span className="text-xs font-mono text-slate-400 w-10 text-right">
                  {formatTemp(day.tempMin, unit)}
                </span>
                <div className="relative flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-400 opacity-90"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${barWidth}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-white font-bold w-10 text-left">
                  {formatTemp(day.tempMax, unit)}
                </span>
              </div>

              {/* Mobile text-only min/max */}
              <div className="sm:hidden text-right shrink-0">
                <span className="text-sm font-bold text-white mr-2">
                  {formatTemp(day.tempMax, unit)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatTemp(day.tempMin, unit)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
