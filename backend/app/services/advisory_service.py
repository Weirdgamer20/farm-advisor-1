"""Advisory service — orchestrates automatic soil detection, weather fetch, soil scoring, and crop confidence."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.ml.crop_model import CropModel
from app.ml.soil_model import SoilModel
from app.services.soil_service import detect_soil
from app.services.weather_service import fetch_weather

logger = logging.getLogger(__name__)

# Soil type → N/P/K/pH typical values (used for suitability scoring)
SOIL_NPK: dict[str, dict[str, float]] = {
    "loamy":  {"N": 75.0,  "P": 58.0,  "K": 84.0,  "ph": 6.5},
    "sandy":  {"N": 55.0,  "P": 42.0,  "K": 65.0,  "ph": 6.0},
    "clay":   {"N": 90.0,  "P": 68.0,  "K": 100.0, "ph": 6.8},
    "silt":   {"N": 80.0,  "P": 60.0,  "K": 90.0,  "ph": 6.6},
    "peaty":  {"N": 85.0,  "P": 45.0,  "K": 70.0,  "ph": 5.5},
    "chalky": {"N": 60.0,  "P": 55.0,  "K": 88.0,  "ph": 7.2},
    "saline": {"N": 55.0,  "P": 45.0,  "K": 110.0, "ph": 7.0},
}


async def generate_advisory(
    latitude: float,
    longitude: float,
    crop: str,
    soil_type: str | None = None,
    model_dir: Path | None = None,
) -> dict[str, Any]:
    """Full advisory pipeline with automatic soil intelligence and real-time weather."""

    # 1. Soil detection (if not explicitly chosen by user)
    detected_soil = await detect_soil(latitude, longitude)
    effective_soil = soil_type if soil_type else detected_soil["soil_type"]
    if soil_type:
        detected_soil["soil_type"] = soil_type
        detected_soil["soil_name"] = f"{soil_type.capitalize()} Soil (User selected)"
        detected_soil["source"] = "user_override"

    # 2. Real-time Weather
    weather = await fetch_weather(latitude, longitude, crop)

    # 3. Soil NPK & pH lookup
    npk = SOIL_NPK.get(effective_soil, SOIL_NPK["loamy"]).copy()
    if detected_soil.get("typical_ph"):
        npk["ph"] = detected_soil["typical_ph"]

    # 4. Soil suitability score
    assert model_dir is not None
    soil_m = SoilModel.get(model_dir)
    soil_result = soil_m.predict(
        crop=crop,
        N=npk["N"], P=npk["P"], K=npk["K"],
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        ph=npk["ph"],
        rainfall=weather["rainfall_mm"],
    )

    # 5. Crop recommendation confidence
    crop_m = CropModel.get(model_dir)
    crop_result = crop_m.predict(
        crop=crop,
        soil_type=effective_soil,
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        rainfall=weather["rainfall_mm"],
    )

    # 6. Build explanation
    explanation = _build_explanation(
        crop=crop,
        soil_type=effective_soil,
        soil_info=detected_soil,
        weather=weather,
        soil_result=soil_result,
        crop_result=crop_result,
        npk=npk,
    )

    return {
        "weather": weather,
        "detected_soil": detected_soil,
        "recommendation": {
            "crop": crop,
            "suitability_score": soil_result["suitability_score"],
            "suitability_label": soil_result["suitability_label"],
            "confidence": crop_result["confidence"],
            "top_predictions": crop_result["top_predictions"],
        },
        "explanation": explanation,
        "soil_profile": soil_result.get("profile"),
        "features_used": crop_result.get("features_used"),
    }


def _build_explanation(
    crop: str,
    soil_type: str,
    soil_info: dict[str, Any],
    weather: dict[str, Any],
    soil_result: dict[str, Any],
    crop_result: dict[str, Any],
    npk: dict[str, float],
) -> list[str]:
    """Generate comprehensive plain-language explanation bullets."""
    lines: list[str] = []
    label = soil_result["suitability_label"]
    score = soil_result["suitability_score"]
    conf = crop_result["confidence"]

    soil_display = soil_info.get("soil_name", f"{soil_type} soil")
    lines.append(
        f"Soil identified as **{soil_display}** (pH ~{npk['ph']:.1f}). "
        f"The suitability model rates this condition for {crop} as **{label}** (score: **{score:.1f}/100**)."
    )

    temp = weather["temperature"]
    apparent_temp = weather.get("apparent_temperature", temp)
    hum = weather["humidity"]
    rain_obs = weather.get("rainfall_observed_7d", 0.0)
    rain_fc = weather.get("rainfall_forecast_7d", 0.0)
    loc_name = weather.get("location_name")

    if loc_name:
        lines.append(f"Location: **{loc_name}**.")

    lines.append(
        f"Current weather: **{temp:.1f}°C** (feels like **{apparent_temp:.1f}°C**), humidity is **{hum:.1f}%** with {weather.get('condition', 'clear skies').lower()}."
    )

    if rain_obs > 0 or rain_fc > 0:
        lines.append(
            f"Precipitation: **{rain_obs:.1f} mm** observed over past 7 days, with **{rain_fc:.1f} mm** forecast for the coming week. "
            + ("Natural moisture is adequate." if (rain_obs + rain_fc) >= 30 else "Consider supplemental irrigation.")
        )
    else:
        lines.append("Dry conditions detected (0 mm rainfall recorded/forecast). Irrigation is strongly recommended.")

    lines.append(
        f"The AI recommendation model estimates **{conf * 100:.1f}% suitability confidence** for cultivating {crop} under these environmental parameters."
    )

    # Soil drainage advice
    drainage = soil_info.get("drainage")
    if drainage:
        lines.append(f"Soil characteristics: {drainage}.")

    if label == "poor":
        lines.append(
            f"⚠️  Suitability is low. Consider soil amendments or exploring alternative crops for {soil_type} soil."
        )
    elif label == "good":
        lines.append(f"✅  Current environmental and soil parameters are well-suited for growing {crop}.")

    return lines
