/**
 * Pure temperature conversion and weather calculation utilities
 */

export function celsiusToFahrenheit(celsius: number): number {
  return Number(((celsius * 9) / 5 + 32).toFixed(1));
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return Number((((fahrenheit - 32) * 5) / 9).toFixed(1));
}

export function kelvinToCelsius(kelvin: number): number {
  return Number((kelvin - 273.15).toFixed(1));
}

export function kelvinToFahrenheit(kelvin: number): number {
  return celsiusToFahrenheit(kelvin - 273.15);
}

export function formatTemp(valueInCelsius: number, unit: 'C' | 'F'): string {
  if (unit === 'F') {
    return `${Math.round(celsiusToFahrenheit(valueInCelsius))}°F`;
  }
  return `${Math.round(valueInCelsius)}°C`;
}

export function validateCityInput(query: string): { isValid: boolean; error?: string } {
  const trimmed = query.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Please enter a city name or ZIP code.' };
  }
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Query is too short. Please enter at least 2 characters.' };
  }
  return { isValid: true };
}

export interface ForecastEntry {
  dt: number;
  dt_txt: string;
  temp: number; // in Celsius
  temp_min: number;
  temp_max: number;
  humidity: number;
  pressure: number;
  condition: string;
  description: string;
  icon: string;
  windSpeed: number;
  pop?: number; // probability of precipitation
}

export interface DailySummary {
  date: string;
  dayName: string;
  tempMin: number;
  tempMax: number;
  condition: string;
  description: string;
  icon: string;
  humidityAvg: number;
  count: number;
}

/**
 * Extracts the next 6 forecast entries for the hourly panel
 */
export function extractNext6Hours(entries: ForecastEntry[]): ForecastEntry[] {
  return entries.slice(0, 6);
}

/**
 * Groups forecast intervals by local calendar date to calculate daily minimum and maximum temperatures
 */
export function groupForecastByDay(entries: ForecastEntry[]): DailySummary[] {
  const grouped: Record<string, DailySummary> = {};

  for (const entry of entries) {
    const dateObj = new Date(entry.dt * 1000);
    const dateKey = dateObj.toISOString().split('T')[0];
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: dateKey,
        dayName,
        tempMin: entry.temp_min,
        tempMax: entry.temp_max,
        condition: entry.condition,
        description: entry.description,
        icon: entry.icon,
        humidityAvg: entry.humidity,
        count: 1,
      };
    } else {
      const g = grouped[dateKey];
      g.tempMin = Math.min(g.tempMin, entry.temp_min);
      g.tempMax = Math.max(g.tempMax, entry.temp_max);
      g.humidityAvg = Math.round((g.humidityAvg * g.count + entry.humidity) / (g.count + 1));
      g.count += 1;
      // Prefer mid-day icon (around 12:00) if available
      const hour = dateObj.getHours();
      if (hour >= 11 && hour <= 14) {
        g.condition = entry.condition;
        g.description = entry.description;
        g.icon = entry.icon;
      }
    }
  }

  return Object.values(grouped).slice(0, 5);
}
