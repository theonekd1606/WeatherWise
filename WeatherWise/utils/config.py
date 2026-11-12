"""
Configuration and Environment Settings for WeatherWise Desktop Application.
"""

import os
from pathlib import Path

# Load environment variables from .env file if available
try:
    from dotenv import load_dotenv
    # Look for .env in current folder or parent folder
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass

# API Configuration
OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5"
OPENWEATHER_ICON_URL = "https://openweathermap.org/img/wn"
IPINFO_URL = "https://ipinfo.io/json"

# Fallback open geocoding and meteorological service for testing/live demo without key
OPEN_METEO_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Application Settings
DEFAULT_CITY = "London"
DEFAULT_UNIT = "C"  # 'C' or 'F'
REQUEST_TIMEOUT = 10  # seconds
RECENT_SEARCHES_MAX = 8
RECENT_SEARCHES_FILE = Path(__file__).resolve().parent.parent / "recent_searches.json"

# UI Theme Palette (Dark Premium)
THEME = {
    "bg_main": "#0B1120",       # Deep navy background
    "bg_card": "#1E293B",       # Slate 800 card surface
    "bg_card_hover": "#334155", # Slate 700 hover
    "accent_blue": "#38BDF8",   # Sky blue
    "accent_cyan": "#06B6D4",   # Cyan
    "accent_indigo": "#6366F1", # Indigo
    "text_primary": "#F8FAFC",  # Off-white
    "text_secondary": "#94A3B8",# Slate 400
    "text_muted": "#64748B",    # Slate 500
    "border": "#334155",        # Slate 700 border
    "danger": "#EF4444",        # Red
    "success": "#10B981",       # Emerald
    "warning": "#F59E0B",       # Amber
}

def get_api_key() -> str:
    """Retrieve OpenWeatherMap API key from environment variable."""
    return os.environ.get("OPENWEATHERMAP_API_KEY", "").strip()

def set_api_key(api_key: str) -> None:
    """Dynamically set or override the OpenWeatherMap API key."""
    os.environ["OPENWEATHERMAP_API_KEY"] = api_key.strip()
