#!/usr/bin/env bash
set -euo pipefail

echo "Starting Patrol Zones Melbourne..."
echo ""

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

echo "▸ Starting Express backend on port 5000..."
npm run server:dev &
BACKEND_PID=$!

sleep 2

echo "▸ Starting Expo frontend on port 8081..."
npx expo start --web --port 8081 &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  Backend:  http://localhost:5000"
echo "  Frontend: http://localhost:8081"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "============================================"

wait
