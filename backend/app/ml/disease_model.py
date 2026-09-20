"""Plant disease image classification model wrapper.

Uses the pre-trained plant_disease_model.keras (29-class CNN from PlantVillage).
"""
from __future__ import annotations

import json
import logging
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Disease → treatment hint mapping
TREATMENT_HINTS: dict[str, str] = {
    "Apple - Apple Scab": "Apply fungicide (e.g., captan or mancozeb) at bud break. Remove infected leaves. Ensure good air circulation.",
    "Apple - Black Rot": "Prune dead wood, apply copper-based fungicide. Remove mummified fruits.",
    "Apple - Cedar Apple Rust": "Apply preventive fungicide in spring. Remove nearby cedar/juniper hosts if possible.",
    "Apple - Healthy": "No disease detected. Maintain regular irrigation and fertilization.",
    "Bell Pepper - Bacterial Spot": "Use copper-based bactericide. Avoid overhead irrigation. Rotate crops annually.",
    "Bell Pepper - Healthy": "No disease detected. Ensure adequate calcium to prevent blossom-end rot.",
    "Cherry - Healthy": "No disease detected. Monitor for pests during fruit development.",
    "Cherry - Powdery Mildew": "Apply sulfur or potassium bicarbonate spray. Improve air circulation by pruning.",
    "Corn (Maize) - Cercospora Leaf Spot": "Apply foliar fungicide. Use resistant varieties. Avoid dense planting.",
    "Corn (Maize) - Common Rust": "Apply fungicide at early stages. Plant resistant hybrids.",
    "Corn (Maize) - Healthy": "No disease detected. Maintain balanced nitrogen fertilization.",
    "Corn (Maize) - Northern Leaf Blight": "Apply triazole fungicide. Use resistant varieties. Remove crop debris.",
    "Grape - Black Rot": "Apply mancozeb or myclobutanil fungicide early. Remove infected clusters and leaves.",
    "Grape - Esca (Black Measles)": "No effective cure; prune and destroy infected wood. Use trunk protection strategies.",
    "Grape - Healthy": "No disease detected. Monitor irrigation to avoid water stress.",
    "Grape - Leaf Blight": "Apply copper fungicide. Ensure good canopy management for airflow.",
    "Peach - Bacterial Spot": "Apply copper sprays during dormancy. Select resistant varieties.",
    "Peach - Healthy": "No disease detected. Thin fruit for better size and disease prevention.",
    "Potato - Early Blight": "Apply chlorothalonil or mancozeb. Avoid overhead watering. Rotate crops.",
    "Potato - Healthy": "No disease detected. Monitor for late blight during wet conditions.",
    "Potato - Late Blight": "Apply copper or metalaxyl fungicide immediately. Destroy infected foliage.",
    "Strawberry - Healthy": "No disease detected. Maintain mulch to prevent soil-splash infections.",
    "Strawberry - Leaf Scorch": "Remove infected leaves. Apply myclobutanil fungicide. Improve drainage.",
    "Tomato - Bacterial Spot": "Use copper bactericide. Avoid working in field when wet. Use certified seed.",
    "Tomato - Early Blight": "Apply mancozeb fungicide. Remove lower infected leaves. Rotate crops.",
    "Tomato - Healthy": "No disease detected. Maintain consistent watering to prevent blossom-end rot.",
    "Tomato - Late Blight": "Apply chlorothalonil immediately. Destroy infected plants. Improve drainage.",
    "Tomato - Septoria Leaf Spot": "Apply fungicide. Remove infected lower leaves. Avoid wetting foliage.",
    "Tomato - Yellow Leaf Curl Virus": "Control whitefly vectors with insecticide. Remove infected plants. Use resistant varieties.",
}

INPUT_SIZE = (224, 224)
CONFIDENCE_THRESHOLD = 0.5


class DiseaseModel:
    """Inference wrapper for the Keras plant disease classification model."""

    _instance: "DiseaseModel | None" = None

    def __init__(self, model_dir: Path) -> None:
        self._model_dir = model_dir
        self._model: Any = None
        self._classes: list[str] = []
        self._loaded = False

    @classmethod
    def get(cls, model_dir: Path) -> "DiseaseModel":
        if cls._instance is None:
            cls._instance = cls(model_dir)
        return cls._instance

    def load(self) -> None:
        """Load Keras model and class list."""
        import keras  # standalone keras package (TF 2.16+)

        model_path = self._model_dir / "plant_disease_model.keras"
        classes_path = self._model_dir / "plant_disease_classes.json"

        self._model = keras.models.load_model(str(model_path))

        with open(classes_path) as f:
            self._classes = json.load(f)

        self._loaded = True
        logger.info(
            "Plant disease model loaded. Classes: %d", len(self._classes)
        )

    def is_loaded(self) -> bool:
        return self._loaded

    def predict(self, image_bytes: bytes) -> dict[str, Any]:
        """Run inference on raw image bytes.

        Returns:
            dict with disease, confidence, is_healthy, crop, condition, treatment_hint
        """
        if not self._loaded:
            raise RuntimeError("Disease model is not loaded.")

        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        img = img.resize(INPUT_SIZE)
        # Note: EfficientNet has built-in Rescaling/Normalization.
        # Images must be passed in raw [0, 255] range as float32.
        arr = np.array(img, dtype=np.float32)
        arr = np.expand_dims(arr, axis=0)

        proba = self._model.predict(arr, verbose=0)[0]
        top_idx = int(np.argmax(proba))
        confidence = float(proba[top_idx])
        disease_label = self._classes[top_idx]

        # Top 3
        top3_idx = np.argsort(proba)[::-1][:3]
        top3 = [
            {"label": self._classes[i], "confidence": float(proba[i])}
            for i in top3_idx
        ]

        # Parse label: "Crop - Condition"
        parts = disease_label.split(" - ", 1)
        crop = parts[0] if len(parts) == 2 else None
        condition = parts[1] if len(parts) == 2 else disease_label
        is_healthy = "healthy" in disease_label.lower()

        return {
            "disease": disease_label,
            "confidence": confidence,
            "is_healthy": is_healthy,
            "crop": crop,
            "condition": condition,
            "treatment_hint": TREATMENT_HINTS.get(disease_label),
            "top3": top3,
            "status": "success" if confidence >= CONFIDENCE_THRESHOLD else "low_confidence",
            "model_version": "plant_disease_v1",
        }
