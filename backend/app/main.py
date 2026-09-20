"""FastAPI application entry point.

Startup loads all ML models once into memory.
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import settings
from app.ml.crop_model import CropModel
from app.ml.disease_model import DiseaseModel
from app.ml.soil_model import SoilModel
from app.routers import advisory, disease, chat

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=[f"{settings.rate_limit_per_minute}/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all ML models at startup."""
    logger.info("Loading ML models from %s …", settings.model_dir)
    start = time.time()

    try:
        crop_model = CropModel.get(settings.model_dir)
        crop_model.load()
    except FileNotFoundError as e:
        logger.error("Crop model not found: %s", e)

    soil_model = SoilModel.get(settings.model_dir)
    soil_model.load()

    disease_model = DiseaseModel.get(settings.model_dir)
    disease_model.load()

    elapsed = time.time() - start
    logger.info("All models loaded in %.2f seconds.", elapsed)

    yield  # Application runs here

    logger.info("Application shutting down.")


app = FastAPI(
    title="Farmer Crop Advisory System API",
    version="1.0.0",
    description=(
        "AI-powered crop advisory, plant disease detection, and contextual chatbot. "
        "All predictions are decision-support only — not guaranteed agricultural diagnoses."
    ),
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Global error handler ──────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception for %s %s", request.method, request.url)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again.",
            }
        },
    )


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/api/v1/health", tags=["health"])
async def health():
    crop_ok = CropModel.get(settings.model_dir).is_loaded()
    soil_ok = SoilModel.get(settings.model_dir).is_loaded()
    disease_ok = DiseaseModel.get(settings.model_dir).is_loaded()

    status = "healthy" if (soil_ok and disease_ok) else "degraded"
    return {
        "status": status,
        "models": {
            "crop_recommendation": crop_ok,
            "soil_suitability": soil_ok,
            "plant_disease": disease_ok,
        },
    }


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(advisory.router, prefix="/api/v1", tags=["advisory"])
app.include_router(disease.router, prefix="/api/v1", tags=["disease"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
