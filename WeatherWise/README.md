# WeatherWise – Real-Time Weather Dashboard

![WeatherWise Dashboard](https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?w=1200&auto=format&fit=crop&q=80)

WeatherWise is a modern desktop weather dashboard application built with Python, Tkinter/CustomTkinter, Pillow, and the OpenWeatherMap API. Designed with a dark interface accented by glowing cyan and blue highlights, WeatherWise provides real-time meteorological conditions, an interactive 6-hour forecast, an aggregated 5-day daily forecast, instant Celsius/Fahrenheit unit toggling, IP-based location detection, and search history persistence.

---

## 🌟 Key Features

### 1. City & ZIP Code Search
- Enter any global city name, state, country, or US/international ZIP/postal code.
- Input validation prevents empty queries and provides actionable feedback.
- Non-blocking asynchronous query execution prevents GUI freezing.

### 2. Comprehensive Current Weather Display
- **Location**: City and country designation with coordinate tracking.
- **Temperature**: Real-time current temperature in Celsius (°C) and Fahrenheit (°F).
- **Perceived Temperature**: "Feels-like" calculation reflecting humidity and wind chill.
- **Atmospheric Metrics**:
  - Relative Humidity (%) with comfort index indicators.
  - Atmospheric Pressure in both hectopascals (hPa) and inches of mercury (inHg).
  - Wind Speed (m/s and mph) with directional degree compass bearings.
  - Sunrise and sunset times formatted in local AM/PM clock time.

### 3. High-Resolution Dynamic Weather Icons
- Live streaming of official OpenWeatherMap icon assets (`@2x.png`).
- Pillow (PIL) dynamically resizes and optimizes image rendering.
- Resilient fallback to Unicode weather glyphs during offline or low-bandwidth states.

### 4. 6-Hour Hourly Forecast
- Next six intervals visualized as individual forecast cards.
- Displays time, meteorological condition, weather icon, temperature, and precipitation probability (PoP %).

### 5. 5-Day Aggregated Daily Forecast
- 3-hour forecast entries grouped by calendar day.
- Computes accurate daily minimum (L) and maximum (H) temperatures.
- Prevailing weather icon and descriptive summaries for each calendar day.

### 6. Instant Temperature Unit Toggle
- Switch between Celsius (°C) and Fahrenheit (°F) with one click.
- Instant, seamless re-render across all current, hourly, and 5-day forecast displays.

### 7. IP-Based Geolocation Detection
- Automatic IP location resolution using `ipinfo.io`.
- Explicit permission modal ensures user privacy is respected before detecting location.
- Manual city search remains accessible at all times.

### 8. Recent Searches History
- Tracks recent searches with persistent storage in `recent_searches.json`.
- 1-click interactive pill buttons for instant weather reloads.

### 9. Robust Error Handling & Threading
- Handles invalid API keys (HTTP 401), missing cities (HTTP 404), and rate limits (HTTP 429).
- Network disconnections and request timeouts display non-intrusive in-app banner alerts.
- Python `threading.Thread` ensures the user interface remains responsive and never hangs during network activity.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Language** | Python 3.10+ |
| **GUI Framework** | Tkinter / CustomTkinter / ttk |
| **Image Processing** | Pillow (PIL) |
| **HTTP & Networking** | Requests / `urllib.request` standard library |
| **Data Format** | JSON |
| **Concurrency** | Python `threading` |
| **Configuration** | `python-dotenv` & OS Environment Variables |
| **Weather APIs** | OpenWeatherMap 2.5 API (with keyless Open-Meteo fallback) |
| **Geolocation** | ipinfo.io JSON API |

---

## 📁 Project Architecture

```
WeatherWise/
├── main.py                     # Application entry point & window manager
├── requirements.txt            # Python package dependencies
├── README.md                   # Complete documentation
├── .env.example                # Environment variable configuration template
├── .gitignore                  # Git exclusions for secrets and cache
├── services/
│   ├── weather_api.py          # OpenWeatherMap current weather service
│   ├── forecast_service.py     # 6-hour hourly and 5-day daily forecast aggregator
│   └── location_service.py     # IP geolocation service with permission gate
├── gui/
│   ├── dashboard.py            # Primary dashboard window, layout, and async threads
│   └── weather_cards.py        # Modular UI components (Hero, Metrics, Hourly, Daily)
├── utils/
│   ├── config.py               # Constants, theme palette, and configuration loader
│   └── temperature.py          # Pure mathematical conversion functions
├── tests/
│   └── test_weather.py         # Unit test suite for math, parsing, and services
└── assets/
    └── icons/                  # Icon mapping and documentation
```

---

## 🔑 API Setup Instructions

WeatherWise uses the **OpenWeatherMap API**. To obtain your free API key:

