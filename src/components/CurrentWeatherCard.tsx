import React from 'react';
import {
  Droplets,
  Gauge,
  Wind,
  Sunrise,
  Sunset,
  Compass,
  ArrowUp,
  ArrowDown,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { CurrentWeather } from '../services/weatherService';
import { formatTemp } from '../utils/weatherMath';

interface CurrentWeatherCardProps {
  weather: CurrentWeather;
  unit: 'C' | 'F';
}

export const CurrentWeatherCard: React.FC<CurrentWeatherCardProps> = ({ weather, unit }) => {
  // Format sunrise/sunset
  const formatTime = (ts: number) => {
    if (!ts) return '--:--';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Convert pressure to inHg
  const inHg = (weather.pressure * 0.02953).toFixed(2);
  // Convert wind to mph
  const windMph = (weather.wind_speed * 2.23694).toFixed(1);

  // Compass direction
  const getWindDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  return (
    <div className="space-y-4">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800/90 to-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        {/* Glow backdrop accent */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left Column: Location & Main Temp */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 text-xs font-semibold border border-cyan-800/60 inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Live Conditions
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Updated {new Date(weather.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {weather.city}
                {weather.country && <span className="text-cyan-400 text-2xl sm:text-3xl font-light ml-2">, {weather.country}</span>}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Lat: {weather.coordinates.lat.toFixed(2)}° • Lon: {weather.coordinates.lon.toFixed(2)}°
              </p>
            </div>

            {/* Temperatures */}
            <div className="pt-2 flex items-baseline gap-4">
              <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
                {formatTemp(weather.temp_c, unit)}
              </span>
              <div className="text-xs sm:text-sm text-slate-400 space-y-0.5">
                <div>
                  Alt Unit:{' '}
                  <span className="text-slate-200 font-semibold">
                    {unit === 'C' ? `${Math.round(weather.temp_f)}°F` : `${Math.round(weather.temp_c)}°C`}
                  </span>
                </div>
                <div>
                  Feels like:{' '}
                  <span className="text-cyan-300 font-medium">
                    {formatTemp(weather.feels_like_c, unit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Min / Max badge */}
            <div className="flex items-center gap-3 pt-1 text-xs text-slate-300">
              <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                <ArrowUp className="w-3 h-3 text-red-400" />
                High: {formatTemp(weather.temp_max_c, unit)}
              </span>
              <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                <ArrowDown className="w-3 h-3 text-blue-400" />
                Low: {formatTemp(weather.temp_min_c, unit)}
              </span>
            </div>
          </div>

          {/* Right Column: Weather Icon & Condition */}
          <div className="flex flex-col items-center md:items-end justify-center self-center md:self-auto text-center md:text-right">
            <div className="relative">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center p-2 shadow-inner">
                <img
                  src={weather.icon_url}
                  alt={weather.description}
                  className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(6,182,212,0.3)]"
                  onError={(e) => {
                    // Fallback to static weather icon placeholder if image load fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl sm:text-2xl font-bold text-white capitalize">{weather.condition}</h3>
              <p className="text-xs sm:text-sm text-cyan-300 capitalize">{weather.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Atmospheric Metrics Grid (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Humidity */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>HUMIDITY</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{weather.humidity}%</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {weather.humidity > 70 ? 'High moisture' : weather.humidity < 35 ? 'Dry conditions' : 'Optimal range'}
          </p>
        </div>

        {/* Pressure */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>PRESSURE</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {weather.pressure} <span className="text-xs font-normal text-slate-400">hPa</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{inHg} inHg (barometric)</p>
        </div>

        {/* Wind Speed & Compass */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>WIND SPEED</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {unit === 'F' ? `${windMph} mph` : `${weather.wind_speed} m/s`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Compass className="w-3 h-3 text-cyan-400" />
            Dir: {getWindDirection(weather.wind_deg)} ({weather.wind_deg}°)
          </p>
        </div>

        {/* Sunrise & Sunset */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>SUN CYCLE</span>
            <Sunrise className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sunrise className="w-3 h-3 text-amber-400" /> Rise:
              </span>
              <span className="text-white font-medium">{formatTime(weather.sunrise)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sunset className="w-3 h-3 text-amber-500" /> Set:
              </span>
              <span className="text-white font-medium">{formatTime(weather.sunset)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
