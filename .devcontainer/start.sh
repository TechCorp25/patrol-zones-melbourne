#!/usr/bin/env bash
set -euo pipefail

ENVFILE=".env.codespaces"

if [ -f "$ENVFILE" ]; then
  echo "▸ Loading environment from $ENVFILE..."
  set -a
  source "$ENVFILE"
  set +a
fi

if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  export CODESPACES_BACKEND_URL="https://${CODESPACE_NAME}-5000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  export CODESPACES_FRONTEND_URL="https://${CODESPACE_NAME}-8081.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  export EXPO_PUBLIC_DOMAIN="${CODESPACES_BACKEND_URL}"
fi

MODE="${1:-both}"

start_backend() {
  echo "▸ Starting Express backend on port ${PORT:-5000}..."
  npx tsx server/index.ts
}

start_frontend() {
  echo "▸ Starting Expo frontend on port 8081..."
  EXPO_PUBLIC_DOMAIN="${EXPO_PUBLIC_DOMAIN:-http://localhost:5000}" \
    npx expo start --web --port 8081
}

case "$MODE" in
  backend)
    start_backend
    ;;
  frontend)
    start_frontend
    ;;
  both)
    echo "Starting Patrol Zones Melbourne..."
    echo ""

    cleanup() {
      echo ""
      echo "Shutting down..."
      kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
      wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
      echo "Done."
    }
    trap cleanup EXIT INT TERM

    start_backend &
    BACKEND_PID=$!

    sleep 3

    start_frontend &
    FRONTEND_PID=$!

    echo ""
    echo "============================================"
    echo "  Backend:  ${CODESPACES_BACKEND_URL:-http://localhost:5000}"
    echo "  Frontend: ${CODESPACES_FRONTEND_URL:-http://localhost:8081}"
    echo ""
    echo "  Press Ctrl+C to stop both servers"
    echo "============================================"

    wait
    ;;
  *)
    echo "Usage: bash .devcontainer/start.sh [backend|frontend|both]"
    exit 1
    ;;
esac
