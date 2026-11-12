"""
Main Dashboard View for WeatherWise Desktop Application.
Implements threaded async data fetching, input validation, unit toggling,
recent searches history, error notification banners, and responsive layout.
"""

import datetime
import json
import logging
import os
from pathlib import Path
import threading
import tkinter as tk
from tkinter import messagebox, ttk
from typing import Any, Dict, List, Optional

from gui.weather_cards import (
    DailyCard,
    HeroWeatherCard,
    HourlyCard,
    MetricCard,
)
from services.forecast_service import ForecastService
from services.location_service import LocationService, LocationServiceError
from services.weather_api import WeatherAPIError, WeatherAPIService
from utils.config import (
    DEFAULT_CITY,
    DEFAULT_UNIT,
    RECENT_SEARCHES_FILE,
    RECENT_SEARCHES_MAX,
    THEME,
    get_api_key,
    set_api_key,
)
from utils.temperature import format_temperature, hpa_to_inhg, mps_to_mph

logger = logging.getLogger(__name__)


class WeatherDashboard(tk.Frame):
    """Primary application dashboard window frame."""

    def __init__(self, parent: tk.Tk, **kwargs):
        super().__init__(parent, bg=THEME["bg_main"], **kwargs)
        self.parent = parent
        self.unit: str = DEFAULT_UNIT  # 'C' or 'F'

        # Initialize API services
        self.weather_service = WeatherAPIService()
        self.forecast_service = ForecastService()
        self.location_service = LocationService()

        # Cached state
        self.current_data: Optional[Dict[str, Any]] = None
        self.forecast_data: Optional[Dict[str, Any]] = None
        self.recent_searches: List[str] = self._load_recent_searches()
        self.is_loading: bool = False

        self._build_layout()

        # Load default city on launch in background thread
        default_target = self.recent_searches[0] if self.recent_searches else DEFAULT_CITY
        self.fetch_weather_async(default_target)

    def _build_layout(self):
        """Construct all GUI frames and components."""
        # Main scrollable canvas container to ensure responsive fit on all screens
        self.canvas = tk.Canvas(self, bg=THEME["bg_main"], highlightthickness=0)
        self.scrollbar = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.scrollable_content = tk.Frame(self.canvas, bg=THEME["bg_main"])

        self.scrollable_content.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )
        self.canvas_window = self.canvas.create_window((0, 0), window=self.scrollable_content, anchor="nw")
        self.canvas.configure(xscrollcommand=None, yscrollcommand=self.scrollbar.set)

        self.canvas.pack(side="left", fill="both", expand=True)
        self.scrollbar.pack(side="right", fill="y")

        # Allow resizing content window with canvas width
        self.canvas.bind("<Configure>", self._on_canvas_configure)

        # 1. Top Navbar / Header
        self._build_header(self.scrollable_content)

        # 2. In-app Error Banner
        self._build_notification_banner(self.scrollable_content)

        # 3. Search and Quick Location Controls
        self._build_search_bar(self.scrollable_content)

        # 4. Recent Searches Pills
        self._build_recent_searches_bar(self.scrollable_content)

        # 5. Loading Bar
        self.progress_frame = tk.Frame(self.scrollable_content, bg=THEME["bg_main"], height=6)
        self.progress_frame.pack(fill="x", padx=24, pady=(2, 6))
        self.progress_bar = ttk.Progressbar(self.progress_frame, mode="indeterminate")

        # 6. Hero Current Weather Card
        self.hero_card = HeroWeatherCard(self.scrollable_content)
        self.hero_card.pack(fill="x", padx=24, pady=(6, 12))

        # 7. Metrics Grid (Humidity, Pressure, Wind, Sunrise/Sunset)
        self._build_metrics_grid(self.scrollable_content)

        # 8. 6-Hour Hourly Forecast Section
        self._build_hourly_section(self.scrollable_content)

        # 9. 5-Day Daily Forecast Section
        self._build_daily_section(self.scrollable_content)

        # Bottom Padding
        tk.Frame(self.scrollable_content, bg=THEME["bg_main"], height=30).pack()

    def _on_canvas_configure(self, event):
        self.canvas.itemconfig(self.canvas_window, width=event.width)

    def _build_header(self, parent: tk.Frame):
        nav = tk.Frame(parent, bg=THEME["bg_main"])
        nav.pack(fill="x", padx=24, pady=(16, 12))

        # Brand Logo & Title
        title_box = tk.Frame(nav, bg=THEME["bg_main"])
        title_box.pack(side="left")

        lbl_logo = tk.Label(
            title_box,
            text="⚡",
            font=("Helvetica", 20),
            fg=THEME["accent_cyan"],
            bg=THEME["bg_main"]
        )
        lbl_logo.pack(side="left", padx=(0, 8))

        lbl_title = tk.Label(
            title_box,
            text="WeatherWise",
            font=("Helvetica", 20, "bold"),
            fg=THEME["text_primary"],
            bg=THEME["bg_main"]
        )
        lbl_title.pack(side="left")

        lbl_sub = tk.Label(
            title_box,
            text="Real-Time Weather Dashboard",
            font=("Helvetica", 10),
            fg=THEME["text_secondary"],
            bg=THEME["bg_main"]
        )
        lbl_sub.pack(side="left", padx=(10, 0), pady=(4, 0))

        # Right Controls: Unit Toggle & API Key config
        right_controls = tk.Frame(nav, bg=THEME["bg_main"])
        right_controls.pack(side="right")

        self.btn_unit = tk.Button(
            right_controls,
            text="Units: °C (Metric)",
            font=("Helvetica", 10, "bold"),
            bg=THEME["bg_card"],
            fg=THEME["accent_cyan"],
            activebackground=THEME["bg_card_hover"],
            activeforeground=THEME["text_primary"],
            relief="flat",
            padx=12,
            pady=6,
            cursor="hand2",
            command=self.toggle_temperature_unit
        )
        self.btn_unit.pack(side="left", padx=(0, 10))

        btn_settings = tk.Button(
            right_controls,
            text="⚙️ API Key",
            font=("Helvetica", 10),
            bg=THEME["bg_card"],
            fg=THEME["text_secondary"],
            activebackground=THEME["bg_card_hover"],
            activeforeground=THEME["text_primary"],
            relief="flat",
            padx=10,
            pady=6,
            cursor="hand2",
            command=self._show_api_key_dialog
        )
        btn_settings.pack(side="left")

    def _build_notification_banner(self, parent: tk.Frame):
        """In-app dismissible notification banner."""
        self.banner_frame = tk.Frame(
            parent,
            bg="#451A1A",
            highlightbackground=THEME["danger"],
            highlightthickness=1,
            padx=16,
            pady=8
        )
        self.lbl_banner_msg = tk.Label(
            self.banner_frame,
            text="",
            font=("Helvetica", 10),
            fg="#FCA5A5",
            bg="#451A1A",
            wraplength=600,
            justify="left"
        )
        self.lbl_banner_msg.pack(side="left", fill="x", expand=True)

        btn_close = tk.Button(
            self.banner_frame,
            text="✕",
            font=("Helvetica", 10, "bold"),
            fg="#FCA5A5",
            bg="#451A1A",
            activebackground="#5C1D1D",
            activeforeground="#FFFFFF",
            relief="flat",
            bd=0,
            cursor="hand2",
            command=self.hide_error
        )
        btn_close.pack(side="right", padx=(8, 0))

    def show_error(self, message: str):
        """Display error alert inside the dashboard."""
        self.lbl_banner_msg.config(text=f"⚠️ {message}")
        self.banner_frame.pack(fill="x", padx=24, pady=(0, 10), before=self.hero_card)

    def hide_error(self):
        """Dismiss the error alert."""
        self.banner_frame.pack_forget()

    def _build_search_bar(self, parent: tk.Frame):
        search_container = tk.Frame(parent, bg=THEME["bg_main"])
        search_container.pack(fill="x", padx=24, pady=(0, 8))

        # Search Entry Field
        self.entry_var = tk.StringVar()
        self.entry_search = tk.Entry(
            search_container,
            textvariable=self.entry_var,
            font=("Helvetica", 12),
            bg=THEME["bg_card"],
            fg=THEME["text_primary"],
            insertbackground=THEME["accent_cyan"],
            relief="flat",
            highlightbackground=THEME["border"],
            highlightthickness=1,
            highlightcolor=THEME["accent_blue"]
        )
        self.entry_search.pack(side="left", fill="x", expand=True, ipady=8, padx=(0, 10))
        self.entry_search.bind("<Return>", lambda e: self.on_search_clicked())

        # Placeholder binding
        self.entry_var.set("Enter city name or ZIP code (e.g. New York, 90210, Tokyo)...")
        self.entry_search.config(fg=THEME["text_muted"])
        self.entry_search.bind("<FocusIn>", self._on_entry_focus_in)
        self.entry_search.bind("<FocusOut>", self._on_entry_focus_out)

        # Get Weather Button
        btn_search = tk.Button(
            search_container,
            text="Get Weather",
            font=("Helvetica", 11, "bold"),
            bg=THEME["accent_blue"],
            fg="#0B1120",
            activebackground=THEME["accent_cyan"],
            activeforeground="#000000",
            relief="flat",
            padx=18,
            pady=8,
            cursor="hand2",
            command=self.on_search_clicked
        )
        btn_search.pack(side="left", padx=(0, 10))

        # Detect Location Button
        btn_loc = tk.Button(
            search_container,
            text="📍 My Location",
            font=("Helvetica", 11),
            bg=THEME["bg_card"],
            fg=THEME["accent_cyan"],
            activebackground=THEME["bg_card_hover"],
            activeforeground=THEME["text_primary"],
            relief="flat",
            padx=14,
            pady=8,
            cursor="hand2",
            command=self.on_detect_location_clicked
        )
        btn_loc.pack(side="left")

    def _on_entry_focus_in(self, event):
        if "Enter city" in self.entry_var.get():
            self.entry_var.set("")
            self.entry_search.config(fg=THEME["text_primary"])

    def _on_entry_focus_out(self, event):
        if not self.entry_var.get().strip():
            self.entry_var.set("Enter city name or ZIP code...")
            self.entry_search.config(fg=THEME["text_muted"])

    def _build_recent_searches_bar(self, parent: tk.Frame):
        self.recent_frame = tk.Frame(parent, bg=THEME["bg_main"])
        self.recent_frame.pack(fill="x", padx=24, pady=(0, 8))
        self._refresh_recent_searches_ui()

    def _refresh_recent_searches_ui(self):
        for widget in self.recent_frame.winfo_children():
            widget.destroy()

        if not self.recent_searches:
            return

        lbl = tk.Label(
            self.recent_frame,
            text="Recent:",
            font=("Helvetica", 9, "bold"),
            fg=THEME["text_muted"],
            bg=THEME["bg_main"]
        )
        lbl.pack(side="left", padx=(0, 8))

        for city in self.recent_searches[:6]:
            btn = tk.Button(
                self.recent_frame,
                text=city,
                font=("Helvetica", 9),
                bg=THEME["bg_card"],
                fg=THEME["text_secondary"],
                activebackground=THEME["bg_card_hover"],
                activeforeground=THEME["text_primary"],
                relief="flat",
                padx=8,
                pady=2,
                cursor="hand2",
                command=lambda c=city: self.fetch_weather_async(c)
            )
            btn.pack(side="left", padx=(0, 6))

    def _build_metrics_grid(self, parent: tk.Frame):
        grid_frame = tk.Frame(parent, bg=THEME["bg_main"])
        grid_frame.pack(fill="x", padx=24, pady=(0, 14))

        # 4 Equal columns
        grid_frame.columnconfigure((0, 1, 2, 3), weight=1, uniform="metric_group")

        self.card_humidity = MetricCard(grid_frame, title="Humidity", icon_symbol="💧")
        self.card_humidity.grid(row=0, column=0, sticky="ew", padx=(0, 8))

        self.card_pressure = MetricCard(grid_frame, title="Pressure", icon_symbol="⏱️")
        self.card_pressure.grid(row=0, column=1, sticky="ew", padx=(0, 8))

        self.card_wind = MetricCard(grid_frame, title="Wind Speed", icon_symbol="💨")
        self.card_wind.grid(row=0, column=2, sticky="ew", padx=(0, 8))

        self.card_sun = MetricCard(grid_frame, title="Sun Cycle", icon_symbol="🌅")
        self.card_sun.grid(row=0, column=3, sticky="ew")

    def _build_hourly_section(self, parent: tk.Frame):
        section_frame = tk.Frame(parent, bg=THEME["bg_main"])
        section_frame.pack(fill="x", padx=24, pady=(0, 16))

        lbl_section = tk.Label(
            section_frame,
            text="6-Hour Forecast",
            font=("Helvetica", 14, "bold"),
            fg=THEME["text_primary"],
            bg=THEME["bg_main"]
        )
        lbl_section.pack(anchor="w", pady=(0, 8))

        self.hourly_container = tk.Frame(section_frame, bg=THEME["bg_main"])
        self.hourly_container.pack(fill="x")

        # Pre-create 6 hourly cards
        self.hourly_cards: List[HourlyCard] = []
        for i in range(6):
            card = HourlyCard(self.hourly_container)
            card.pack(side="left", fill="both", expand=True, padx=(0, 8 if i < 5 else 0))
            self.hourly_cards.append(card)

    def _build_daily_section(self, parent: tk.Frame):
        section_frame = tk.Frame(parent, bg=THEME["bg_main"])
        section_frame.pack(fill="x", padx=24, pady=(0, 16))

        lbl_section = tk.Label(
            section_frame,
            text="5-Day Forecast",
            font=("Helvetica", 14, "bold"),
            fg=THEME["text_primary"],
            bg=THEME["bg_main"]
        )
        lbl_section.pack(anchor="w", pady=(0, 8))

        self.daily_container = tk.Frame(section_frame, bg=THEME["bg_main"])
        self.daily_container.pack(fill="x")

        # Pre-create 5 daily cards
        self.daily_cards: List[DailyCard] = []
        for i in range(5):
            card = DailyCard(self.daily_container)
            card.pack(fill="x", pady=(0, 6 if i < 4 else 0))
            self.daily_cards.append(card)

    # ---------------- USER INTERACTIONS & ASYNC THREADING ----------------

    def on_search_clicked(self):
        query = self.entry_var.get().strip()
        if "Enter city" in query or not query:
            self.show_error("Please enter a city name or ZIP code to search.")
            return
        self.hide_error()
        self.fetch_weather_async(query)

    def on_detect_location_clicked(self):
        """Prompt user for permission before querying IP location."""
        self.hide_error()
        confirmed = messagebox.askyesno(
            title="Location Permission Request",
            message="WeatherWise would like to detect your approximate location using your IP address (via ipinfo.io).\n\nDo you grant permission to proceed?",
            parent=self.parent
        )
        if not confirmed:
            return

        self._set_loading(True)
        threading.Thread(target=self._worker_detect_location, daemon=True).start()

    def _worker_detect_location(self):
        try:
            loc_data = self.location_service.detect_location(user_permitted=True)
            city = loc_data.get("city")
            if city:
                self.parent.after(0, lambda: self.fetch_weather_async(city))
            else:
                self.parent.after(0, lambda: self._on_fetch_error("Could not determine your city."))
        except LocationServiceError as e:
            self.parent.after(0, lambda: self._on_fetch_error(str(e)))
        except Exception as e:
            self.parent.after(0, lambda: self._on_fetch_error(f"Location detection failed: {str(e)}"))

    def fetch_weather_async(self, query: str):
        """Initiate background thread to fetch weather data without freezing GUI."""
        if self.is_loading:
            return

        self.hide_error()
        self._set_loading(True)

        threading.Thread(
            target=self._worker_fetch_weather,
            args=(query,),
            daemon=True
        ).start()

    def _worker_fetch_weather(self, query: str):
        try:
            current = self.weather_service.get_current_weather(query)
            forecast = self.forecast_service.get_forecast(query)

            # Post results back to Tkinter main thread
            self.parent.after(0, lambda: self._on_fetch_success(query, current, forecast))

        except WeatherAPIError as e:
            self.parent.after(0, lambda: self._on_fetch_error(e.message))
        except Exception as e:
            self.parent.after(0, lambda: self._on_fetch_error(f"Error: {str(e)}"))

    def _on_fetch_success(self, query: str, current: Dict[str, Any], forecast: Dict[str, Any]):
        self._set_loading(False)
        self.current_data = current
        self.forecast_data = forecast

        # Add to recent searches
        city_name = current.get("city", query)
        self._save_recent_search(city_name)

        # Update all UI cards
        self._update_all_displays()

    def _on_fetch_error(self, message: str):
        self._set_loading(False)
        self.show_error(message)

    def _set_loading(self, loading: bool):
        self.is_loading = loading
        if loading:
            self.progress_bar.pack(fill="x")
            self.progress_bar.start(10)
        else:
            self.progress_bar.stop()
            self.progress_bar.pack_forget()

    def toggle_temperature_unit(self):
        """Switch between Celsius and Fahrenheit and refresh views immediately."""
        self.unit = "F" if self.unit == "C" else "C"
        unit_label = "Units: °F (Imperial)" if self.unit == "F" else "Units: °C (Metric)"
        self.btn_unit.config(text=unit_label)
        self._update_all_displays()

    def _update_all_displays(self):
        """Update Hero card, metrics, hourly cards, and daily cards with active unit."""
        if not self.current_data:
            return

        # 1. Update Hero Card
        self.hero_card.update_data(self.current_data, self.unit)

        # 2. Update Metric Cards
        hum = self.current_data.get("humidity", 0)
        self.card_humidity.set_value(f"{hum}%", "Comfortable" if hum < 60 else "Humid")

        pres = self.current_data.get("pressure", 1013)
        pres_inhg = hpa_to_inhg(pres)
        self.card_pressure.set_value(f"{pres} hPa", f"{pres_inhg} inHg")

        wind_mps = self.current_data.get("wind_speed", 0.0)
        wind_mph = mps_to_mph(wind_mps)
        if self.unit == "F":
            self.card_wind.set_value(f"{wind_mph} mph", f"{wind_mps} m/s")
        else:
            self.card_wind.set_value(f"{wind_mps} m/s", f"{wind_mph} mph")

        # Sunrise & Sunset
        sr = self.current_data.get("sunrise", 0)
        ss = self.current_data.get("sunset", 0)
        sr_txt = datetime.datetime.fromtimestamp(sr).strftime("%I:%M %p").lstrip("0") if sr else "--"
        ss_txt = datetime.datetime.fromtimestamp(ss).strftime("%I:%M %p").lstrip("0") if ss else "--"
        self.card_sun.set_value(f"↑ {sr_txt}", f"↓ {ss_txt}")

        # 3. Update Hourly Forecast Cards
        if self.forecast_data:
            hourly_list = self.forecast_data.get("hourly", [])
            for i, card in enumerate(self.hourly_cards):
                if i < len(hourly_list):
                    card.update_data(hourly_list[i], self.unit)

            # 4. Update Daily Forecast Cards
            daily_list = self.forecast_data.get("daily", [])
            for i, card in enumerate(self.daily_cards):
                if i < len(daily_list):
                    card.update_data(daily_list[i], self.unit)

    # ---------------- RECENT SEARCHES PERSISTENCE ----------------

    def _load_recent_searches(self) -> List[str]:
        if RECENT_SEARCHES_FILE.exists():
            try:
                with open(RECENT_SEARCHES_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data[:RECENT_SEARCHES_MAX]
            except Exception:
                pass
        return ["London", "New York", "Tokyo", "Paris"]

    def _save_recent_search(self, city: str):
        city = city.strip().title()
        if not city:
            return
        if city in self.recent_searches:
            self.recent_searches.remove(city)
        self.recent_searches.insert(0, city)
        self.recent_searches = self.recent_searches[:RECENT_SEARCHES_MAX]

        try:
            with open(RECENT_SEARCHES_FILE, "w", encoding="utf-8") as f:
                json.dump(self.recent_searches, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not persist recent searches: {e}")

        self._refresh_recent_searches_ui()

    def _show_api_key_dialog(self):
        """Dialog to configure or view OpenWeatherMap API key."""
        dialog = tk.Toplevel(self.parent)
        dialog.title("OpenWeatherMap API Key Configuration")
        dialog.geometry("460x260")
        dialog.configure(bg=THEME["bg_card"])
        dialog.transient(self.parent)
        dialog.grab_set()

        lbl_desc = tk.Label(
            dialog,
            text="Configure your OpenWeatherMap API key:\n(Leave empty to use automatic live keyless fallback)",
            font=("Helvetica", 10),
            fg=THEME["text_primary"],
            bg=THEME["bg_card"],
            justify="left"
        )
        lbl_desc.pack(padx=20, pady=(20, 10), anchor="w")

        var_key = tk.StringVar(value=get_api_key())
        entry = tk.Entry(
            dialog,
            textvariable=var_key,
            font=("Helvetica", 11),
            bg=THEME["bg_main"],
            fg=THEME["text_primary"],
            insertbackground=THEME["accent_cyan"],
            relief="flat",
            highlightbackground=THEME["border"],
            highlightthickness=1
        )
        entry.pack(fill="x", padx=20, pady=10, ipady=6)

        def save_and_close():
            k = var_key.get().strip()
            set_api_key(k)
            self.weather_service.set_key(k)
            self.forecast_service.set_key(k)
            dialog.destroy()
            if self.current_data:
                self.fetch_weather_async(self.current_data.get("city", DEFAULT_CITY))

        btn_save = tk.Button(
            dialog,
            text="Save & Apply",
            font=("Helvetica", 10, "bold"),
            bg=THEME["accent_blue"],
            fg="#0B1120",
            relief="flat",
            padx=16,
            pady=8,
            cursor="hand2",
            command=save_and_close
        )
        btn_save.pack(pady=16)
