"""Advisory router — POST /api/v1/advisory & GET /api/v1/soil/detect"""
from __future__ import annotations

import uuid
import logging
from typing import Annotated

from fastapi import APIRouter, Request, HTTPException, Query

from app.config import settings
from app.schemas.advisory import (
    AdvisoryRequest,
    AdvisoryResponse,
    LocationInfo,
    WeatherInfo,
    DetectedSoilInfo,
    Recommendation,
)
from app.services.advisory_service import generate_advisory
from app.services.soil_service import detect_soil

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get(
    "/soil/detect",
    summary="Auto-detect soil type from coordinates",
)
async def get_detected_soil(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="GPS Latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="GPS Longitude"),
):
    """Return soil type, texture, typical pH, and drainage inferred from location."""
    try:
        soil_info = await detect_soil(latitude, longitude)
        return {
            "latitude": latitude,
            "longitude": longitude,
            "soil": soil_info,
        }
    except Exception as exc:
        logger.exception("Soil auto-detection failed")
        raise HTTPException(status_code=500, detail="Soil detection failed")


@router.post(
    "/advisory",
    response_model=AdvisoryResponse,
    summary="Generate contextual crop advisory with auto-detected soil and live weather",
)
async def advisory(
    request: Request,
    body: AdvisoryRequest,
) -> AdvisoryResponse:
    request_id = str(uuid.uuid4())
    logger.info(
        "Advisory request %s: lat=%.4f lon=%.4f soil=%s crop=%s",
        request_id, body.latitude, body.longitude, body.soil_type, body.crop,
    )

    try:
        result = await generate_advisory(
            latitude=body.latitude,
            longitude=body.longitude,
            soil_type=body.soil_type,
            crop=body.crop,
            model_dir=settings.model_dir,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Advisory generation failed for request %s", request_id)
        raise HTTPException(status_code=500, detail="Advisory generation failed.")

    w = result["weather"]
    rec = result["recommendation"]
    soil = result["detected_soil"]

    return AdvisoryResponse(
        request_id=request_id,
        location=LocationInfo(
            latitude=body.latitude,
            longitude=body.longitude,
            region=w.get("location_name"),
        ),
        weather=WeatherInfo(
            temperature=w["temperature"],
            apparent_temperature=w.get("apparent_temperature"),
            humidity=w["humidity"],
            rainfall_mm=w["rainfall_mm"],
            rainfall_observed_7d=w.get("rainfall_observed_7d"),
            rainfall_forecast_7d=w.get("rainfall_forecast_7d"),
            wind_speed_kmh=w.get("wind_speed_kmh"),
            condition=w["condition"],
            location_name=w.get("location_name"),
            source=w["source"],
        ),
        detected_soil=DetectedSoilInfo(
            soil_type=soil["soil_type"],
            soil_name=soil.get("soil_name", f"{soil['soil_type'].capitalize()} Soil"),
            description=soil.get("description"),
            typical_ph=soil.get("typical_ph"),
            drainage=soil.get("drainage"),
            confidence=soil.get("confidence"),
            source=soil.get("source"),
        ),
        recommendation=Recommendation(
            crop=rec["crop"],
            suitability_score=rec["suitability_score"],
            suitability_label=rec["suitability_label"],
            confidence=rec["confidence"],
        ),
        explanation=result["explanation"],
        soil_profile=result.get("soil_profile"),
    )
