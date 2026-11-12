"""
Weather Cards and Visual Components for WeatherWise Desktop GUI.
Provides modular card frames for current weather metrics,
hourly intervals, and 5-day forecast displays.
"""

import io
import tkinter as tk
from tkinter import ttk
import urllib.request
from typing import Any, Callable, Dict, Optional

from utils.config import THEME, OPENWEATHER_ICON_URL
from utils.temperature import format_temperature

# Pillow for icon loading and resizing
try:
    from PIL import Image, ImageTk
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# Fallback Unicode weather glyphs if image cannot be loaded
ICON_GLYPHS = {
    "01d": "☀️",
    "01n": "🌙",
    "02d": "🌤️",
    "02n": "☁️",
    "03d": "⛅",
    "03n": "⛅",
    "04d": "☁️",
    "04n": "☁️",
    "09d": "🌧️",
    "09n": "🌧️",
    "10d": "🌦️",
    "10n": "🌧️",
    "11d": "⛈️",
    "11n": "⛈️",
    "13d": "❄️",
    "13n": "❄️",
    "50d": "🌫️",
    "50n": "🌫️",
}

class IconCache:
    """In-memory cache for downloaded weather icon PhotoImages."""
    _cache: Dict[str, Any] = {}

    @classmethod
    def get_icon(cls, icon_code: str, size: int = 64) -> Optional[Any]:
        if not HAS_PIL:
            return None
        key = f"{icon_code}_{size}"
        if key in cls._cache:
            return cls._cache[key]

        url = f"{OPENWEATHER_ICON_URL}/{icon_code}@2x.png"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "WeatherWise/1.0"})
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = resp.read()
                image = Image.open(io.BytesIO(data))
                image = image.resize((size, size), Image.Resampling.LANCZOS)
                photo = ImageTk.PhotoImage(image)
                cls._cache[key] = photo
                return photo
        except Exception:
            return None

    @classmethod
    def get_glyph(cls, icon_code: str) -> str:
        return ICON_GLYPHS.get(icon_code, "🌤️")


class HeroWeatherCard(tk.Frame):
    """Main current weather hero card."""

    def __init__(self, parent, **kwargs):
        super().__init__(
            parent,
            bg=THEME["bg_card"],
            highlightbackground=THEME["border"],
            highlightthickness=1,
            padx=20,
            pady=16,
            **kwargs
        )
        self._build_ui()

    def _build_ui(self):
        # Header: City & Country + Local Time
        header_frame = tk.Frame(self, bg=THEME["bg_card"])
        header_frame.pack(fill="x", expand=True)

        self.lbl_location = tk.Label(
            header_frame,
            text="Search a city to begin",
            font=("Helvetica", 22, "bold"),
            fg=THEME["text_primary"],
            bg=THEME["bg_card"],
            anchor="w"
        )
        self.lbl_location.pack(side="left")

        self.lbl_source = tk.Label(
            header_frame,
            text="",
            font=("Helvetica", 9),
            fg=THEME["accent_blue"],
            bg=THEME["bg_card"]
        )
        self.lbl_source.pack(side="right")

        # Main Body: Icon + Temperature + Condition
        body_frame = tk.Frame(self, bg=THEME["bg_card"])
        body_frame.pack(fill="x", expand=True, pady=(12, 8))

        # Icon Label
        self.lbl_icon = tk.Label(
            body_frame,
            text="🌤️",
            font=("Helvetica", 36),
            fg=THEME["accent_cyan"],
            bg=THEME["bg_card"]
        )
        self.lbl_icon.pack(side="left", padx=(0, 16))

        # Temperature Column
        temp_col = tk.Frame(body_frame, bg=THEME["bg_card"])
        temp_col.pack(side="left", fill="y")

        self.lbl_temp = tk.Label(
            temp_col,
            text="--°",
            font=("Helvetica", 44, "bold"),
            fg=THEME["text_primary"],
            bg=THEME["bg_card"]
        )
        self.lbl_temp.pack(anchor="w")

        self.lbl_feels = tk.Label(
            temp_col,
            text="Feels like: --°",
            font=("Helvetica", 11),
            fg=THEME["text_secondary"],
            bg=THEME["bg_card"]
        )
        self.lbl_feels.pack(anchor="w")

        # Condition & High/Low Column
        cond_col = tk.Frame(body_frame, bg=THEME["bg_card"])
        cond_col.pack(side="right", anchor="e")

        self.lbl_condition = tk.Label(
            cond_col,
            text="Clear",
            font=("Helvetica", 16, "bold"),
            fg=THEME["accent_blue"],
            bg=THEME["bg_card"],
            anchor="e"
        )
        self.lbl_condition.pack(anchor="e")

        self.lbl_high_low = tk.Label(
            cond_col,
            text="H: --°  L: --°",
            font=("Helvetica", 11),
            fg=THEME["text_secondary"],
            bg=THEME["bg_card"],
            anchor="e"
        )
        self.lbl_high_low.pack(anchor="e", pady=(4, 0))

    def update_data(self, data: Dict[str, Any], unit: str = "C"):
        city_display = f"{data.get('city', 'Unknown')}"
        if data.get("country"):
            city_display += f", {data['country']}"
        self.lbl_location.config(text=city_display)
        self.lbl_source.config(text=f"Live via {data.get('source', 'OpenWeatherMap')}")

        temp_c = data.get("temp_c", 0.0)
        feels_c = data.get("feels_like_c", 0.0)
        min_c = data.get("temp_min_c", temp_c)
        max_c = data.get("temp_max_c", temp_c)

        self.lbl_temp.config(text=format_temperature(temp_c, unit))
        self.lbl_feels.config(text=f"Feels like {format_temperature(feels_c, unit)}")
        self.lbl_high_low.config(
            text=f"H: {format_temperature(max_c, unit)}  L: {format_temperature(min_c, unit)}"
        )
        self.lbl_condition.config(text=data.get("description", data.get("condition", "Clear")))

        # Update Icon
        icon_code = data.get("icon_code", "01d")
        photo = IconCache.get_icon(icon_code, size=72)
        if photo:
            self.lbl_icon.config(image=photo, text="")
            self.lbl_icon.image = photo  # keep reference
        else:
            self.lbl_icon.config(text=IconCache.get_glyph(icon_code), image="")


