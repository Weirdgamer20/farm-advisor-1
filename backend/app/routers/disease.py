"""Disease prediction router — POST /api/v1/disease/predict"""
from __future__ import annotations

import imghdr
import logging
import uuid

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.config import settings
from app.schemas.disease import DiseaseResponse
from app.services.disease_service import predict_disease

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/disease/predict",
    response_model=DiseaseResponse,
    summary="Classify a crop/leaf disease from an uploaded image",
)
async def disease_predict(
    request: Request,
    image: UploadFile = File(..., description="JPEG/PNG/WebP leaf or plant image"),
) -> DiseaseResponse:
    request_id = str(uuid.uuid4())

    # Validate content type
    if image.content_type not in settings.allowed_image_mimes:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_IMAGE_TYPE",
                "message": f"Unsupported image type '{image.content_type}'. "
                           f"Accepted: {settings.allowed_image_mimes}",
                "request_id": request_id,
            },
        )

    # Read and enforce size limit
    image_bytes = await image.read()
    if len(image_bytes) > settings.max_image_bytes:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "IMAGE_TOO_LARGE",
                "message": f"Image exceeds {settings.max_image_bytes // (1024*1024)} MB limit.",
                "request_id": request_id,
            },
        )

    # Validate that the bytes actually decode as an image
    fmt = imghdr.what(None, h=image_bytes)
    if fmt not in ("jpeg", "png", "webp"):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "INVALID_IMAGE_CONTENT",
                "message": "Uploaded file could not be decoded as a valid image.",
                "request_id": request_id,
            },
        )

    logger.info(
        "Disease predict request %s: filename=%s size=%d bytes",
        request_id, image.filename, len(image_bytes),
    )

    try:
        result = await predict_disease(image_bytes, settings.model_dir)
    except Exception:
        logger.exception("Disease inference failed for request %s", request_id)
        raise HTTPException(status_code=500, detail="Disease inference failed.")

    return DiseaseResponse(
        request_id=request_id,
        disease=result["disease"],
        confidence=result["confidence"],
        is_healthy=result["is_healthy"],
        crop=result.get("crop"),
        condition=result.get("condition"),
        treatment_hint=result.get("treatment_hint"),
        model_version=result.get("model_version", "plant_disease_v1"),
        status=result["status"],
    )
