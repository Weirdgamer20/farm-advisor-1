"""Weather service — fetches live data from Open-Meteo with reverse geocoding.

Provides real-time temperature, apparent temperature, relative humidity,
observed 7-day rainfall, upcoming 7-day forecast, wind speed, and location naming.
"""
from __future__ import annotations

import logging
from typing import Any
import httpx

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

# Fallback medians per crop (used if Open-Meteo is completely unreachable)
CROP_FALLBACK_WEATHER: dict[str, dict[str, float]] = {
    "apple":       {"temperature": 17.9,  "humidity": 69.5, "rainfall_mm": 110.2},
    "bell_pepper": {"temperature": 25.3,  "humidity": 70.3, "rainfall_mm": 93.4},
    "cherry":      {"temperature": 18.1,  "humidity": 64.6, "rainfall_mm": 81.4},
    "grapes":      {"temperature": 23.8,  "humidity": 55.1, "rainfall_mm": 69.6},
    "maize":       {"temperature": 24.2,  "humidity": 65.5, "rainfall_mm": 104.4},
    "peach":       {"temperature": 21.9,  "humidity": 60.3, "rainfall_mm": 75.6},
    "potato":      {"temperature": 17.9,  "humidity": 71.8, "rainfall_mm": 105.6},
    "strawberry":  {"temperature": 17.8,  "humidity": 74.7, "rainfall_mm": 91.2},
    "tomato":      {"temperature": 25.0,  "humidity": 68.3, "rainfall_mm": 100.4},
}


async def fetch_weather(
    latitude: float, longitude: float, crop: str
) -> dict[str, Any]:
    """Fetch live meteorological observations and reverse-geocoded place name."""
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,surface_pressure",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_probability_max",
        "timezone": "auto",
        "past_days": 7,
        "forecast_days": 7,
    }

    location_name = await _reverse_geocode(latitude, longitude)

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(OPEN_METEO_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        current = data.get("current", {})
        daily = data.get("daily", {})

        temperature = float(current.get("temperature_2m", 25.0))
        apparent_temp = float(current.get("apparent_temperature", temperature))
        humidity = float(current.get("relative_humidity_2m", 70.0))
        wind_speed = float(current.get("wind_speed_10m", 5.0))
        precip_current = float(current.get("precipitation", 0.0))

        # Daily precipitation sum contains 14 days (7 past + 7 forecast)
        precip_sums = daily.get("precipitation_sum", [])
        if len(precip_sums) >= 14:
            observed_7d = float(sum(precip_sums[:7]))
            forecast_7d = float(sum(precip_sums[7:14]))
        elif precip_sums:
            observed_7d = float(sum(precip_sums[:len(precip_sums)//2]))
            forecast_7d = float(sum(precip_sums[len(precip_sums)//2:]))
        else:
            observed_7d = 0.0
            forecast_7d = 0.0

        # In agronomic datasets, rainfall represents typical cumulative precipitation
        # available to the crop root zone over the growing period (monthly equivalent)
        combined_14d = observed_7d + forecast_7d
        # Extrapolate 14-day precipitation to 30-day monthly equivalent
        # with realistic agronomic bounds
        monthly_equivalent = round(combined_14d * 2.14, 1)

        weather_code = int(current.get("weather_code", 0))
        condition = _weather_code_to_label(weather_code)

        return {
            "temperature": round(temperature, 1),
            "apparent_temperature": round(apparent_temp, 1),
            "humidity": round(humidity, 1),
            "rainfall_mm": monthly_equivalent,
            "rainfall_observed_7d": round(observed_7d, 1),
            "rainfall_forecast_7d": round(forecast_7d, 1),
            "current_precipitation": round(precip_current, 1),
            "wind_speed_kmh": round(wind_speed, 1),
            "condition": condition,
            "location_name": location_name,
            "source": "live",
        }

    except Exception as exc:
        logger.warning("Open-Meteo unavailable (%s). Using fallback values.", exc)
        fallback = CROP_FALLBACK_WEATHER.get(
            crop.lower(), {"temperature": 25.0, "humidity": 70.0, "rainfall_mm": 100.0}
        )
        return {
            "temperature": fallback["temperature"],
            "apparent_temperature": fallback["temperature"],
            "humidity": fallback["humidity"],
            "rainfall_mm": fallback["rainfall_mm"],
            "rainfall_observed_7d": round(fallback["rainfall_mm"] / 4.0, 1),
            "rainfall_forecast_7d": round(fallback["rainfall_mm"] / 4.0, 1),
            "current_precipitation": 0.0,
            "wind_speed_kmh": 8.0,
            "condition": "unavailable",
            "location_name": location_name,
            "source": "fallback",
        }


async def _reverse_geocode(lat: float, lon: float) -> str:
    """Resolve location to city, state, country using reverse geocoding."""
    headers = {"User-Agent": "FarmerCropAdvisory/1.0 (contact@farm-advisory.org)"}
    params = {"lat": lat, "lon": lon, "format": "json"}

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(NOMINATIM_URL, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                addr = data.get("address", {})
                city = (
                    addr.get("city")
                    or addr.get("town")
                    or addr.get("village")
                    or addr.get("suburb")
                    or addr.get("county")
                )
                state = addr.get("state")
                country = addr.get("country")

                parts = [p for p in [city, state, country] if p]
                if parts:
                    return ", ".join(parts)
    except Exception as exc:
        logger.debug("Reverse geocoding unavailable: %s", exc)

    return f"Lat: {lat:.4f}, Lon: {lon:.4f}"


def _weather_code_to_label(code: int) -> str:
    """Convert WMO weather code to a human-readable label."""
    if code == 0:
        return "Clear sky"
    elif code <= 3:
        return "Partly cloudy"
    elif code <= 9:
        return "Foggy"
    elif code <= 19:
        return "Drizzle / Light rain"
    elif code <= 29:
        return "Rain"
    elif code <= 39:
        return "Snow"
    elif code <= 49:
        return "Freezing fog"
    elif code <= 59:
        return "Drizzle"
    elif code <= 69:
        return "Rain"
    elif code <= 79:
        return "Snow"
    elif code <= 84:
        return "Rain showers"
    elif code <= 94:
        return "Thunderstorm"
    else:
        return "Severe thunderstorm"
