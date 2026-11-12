"""
Temperature and Meteorological Unit Conversion Utilities for WeatherWise.
"""

def celsius_to_fahrenheit(celsius: float) -> float:
    """Convert temperature from Celsius to Fahrenheit."""
    return round((celsius * 9.0 / 5.0) + 32.0, 1)

def fahrenheit_to_celsius(fahrenheit: float) -> float:
    """Convert temperature from Fahrenheit to Celsius."""
    return round((fahrenheit - 32.0) * 5.0 / 9.0, 1)

def kelvin_to_celsius(kelvin: float) -> float:
    """Convert temperature from Kelvin to Celsius."""
    return round(kelvin - 273.15, 1)

def kelvin_to_fahrenheit(kelvin: float) -> float:
    """Convert temperature from Kelvin to Fahrenheit."""
    return celsius_to_fahrenheit(kelvin - 273.15)

def format_temperature(celsius: float, unit: str = "C") -> str:
    """Format temperature string based on active unit ('C' or 'F')."""
    if unit.upper() == "F":
        val = celsius_to_fahrenheit(celsius)
        return f"{round(val)}°F"
    return f"{round(celsius)}°C"

def mps_to_mph(mps: float) -> float:
    """Convert meters per second to miles per hour."""
    return round(mps * 2.23694, 1)

def hpa_to_inhg(hpa: float) -> float:
    """Convert hectopascals (hPa) to inches of mercury (inHg)."""
    return round(hpa * 0.02953, 2)
