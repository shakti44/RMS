#!/bin/bash
# ============================================================
# RMS — Zero-downtime update script
# Run on VPS: bash deploy/update.sh
# ============================================================
set -euo pipefail

cd /opt/rms

echo "📦  Pulling latest code..."
git pull origin main

echo "📦  Updating server dependencies..."
cd server && npm ci --only=production && cd ..

echo "🏗️   Rebuilding frontend..."
cd client
source /opt/rms/.env
VITE_API_URL="https://$(grep CLIENT_URL /opt/rms/.env | cut -d'=' -f2 | sed 's|https://||')" npm run build
cp -r dist/* /var/www/rms/
cd ..

echo "♻️   Restarting backend (zero-downtime)..."
pm2 reload rms-server --update-env

echo "✅  Update complete. $(pm2 list | grep rms-server)"
