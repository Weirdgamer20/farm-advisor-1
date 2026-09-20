# Farmer Crop Advisory System — Setup & Run Guide

## Prerequisites (WSL Ubuntu)
- Python 3.10+
- Node.js 18+ (installed automatically by start.sh if missing)
- Internet connection (for Open-Meteo weather, Google Fonts)

## Quick Start (WSL)

```bash
# From WSL terminal:
cd /mnt/d/Farmer_Crop_Advisory_
bash start.sh
```

The launcher will:
1. Create a Python virtual environment in `backend/.venv`
2. Install all backend dependencies
3. Train the crop recommendation model (first run only, ~30s)
4. Install frontend npm packages
5. Start both services

**Backend:**  `http://localhost:8000`
**Frontend:** `http://localhost:5173`
**API Docs:**  `http://localhost:8000/docs`

---

## Manual Start

### Backend
```bash
cd /mnt/d/Farmer_Crop_Advisory_/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Train crop model (only needed once)
python3 scripts/train_crop_model.py

# Start server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd /mnt/d/Farmer_Crop_Advisory_/frontend
npm install
npm run dev
```

---

## Configuration

Copy `backend/.env.example` to `backend/.env` and set:

| Variable | Default | Description |
|---|---|---|
| `CHAT_PROVIDER` | `rule_based` | Chat engine: `rule_based`, `gemini`, `openai` |
| `GEMINI_API_KEY` | _(empty)_ | Google Gemini API key (optional) |
| `OPENAI_API_KEY` | _(empty)_ | OpenAI API key (optional) |
| `ALLOWED_ORIGINS` | `localhost:5173` | CORS allowed origins |
| `RATE_LIMIT_PER_MINUTE` | `60` | API rate limit |

---

## Project Structure

```
Farmer_Crop_Advisory_/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app
│   │   ├── config.py        # Settings
│   │   ├── routers/         # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── ml/              # Model wrappers
│   │   └── schemas/         # Pydantic models
│   ├── scripts/
│   │   └── train_crop_model.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/           # Home, Advisory, Disease
│       ├── components/      # Navbar, Chatbot, AdvisoryCard, etc.
│       ├── api/             # Typed API client
│       └── hooks/           # useGeolocation
├── models/                  # ML artifacts (pre-trained + trained)
├── Plant Village Dataset/   # Training data
└── start.sh                 # WSL launcher
```

---

## ML Models

| Model | File | Description |
|---|---|---|
| Plant Disease CNN | `plant_disease_model.keras` | 29-class disease classifier (PlantVillage) |
| Soil Suitability | `soil_condition_model.keras` | 0-100 suitability regressor |
| Crop Recommendation | `crop_model.pkl` | Random Forest (trained at first launch) |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/advisory` | Generate crop advisory |
| POST | `/api/v1/disease/predict` | Classify leaf disease |
| POST | `/api/v1/chat` | Chatbot response |

See full docs at `http://localhost:8000/docs` (Swagger UI).

---

## Supported Crops
Apple · Bell Pepper · Cherry · Grapes · Maize · Peach · Potato · Strawberry · Tomato

## Supported Soil Types
Loamy · Sandy · Clay · Silt · Peaty · Chalky · Saline

---

## Disclaimer
All ML predictions are decision-support tools only. Always consult a qualified agricultural expert before applying treatments or making major farming decisions.