1. Visit [OpenWeatherMap Sign Up](https://home.openweathermap.org/users/sign_up) and create a free account.
2. Navigate to the **API keys** tab in your account dashboard.
3. Generate a new API key (Free tier includes 1,000 calls/day and 60 calls/minute).
4. *Note*: Newly created OpenWeatherMap API keys typically require 10 to 120 minutes to become active across their global edge network.
5. *Built-in Fallback*: If no API key is supplied, WeatherWise operates using open geocoding and real-time data so you can test immediately without waiting for key activation!

---

## ⚙️ Environment Configuration

1. In the `WeatherWise/` directory, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and insert your OpenWeatherMap API key:
   ```env
   OPENWEATHERMAP_API_KEY="your_actual_api_key_here"
   DEFAULT_UNIT="C"
   DEFAULT_CITY="London"
   ```
3. You can also configure or change the API key directly inside the running desktop GUI by clicking the **⚙️ API Key** button in the header.

---

## 📦 Installation Instructions

### Prerequisites
- Python 3.9, 3.10, 3.11, or 3.12 installed.
- (Linux / Ubuntu users): Ensure Tkinter is installed on your operating system:
  ```bash
  sudo apt-get update
  sudo apt-get install python3-tk
  ```

### Steps
1. Clone or navigate to the repository:
   ```bash
   cd WeatherWise
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate    # On Windows: venv\Scripts\activate
   ```
3. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## 🚀 How to Run

### Run the Desktop GUI
```bash
python3 main.py
```

### Launch with a Specific City
```bash
python3 main.py --city "San Francisco"
```

### Run in Headless CLI Mode
```bash
python3 main.py --cli --city "Tokyo"
```

### Run Unit Tests
```bash
python3 -m unittest discover -s tests
```

---

## 🖥️ User Interface Overview

```
+------------------------------------------------------------------------------------+
| ⚡ WeatherWise  Real-Time Weather Dashboard          [Units: °C]   [⚙️ API Key]    |
+------------------------------------------------------------------------------------+
| [ Enter city name or ZIP code...                     ] [ Get Weather ] [📍 My Loc] |
| Recent: [ London ] [ Tokyo ] [ Paris ] [ New York ]                                |
+------------------------------------------------------------------------------------+
| +--------------------------------------------------------------------------------+ |
| | Tokyo, JP                                             Live via OpenWeatherMap  | |
| |  [☀️]  18°C  Feels like 17°C                     Clear Sky                     | |
| |        H: 21°C  L: 14°C                                                        | |
| +--------------------------------------------------------------------------------+ |
| [ 💧 Humidity: 65% ] [ ⏱️ Pressure: 1015 hPa ] [ 💨 Wind: 4.2 m/s ] [ 🌅 Sun: 6 AM ]|
|                                                                                    |
| 6-Hour Forecast                                                                    |
| [ 12 PM | 18° ] [ 3 PM | 20° ] [ 6 PM | 17° ] [ 9 PM | 15° ] [ 12 AM | 14° ] ...   |
|                                                                                    |
| 5-Day Forecast                                                                     |
| Friday    Nov 13   ☀️ Clear Sky          H: 21°C   L: 14°C                          |
| Saturday  Nov 14   ⛅ Scattered Clouds   H: 20°C   L: 13°C                          |
| Sunday    Nov 15   🌧️ Light Rain         H: 17°C   L: 12°C                          |
| Monday    Nov 16   🌤️ Mainly Clear      H: 19°C   L: 13°C                          |
| Tuesday   Nov 17   ⛅ Partly Cloudy      H: 18°C   L: 12°C                          |
+------------------------------------------------------------------------------------+
```

---

## 🔒 Privacy Considerations

- **Explicit Location Permission**: WeatherWise never queries your IP address or detects location silently. The application presents an explicit system confirmation dialog before sending any request to `ipinfo.io`.
- **Key Safety**: API keys are stored solely in local `.env` files or session memory. Keys are never transmitted to third parties other than direct calls to `api.openweathermap.org`.
- **Search History**: Search history is stored in a simple local file (`recent_searches.json`) on your device and can be cleared at any time.

---

## 🔮 Future Scope & Roadmap

- **Interactive Weather Radar & Satellite Maps**: Integration with interactive tile maps using Folium or Leaflet.
- **Severe Weather Alerts & Notifications**: Native desktop OS notifications for severe storm warnings, blizzards, or heat advisories.
- **Air Quality Index (AQI)**: Integration of PM2.5, PM10, and ozone monitoring via OpenWeatherMap Air Pollution API.
- **Historical Weather Comparisons**: Comparing current conditions against multi-year historical averages.
- **Exporting Weather Data**: Exporting 5-day forecasts to CSV or JSON formats.