class MetricCard(tk.Frame):
    """Small metric card for humidity, pressure, wind, sunrise, sunset."""

    def __init__(self, parent, title: str, icon_symbol: str, **kwargs):
        super().__init__(
            parent,
            bg=THEME["bg_card"],
            highlightbackground=THEME["border"],
            highlightthickness=1,
            padx=14,
            pady=12,
            **kwargs
        )
        self.title = title
        self.icon_symbol = icon_symbol
        self._build_ui()

    def _build_ui(self):
        top_row = tk.Frame(self, bg=THEME["bg_card"])
        top_row.pack(fill="x")

        lbl_icon = tk.Label(
            top_row,
            text=self.icon_symbol,
            font=("Helvetica", 12),
            fg=THEME["accent_cyan"],
            bg=THEME["bg_card"]
        )
        lbl_icon.pack(side="left", padx=(0, 6))

        lbl_title = tk.Label(
            top_row,
            text=self.title.upper(),
            font=("Helvetica", 9, "bold"),
            fg=THEME["text_secondary"],
            bg=THEME["bg_card"]
        )
        lbl_title.pack(side="left")

        self.lbl_value = tk.Label(
            self,
            text="--",
            font=("Helvetica", 15, "bold"),
            fg=THEME["text_primary"],
            bg=THEME["bg_card"],
            anchor="w"
        )
        self.lbl_value.pack(fill="x", pady=(8, 2))

        self.lbl_sub = tk.Label(
            self,
            text="",
            font=("Helvetica", 9),
            fg=THEME["text_muted"],
            bg=THEME["bg_card"],
            anchor="w"
        )
        self.lbl_sub.pack(fill="x")

    def set_value(self, value: str, subtext: str = ""):
        self.lbl_value.config(text=value)
        self.lbl_sub.config(text=subtext)


