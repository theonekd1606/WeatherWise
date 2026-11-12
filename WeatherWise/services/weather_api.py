"""
Weather API Service for WeatherWise.
Handles real-time current weather retrieval from OpenWeatherMap API,
with comprehensive error handling and network fallback.
"""

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Optional, Tuple

from utils.config import (
    DEFAULT_UNIT,
    OPEN_METEO_FORECAST_URL,
    OPEN_METEO_GEOCODE_URL,
    OPENWEATHER_BASE_URL,
    OPENWEATHER_ICON_URL,
    REQUEST_TIMEOUT,
    get_api_key,
)

logger = logging.getLogger(__name__)

class WeatherAPIError(Exception):
    """Custom exception class for weather API failures."""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code

class WeatherAPIService:
    """Service to fetch and parse current weather information."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_api_key()

    def set_key(self, key: str) -> None:
        self.api_key = key.strip()

    def get_current_weather(self, query: str) -> Dict[str, Any]:
        """
        Fetch current weather for a city name or ZIP/postal code.
        Returns normalized dictionary with all required fields:
        - city, country
        - temp_c, temp_f, feels_like_c, feels_like_f
        - humidity, pressure, wind_speed
        - condition, description, icon_code, icon_url
        - sunrise, sunset, dt
        """
        query = query.strip()
        if not query:
            raise WeatherAPIError("City name or ZIP code cannot be empty.")

        key = self.api_key or get_api_key()
        if key:
            return self._fetch_from_openweathermap(query, key)
        else:
            # When no key is supplied, use live real-time Open-Meteo geocoding & data
            return self._fetch_from_open_meteo(query)

    def _fetch_from_openweathermap(self, query: str, key: str) -> Dict[str, Any]:
        """Query official OpenWeatherMap API."""
        encoded_query = urllib.parse.quote(query)
        url = f"{OPENWEATHER_BASE_URL}/weather?q={encoded_query}&appid={key}&units=metric"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "WeatherWise-Desktop/1.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
                status = response.getcode()
                raw_data = response.read().decode("utf-8")
                data = json.loads(raw_data)
                return self._parse_owm_current(data)

        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise WeatherAPIError(
                    "Invalid or unactivated OpenWeatherMap API key. "
                    "New keys may take up to 2 hours to activate.",
                    status_code=401
                )
            elif e.code == 404:
                raise WeatherAPIError(
                    f"Location '{query}' was not found. Please check spelling or ZIP code.",
                    status_code=404
                )
            elif e.code == 429:
                raise WeatherAPIError(
                    "OpenWeatherMap API rate limit exceeded. Please wait a moment and try again.",
                    status_code=429
                )
            else:
                raise WeatherAPIError(f"Weather service returned error {e.code}: {e.reason}", status_code=e.code)

        except urllib.error.URLError as e:
            raise WeatherAPIError(f"Network connection failed: {e.reason}. Please check your internet connection.")
        except TimeoutError:
            raise WeatherAPIError("Request timed out while contacting OpenWeatherMap service.")
        except json.JSONDecodeError:
            raise WeatherAPIError("Received malformed or non-JSON response from weather server.")
        except Exception as e:
            raise WeatherAPIError(f"Unexpected error retrieving weather: {str(e)}")

    def _parse_owm_current(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize OpenWeatherMap current weather response."""
        main = data.get("main", {})
        sys = data.get("sys", {})
        weather_list = data.get("weather", [{}])
        weather_item = weather_list[0] if weather_list else {}
        wind = data.get("wind", {})

        temp_c = float(main.get("temp", 0.0))
        temp_f = round((temp_c * 9.0 / 5.0) + 32.0, 1)

        feels_c = float(main.get("feels_like", temp_c))
        feels_f = round((feels_c * 9.0 / 5.0) + 32.0, 1)

        icon_code = weather_item.get("icon", "01d")
        icon_url = f"{OPENWEATHER_ICON_URL}/{icon_code}@2x.png"

        return {
            "city": data.get("name", "Unknown"),
            "country": sys.get("country", ""),
            "coordinates": {
                "lat": data.get("coord", {}).get("lat", 0.0),
                "lon": data.get("coord", {}).get("lon", 0.0),
            },
            "temp_c": round(temp_c, 1),
            "temp_f": temp_f,
            "feels_like_c": round(feels_c, 1),
            "feels_like_f": feels_f,
            "temp_min_c": round(float(main.get("temp_min", temp_c)), 1),
            "temp_max_c": round(float(main.get("temp_max", temp_c)), 1),
            "humidity": int(main.get("humidity", 0)),
            "pressure": int(main.get("pressure", 1013)),
            "wind_speed": round(float(wind.get("speed", 0.0)), 1),  # m/s
            "wind_deg": int(wind.get("deg", 0)),
            "condition": weather_item.get("main", "Clear"),
            "description": weather_item.get("description", "clear sky").capitalize(),
            "icon_code": icon_code,
            "icon_url": icon_url,
            "sunrise": sys.get("sunrise", 0),
            "sunset": sys.get("sunset", 0),
            "timezone": data.get("timezone", 0),
            "dt": data.get("dt", 0),
            "source": "OpenWeatherMap",
        }

    def _fetch_from_open_meteo(self, query: str) -> Dict[str, Any]:
        """
        Live fallback using Open-Meteo real meteorological data when no API key is specified.
        Ensures the application works immediately with accurate real-world data.
        """
        # Geocode city
        geo_url = f"{OPEN_METEO_GEOCODE_URL}?name={urllib.parse.quote(query)}&count=1&language=en&format=json"
        try:
            req = urllib.request.Request(geo_url, headers={"User-Agent": "WeatherWise-Desktop/1.0"})
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                geo_data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            raise WeatherAPIError(f"Network error geocoding '{query}': {str(e)}")

        results = geo_data.get("results")
        if not results:
            raise WeatherAPIError(f"Location '{query}' not found. Please verify spelling.", status_code=404)

        place = results[0]
        lat, lon = place["latitude"], place["longitude"]
        city_name = place.get("name", query)
        country = place.get("country_code", "")

        forecast_url = (
            f"{OPEN_METEO_FORECAST_URL}?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code"
            f"&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min&timezone=auto"
        )
        try:
            req = urllib.request.Request(forecast_url, headers={"User-Agent": "WeatherWise-Desktop/1.0"})
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                weather_data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            raise WeatherAPIError(f"Network error fetching weather: {str(e)}")

        cur = weather_data.get("current", {})
        daily = weather_data.get("daily", {})

        temp_c = float(cur.get("temperature_2m", 20.0))
        feels_c = float(cur.get("apparent_temperature", temp_c))
        wcode = int(cur.get("weather_code", 0))

        condition, desc, icon_code = self._wmo_code_to_weather(wcode)

        # Parse sunrise/sunset strings
        sunrise_ts = 0
        sunset_ts = 0
        if daily.get("sunrise") and len(daily["sunrise"]) > 0:
            import datetime
            try:
                dt_sr = datetime.datetime.fromisoformat(daily["sunrise"][0])
                sunrise_ts = int(dt_sr.timestamp())
            except Exception:
                pass
        if daily.get("sunset") and len(daily["sunset"]) > 0:
            import datetime
            try:
                dt_ss = datetime.datetime.fromisoformat(daily["sunset"][0])
                sunset_ts = int(dt_ss.timestamp())
            except Exception:
                pass

        return {
            "city": city_name,
            "country": country,
            "coordinates": {"lat": lat, "lon": lon},
            "temp_c": round(temp_c, 1),
            "temp_f": round((temp_c * 9.0 / 5.0) + 32.0, 1),
            "feels_like_c": round(feels_c, 1),
            "feels_like_f": round((feels_c * 9.0 / 5.0) + 32.0, 1),
            "temp_min_c": round(float(daily.get("temperature_2m_min", [temp_c])[0]), 1),
            "temp_max_c": round(float(daily.get("temperature_2m_max", [temp_c])[0]), 1),
            "humidity": int(cur.get("relative_humidity_2m", 50)),
            "pressure": int(cur.get("surface_pressure", 1013)),
            "wind_speed": round(float(cur.get("wind_speed_10m", 0.0)) / 3.6, 1),  # convert km/h to m/s
            "wind_deg": int(cur.get("wind_direction_10m", 0)),
            "condition": condition,
            "description": desc,
            "icon_code": icon_code,
            "icon_url": f"{OPENWEATHER_ICON_URL}/{icon_code}@2x.png",
            "sunrise": sunrise_ts,
            "sunset": sunset_ts,
            "timezone": 0,
            "dt": int(datetime.datetime.now().timestamp()) if 'datetime' in locals() else 0,
            "source": "Open-Meteo (Keyless Mode)",
        }

    @staticmethod
    def _wmo_code_to_weather(code: int) -> Tuple[str, str, str]:
        """Convert WMO weather interpretation code to (Condition, Description, IconCode)."""
        mapping = {
            0: ("Clear", "Clear sky", "01d"),
            1: ("Mainly Clear", "Mainly clear", "02d"),
            2: ("Partly Cloudy", "Partly cloudy", "03d"),
            3: ("Overcast", "Overcast", "04d"),
            45: ("Fog", "Foggy", "50d"),
            48: ("Depositing Rime Fog", "Freezing fog", "50d"),
            51: ("Drizzle", "Light drizzle", "09d"),
            53: ("Drizzle", "Moderate drizzle", "09d"),
            55: ("Drizzle", "Dense drizzle", "09d"),
            61: ("Rain", "Slight rain", "10d"),
            63: ("Rain", "Moderate rain", "10d"),
            65: ("Rain", "Heavy rain", "10d"),
            71: ("Snow", "Slight snow fall", "13d"),
            73: ("Snow", "Moderate snow fall", "13d"),
            75: ("Snow", "Heavy snow fall", "13d"),
            80: ("Rain Showers", "Slight rain showers", "09d"),
            81: ("Rain Showers", "Moderate rain showers", "09d"),
            82: ("Violent Showers", "Violent rain showers", "09d"),
            95: ("Thunderstorm", "Thunderstorm", "11d"),
            96: ("Thunderstorm", "Thunderstorm with slight hail", "11d"),
            99: ("Thunderstorm", "Thunderstorm with heavy hail", "11d"),
        }
        return mapping.get(code, ("Clear", "Clear sky", "01d"))
