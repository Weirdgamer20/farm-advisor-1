"""Context-aware chatbot service.

Default: rule-based template engine (offline, no API key required).
Optional: plug-in slot for Gemini or OpenAI via CHAT_PROVIDER env var.
"""
from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


def generate_chat_response(
    message: str,
    context: dict[str, Any],
    history: list[dict[str, Any]],
    provider: str = "rule_based",
    api_key: str = "",
) -> dict[str, Any]:
    """Route to appropriate chat provider."""
    if provider == "gemini" and api_key:
        return _gemini_response(message, context, history, api_key)
    elif provider == "openai" and api_key:
        return _openai_response(message, context, history, api_key)
    else:
        return _rule_based_response(message, context)


# ---------------------------------------------------------------------------
# Rule-based engine
# ---------------------------------------------------------------------------

def _rule_based_response(message: str, ctx: dict[str, Any]) -> dict[str, Any]:
    """Pattern-match against common farmer questions and return contextual answers."""
    msg = message.lower().strip()

    crop = ctx.get("crop") or "the selected crop"
    soil = ctx.get("soil_type") or "the selected soil"
    score = ctx.get("suitability_score")
    label = ctx.get("suitability_label")
    temp = ctx.get("temperature")
    humidity = ctx.get("humidity")
    rainfall = ctx.get("rainfall_mm")
    disease = ctx.get("disease")
    disease_conf = ctx.get("disease_confidence")
    explanation = ctx.get("explanation") or []

    # ── Disease questions ──
    if any(k in msg for k in ["disease", "image", "leaf", "spot", "blight", "rust", "mildew", "infected"]):
        if disease:
            conf_pct = f"{disease_conf * 100:.1f}%" if disease_conf else "N/A"
            healthy = "healthy" in disease.lower()
            if healthy:
                answer = (
                    f"The plant disease model analyzed the uploaded image and classified it as "
                    f"**{disease}** (confidence: {conf_pct}). No disease treatment is required. "
                    "Continue monitoring the plant for any changes."
                )
            else:
                answer = (
                    f"The plant disease model classified the image as **{disease}** "
                    f"with a confidence of {conf_pct}. This is a model prediction — "
                    "please consult a local agricultural expert to confirm the diagnosis "
                    "before applying any treatments."
                )
        else:
            answer = (
                "No disease analysis has been performed yet. "
                "Please upload a clear, well-lit photograph of the affected leaf or plant part "
                "on the Disease Detection page."
            )

    # ── Suitability / advisory ──
    elif any(k in msg for k in ["suitability", "score", "suitable", "good", "bad", "condition", "rating"]):
        if score is not None:
            answer = (
                f"The soil suitability model rates **{soil}** soil for **{crop}** as "
                f"**{label}** with a score of **{score:.1f} out of 100**. "
                f"A score above 80 is considered good, 60-80 is acceptable, "
                f"40-60 needs attention, and below 40 is poor."
            )
        else:
            answer = "Please generate an advisory first by selecting your soil type and crop."

    # ── Recommendation / crop ──
    elif any(k in msg for k in ["recommend", "why", "reason", "crop", "suggested", "chose"]):
        if explanation:
            answer = (
                f"The advisory system recommended **{crop}** based on the following factors:\n\n"
                + "\n".join(f"• {e}" for e in explanation[:4])
            )
        else:
            answer = (
                f"The recommendation for **{crop}** is based on the soil type ({soil}), "
                "current environmental conditions (temperature, humidity, rainfall), "
                "and the crop's historical suitability data from the training dataset."
            )

    # ── Weather / temperature ──
    elif any(k in msg for k in ["weather", "temperature", "temp", "hot", "cold", "humidity", "rain", "rainfall"]):
        parts = []
        if temp is not None:
            parts.append(f"temperature is **{temp:.1f}°C**")
        if humidity is not None:
            parts.append(f"humidity is **{humidity:.1f}%**")
        if rainfall is not None:
            parts.append(f"recent 7-day rainfall is **{rainfall:.1f} mm**")
        if parts:
            answer = (
                f"The current environmental data for the selected location shows: "
                + ", ".join(parts) + ". "
                "These values were retrieved from the Open-Meteo weather service."
            )
        else:
            answer = "Weather data is not available yet. Please generate an advisory first."

    # ── Soil ──
    elif any(k in msg for k in ["soil", "npk", "nitrogen", "phosphorus", "potassium", "ph", "nutrient"]):
        answer = (
            f"**{soil.capitalize()}** soil was selected. "
            "The soil suitability model uses the soil type together with environmental "
            "conditions to estimate how well the soil will support crop growth. "
            "Different soil types have different N, P, K, and pH profiles that affect "
            "nutrient availability and root development."
        )

    # ── Irrigation ──
    elif any(k in msg for k in ["water", "irrigat", "drip", "sprinkler"]):
        if rainfall is not None and rainfall < 50:
            answer = (
                f"Rainfall in the last 7 days is only **{rainfall:.1f} mm**, which is relatively low. "
                f"Consider supplemental irrigation for **{crop}**. "
                "Drip irrigation is generally most efficient for water conservation."
            )
        elif rainfall is not None:
            answer = (
                f"Recent rainfall of **{rainfall:.1f} mm** over 7 days provides moderate moisture. "
                f"Monitor soil moisture regularly and irrigate if the topsoil dries out."
            )
        else:
            answer = "Please generate an advisory to get location-specific irrigation advice."

    # ── Fertilizer ──
    elif any(k in msg for k in ["fertiliz", "manure", "compost", "npk", "nutrient", "feed"]):
        answer = (
            f"Fertilizer recommendations should be based on a soil test. As a general guide for "
            f"**{crop}** on **{soil}** soil: maintain adequate nitrogen (N) for leaf growth, "
            "phosphorus (P) for root development, and potassium (K) for fruit quality. "
            "Always follow local agricultural extension guidelines for specific dosages — "
            "this system does not prescribe exact fertilizer quantities."
        )

    # ── Hello / greeting ──
    elif any(k in msg for k in ["hello", "hi", "hey", "good morning", "good evening", "namaste"]):
        answer = (
            f"Hello! I'm your Farmer Crop Advisory assistant. "
            f"I can help explain the advisory results for **{crop}** on **{soil}** soil, "
            "discuss the disease detection results, or answer questions about weather conditions. "
            "What would you like to know?"
        )

    # ── Help ──
    elif any(k in msg for k in ["help", "what can", "what do", "how to use", "how do"]):
        answer = (
            "I can help you understand:\n"
            "• **Why** a particular crop was recommended\n"
            "• **What** the suitability score means\n"
            "• **Current weather** conditions at your location\n"
            "• **Disease detection** results from uploaded images\n"
            "• **Soil** type characteristics and nutrient advice\n"
            "• **Irrigation** needs based on recent rainfall\n\n"
            "Just ask me anything about your crop advisory!"
        )

    # ── Fallback ──
    else:
        ctx_summary = []
        if crop and crop != "the selected crop":
            ctx_summary.append(f"crop: {crop}")
        if soil and soil != "the selected soil":
            ctx_summary.append(f"soil: {soil}")
        if score is not None:
            ctx_summary.append(f"suitability: {label} ({score:.1f}/100)")

        ctx_str = ", ".join(ctx_summary) if ctx_summary else "no advisory generated yet"
        answer = (
            f"I'm focused on your crop advisory ({ctx_str}). "
            "You can ask me about the crop recommendation, soil suitability score, "
            "weather conditions, disease detection results, or irrigation advice."
        )

    return {"answer": answer, "provider": "rule_based", "available": True}


