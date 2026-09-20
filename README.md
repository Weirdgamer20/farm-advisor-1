# FarmAI — Farmer Crop Advisory System

AI-powered agricultural decision-support web application combining **machine learning, live weather context, geospatial soil intelligence, plant-disease image classification, and a contextual chatbot**.

> **Project status:** Academic / certificate project  
> **Access model:** Guest — no registration required  
> **Primary platform:** Responsive web application

---

## 1. Overview

FarmAI helps a user evaluate crop suitability from a geographic location and environmental conditions, then optionally inspect a plant/leaf image for disease classification.

### Core flow

```text
Browser GPS
    │
    ├── Soil Intelligence
    ├── Live Weather
    └── Selected Crop
            │
            ▼
     Advisory Engine
            │
      ┌─────┴─────┐
      ▼           ▼
 Soil Suitability  Crop Model
      │           │
      └─────┬─────┘
            ▼
       Explanation
```

Disease detection uses a separate vision pipeline:

```text
Leaf / Plant Image
       │
       ▼
File Validation
       │
       ▼
Image Preprocessing
       │
       ▼
Plant Disease CNN
       │
       ▼
Disease + Confidence
```

The chatbot provides contextual explanations of advisory and disease results. The core chatbot works in **rule-based/offline mode**, with optional external providers.

---

## 2. Current Features

### Crop Advisory

- Browser GPS / manual coordinate fallback
- Automatic soil intelligence from coordinates
- Real-time weather data
- Crop suitability analysis
- Suitability score and label
- Model confidence
- Human-readable explanation
- Crop-specific soil profile information

### Plant Disease Detection

- Upload JPEG, PNG, or WebP image
- Maximum upload size: 10 MB
- Image-content validation before inference
- **29-class** plant disease / healthy classifier
- Disease confidence score
- Crop and condition information
- Treatment hint where available

### Contextual Chatbot

- Rule-based default provider
- No external API key required for default operation
- Uses current advisory / disease context
- Optional Gemini or OpenAI provider support via environment configuration

### Security

- FastAPI request validation
- CORS allowlist
- API rate limiting with `slowapi`
- Secure image type/size/content checks
- Generic global error handling
- Request IDs for troubleshooting
- No authentication required by design
- No secrets required in the frontend

---

## 3. ML Models

### 3.1 Crop Recommendation Model

**Algorithm:** Random Forest Classifier  
**Estimators:** 300  
**Random state:** 42

#### Input features

| Feature |
|---|
| Nitrogen (N) |
| Phosphorus (P) |
| Potassium (K) |
| Temperature |
| Humidity |
| pH |
| Rainfall |

#### Current model classes

```text
Apple
Bell Pepper
Cherry
Grapes
Maize
Peach
Potato
Strawberry
Tomato
```

#### Recorded evaluation metadata

- Training rows: **7,650**
- Test rows: **1,350**
- Test accuracy: **71.11%**

Feature importance recorded in the model metadata:

| Feature | Importance |
|---|---:|
| K | 0.2143 |
| N | 0.2007 |
| Temperature | 0.1486 |
| P | 0.1445 |
| pH | 0.1011 |
| Humidity | 0.0980 |
| Rainfall | 0.0928 |

> The crop model currently evaluates the **selected crop under the supplied conditions**. It should be described as a crop suitability/advisory model unless the implementation is extended to rank all supported crops automatically.

### 3.2 Soil Suitability Model

A Keras regression model predicts a **0–100 crop-conditioned soil/environment suitability score**.

Model inputs:

- N
- P
- K
- Temperature
- Humidity
- pH
- Rainfall
- Crop encoding

Recorded evaluation metadata:

- Training rows: **6,300**
- Validation rows: **1,350**
- Test rows: **1,350**
- Test MAE: **2.2174**
- Test RMSE: **2.8279**
- Prediction-target correlation: **0.9734**

### Important methodological note

The repository metadata states that the soil-suitability target was **derived from crop-specific distributions in the supplied CSV because the CSV does not contain a direct `soil_condition` ground-truth label**.

Therefore, this component should be presented as a **derived suitability scoring model**, not as a model trained on independently measured soil-condition labels.

### 3.3 Plant Disease Model

**Architecture:** Keras image-classification model  
**Classes:** 29

Current class family includes healthy and disease categories for:

- Apple
- Bell Pepper
- Cherry
- Corn / Maize
- Grape
- Peach
- Potato
- Strawberry
- Tomato

Deployed artifact:

```text
models/plant_disease_model.keras
```

Class mapping:

```text
models/plant_disease_classes.json
```

---

## 4. Dataset

The repository currently contains:

```text
Plant Village Dataset/
└── crop_recommendation_10000.csv
```

The crop model metadata indicates that the training/evaluation pipeline used a 9-class crop dataset derived from the supplied CSV.

The image model uses a PlantVillage-style labeled image dataset represented by the deployed disease model and class mapping.

> Dataset-specific source/license and image-count details should be documented separately before final academic submission.

---

## 5. Technology Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Dropzone
- Framer Motion
- Lucide React

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic / pydantic-settings
- scikit-learn
- TensorFlow / Keras
- Pillow
- HTTPX
- SlowAPI
- python-dotenv

### External data

- Open-Meteo weather integration
- Optional Gemini/OpenAI chatbot providers

The core application is designed so the default chatbot mode works without a paid AI API.

---

## 6. System Architecture

