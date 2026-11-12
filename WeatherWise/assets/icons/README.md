# WeatherWise Assets & Icons

This directory stores weather icon assets and mapping resources for WeatherWise.

- WeatherWise fetches high-resolution icons from OpenWeatherMap at runtime (`https://openweathermap.org/img/wn/{icon_code}@2x.png`).
- Pillow (PIL) dynamically resizes and converts images to `ImageTk.PhotoImage` with caching.
- If offline or Pillow is unavailable, WeatherWise automatically falls back to clean Unicode weather glyphs:
  - `01d` / `01n`: ☀️ / 🌙 (Clear)
  - `02d` / `02n`: 🌤️ / ☁️ (Few Clouds)
  - `03d` / `03n`: ⛅ (Scattered Clouds)
  - `04d` / `04n`: ☁️ (Broken / Overcast Clouds)
  - `09d` / `09n`: 🌧️ (Shower Rain)
  - `10d` / `10n`: 🌦️ (Rain)
  - `11d` / `11n`: ⛈️ (Thunderstorm)
  - `13d` / `13n`: ❄️ (Snow)
  - `50d` / `50n`: 🌫️ (Mist / Fog)