# ---------------------------------------------------------------------------
# Optional: Gemini / OpenAI stubs (activated via .env)
# ---------------------------------------------------------------------------

def _build_system_prompt(ctx: dict[str, Any]) -> str:
    crop = ctx.get("crop", "unknown")
    soil = ctx.get("soil_type", "unknown")
    score = ctx.get("suitability_score")
    label = ctx.get("suitability_label")
    temp = ctx.get("temperature")
    humidity = ctx.get("humidity")
    rainfall = ctx.get("rainfall_mm")
    disease = ctx.get("disease")
    disease_conf = ctx.get("disease_confidence")

    return f"""You are an agricultural advisory assistant for the Farmer Crop Advisory System.
Current advisory context:
- Crop: {crop}
- Soil type: {soil}
- Soil suitability score: {score} ({label})
- Temperature: {temp}°C
- Humidity: {humidity}%
- 7-day rainfall: {rainfall} mm
- Disease detected: {disease} (confidence: {disease_conf})

Rules:
1. Only use the data above — do NOT invent weather values, confidence scores, or dosages.
2. Do NOT change the ML prediction.
3. If information is missing, state that clearly.
4. Keep responses concise and farmer-friendly.
5. Always add a disclaimer that ML predictions are decision-support only, not guaranteed diagnoses."""


def _gemini_response(
    message: str, ctx: dict[str, Any], history: list, api_key: str
) -> dict[str, Any]:
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        system = _build_system_prompt(ctx)
        full_message = f"{system}\n\nFarmer question: {message}"
        response = model.generate_content(full_message)
        return {"answer": response.text, "provider": "gemini", "available": True}
    except Exception as exc:
        logger.warning("Gemini unavailable: %s. Falling back to rule-based.", exc)
        return _rule_based_response(message, ctx)


def _openai_response(
    message: str, ctx: dict[str, Any], history: list, api_key: str
) -> dict[str, Any]:
    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        messages = [
            {"role": "system", "content": _build_system_prompt(ctx)},
            *history[-6:],
            {"role": "user", "content": message},
        ]
        resp = client.chat.completions.create(model="gpt-4o-mini", messages=messages)
        return {
            "answer": resp.choices[0].message.content,
            "provider": "openai",
            "available": True,
        }
    except Exception as exc:
        logger.warning("OpenAI unavailable: %s. Falling back to rule-based.", exc)
        return _rule_based_response(message, ctx)
