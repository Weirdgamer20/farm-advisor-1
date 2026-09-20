"""Disease prediction service."""
from __future__ import annotations

import logging
from typing import Any

from app.ml.disease_model import DiseaseModel, CONFIDENCE_THRESHOLD

logger = logging.getLogger(__name__)


async def predict_disease(image_bytes: bytes, model_dir) -> dict[str, Any]:
    """Run disease inference on validated image bytes."""
    model = DiseaseModel.get(model_dir)
    return model.predict(image_bytes)