class HourlyCard(tk.Frame):
    """Card displaying a single interval in the 6-hour forecast."""

    def __init__(self, parent, **kwargs):
        super().__init__(
            parent,
            bg=THEME["bg_card"],
            highlightbackground=THEME["border"],
            highlightthickness=1,
            padx=12,
            pady=10,
            width=90,
            **kwargs
        )
        self.pack_propagate(False)
        self._build_ui()

    def _build_ui(self):
        self.lbl_time = tk.Label(
            self,
            text="Now",
            font=("Helvetica", 10, "bold"),
            fg=THEME["text_secondary"],
            bg=THEME["bg_card"]
        )
        self.lbl_time.pack(pady=(0, 4))

        self.lbl_icon = tk.Label(
            self,
            text="🌤️",
            font=("Helvetica", 20),
            fg=THEME["accent_cyan"],
            bg=THEME["bg_card"]
        )
        self.lbl_icon.pack(pady=2)

        self.lbl_temp = tk.Label(
            self,
            text="--°",
            font=("Helvetica", 13, "bold"),
            fg=THEME["text_primary"],
            bg=THEME["bg_card"]
        )
        self.lbl_temp.pack(pady=(4, 2))

        self.lbl_pop = tk.Label(
            self,
            text="",
            font=("Helvetica", 9),
            fg=THEME["accent_blue"],
            bg=THEME["bg_card"]
        )
        self.lbl_pop.pack()

    def update_data(self, item: Dict[str, Any], unit: str = "C"):
        self.lbl_time.config(text=item.get("time", "--"))
        temp_c = item.get("temp_c", 0.0)
        self.lbl_temp.config(text=format_temperature(temp_c, unit))

        pop = item.get("pop", 0)
        self.lbl_pop.config(text=f"💧 {pop}%" if pop > 0 else "")

        icon_code = item.get("icon_code", "01d")
        photo = IconCache.get_icon(icon_code, size=36)
        if photo:
            self.lbl_icon.config(image=photo, text="")
            self.lbl_icon.image = photo
        else:
            self.lbl_icon.config(text=IconCache.get_glyph(icon_code), image="")


class DailyCard(tk.Frame):
    """Card displaying a single day in the 5-day forecast."""

    def __init__(self, parent, **kwargs):
        super().__init__(
            parent,
            bg=THEME["bg_card"],
            highlightbackground=THEME["border"],
            highlightthickness=1,
            padx=14,
            pady=10,
            **kwargs
        )
        self._build_ui()

    def _build_ui(self):
        # Day name and date
        col1 = tk.Frame(self, bg=THEME["bg_card"], width=110)
        col1.pack(side="left", fill="y")
        col1.pack_propagate(False)

        self.lbl_day = tk.Label(
            col1,
            text="Monday",
            font=("Helvetica", 11, "bold"),
            fg=THEME["text_primary"],
            bg=THEME["bg_card"],
            anchor="w"
        )
        self.lbl_day.pack(fill="x")

        self.lbl_date = tk.Label(
            col1,
            text="Jan 01",
            font=("Helvetica", 9),
            fg=THEME["text_muted"],
            bg=THEME["bg_card"],
            anchor="w"
        )
        self.lbl_date.pack(fill="x")

        # Condition Icon and text
        col2 = tk.Frame(self, bg=THEME["bg_card"])
        col2.pack(side="left", fill="both", expand=True, padx=10)

        self.lbl_icon = tk.Label(
            col2,
            text="🌤️",
            font=("Helvetica", 18),
            fg=THEME["accent_cyan"],
            bg=THEME["bg_card"]
        )
        self.lbl_icon.pack(side="left", padx=(0, 8))

        self.lbl_cond = tk.Label(
            col2,
            text="Partly Cloudy",
            font=("Helvetica", 10),
            fg=THEME["text_secondary"],
            bg=THEME["bg_card"],
            anchor="w"
        )
        self.lbl_cond.pack(side="left")

        # Min and Max Temperature
        col3 = tk.Frame(self, bg=THEME["bg_card"])
        col3.pack(side="right")

        self.lbl_temps = tk.Label(
            col3,
            text="H: --°  L: --°",
            font=("Helvetica", 11, "bold"),
            fg=THEME["text_primary"],
            bg=THEME["bg_card"],
            anchor="e"
        )
        self.lbl_temps.pack(anchor="e")

    def update_data(self, item: Dict[str, Any], unit: str = "C"):
        self.lbl_day.config(text=item.get("day_name", "--"))
        self.lbl_date.config(text=item.get("short_date", "--"))
        self.lbl_cond.config(text=item.get("description", item.get("condition", "--")))

        min_c = item.get("temp_min_c", 0.0)
        max_c = item.get("temp_max_c", 0.0)
        self.lbl_temps.config(
            text=f"H: {format_temperature(max_c, unit)}   L: {format_temperature(min_c, unit)}"
        )

        icon_code = item.get("icon_code", "01d")
        photo = IconCache.get_icon(icon_code, size=32)
        if photo:
            self.lbl_icon.config(image=photo, text="")
            self.lbl_icon.image = photo
        else:
            self.lbl_icon.config(text=IconCache.get_glyph(icon_code), image="")
