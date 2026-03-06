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

# ── 4. Environment variables for Codespaces ──────
ENVFILE=".env.local"
if [ ! -f "$ENVFILE" ]; then
  echo "▸ Creating $ENVFILE for Codespaces..."
  CODESPACE_DOMAIN="${CODESPACE_NAME:-localhost}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-preview.app.github.dev}"
  cat > "$ENVFILE" <<EOF
PORT=5000
EXPO_PUBLIC_DOMAIN=https://${CODESPACE_DOMAIN}:5000
NODE_ENV=development
EOF
  echo "✓ $ENVFILE created"
else
  echo "✓ $ENVFILE already exists — skipping"
fi

echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Start the backend:"
echo "    npm run server:dev"
echo ""
echo "  Start the Expo frontend (separate terminal):"
echo "    npx expo start --web --port 8081"
echo ""
echo "  Or run both together:"
echo "    bash .devcontainer/start.sh"
echo "============================================"
