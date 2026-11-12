import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // IP Location detection proxy via ipinfo.io
  app.get('/api/location/detect', async (req, res) => {
    try {
      // Get client IP or query ipinfo.io
      const response = await fetch('https://ipinfo.io/json');
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to query ipinfo.io' });
      }
      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Location lookup failed' });
    }
  });

  // Weather proxy route
  app.get('/api/weather/current', async (req, res) => {
    const query = String(req.query.q || '').trim();
    const apiKey = String(req.query.apiKey || process.env.OPENWEATHERMAP_API_KEY || '').trim();

    if (!query) {
      return res.status(400).json({ error: 'City name or ZIP code cannot be empty.' });
    }

    if (apiKey) {
      try {
        const owmUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric`;
        const resp = await fetch(owmUrl);
        const data = await resp.json();
        if (!resp.ok) {
          return res.status(resp.status).json({ error: data.message || 'OpenWeatherMap error', status: resp.status });
        }
        return res.json(data);
      } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Network error contacting weather service' });
      }
    }

    // Keyless fallback using Open-Meteo
    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
      const geoResp = await fetch(geoUrl);
      const geoData = await geoResp.json();
      if (!geoData.results || geoData.results.length === 0) {
        return res.status(404).json({ error: `Location '${query}' not found. Please verify spelling.`, status: 404 });
      }
      const place = geoData.results[0];
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const fcResp = await fetch(forecastUrl);
      const fcData = await fcResp.json();
      return res.json({ source: 'Open-Meteo', place, forecast: fcData });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to fetch weather data' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WeatherWise server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
