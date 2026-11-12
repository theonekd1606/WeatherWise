#!/usr/bin/env python3
"""
WeatherWise – Real-Time Weather Dashboard
Main application entry point.

A modern desktop weather application built with Python, Tkinter/CustomTkinter,
Pillow, OpenWeatherMap API, Threading, and JSON persistence.
"""

import argparse
import os
import sys
try:
    import tkinter as tk
    HAS_TKINTER = True
except ImportError:
    HAS_TKINTER = False
    tk = None

# Ensure WeatherWise root is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.config import THEME, get_api_key

def parse_arguments():
    parser = argparse.ArgumentParser(description="WeatherWise – Real-Time Weather Dashboard")
    parser.add_argument("--city", type=str, default="", help="Initial city or ZIP code to display")
    parser.add_argument("--headless-check", action="store_true", help="Validate modules and exit (for headless test runners)")
    parser.add_argument("--cli", action="store_true", help="Run in CLI mode without GUI")
    return parser.parse_args()


def main():
    args = parse_arguments()

    if args.headless_check:
        from services.weather_api import WeatherAPIService
        from services.forecast_service import ForecastService
        from services.location_service import LocationService
        print("WeatherWise modules loaded successfully. Ready for deployment.")
        return 0

    if args.cli or not HAS_TKINTER:
        if not HAS_TKINTER:
            print("Note: tkinter is not installed in this headless environment.")
            print("To run the desktop GUI on Linux/Ubuntu, run: sudo apt-get install python3-tk")
            print("Running in WeatherWise CLI mode:\n")

        from services.weather_api import WeatherAPIService
        from services.forecast_service import ForecastService
        from utils.temperature import format_temperature

        target = args.city or "London"
        api = WeatherAPIService()
        forecaster = ForecastService()

        print(f"Fetching weather for: {target}...")
        try:
            cur = api.get_current_weather(target)
            print("=" * 50)
            print(f"WeatherWise – {cur['city']}, {cur['country']}")
            print(f"Condition:   {cur['description']} ({cur['condition']})")
            print(f"Temperature: {cur['temp_c']}°C / {cur['temp_f']}°F")
            print(f"Feels Like:  {cur['feels_like_c']}°C / {cur['feels_like_f']}°F")
            print(f"Humidity:    {cur['humidity']}%")
            print(f"Pressure:    {cur['pressure']} hPa")
            print(f"Wind Speed:  {cur['wind_speed']} m/s")
            print("=" * 50)

            fc = forecaster.get_forecast(target)
            print("\n6-Hour Forecast:")
            for h in fc.get("hourly", [])[:6]:
                print(f"  {h['time']:<7} | {h['temp_c']:>5}°C / {h['temp_f']:>5}°F | {h['description']}")

            print("\n5-Day Forecast:")
            for d in fc.get("daily", [])[:5]:
                print(f"  {d['day_name']:<10} {d['short_date']:<7} | H: {d['temp_max_c']}°C  L: {d['temp_min_c']}°C | {d['description']}")
            print("=" * 50)
            return 0
        except Exception as e:
            print(f"Error: {e}")
            return 1

    from gui.dashboard import WeatherDashboard
    root = tk.Tk()
    root.title("WeatherWise – Real-Time Weather Dashboard")
    root.geometry("1024x820")
    root.minsize(840, 640)
    root.configure(bg=THEME["bg_main"])

    # Configure style
    try:
        root.tk.call("tk", "scaling", 1.25)
    except Exception:
        pass

    app = WeatherDashboard(root)
    app.pack(fill="both", expand=True)

    if args.city:
        app.fetch_weather_async(args.city)

    # Center window on screen
    root.update_idletasks()
    width = root.winfo_width()
    height = root.winfo_height()
    x = (root.winfo_screenwidth() // 2) - (width // 2)
    y = (root.winfo_screenheight() // 2) - (height // 2)
    root.geometry(f"{width}x{height}+{x}+{y}")

    root.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
