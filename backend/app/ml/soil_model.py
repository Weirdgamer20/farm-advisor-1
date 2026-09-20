"""Soil suitability model wrapper.

Uses the pre-trained soil_condition_model.keras (crop-conditioned regressor)
together with soil_condition_metadata.json (embedded scaler parameters).
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# Thresholds from metadata
STATUS_THRESHOLDS = {"good": 80.0, "acceptable": 60.0, "needs_attention": 40.0}


class SoilModel:
    """Inference wrapper for the Keras soil suitability model."""

    _instance: "SoilModel | None" = None

    def __init__(self, model_dir: Path) -> None:
        self._model_dir = model_dir
        self._model: Any = None
        self._metadata: dict[str, Any] = {}
        self._profiles: dict[str, Any] = {}
        self._loaded = False

    @classmethod
    def get(cls, model_dir: Path) -> "SoilModel":
        if cls._instance is None:
            cls._instance = cls(model_dir)
        return cls._instance

    def load(self) -> None:
        """Load Keras model and supporting JSON artifacts."""
        import keras  # standalone keras package (TF 2.16+)

        model_path = self._model_dir / "soil_condition_model.keras"
        meta_path = self._model_dir / "soil_condition_metadata.json"
        profiles_path = self._model_dir / "soil_condition_profiles.json"

        self._model = keras.models.load_model(str(model_path))

        with open(meta_path) as f:
            self._metadata = json.load(f)
        with open(profiles_path) as f:
            self._profiles = json.load(f)

        self._scaler_mean = np.array(self._metadata["scaler_mean"])
        self._scaler_scale = np.array(self._metadata["scaler_scale"])
        self._crop_to_index = self._metadata["crop_to_index"]
        self._num_crops = self._metadata["crop_feature_count"]

        self._loaded = True
        logger.info("Soil suitability model loaded successfully.")

    def is_loaded(self) -> bool:
        return self._loaded

    def predict(self, crop: str, N: float, P: float, K: float,
                temperature: float, humidity: float, ph: float,
                rainfall: float) -> dict[str, Any]:
        """Predict soil suitability score (0-100) for the given crop and conditions."""
        if not self._loaded:
            raise RuntimeError("Soil model is not loaded.")

        crop_key = crop.lower()
        crop_idx = self._crop_to_index.get(crop_key, 0)

        inputs = {
            "numeric": np.array([[N, P, K, temperature, humidity, ph, rainfall]], dtype=np.float32),
            "crop_index": np.array([[crop_idx]], dtype=np.int32),
        }

        score = float(self._model.predict(inputs, verbose=0)[0][0])
        score = float(np.clip(score, 0.0, 100.0))

        label = self._score_label(score)
        profile = self._profiles.get(crop_key, {})

        return {
            "suitability_score": round(score, 2),
            "suitability_label": label,
            "profile": profile,
        }

    def get_profile(self, crop: str) -> dict[str, Any]:
        return self._profiles.get(crop.lower(), {})

    @staticmethod
    def _score_label(score: float) -> str:
        if score >= STATUS_THRESHOLDS["good"]:
            return "good"
        elif score >= STATUS_THRESHOLDS["acceptable"]:
            return "acceptable"
        elif score >= STATUS_THRESHOLDS["needs_attention"]:
            return "needs_attention"
        return "poor"
