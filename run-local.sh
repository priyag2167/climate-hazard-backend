#!/usr/bin/env bash
# Quick launcher to run the Climate Hazard Trend Analyzer locally without Docker.

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=================================================="
echo " Starting Climate Hazard Trend Analyzer"
echo "=================================================="

# 1. Start MongoDB if not already running
echo "[1/3] Checking MongoDB service..."
if ! mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q "1"; then
    echo "       Attempting to start MongoDB via brew services..."
    brew services start mongodb-community >/dev/null 2>&1 || true
    sleep 1
fi

if ! mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q "1"; then
    echo "       Starting mongod directly in background..."
    mongod --config /opt/homebrew/etc/mongod.conf --fork >/dev/null 2>&1 || true
    sleep 1
fi

if mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null | grep -q "1"; then
    echo "       MongoDB is running on port 27017."
else
    echo "       Error: Could not start MongoDB. Please run: mongod --config /opt/homebrew/etc/mongod.conf"
    exit 1
fi

# 2. Start Backend FastAPI
echo "[2/3] Starting FastAPI backend on http://127.0.0.1:8000..."
cd "$PROJECT_ROOT/backend"
if [ ! -d ".venv" ]; then
    echo "       Creating Python virtual environment..."
    python3 -m venv .venv
    .venv/bin/python -m pip install -r requirements-dev.txt
fi

.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# 3. Start Frontend Vite Dev Server
echo "[3/3] Starting Vite frontend on http://localhost:5173..."
cd "$PROJECT_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    echo "       Installing frontend npm packages..."
    npm install
fi

npm run dev &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "Servers stopped."
}
trap cleanup EXIT INT TERM

echo ""
echo "=================================================="
echo " Application is running!"
echo "   - Frontend:  http://localhost:5173"
echo "   - API Docs:  http://127.0.0.1:8000/docs"
echo "   - Health:    http://127.0.0.1:8000/api/health"
echo " Press Ctrl+C to stop all servers."
echo "=================================================="
echo ""

wait
