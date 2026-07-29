#!/bin/bash

# Ensure we clean up background processes on exit
trap "kill 0" EXIT

echo "============================================="
echo "  NETWORK INTELLIGENCE MONITOR - STARTUP     "
echo "============================================="

# Start Backend
echo "[*] Starting FastAPI Backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "[!] Virtual environment not found in backend/. Run setup first."
    exit 1
fi

echo "[!] Note: Sudo is required for Scapy packet capturing on macOS."
sudo venv/bin/python main.py &
BACKEND_PID=$!

# Start Frontend
echo "[*] Starting Vite/React Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "============================================="
echo "  Dashboard running at: http://localhost:5173"
echo "  API running at: http://localhost:8000      "
echo "  Press Ctrl+C to stop all services.         "
echo "============================================="

# Keep script running
wait
