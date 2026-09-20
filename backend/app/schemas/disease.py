"""Pydantic schemas for disease prediction endpoint."""
from __future__ import annotations

from pydantic import BaseModel, Field


class DiseaseResponse(BaseModel):
    request_id: str
    disease: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_healthy: bool
    crop: str | None = None
    condition: str | None = None
    treatment_hint: str | None = None
    model_version: str = "plant_disease_v1"
    status: str  # "success" | "low_confidence"
