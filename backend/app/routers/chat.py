"""Chat router — POST /api/v1/chat"""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request

from app.config import settings
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import generate_chat_response

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Context-aware chatbot for explaining advisory results",
)
async def chat(
    request: Request,
    body: ChatRequest,
) -> ChatResponse:
    try:
        ctx = body.context.model_dump()
        result = generate_chat_response(
            message=body.message,
            context=ctx,
            history=body.history,
            provider=settings.chat_provider,
            api_key=settings.gemini_api_key or settings.openai_api_key,
        )
        return ChatResponse(**result)
    except Exception:
        logger.exception("Chat generation failed")
        raise HTTPException(
            status_code=503,
            detail={
                "code": "CHAT_UNAVAILABLE",
                "message": "The chat service is temporarily unavailable.",
            },
        )
