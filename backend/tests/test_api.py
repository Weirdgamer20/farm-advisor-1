"""Comprehensive API test suite for Farmer Crop Advisory System.
Mapped directly to 14_Test_Cases.docx (TC-004, TC-005, TC-006, TC-008, TC-010, TC-011, TC-014)
and verifying automatic soil detection, enriched weather, and plant disease accuracy.
"""
import io
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from PIL import Image
import numpy as np

from app.main import app


@pytest.fixture(scope="module")
def client():
    """Run tests within the FastAPI lifespan context so all ML models are loaded."""
    with TestClient(app) as c:
        yield c


def test_tc014_health_endpoint(client):
    """TC-014: Health endpoint returns 200 and indicates model status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "models" in data
    assert data["models"]["crop_recommendation"] is True
    assert data["models"]["soil_suitability"] is True
    assert data["models"]["plant_disease"] is True


def test_soil_detect_endpoint(client):
    """Verify GET /api/v1/soil/detect auto-detects soil texture and name from coordinates."""
    response = client.get("/api/v1/soil/detect", params={"latitude": 18.5204, "longitude": 73.8567})
    assert response.status_code == 200
    data = response.json()
    assert "soil" in data
    assert "soil_type" in data["soil"]
    assert data["soil"]["soil_type"] in ("clay", "loamy", "sandy", "silt")
    assert "soil_name" in data["soil"]
    assert "drainage" in data["soil"]


def test_tc005_advisory_auto_soil(client):
    """TC-005: Generate advisory WITHOUT providing soil_type (fully automatic soil detection)."""
    payload = {
        "latitude": 18.5204,
        "longitude": 73.8567,
        "crop": "tomato"
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "request_id" in data
    assert "detected_soil" in data
    assert data["detected_soil"]["soil_type"] == "clay"
    assert "Black Cotton" in data["detected_soil"]["soil_name"] or "Clay" in data["detected_soil"]["soil_name"]
    assert "recommendation" in data
    assert data["recommendation"]["crop"] == "tomato"
    assert 0.0 <= data["recommendation"]["suitability_score"] <= 100.0
    assert data["recommendation"]["suitability_label"] in ("good", "acceptable", "needs_attention", "poor")
    assert "weather" in data
    assert "temperature" in data["weather"]
    assert "apparent_temperature" in data["weather"]
    assert "rainfall_observed_7d" in data["weather"]


def test_tc005_advisory_manual_soil(client):
    """TC-005: Generate advisory with explicit soil override."""
    payload = {
        "latitude": 18.5204,
        "longitude": 73.8567,
        "soil_type": "loamy",
        "crop": "tomato"
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_soil"]["soil_type"] == "loamy"


def test_tc006_advisory_invalid_coordinates(client):
    """TC-006: Request with invalid coordinates is rejected."""
    payload = {
        "latitude": 999.0,  # Invalid latitude
        "longitude": 73.8567,
        "crop": "tomato"
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 422


def test_tc004_advisory_unsupported_crop(client):
    """TC-004: Unsupported crop is rejected by schema validation."""
    payload = {
        "latitude": 18.5204,
        "longitude": 73.8567,
        "crop": "unsupported_fruit_xyz"
    }
    response = client.post("/api/v1/advisory", json=payload)
    assert response.status_code == 422


def test_tc010_healthy_leaf_prediction(client):
    """TC-010: Disease inference on REAL healthy leaf image correctly predicts healthy (not diseased)."""
    test_dir = Path("/mnt/d/Farmer_Crop_Advisory_/Plant Village Dataset/Test/Tomato - Healthy")
    if not test_dir.exists():
        # Fallback to local Windows path if running outside WSL
        test_dir = Path("D:/Farmer_Crop_Advisory_/Plant Village Dataset/Test/Tomato - Healthy")

    test_files = [p for p in test_dir.iterdir() if p.suffix.lower() in ('.jpg', '.jpeg', '.png')]
    assert len(test_files) > 0, "No test images found"

    with open(test_files[0], "rb") as f:
        img_bytes = f.read()

    files = {"image": ("healthy_tomato.jpg", img_bytes, "image/jpeg")}
    response = client.post("/api/v1/disease/predict", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["is_healthy"] is True
    assert "Healthy" in data["disease"]
    assert data["confidence"] > 0.90


def test_tc010_diseased_leaf_prediction(client):
    """TC-010: Disease inference on REAL diseased leaf image correctly identifies disease."""
    test_dir = Path("/mnt/d/Farmer_Crop_Advisory_/Plant Village Dataset/Test/Tomato - Early Blight")
    if not test_dir.exists():
        test_dir = Path("D:/Farmer_Crop_Advisory_/Plant Village Dataset/Test/Tomato - Early Blight")

    test_files = [p for p in test_dir.iterdir() if p.suffix.lower() in ('.jpg', '.jpeg', '.png')]
    assert len(test_files) > 0, "No test images found"

    with open(test_files[0], "rb") as f:
        img_bytes = f.read()

    files = {"image": ("early_blight.jpg", img_bytes, "image/jpeg")}
    response = client.post("/api/v1/disease/predict", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["is_healthy"] is False
    assert "Early Blight" in data["disease"]
    assert data["treatment_hint"] is not None


def test_tc008_disease_prediction_unsupported_file(client):
    """TC-008: Unsupported file type is rejected."""
    buf = io.BytesIO(b"Not an image file content")
    files = {"image": ("malicious.exe", buf, "application/x-msdownload")}
    response = client.post("/api/v1/disease/predict", files=files)
    assert response.status_code in (400, 422)


def test_tc011_chatbot_advisory_question(client):
    """TC-011: Chatbot returns context-aware response for crop question."""
    payload = {
        "message": "Why was tomato recommended?",
        "context": {
            "crop": "tomato",
            "soil_type": "clay",
            "suitability_score": 75.0,
            "suitability_label": "acceptable",
            "temperature": 25.0,
            "humidity": 65.0
        },
        "history": []
    }
    response = client.post("/api/v1/chat", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert len(data["answer"]) > 10
    assert data["available"] is True
