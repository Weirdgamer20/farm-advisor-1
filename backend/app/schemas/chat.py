"""Pydantic schemas for the chatbot endpoint."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ChatContext(BaseModel):
    """Advisory/disease context to ground the chatbot response."""
    crop: str | None = None
    soil_type: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    temperature: float | None = None
    humidity: float | None = None
    rainfall_mm: float | None = None
    suitability_score: float | None = None
    suitability_label: str | None = None
    disease: str | None = None
    disease_confidence: float | None = None
    explanation: list[str] | None = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)
    context: ChatContext = Field(default_factory=ChatContext)
    history: list[dict[str, Any]] = Field(default_factory=list, max_length=10)


class ChatResponse(BaseModel):
    answer: str
    provider: str  # "rule_based" | "gemini" | "openai"
    available: bool = True
