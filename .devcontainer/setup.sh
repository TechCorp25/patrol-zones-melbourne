#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo "  Patrol Zones Melbourne — Codespaces Setup"
echo "============================================"
echo ""

# ── 1. Node dependencies ──────────────────────────
echo "▸ Installing Node.js dependencies..."
npm ci
echo "✓ Node modules installed"

# ── 2. Patch-package (Metro basePath patches) ─────
echo "▸ Applying patches..."
npm run postinstall
echo "✓ Patches applied"

# ── 3. Python dependencies (for data scripts) ────
echo "▸ Installing Python dependencies..."
pip install --quiet --no-cache-dir \
  orjson pyproj requests rtree shapely tqdm
echo "✓ Python packages installed"

# ── 4. Environment file for Codespaces ────────────
ENVFILE=".env.codespaces"
echo "▸ Creating $ENVFILE..."

if [ -n "${CODESPACE_NAME:-}" ] && [ -n "${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-}" ]; then
  BACKEND_URL="https://${CODESPACE_NAME}-5000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  FRONTEND_URL="https://${CODESPACE_NAME}-8081.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  BACKEND_URL="http://localhost:5000"
  FRONTEND_URL="http://localhost:8081"
fi

cat > "$ENVFILE" <<EOF
PORT=5000
EXPO_PUBLIC_DOMAIN=${BACKEND_URL}
CODESPACES_BACKEND_URL=${BACKEND_URL}
CODESPACES_FRONTEND_URL=${FRONTEND_URL}
NODE_ENV=development
EOF
echo "✓ $ENVFILE created"
echo "  Backend URL:  ${BACKEND_URL}"
echo "  Frontend URL: ${FRONTEND_URL}"

echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Run both servers:"
echo "    bash .devcontainer/start.sh"
echo ""
echo "  Or start individually:"
echo "    Terminal 1:  bash .devcontainer/start.sh backend"
echo "    Terminal 2:  bash .devcontainer/start.sh frontend"
echo "============================================"
