/**
 * Client-Side Weather and Location Service
 * Communicates with OpenWeatherMap API and Open-Meteo live fallback.
 */

import {
  celsiusToFahrenheit,
  extractNext6Hours,
  formatTemp,
  groupForecastByDay,
  validateCityInput,
  type DailySummary,
  type ForecastEntry,
} from '../utils/weatherMath';

export interface CurrentWeather {
  city: string;
  country: string;
  coordinates: { lat: number; lon: number };
  temp_c: number;
  temp_f: number;
  feels_like_c: number;
  feels_like_f: number;
  temp_min_c: number;
  temp_max_c: number;
  humidity: number;
  pressure: number;
  wind_speed: number; // m/s
  wind_deg: number;
  condition: string;
  description: string;
  icon_code: string;
  icon_url: string;
  sunrise: number;
  sunset: number;
  timezone: number;
  dt: number;
  source: string;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: ForecastEntry[];
  daily: DailySummary[];
}

export interface LocationInfo {
  city: string;
  region: string;
  country: string;
  postal?: string;
  lat: number;
  lon: number;
  ip: string;
  org?: string;
}

const OWM_ICON_BASE = 'https://openweathermap.org/img/wn';

export async function detectLocationViaIP(): Promise<LocationInfo> {
  try {
    // Try local backend proxy first, fallback to direct ipinfo
    let resp: Response;
    try {
      resp = await fetch('/api/location/detect');
    } catch {
      resp = await fetch('https://ipinfo.io/json');
    }

    if (!resp.ok) {
      // Secondary fallback to ip-api
      const fbResp = await fetch('https://ipapi.co/json/');
      if (fbResp.ok) {
        const d = await fbResp.json();
        return {
          city: d.city || 'London',
          region: d.region || '',
          country: d.country_code || '',
          postal: d.postal,
          lat: d.latitude || 51.5074,
          lon: d.longitude || -0.1278,
          ip: d.ip || '',
        };
      }
      throw new Error(`Location detection failed (HTTP ${resp.status})`);
    }

    const data = await resp.json();
    const locParts = (data.loc || '').split(',');
    return {
      city: data.city || 'London',
      region: data.region || '',
      country: data.country || '',
      postal: data.postal,
      lat: parseFloat(locParts[0]) || 0,
      lon: parseFloat(locParts[1]) || 0,
      ip: data.ip || '',
      org: data.org,
    };
  } catch (err: any) {
    throw new Error(err.message || 'Unable to detect approximate location.');
  }
}

export async function fetchWeather(
  query: string,
  apiKey: string = ''
): Promise<WeatherData> {
  const validation = validateCityInput(query);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Please enter a valid city name or ZIP code.');
  }

  const trimmedKey = apiKey.trim();

  // If user provided OpenWeatherMap API key, query OpenWeatherMap directly
  if (trimmedKey) {
    return fetchOpenWeatherMapData(query, trimmedKey);
  }

  // Keyless mode: Query Open-Meteo real live data
  return fetchOpenMeteoData(query);
}

