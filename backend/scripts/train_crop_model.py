#!/usr/bin/env python3
"""Train crop recommendation model on crop_recommendation_10000.csv.

Saves three artifacts to the models/ directory:
  - crop_model.pkl        (Random Forest classifier)
  - label_encoder.pkl     (LabelEncoder for crop classes)
  - feature_scaler.pkl    (StandardScaler for features)

Run from the project root:
    python backend/scripts/train_crop_model.py
"""
from __future__ import annotations

import json
import logging
import os
import pickle
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s — %(message)s")
logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
CSV_PATH = PROJECT_ROOT / "Plant Village Dataset" / "crop_recommendation_10000.csv"
MODEL_DIR = PROJECT_ROOT / "models"

FEATURE_COLS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET_COL = "crop"
RANDOM_STATE = 42


def main() -> None:
    logger.info("Loading dataset from %s", CSV_PATH)
    if not CSV_PATH.exists():
        logger.error("CSV not found at %s", CSV_PATH)
        sys.exit(1)

    df = pd.read_csv(CSV_PATH)
    logger.info("Dataset shape: %s", df.shape)
    logger.info("Crop distribution:\n%s", df[TARGET_COL].value_counts())

    # ── Validate columns ──────────────────────────────────────────────────────
    missing = [c for c in FEATURE_COLS + [TARGET_COL] if c not in df.columns]
    if missing:
        logger.error("Missing columns: %s", missing)
        sys.exit(1)

    # ── Preprocessing ─────────────────────────────────────────────────────────
    X = df[FEATURE_COLS].values
    y = df[TARGET_COL].str.strip().str.lower().values

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_enc, test_size=0.15, random_state=RANDOM_STATE, stratify=y_enc
    )
    logger.info("Train: %d | Test: %d", len(X_train), len(X_test))

    # ── Train ─────────────────────────────────────────────────────────────────
    logger.info("Training Random Forest …")
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_split=2,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        class_weight="balanced",
    )
    rf.fit(X_train, y_train)

    # ── Evaluate ──────────────────────────────────────────────────────────────
    y_pred = rf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    logger.info("Test accuracy: %.4f (%.2f%%)", acc, acc * 100)
    logger.info(
        "\n%s",
        classification_report(y_test, y_pred, target_names=le.classes_),
    )

    # ── Feature importance ────────────────────────────────────────────────────
    importances = dict(zip(FEATURE_COLS, rf.feature_importances_))
    logger.info("Feature importances: %s", {k: f"{v:.4f}" for k, v in importances.items()})

    # ── Save artifacts ────────────────────────────────────────────────────────
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    with open(MODEL_DIR / "crop_model.pkl", "wb") as f:
        pickle.dump(rf, f)
    with open(MODEL_DIR / "label_encoder.pkl", "wb") as f:
        pickle.dump(le, f)
    with open(MODEL_DIR / "feature_scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)

    # Save metadata for reference
    metadata = {
        "model_type": "RandomForestClassifier",
        "n_estimators": 300,
        "random_state": RANDOM_STATE,
        "features": FEATURE_COLS,
        "classes": list(le.classes_),
        "test_accuracy": round(acc, 4),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "feature_importances": {k: round(float(v), 4) for k, v in importances.items()},
    }
    with open(MODEL_DIR / "crop_model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("✅ Artifacts saved to %s", MODEL_DIR)
    logger.info("  crop_model.pkl")
    logger.info("  label_encoder.pkl")
    logger.info("  feature_scaler.pkl")
    logger.info("  crop_model_metadata.json")


if __name__ == "__main__":
    main()
