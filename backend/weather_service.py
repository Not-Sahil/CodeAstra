"""
Weather Service: Open-Meteo Real Data Connector
Provides live and cached weather observations for Mumbai metropolitan area
without requiring API keys, with request timeouts, error recovery,
and honest source health reporting.
"""

import os
import time
import logging
from typing import Dict, Any, Optional
import requests

logger = logging.getLogger("UrbanPulse.Weather")

class WeatherService:
    def __init__(self, cache_ttl_seconds: int = 600):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        self.default_lat = 19.0760
        self.default_lon = 72.8777
        self.cache_ttl = cache_ttl_seconds
        
        self._cached_data: Optional[Dict[str, Any]] = None
        self._last_fetch_time: float = 0
        self._last_error: Optional[str] = None
        self._consecutive_failures: int = 0
        self._total_requests: int = 0
        self._successful_requests: int = 0

    def get_weather(self, lat: Optional[float] = None, lon: Optional[float] = None, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Fetches current weather observations for coordinates (defaults to Mumbai).
        Returns structured weather data with clear provenance and freshness metadata.
        """
        lat = lat or self.default_lat
        lon = lon or self.default_lon
        current_time = time.time()
        
        # Check cache validity
        if not force_refresh and self._cached_data and (current_time - self._last_fetch_time < self.cache_ttl):
            age_seconds = int(current_time - self._last_fetch_time)
            return {
                **self._cached_data,
                "data_freshness": "CACHED",
                "cache_age_seconds": age_seconds,
                "is_stale": age_seconds > self.cache_ttl * 2
            }

        self._total_requests += 1
        params = {
            "latitude": lat,
            "longitude": lon,
            "current_weather": "true",
            "hourly": "precipitation,relative_humidity_2m,wind_speed_10m",
            "timezone": "Asia/Kolkata"
        }

        try:
            resp = requests.get(self.base_url, params=params, timeout=6.0)
            if resp.status_code == 200:
                data = resp.json()
                cw = data.get("current_weather", {})
                
                # Extract precipitation from hourly if available
                hourly = data.get("hourly", {})
                precip_list = hourly.get("precipitation", [])
                curr_precip = precip_list[0] if precip_list else 0.0

                w_code = cw.get("weathercode", 0)
                condition_label = self._interpret_weather_code(w_code)

                result = {
                    "source": "OPEN_METEO_API",
                    "source_id": "open-meteo-v1",
                    "provenance": "LIVE_EXTERNAL_DATA",
                    "is_simulated": False,
                    "latitude": lat,
                    "longitude": lon,
                    "temperature_c": cw.get("temperature", 28.0),
                    "wind_speed_kmh": cw.get("windspeed", 12.0),
                    "weather_code": w_code,
                    "condition": condition_label,
                    "precipitation_mm": curr_precip,
                    "is_raining": curr_precip > 1.0 or w_code in [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99],
                    "observation_time": cw.get("time", ""),
                    "ingestion_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "status": "ONLINE",
                    "data_freshness": "LIVE",
                    "cache_age_seconds": 0,
                    "is_stale": False
                }

                self._cached_data = result
                self._last_fetch_time = current_time
                self._last_error = None
                self._consecutive_failures = 0
                self._successful_requests += 1
                return result
            else:
                raise Exception(f"HTTP {resp.status_code}: {resp.text[:100]}")

        except Exception as e:
            self._consecutive_failures += 1
            self._last_error = str(e)
            logger.warning(f"WeatherService error: {e}")
            
            # If we have cached data, return it with degraded status
            if self._cached_data:
                age_seconds = int(current_time - self._last_fetch_time)
                return {
                    **self._cached_data,
                    "source": "OPEN_METEO_API",
                    "data_freshness": "DEGRADED_CACHE",
                    "cache_age_seconds": age_seconds,
                    "is_stale": True,
                    "last_error": str(e),
                    "status": "DEGRADED"
                }

            # Completely unavailable without cache
            return {
                "source": "OPEN_METEO_API",
                "source_id": "open-meteo-v1",
                "provenance": "UNAVAILABLE",
                "is_simulated": False,
                "status": "OFFLINE",
                "temperature_c": None,
                "precipitation_mm": None,
                "is_raining": None,
                "condition": "Weather feed temporarily unavailable",
                "error": str(e),
                "data_freshness": "UNAVAILABLE",
                "is_stale": True
            }

    def get_health(self) -> Dict[str, Any]:
        """Returns connector health for resilience monitoring."""
        return {
            "source_id": "open_meteo_weather",
            "name": "Open-Meteo Weather Observations",
            "endpoint": self.base_url,
            "status": "ONLINE" if self._consecutive_failures == 0 else ("DEGRADED" if self._cached_data else "OFFLINE"),
            "consecutive_failures": self._consecutive_failures,
            "last_error": self._last_error,
            "last_successful_fetch": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self._last_fetch_time)) if self._last_fetch_time else None,
            "total_requests": self._total_requests,
            "success_rate": round(self._successful_requests / max(1, self._total_requests) * 100, 1),
            "free_tier_status": "Free open-access API (Non-commercial / prototype use, no API key required)"
        }

    def _interpret_weather_code(self, code: int) -> str:
        codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Fog",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            71: "Slight snow",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail"
        }
        return codes.get(code, "Cloudy")
