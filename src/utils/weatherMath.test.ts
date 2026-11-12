import test from 'node:test';
import assert from 'node:assert/strict';
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  kelvinToCelsius,
  formatTemp,
  validateCityInput,
  extractNext6Hours,
  groupForecastByDay,
  ForecastEntry,
} from './weatherMath';

test('Temperature conversions between Celsius and Fahrenheit', () => {
  assert.equal(celsiusToFahrenheit(0), 32);
  assert.equal(celsiusToFahrenheit(100), 212);
  assert.equal(celsiusToFahrenheit(20), 68);
  assert.equal(celsiusToFahrenheit(-40), -40);

  assert.equal(fahrenheitToCelsius(32), 0);
  assert.equal(fahrenheitToCelsius(212), 100);
  assert.equal(fahrenheitToCelsius(68), 20);
  assert.equal(fahrenheitToCelsius(-40), -40);
});

test('Kelvin to Celsius conversion', () => {
  assert.equal(kelvinToCelsius(273.15), 0);
  assert.equal(kelvinToCelsius(300), 26.9);
});

test('Formatting temperature with units', () => {
  assert.equal(formatTemp(25, 'C'), '25°C');
  assert.equal(formatTemp(25, 'F'), '77°F');
  assert.equal(formatTemp(0, 'F'), '32°F');
});

test('City input validation', () => {
  const empty = validateCityInput('');
  assert.equal(empty.isValid, false);
  assert.match(empty.error || '', /Please enter a city/);

  const spaces = validateCityInput('   ');
  assert.equal(spaces.isValid, false);

  const short = validateCityInput('a');
  assert.equal(short.isValid, false);

  const validCity = validateCityInput('London');
  assert.equal(validCity.isValid, true);

  const validZip = validateCityInput('10001');
  assert.equal(validZip.isValid, true);
});

test('Extracting next 6 intervals', () => {
  const mockEntries: ForecastEntry[] = Array.from({ length: 12 }, (_, i) => ({
    dt: 1700000000 + i * 10800,
    dt_txt: `2023-11-15 ${String(i * 3).padStart(2, '0')}:00:00`,
    temp: 15 + i,
    temp_min: 14 + i,
    temp_max: 16 + i,
    humidity: 60,
    pressure: 1013,
    condition: 'Clear',
    description: 'clear sky',
    icon: '01d',
    windSpeed: 3.5,
  }));

  const sixHours = extractNext6Hours(mockEntries);
  assert.equal(sixHours.length, 6);
  assert.equal(sixHours[0].temp, 15);
  assert.equal(sixHours[5].temp, 20);
});

test('Grouping forecast intervals by local calendar day computes min and max', () => {
  const baseTimestamp = 1700006400; // 2023-11-15T00:00:00Z
  const mockEntries: ForecastEntry[] = [
    // Day 1
    {
      dt: baseTimestamp,
      dt_txt: '2023-11-15 00:00:00',
      temp: 10,
      temp_min: 8,
      temp_max: 12,
      humidity: 70,
      pressure: 1012,
      condition: 'Clouds',
      description: 'few clouds',
      icon: '02n',
      windSpeed: 4,
    },
    {
      dt: baseTimestamp + 3600 * 12,
      dt_txt: '2023-11-15 12:00:00',
      temp: 20,
      temp_min: 7,
      temp_max: 22,
      humidity: 50,
      pressure: 1014,
      condition: 'Clear',
      description: 'clear sky',
      icon: '01d',
      windSpeed: 5,
    },
    // Day 2
    {
      dt: baseTimestamp + 86400,
      dt_txt: '2023-11-16 00:00:00',
      temp: 14,
      temp_min: 11,
      temp_max: 15,
      humidity: 80,
      pressure: 1010,
      condition: 'Rain',
      description: 'light rain',
      icon: '10d',
      windSpeed: 6,
    },
  ];

  const days = groupForecastByDay(mockEntries);
  assert.equal(days.length, 2);
  assert.equal(days[0].tempMin, 7); // lowest of (8, 7)
  assert.equal(days[0].tempMax, 22); // highest of (12, 22)
  assert.equal(days[0].condition, 'Clear'); // 12:00 entry preferred
});
