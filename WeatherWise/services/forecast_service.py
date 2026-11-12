"""
Forecast Service for WeatherWise.
Handles retrieval and transformation of 6-hour hourly forecasts
and 5-day daily forecasts from OpenWeatherMap API and fallback services.
"""

import datetime
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

from utils.config import (
    OPEN_METEO_FORECAST_URL,
    OPEN_METEO_GEOCODE_URL,
    OPENWEATHER_BASE_URL,
    OPENWEATHER_ICON_URL,
    REQUEST_TIMEOUT,
    get_api_key,
)
from services.weather_api import WeatherAPIError, WeatherAPIService

logger = logging.getLogger(__name__)

class ForecastService:
    """Service to process 6-hour hourly and 5-day daily forecasts."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or get_api_key()

    def set_key(self, key: str) -> None:
        self.api_key = key.strip()

    def get_forecast(self, query: str) -> Dict[str, Any]:
        """
        Fetch forecast for a city name or ZIP code.
        Returns:
        {
            "hourly": List[Dict] (Next 6 forecast intervals with time, temp, condition, icon),
            "daily": List[Dict] (Next 5 calendar days with min/max temp, condition, icon)
        }
        """
        query = query.strip()
        if not query:
            raise WeatherAPIError("City name or ZIP code cannot be empty.")

        key = self.api_key or get_api_key()
        if key:
            return self._fetch_from_openweathermap(query, key)
        else:
            return self._fetch_from_open_meteo(query)

    def _fetch_from_openweathermap(self, query: str, key: str) -> Dict[str, Any]:
        """Query OpenWeatherMap 5-day/3-hour forecast endpoint."""
        encoded_query = urllib.parse.quote(query)
        url = f"{OPENWEATHER_BASE_URL}/forecast?q={encoded_query}&appid={key}&units=metric"

        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "WeatherWise-Desktop/1.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            entries = data.get("list", [])
            hourly = self.extract_next_6_intervals(entries)
            daily = self.group_by_calendar_day(entries)

            return {
                "hourly": hourly,
                "daily": daily,
                "city": data.get("city", {}).get("name", query),
                "country": data.get("city", {}).get("country", ""),
            }

        except urllib.error.HTTPError as e:
            if e.code == 401:
                raise WeatherAPIError("Invalid OpenWeatherMap API key.", status_code=401)
            elif e.code == 404:
                raise WeatherAPIError(f"Forecast for '{query}' not found.", status_code=404)
            elif e.code == 429:
                raise WeatherAPIError("API rate limit exceeded.", status_code=429)
            else:
                raise WeatherAPIError(f"Forecast error: {e.reason}", status_code=e.code)
        except Exception as e:
            raise WeatherAPIError(f"Failed to fetch forecast: {str(e)}")

    def extract_next_6_intervals(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract the next 6 forecast entries for the hourly panel.
        Calculates time label, temperature in Celsius and Fahrenheit,
        weather condition and icon URL.
        """
        hourly_cards: List[Dict[str, Any]] = []

        for item in entries[:6]:
            dt_ts = item.get("dt", 0)
            main = item.get("main", {})
            weather_list = item.get("weather", [{}])
            weather = weather_list[0] if weather_list else {}

            temp_c = float(main.get("temp", 0.0))
            temp_f = round((temp_c * 9.0 / 5.0) + 32.0, 1)

            # Format hour display (e.g. "3 PM" or "15:00")
            dt_obj = datetime.datetime.fromtimestamp(dt_ts)
            time_label = dt_obj.strftime("%I %p").lstrip("0")

            icon_code = weather.get("icon", "01d")
            pop = round(float(item.get("pop", 0.0)) * 100)  # Precipitation probability %

            hourly_cards.append({
                "dt": dt_ts,
                "time": time_label,
                "date_str": dt_obj.strftime("%a %b %d"),
                "temp_c": round(temp_c, 1),
                "temp_f": temp_f,
                "condition": weather.get("main", "Clear"),
                "description": weather.get("description", "").capitalize(),
                "icon_code": icon_code,
                "icon_url": f"{OPENWEATHER_ICON_URL}/{icon_code}.png",
                "pop": pop,
                "humidity": main.get("humidity", 0),
            })

        return hourly_cards

    def group_by_calendar_day(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Group 3-hour forecast entries by local calendar date to calculate
        daily minimum and maximum temperatures, prevailing condition, and icon.
        """
        grouped: Dict[str, Dict[str, Any]] = {}

        for item in entries:
            dt_ts = item.get("dt", 0)
            dt_obj = datetime.datetime.fromtimestamp(dt_ts)
            date_key = dt_obj.strftime("%Y-%m-%d")
            day_name = dt_obj.strftime("%A")

            main = item.get("main", {})
            temp_min = float(main.get("temp_min", main.get("temp", 0)))
            temp_max = float(main.get("temp_max", main.get("temp", 0)))
            weather = item.get("weather", [{}])[0] if item.get("weather") else {}

            if date_key not in grouped:
                grouped[date_key] = {
                    "date": date_key,
                    "day_name": day_name,
                    "short_date": dt_obj.strftime("%b %d"),
                    "temp_min_c": temp_min,
                    "temp_max_c": temp_max,
                    "condition": weather.get("main", "Clear"),
                    "description": weather.get("description", "").capitalize(),
                    "icon_code": weather.get("icon", "01d"),
                    "humidity_sum": main.get("humidity", 0),
                    "count": 1,
                }
            else:
                g = grouped[date_key]
                g["temp_min_c"] = min(g["temp_min_c"], temp_min)
                g["temp_max_c"] = max(g["temp_max_c"], temp_max)
                g["humidity_sum"] += main.get("humidity", 0)
                g["count"] += 1

                # Prioritize mid-day forecast entries (around 12:00) for daily icon/condition
                hour = dt_obj.hour
                if 11 <= hour <= 14:
                    g["condition"] = weather.get("main", g["condition"])
                    g["description"] = weather.get("description", g["description"]).capitalize()
                    g["icon_code"] = weather.get("icon", g["icon_code"])

        # Format and round final daily summaries
        daily_cards: List[Dict[str, Any]] = []
        # Get next 5 days
        for key in sorted(grouped.keys())[:5]:
            item = grouped[key]
            min_c = round(item["temp_min_c"], 1)
            max_c = round(item["temp_max_c"], 1)
            min_f = round((min_c * 9.0 / 5.0) + 32.0, 1)
            max_f = round((max_c * 9.0 / 5.0) + 32.0, 1)

            icon_code = item["icon_code"]
            # Ensure day icon is used for daily overview
            if icon_code.endswith("n"):
                icon_code = icon_code[:-1] + "d"

            daily_cards.append({
                "date": item["date"],
                "day_name": item["day_name"],
                "short_date": item["short_date"],
                "temp_min_c": min_c,
                "temp_max_c": max_c,
                "temp_min_f": min_f,
                "temp_max_f": max_f,
                "condition": item["condition"],
                "description": item["description"],
                "icon_code": icon_code,
                "icon_url": f"{OPENWEATHER_ICON_URL}/{icon_code}@2x.png",
                "humidity": round(item["humidity_sum"] / item["count"]),
            })

        return daily_cards

    def _fetch_from_open_meteo(self, query: str) -> Dict[str, Any]:
        """Fetch forecast from Open-Meteo for live keyless testing."""
        # Geocode first
        geo_url = f"{OPEN_METEO_GEOCODE_URL}?name={urllib.parse.quote(query)}&count=1&language=en&format=json"
        req = urllib.request.Request(geo_url, headers={"User-Agent": "WeatherWise-Desktop/1.0"})
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            geo = json.loads(resp.read().decode("utf-8"))

        if not geo.get("results"):
            raise WeatherAPIError(f"Forecast location '{query}' not found.", status_code=404)

        place = geo["results"][0]
        lat, lon = place["latitude"], place["longitude"]
        city_name = place.get("name", query)
        country = place.get("country_code", "")

        forecast_url = (
            f"{OPEN_METEO_FORECAST_URL}?latitude={lat}&longitude={lon}"
            f"&hourly=temperature_2m,precipitation_probability,weather_code"
            f"&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto"
        )
        req = urllib.request.Request(forecast_url, headers={"User-Agent": "WeatherWise-Desktop/1.0"})
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))

        # Hourly next 6 hours
        hourly_data = data.get("hourly", {})
        times = hourly_data.get("time", [])
        temps = hourly_data.get("temperature_2m", [])
        pops = hourly_data.get("precipitation_probability", [])
        wcodes = hourly_data.get("weather_code", [])

        # Find current hour index
        now_iso = datetime.datetime.now().strftime("%Y-%m-%dT%H:00")
        start_idx = 0
        for i, t in enumerate(times):
            if t >= now_iso:
                start_idx = i
                break

        hourly_cards: List[Dict[str, Any]] = []
        for i in range(start_idx, min(start_idx + 6, len(times))):
            t_str = times[i]
            dt_obj = datetime.datetime.fromisoformat(t_str)
            temp_c = float(temps[i])
            temp_f = round((temp_c * 9.0 / 5.0) + 32.0, 1)
            code = int(wcodes[i]) if i < len(wcodes) else 0
            cond, desc, icon = WeatherAPIService._wmo_code_to_weather(code)
            pop = int(pops[i]) if i < len(pops) else 0

            hourly_cards.append({
                "dt": int(dt_obj.timestamp()),
                "time": dt_obj.strftime("%I %p").lstrip("0"),
                "date_str": dt_obj.strftime("%a %b %d"),
                "temp_c": round(temp_c, 1),
                "temp_f": temp_f,
                "condition": cond,
                "description": desc,
                "icon_code": icon,
                "icon_url": f"{OPENWEATHER_ICON_URL}/{icon}.png",
                "pop": pop,
                "humidity": 60,
            })

        # Daily next 5 days
        daily_data = data.get("daily", {})
        d_times = daily_data.get("time", [])
        d_maxs = daily_data.get("temperature_2m_max", [])
        d_mins = daily_data.get("temperature_2m_min", [])
        d_codes = daily_data.get("weather_code", [])

        daily_cards: List[Dict[str, Any]] = []
        for i in range(min(5, len(d_times))):
            dt_obj = datetime.datetime.fromisoformat(d_times[i])
            min_c = round(float(d_mins[i]), 1)
            max_c = round(float(d_maxs[i]), 1)
            cond, desc, icon = WeatherAPIService._wmo_code_to_weather(int(d_codes[i]))

            daily_cards.append({
                "date": d_times[i],
                "day_name": dt_obj.strftime("%A"),
                "short_date": dt_obj.strftime("%b %d"),
                "temp_min_c": min_c,
                "temp_max_c": max_c,
                "temp_min_f": round((min_c * 9.0 / 5.0) + 32.0, 1),
                "temp_max_f": round((max_c * 9.0 / 5.0) + 32.0, 1),
                "condition": cond,
                "description": desc,
                "icon_code": icon,
                "icon_url": f"{OPENWEATHER_ICON_URL}/{icon}@2x.png",
                "humidity": 60,
            })

        return {
            "hourly": hourly_cards,
            "daily": daily_cards,
            "city": city_name,
            "country": country,
        }