async function fetchOpenWeatherMapData(query: string, apiKey: string): Promise<WeatherData> {
  const encoded = encodeURIComponent(query);

  // 1. Current Weather
  const curUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encoded}&appid=${apiKey}&units=metric`;
  const curResp = await fetch(curUrl);
  if (!curResp.ok) {
    if (curResp.status === 401) {
      throw new Error('Invalid or unactivated OpenWeatherMap API key. New keys take up to 2 hours to activate.');
    }
    if (curResp.status === 404) {
      throw new Error(`Location '${query}' not found. Please check spelling or ZIP code.`);
    }
    if (curResp.status === 429) {
      throw new Error('OpenWeatherMap API rate limit exceeded. Please wait a moment.');
    }
    throw new Error(`Weather service error (HTTP ${curResp.status})`);
  }
  const curData = await curResp.json();

  // 2. 5-Day / 3-Hour Forecast
  const fcUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encoded}&appid=${apiKey}&units=metric`;
  const fcResp = await fetch(fcUrl);
  if (!fcResp.ok) {
    throw new Error('Could not retrieve forecast data.');
  }
  const fcData = await fcResp.json();

  const weatherItem = curData.weather?.[0] || {};
  const temp_c = Number(curData.main?.temp || 0);
  const feels_c = Number(curData.main?.feels_like || temp_c);
  const iconCode = weatherItem.icon || '01d';

  const current: CurrentWeather = {
    city: curData.name || query,
    country: curData.sys?.country || '',
    coordinates: {
      lat: curData.coord?.lat || 0,
      lon: curData.coord?.lon || 0,
    },
    temp_c: Math.round(temp_c * 10) / 10,
    temp_f: celsiusToFahrenheit(temp_c),
    feels_like_c: Math.round(feels_c * 10) / 10,
    feels_like_f: celsiusToFahrenheit(feels_c),
    temp_min_c: Math.round(Number(curData.main?.temp_min || temp_c) * 10) / 10,
    temp_max_c: Math.round(Number(curData.main?.temp_max || temp_c) * 10) / 10,
    humidity: Number(curData.main?.humidity || 0),
    pressure: Number(curData.main?.pressure || 1013),
    wind_speed: Number(curData.wind?.speed || 0),
    wind_deg: Number(curData.wind?.deg || 0),
    condition: weatherItem.main || 'Clear',
    description: (weatherItem.description || 'clear sky').replace(/^\w/, (c: string) => c.toUpperCase()),
    icon_code: iconCode,
    icon_url: `${OWM_ICON_BASE}/${iconCode}@2x.png`,
    sunrise: Number(curData.sys?.sunrise || 0),
    sunset: Number(curData.sys?.sunset || 0),
    timezone: Number(curData.timezone || 0),
    dt: Number(curData.dt || 0),
    source: 'OpenWeatherMap API',
  };

  const rawForecastEntries: ForecastEntry[] = (fcData.list || []).map((item: any) => {
    const itemWeather = item.weather?.[0] || {};
    const t = Number(item.main?.temp || 0);
    return {
      dt: item.dt,
      dt_txt: item.dt_txt || '',
      temp: t,
      temp_min: Number(item.main?.temp_min || t),
      temp_max: Number(item.main?.temp_max || t),
      humidity: Number(item.main?.humidity || 0),
      pressure: Number(item.main?.pressure || 1013),
      condition: itemWeather.main || 'Clear',
      description: itemWeather.description || '',
      icon: itemWeather.icon || '01d',
      windSpeed: Number(item.wind?.speed || 0),
      pop: typeof item.pop === 'number' ? Math.round(item.pop * 100) : 0,
    };
  });

  const hourly = extractNext6Hours(rawForecastEntries);
  const daily = groupForecastByDay(rawForecastEntries);

  return { current, hourly, daily };
}

