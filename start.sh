#!/usr/bin/env bash
# =============================================================================
# FarmAI — Farmer Crop Advisory System — WSL Launcher
# Usage: bash start.sh
# =============================================================================

set -e

# Ensure local bin (virtualenv, etc.) is on PATH
export PATH="$PATH:$HOME/.local/bin"

# Load nvm for Node.js
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
MODEL_DIR="$PROJECT_DIR/models"
VENV_DIR="$BACKEND_DIR/.venv"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════╗"
echo "║          FarmAI — Crop Advisory System         ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Backend virtual environment ────────────────────────────────────────────
echo -e "${CYAN}[1/6] Setting up Python virtual environment...${NC}"
if [ ! -d "$VENV_DIR" ] || [ ! -f "$VENV_DIR/bin/python" ]; then
    if command -v uv &> /dev/null; then
        echo -e "${YELLOW}   Using uv to provision Python 3.11 virtualenv...${NC}"
        uv python install 3.11
        uv venv "$VENV_DIR" --python 3.11
    else
        if ! command -v virtualenv &> /dev/null; then
            pip3 install virtualenv --break-system-packages -q
        fi
        virtualenv "$VENV_DIR"
    fi
fi
source "$VENV_DIR/bin/activate"

echo -e "${CYAN}[2/6] Installing backend dependencies...${NC}"
if command -v uv &> /dev/null; then
    uv pip install -q -r "$BACKEND_DIR/requirements.txt" --python "$VENV_DIR/bin/python"
else
    pip install -q -r "$BACKEND_DIR/requirements.txt"
fi

# ── 2. Train crop model if not present ────────────────────────────────────────
echo -e "${CYAN}[3/6] Checking crop recommendation model...${NC}"
if [ ! -f "$MODEL_DIR/crop_model.pkl" ]; then
    echo -e "${YELLOW}   Crop model not found — training now (this takes ~30s)...${NC}"
    python3 "$BACKEND_DIR/scripts/train_crop_model.py"
else
    echo -e "${GREEN}   Crop model found ✓${NC}"
fi

# ── 3. Copy .env if not present ───────────────────────────────────────────────
echo -e "${CYAN}[4/6] Checking environment configuration...${NC}"
if [ ! -f "$BACKEND_DIR/.env" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    echo -e "${YELLOW}   Created .env from example. Edit backend/.env to configure.${NC}"
fi

# ── 4. Node / npm ─────────────────────────────────────────────────────────────
echo -e "${CYAN}[5/6] Setting up frontend...${NC}"

# Find node/npm in nvm if not on PATH
if ! command -v npm &> /dev/null; then
    if [ -d "$HOME/.nvm/versions/node" ]; then
        LATEST_NODE=$(ls -d "$HOME/.nvm/versions/node/"* 2>/dev/null | tail -1)
        if [ -n "$LATEST_NODE" ]; then
            export PATH="$LATEST_NODE/bin:$PATH"
        fi
    fi
fi

if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}   npm not found — installing Node.js via nvm...${NC}"
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    source "$NVM_DIR/nvm.sh"
    nvm install 22
fi

echo -e "${CYAN}   Installing frontend packages...${NC}"
cd "$FRONTEND_DIR"
npm install --silent

# ── 5. Launch both services ───────────────────────────────────────────────────
echo -e "${CYAN}[6/6] Launching services...${NC}"
echo ""
echo -e "${GREEN}  Backend  → http://localhost:8000${NC}"
echo -e "${GREEN}  Frontend → http://localhost:5173${NC}"
echo -e "${GREEN}  API Docs → http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}  Press Ctrl+C to stop both services.${NC}"
echo ""

# Activate venv for background process
source "$VENV_DIR/bin/activate"

# Start backend
cd "$BACKEND_DIR"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
cd "$FRONTEND_DIR"
npm run dev -- --host &
FRONTEND_PID=$!

# Cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Health check
sleep 5
if curl -sf http://localhost:8000/api/v1/health > /dev/null; then
    echo -e "${GREEN}✅ Backend healthy!${NC}"
else
    echo -e "${YELLOW}⚠  Backend still starting up...${NC}"
fi

wait
