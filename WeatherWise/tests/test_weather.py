"""
Comprehensive Test Suite for WeatherWise.
Tests:
- Temperature conversions and meteorological units
- City input validation and error raising
- OpenWeatherMap payload parsing
- Hourly 6-interval extraction
- 5-Day forecast grouping and min/max aggregation
- Location detection permission enforcement
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.forecast_service import ForecastService
from services.location_service import LocationService, LocationServiceError
from services.weather_api import WeatherAPIError, WeatherAPIService
from utils.temperature import (
    celsius_to_fahrenheit,
    fahrenheit_to_celsius,
    format_temperature,
    kelvin_to_celsius,
    kelvin_to_fahrenheit,
)


class TestTemperatureConversions(unittest.TestCase):
    """Test pure temperature and meteorological conversion functions."""

    def test_celsius_to_fahrenheit(self):
        self.assertEqual(celsius_to_fahrenheit(0), 32.0)
        self.assertEqual(celsius_to_fahrenheit(100), 212.0)
        self.assertEqual(celsius_to_fahrenheit(20), 68.0)
        self.assertEqual(celsius_to_fahrenheit(-40), -40.0)

    def test_fahrenheit_to_celsius(self):
        self.assertEqual(fahrenheit_to_celsius(32), 0.0)
        self.assertEqual(fahrenheit_to_celsius(212), 100.0)
        self.assertEqual(fahrenheit_to_celsius(68), 20.0)
        self.assertEqual(fahrenheit_to_celsius(-40), -40.0)

    def test_kelvin_conversions(self):
        self.assertEqual(kelvin_to_celsius(273.15), 0.0)
        self.assertEqual(kelvin_to_celsius(300), 26.9)
        self.assertEqual(kelvin_to_fahrenheit(273.15), 32.0)

    def test_format_temperature(self):
        self.assertEqual(format_temperature(25, "C"), "25°C")
        self.assertEqual(format_temperature(25, "F"), "77°F")
        self.assertEqual(format_temperature(0, "F"), "32°F")


class TestWeatherAPIService(unittest.TestCase):
    """Test WeatherAPIService parsing and error validation."""

    def setUp(self):
        self.service = WeatherAPIService(api_key="mock_key")

    def test_empty_query_raises_error(self):
        with self.assertRaises(WeatherAPIError) as ctx:
            self.service.get_current_weather("   ")
        self.assertIn("cannot be empty", str(ctx.exception))

    def test_parse_owm_current_payload(self):
        mock_payload = {
            "name": "Paris",
            "sys": {"country": "FR", "sunrise": 1700000000, "sunset": 1700030000},
            "coord": {"lat": 48.8566, "lon": 2.3522},
            "main": {
                "temp": 18.4,
                "feels_like": 17.8,
                "temp_min": 15.0,
                "temp_max": 20.0,
                "humidity": 65,
                "pressure": 1015,
            },
            "weather": [
                {
                    "main": "Rain",
                    "description": "light rain",
                    "icon": "10d",
                }
            ],
            "wind": {"speed": 4.5, "deg": 210},
            "dt": 1700010000,
        }

        parsed = self.service._parse_owm_current(mock_payload)
        self.assertEqual(parsed["city"], "Paris")
        self.assertEqual(parsed["country"], "FR")
        self.assertEqual(parsed["temp_c"], 18.4)
        self.assertEqual(parsed["temp_f"], 65.1)
        self.assertEqual(parsed["feels_like_c"], 17.8)
        self.assertEqual(parsed["humidity"], 65)
        self.assertEqual(parsed["pressure"], 1015)
        self.assertEqual(parsed["condition"], "Rain")
        self.assertEqual(parsed["icon_code"], "10d")
        self.assertTrue(parsed["icon_url"].endswith("10d@2x.png"))


class TestForecastService(unittest.TestCase):
    """Test hourly intervals extraction and 5-day grouping."""

    def setUp(self):
        self.service = ForecastService(api_key="mock_key")

    def test_empty_forecast_query_raises_error(self):
        with self.assertRaises(WeatherAPIError):
            self.service.get_forecast("")

    def test_extract_next_6_intervals(self):
        mock_entries = [
            {
                "dt": 1700000000 + (i * 10800),
                "main": {"temp": 12.0 + i, "humidity": 70},
                "weather": [{"main": "Clouds", "description": "scattered clouds", "icon": "03d"}],
                "pop": 0.2,
            }
            for i in range(10)
        ]

        extracted = self.service.extract_next_6_intervals(mock_entries)
        self.assertEqual(len(extracted), 6)
        self.assertEqual(extracted[0]["temp_c"], 12.0)
        self.assertEqual(extracted[5]["temp_c"], 17.0)
        self.assertEqual(extracted[0]["pop"], 20)

    def test_group_by_calendar_day_computes_min_max(self):
        base_dt = 1700006400  # 2023-11-15 00:00:00 UTC
        mock_entries = [
            # Day 1: 00:00, 12:00
            {
                "dt": base_dt,
                "main": {"temp": 10.0, "temp_min": 8.0, "temp_max": 12.0, "humidity": 80},
                "weather": [{"main": "Clouds", "description": "few clouds", "icon": "02n"}],
            },
            {
                "dt": base_dt + 43200,  # 12:00
                "main": {"temp": 18.0, "temp_min": 6.0, "temp_max": 22.0, "humidity": 50},
                "weather": [{"main": "Clear", "description": "clear sky", "icon": "01d"}],
            },
            # Day 2
            {
                "dt": base_dt + 86400,
                "main": {"temp": 15.0, "temp_min": 11.0, "temp_max": 16.0, "humidity": 75},
                "weather": [{"main": "Rain", "description": "light rain", "icon": "10d"}],
            },
        ]

        daily = self.service.group_by_calendar_day(mock_entries)
        self.assertEqual(len(daily), 2)
        # Day 1 min should be 6.0, max 22.0
        self.assertEqual(daily[0]["temp_min_c"], 6.0)
        self.assertEqual(daily[0]["temp_max_c"], 22.0)
        self.assertEqual(daily[0]["condition"], "Clear")


class TestLocationService(unittest.TestCase):
    """Test location service permission enforcement."""

    def setUp(self):
        self.service = LocationService()

    def test_unpermitted_location_detection_raises_error(self):
        with self.assertRaises(LocationServiceError) as ctx:
            self.service.detect_location(user_permitted=False)
        self.assertIn("Permission not granted", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
