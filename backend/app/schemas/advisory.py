"""Pydantic schemas for advisory endpoint."""
from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field, field_validator


SUPPORTED_SOIL_TYPES = [
    "loamy",
    "sandy",
    "clay",
    "silt",
    "peaty",
    "chalky",
    "saline",
]

SUPPORTED_CROPS = [
    "apple",
    "bell_pepper",
    "cherry",
    "grapes",
    "maize",
    "peach",
    "potato",
    "strawberry",
    "tomato",
]


class AdvisoryRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="GPS latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="GPS longitude")
    soil_type: str | None = Field(
        default=None,
        description="Optional soil type. If omitted, automatically inferred from coordinates.",
    )
    crop: str = Field(..., description="Crop name from supported list")

    @field_validator("soil_type")
    @classmethod
    def validate_soil(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip().lower()
        if not v or v in ("auto", "detected", "none"):
            return None
        if v not in SUPPORTED_SOIL_TYPES:
            raise ValueError(
                f"Unsupported soil type '{v}'. Supported: {SUPPORTED_SOIL_TYPES}"
            )
        return v

    @field_validator("crop")
    @classmethod
    def validate_crop(cls, v: str) -> str:
        v = v.strip().lower()
        if v not in SUPPORTED_CROPS:
            raise ValueError(
                f"Unsupported crop '{v}'. Supported: {SUPPORTED_CROPS}"
            )
        return v


class WeatherInfo(BaseModel):
    temperature: float
    apparent_temperature: float | None = None
    humidity: float
    rainfall_mm: float
    rainfall_observed_7d: float | None = None
    rainfall_forecast_7d: float | None = None
    wind_speed_kmh: float | None = None
    condition: str
    location_name: str | None = None
    source: str  # "live" | "fallback"


class LocationInfo(BaseModel):
    latitude: float
    longitude: float
    region: str | None = None


class DetectedSoilInfo(BaseModel):
    soil_type: str
    soil_name: str
    description: str | None = None
    typical_ph: float | None = None
    drainage: str | None = None
    confidence: float | None = None
    source: str | None = None


class Recommendation(BaseModel):
    crop: str
    suitability_score: float = Field(..., ge=0.0, le=100.0)
    suitability_label: str  # "good" | "acceptable" | "needs_attention" | "poor"
    confidence: float = Field(..., ge=0.0, le=1.0)


class AdvisoryResponse(BaseModel):
    request_id: str
    location: LocationInfo
    weather: WeatherInfo
    detected_soil: DetectedSoilInfo
    recommendation: Recommendation
    explanation: list[str]
    soil_profile: dict[str, Any] | None = None