```text
                 ┌───────────────────────┐
                 │      Web Browser      │
                 │ React + TypeScript    │
                 └───────────┬───────────┘
                             │ HTTPS / JSON
                             ▼
                 ┌───────────────────────┐
                 │     FastAPI API       │
                 ├───────────────────────┤
                 │ Validation / CORS      │
                 │ Rate Limiting          │
                 │ Error Handling         │
                 └───────────┬───────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     Advisory Service  Disease Service  Chat Service
            │                │                │
       ┌────┴────┐           ▼                ▼
       ▼         ▼      Disease CNN     Rule-based /
  Soil Model  Crop Model               Optional LLM
       │         │
       └────┬────┘
            ▼
      Weather Service
            │
            ▼
       Open-Meteo
```

---

## 7. Backend API

Base path:

```text
/api/v1
```

### Health

```http
GET /api/v1/health
```

Returns service/model health.

### Advisory

```http
POST /api/v1/advisory
```

Generates crop suitability/advisory using latitude, longitude, crop, optional soil override, live weather, the soil model, and the crop model.

### Automatic Soil Detection

```http
GET /api/v1/soil/detect?latitude=<lat>&longitude=<lon>
```

Returns detected soil information and related metadata.

### Disease Detection

```http
POST /api/v1/disease/predict
Content-Type: multipart/form-data
```

Field: `image`

Accepted formats: JPEG, PNG, WebP.

### Chatbot

```http
POST /api/v1/chat
```

Accepts a user message plus bounded advisory/disease context and returns a contextual answer.

---

## 8. Frontend Pages

### Home

```text
/
```

Landing page and project introduction.

### Advisory

```text
/advisory
```

Provides GPS location, soil intelligence, crop selection, advisory generation, weather context, suitability result, and chatbot.

### Disease Detection

```text
/disease
```

Provides image upload, preview, validation, disease inference, confidence, and contextual chatbot.

---

## 9. Security Model

FarmAI intentionally uses **guest access** for the academic MVP.

There is no:

- User account system
- Password database
- Admin dashboard
- Authentication service

### Implemented API controls

- Pydantic request validation
- Latitude/longitude range validation
- CORS configuration
- Rate limiting
- Generic exception responses
- Request IDs
- Image MIME-type validation
- Image size limits
- Image-content validation

### Production requirements

For deployment outside the academic environment:

- HTTPS
- Strict production CORS origins
- Secret management
- Reverse proxy
- Dependency vulnerability scanning
- Log monitoring
- Appropriate retention policy for location/image data

---

## 10. Configuration

Copy `backend/.env.example` to `backend/.env`.

| Variable | Purpose |
|---|---|
| `CHAT_PROVIDER` | `rule_based`, `gemini`, or `openai` |
| `GEMINI_API_KEY` | Optional Gemini API key |
| `OPENAI_API_KEY` | Optional OpenAI API key |
| `ALLOWED_ORIGINS` | CORS origin allowlist |
| `RATE_LIMIT_PER_MINUTE` | API rate limit |

Do not commit real API keys.

---

## 11. Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- Internet connection for weather data and frontend assets

### Automated WSL launcher

```bash
bash start.sh
```

The launcher provisions the Python environment, installs dependencies, verifies/trains the crop model when necessary, configures the environment, and starts both services.

### Manual backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Manual frontend

```bash
cd frontend
npm install
npm run dev
```

### Local endpoints

```text
Frontend  → http://localhost:5173
Backend   → http://localhost:8000
Swagger   → http://localhost:8000/docs
Health    → http://localhost:8000/api/v1/health
```

---

## 12. Project Structure

```text
farm-advisor-1/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   ├── services/
│   │   ├── ml/
│   │   └── schemas/
│   ├── scripts/
│   ├── tests/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   └── hooks/
│   ├── package.json
│   └── vite.config.ts
│
├── models/
│   ├── crop_model_metadata.json
│   ├── feature_scaler.pkl
│   ├── label_encoder.pkl
│   ├── crop_model.pkl
│   ├── soil_condition_model.keras
│   ├── soil_condition_metadata.json
│   ├── soil_condition_profiles.json
│   ├── plant_disease_model.keras
│   └── plant_disease_classes.json
│
├── Plant Village Dataset/
│   └── crop_recommendation_10000.csv
│
├── README.md
├── README_SETUP.md
└── start.sh
```

---

## 13. Project Documentation

1. Problem Statement
2. SRS
3. System Architecture
4. ER Diagram / Data Model
5. Dataset
6. Data Preprocessing
7. ML Model
8. Model Evaluation
9. Chatbot
10. Backend API
11. Database Strategy
12. Frontend
13. Security & Access Control
14. Test Cases
15. API Documentation
16. Deployment
17. Final Project Report
18. Project Presentation

---

## 14. Limitations

This is an academic decision-support prototype.

- Model performance is bounded by the supplied dataset.
- The crop model currently evaluates the selected crop rather than automatically ranking every crop.
- Weather data depends on external provider availability.
- Disease classification depends on image quality and dataset coverage.
- The soil suitability target is derived rather than directly observed in the source CSV.
- The system should not be treated as a guaranteed agricultural diagnosis or prescription.

---

## 15. Future Improvements

- Multi-crop ranking and recommendation
- More crops and disease classes
- Soil-test/NPK input from actual field measurements
- Local-language support
- Offline/PWA workflows
- Expert review
- Persistent farmer profiles
- Historical advisory tracking
- More rigorous geographic validation
- Model calibration and uncertainty estimation
- Production-grade observability and monitoring

---

## 16. Disclaimer

**FarmAI provides AI/ML-based decision support for educational and demonstration purposes. Predictions are not guaranteed agricultural diagnoses or prescriptions. Users should verify important farming decisions with qualified local agricultural professionals and validated agricultural guidance.**