async function fetchOpenMeteoData(query: string): Promise<WeatherData> {
  // 1. Geocode
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const geoResp = await fetch(geoUrl);
  if (!geoResp.ok) {
    throw new Error('Location lookup service unavailable.');
  }
  const geoData = await geoResp.json();
  if (!geoData.results || geoData.results.length === 0) {
    throw new Error(`Location '${query}' not found. Please verify city name or ZIP code.`);
  }

  const place = geoData.results[0];
  const lat = place.latitude;
  const lon = place.longitude;
  const cityName = place.name || query;
  const country = place.country_code || place.country || '';

  // 2. Fetch full current + hourly + daily
  const fcUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&hourly=temperature_2m,relative_humidity_2m,surface_pressure,weather_code,precipitation_probability,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;
  const fcResp = await fetch(fcUrl);
  if (!fcResp.ok) {
    throw new Error('Forecast service encountered an error.');
  }
  const fcData = await fcResp.json();

  const cur = fcData.current || {};
  const dailyData = fcData.daily || {};
  const hourlyData = fcData.hourly || {};

  const temp_c = Number(cur.temperature_2m ?? 20);
  const feels_c = Number(cur.apparent_temperature ?? temp_c);
  const wCode = Number(cur.weather_code ?? 0);
  const { condition, description, iconCode } = wmoToWeather(wCode);

  const sunriseStr = dailyData.sunrise?.[0];
  const sunsetStr = dailyData.sunset?.[0];
  const sunriseTs = sunriseStr ? Math.floor(new Date(sunriseStr).getTime() / 1000) : 0;
  const sunsetTs = sunsetStr ? Math.floor(new Date(sunsetStr).getTime() / 1000) : 0;

  const current: CurrentWeather = {
    city: cityName,
    country: country.toUpperCase(),
    coordinates: { lat, lon },
    temp_c: Math.round(temp_c * 10) / 10,
    temp_f: celsiusToFahrenheit(temp_c),
    feels_like_c: Math.round(feels_c * 10) / 10,
    feels_like_f: celsiusToFahrenheit(feels_c),
    temp_min_c: Math.round(Number(dailyData.temperature_2m_min?.[0] ?? temp_c) * 10) / 10,
    temp_max_c: Math.round(Number(dailyData.temperature_2m_max?.[0] ?? temp_c) * 10) / 10,
    humidity: Math.round(Number(cur.relative_humidity_2m ?? 50)),
    pressure: Math.round(Number(cur.surface_pressure ?? 1013)),
    wind_speed: Math.round((Number(cur.wind_speed_10m ?? 0) / 3.6) * 10) / 10, // km/h to m/s
    wind_deg: Math.round(Number(cur.wind_direction_10m ?? 0)),
    condition,
    description,
    icon_code: iconCode,
    icon_url: `${OWM_ICON_BASE}/${iconCode}@2x.png`,
    sunrise: sunriseTs,
    sunset: sunsetTs,
    timezone: 0,
    dt: Math.floor(Date.now() / 1000),
    source: 'Real-Time Meteorological API (Keyless Live Mode)',
  };

  // Build hourly
  const times: string[] = hourlyData.time || [];
  const temps: number[] = hourlyData.temperature_2m || [];
  const pops: number[] = hourlyData.precipitation_probability || [];
  const hums: number[] = hourlyData.relative_humidity_2m || [];
  const press: number[] = hourlyData.surface_pressure || [];
  const codes: number[] = hourlyData.weather_code || [];
  const winds: number[] = hourlyData.wind_speed_10m || [];

  const nowIso = new Date().toISOString().slice(0, 13);
  let startIdx = 0;
  for (let i = 0; i < times.length; i++) {
    if (times[i] >= nowIso) {
      startIdx = i;
      break;
    }
  }

  const hourly: ForecastEntry[] = [];
  for (let i = startIdx; i < Math.min(startIdx + 6, times.length); i++) {
    const tObj = new Date(times[i]);
    const c = wmoToWeather(codes[i] ?? 0);
    hourly.push({
      dt: Math.floor(tObj.getTime() / 1000),
      dt_txt: times[i],
      temp: temps[i],
      temp_min: temps[i],
      temp_max: temps[i],
      humidity: hums[i] ?? 50,
      pressure: press[i] ?? 1013,
      condition: c.condition,
      description: c.description,
      icon: c.iconCode,
      windSpeed: Math.round(((winds[i] ?? 0) / 3.6) * 10) / 10,
      pop: pops[i] ?? 0,
    });
  }

  // Build daily (next 5 days)
  const dTimes: string[] = dailyData.time || [];
  const dMins: number[] = dailyData.temperature_2m_min || [];
  const dMaxs: number[] = dailyData.temperature_2m_max || [];
  const dCodes: number[] = dailyData.weather_code || [];

  const daily: DailySummary[] = [];
  for (let i = 0; i < Math.min(5, dTimes.length); i++) {
    const dateObj = new Date(dTimes[i]);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const c = wmoToWeather(dCodes[i] ?? 0);
    daily.push({
      date: dTimes[i],
      dayName,
      tempMin: Math.round(Number(dMins[i] ?? 0) * 10) / 10,
      tempMax: Math.round(Number(dMaxs[i] ?? 0) * 10) / 10,
      condition: c.condition,
      description: c.description,
      icon: c.iconCode,
      humidityAvg: 55,
      count: 1,
    });
  }

  return { current, hourly, daily };
}

function wmoToWeather(code: number): { condition: string; description: string; iconCode: string } {
  switch (code) {
    case 0:
      return { condition: 'Clear', description: 'Clear sky', iconCode: '01d' };
    case 1:
      return { condition: 'Mainly Clear', description: 'Mainly clear', iconCode: '02d' };
    case 2:
      return { condition: 'Partly Cloudy', description: 'Partly cloudy', iconCode: '03d' };
    case 3:
      return { condition: 'Overcast', description: 'Overcast clouds', iconCode: '04d' };
    case 45:
    case 48:
      return { condition: 'Fog', description: 'Foggy conditions', iconCode: '50d' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', description: 'Light drizzle', iconCode: '09d' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Rain', description: 'Rain showers', iconCode: '10d' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Snow', description: 'Snowfall', iconCode: '13d' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Showers', description: 'Rain showers', iconCode: '09d' };
    case 95:
    case 96:
    case 99:
      return { condition: 'Thunderstorm', description: 'Thunderstorm', iconCode: '11d' };
    default:
      return { condition: 'Clear', description: 'Clear', iconCode: '01d' };
  }
}
