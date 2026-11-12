"""
IP-based Geolocation Service for WeatherWise.
Fetches user's approximate location using ipinfo.io with permission enforcement.
"""

import json
import logging
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

from utils.config import IPINFO_URL, REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class LocationServiceError(Exception):
    """Exception raised when IP location detection fails."""
    pass

class LocationService:
    """Service to detect location via IP address."""

    def __init__(self, endpoint_url: str = IPINFO_URL):
        self.endpoint_url = endpoint_url

    def detect_location(self, user_permitted: bool = False) -> Dict[str, Any]:
        """
        Detect the user's current city, region, country, and lat/lon coordinates.
        Requires explicit user permission before executing.
        """
        if not user_permitted:
            raise LocationServiceError(
                "Permission not granted. User must explicitly authorize location detection."
            )

        try:
            req = urllib.request.Request(
                self.endpoint_url,
                headers={"User-Agent": "WeatherWise-Desktop/1.0", "Accept": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
                raw_data = response.read().decode("utf-8")
                data = json.loads(raw_data)

            city = data.get("city")
            if not city:
                raise LocationServiceError("Location service could not determine your city.")

            loc = data.get("loc", "").split(",")
            lat = float(loc[0]) if len(loc) > 0 and loc[0] else 0.0
            lon = float(loc[1]) if len(loc) > 1 and loc[1] else 0.0

            return {
                "city": city,
                "region": data.get("region", ""),
                "country": data.get("country", ""),
                "postal": data.get("postal", ""),
                "lat": lat,
                "lon": lon,
                "ip": data.get("ip", ""),
                "timezone": data.get("timezone", ""),
            }

        except urllib.error.URLError as e:
            raise LocationServiceError(f"Network error detecting location: {e.reason}")
        except TimeoutError:
            raise LocationServiceError("Location detection request timed out.")
        except Exception as e:
            raise LocationServiceError(f"Failed to detect IP location: {str(e)}")
