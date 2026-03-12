#!/bin/bash
# ============================================================
# RMS — One-shot VPS setup script
# Tested on Ubuntu 22.04 / 24.04 (DigitalOcean, AWS EC2, etc.)
# Run as root: bash setup-vps.sh
# ============================================================
set -euo pipefail

DOMAIN=${1:-""}    # Pass your domain: bash setup-vps.sh yourdomain.com
EMAIL=${2:-""}     # For SSL cert:     bash setup-vps.sh yourdomain.com you@email.com

echo "🚀  Starting RMS VPS setup..."

# ── 1. System packages ─────────────────────────────────────
apt-get update -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

# ── 2. Node.js 20 ──────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# ── 3. Docker & Docker Compose ─────────────────────────────
curl -fsSL https://get.docker.com | bash
systemctl enable docker && systemctl start docker

# ── 4. Firewall ────────────────────────────────────────────
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── 5. Clone / pull repo ───────────────────────────────────
if [ -d "/opt/rms" ]; then
  cd /opt/rms && git pull
else
  git clone https://github.com/YOUR_USERNAME/rms.git /opt/rms
  cd /opt/rms
fi

# ── 6. Environment files ───────────────────────────────────
if [ ! -f /opt/rms/.env ]; then
  cp /opt/rms/.env.example /opt/rms/.env
  echo ""
  echo "⚠️   Edit /opt/rms/.env with your secrets before continuing:"
  echo "    DB_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CLIENT_URL"
  echo "    Then re-run this script."
  exit 1
fi

# ── 7. Start PostgreSQL via Docker ─────────────────────────
source /opt/rms/.env
docker run -d \
  --name rms_postgres \
  --restart unless-stopped \
  -e POSTGRES_DB=rms_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
  -p 127.0.0.1:5432:5432 \
  -v rms_pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

echo "⏳  Waiting for PostgreSQL..."
sleep 8

# ── 8. Run DB schema ───────────────────────────────────────
docker exec -i rms_postgres psql -U postgres -d rms_db \
  < /opt/rms/server/src/db/migrations/001_initial_schema.sql

# ── 9. Install server deps & seed ─────────────────────────
cd /opt/rms/server
npm ci --only=production
DB_HOST=localhost DB_PASSWORD="${DB_PASSWORD}" node -e "
  const knex = require('./src/config/database');
  Promise.all([
    knex.raw('SELECT 1')
  ]).then(() => { console.log('DB OK'); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
"
npm run seed 2>/dev/null || echo "Seeds already applied or skipped"

# ── 10. Build frontend ─────────────────────────────────────
cd /opt/rms/client
npm ci
VITE_API_URL="https://${DOMAIN}" npm run build

# Copy to Nginx web root
mkdir -p /var/www/rms
cp -r dist/* /var/www/rms/

# ── 11. Nginx config ───────────────────────────────────────
cat > /etc/nginx/sites-available/rms << NGINX_EOF
server {
    listen 80;
    server_name ${DOMAIN:-localhost};
    root /var/www/rms;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript image/svg+xml;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    location /socket.io/ {
        proxy_pass         http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_set_header   Host \$host;
        proxy_read_timeout 86400;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/rms /etc/nginx/sites-enabled/rms
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 12. SSL (if domain provided) ───────────────────────────
if [ -n "${DOMAIN}" ] && [ -n "${EMAIL}" ]; then
  certbot --nginx -d "${DOMAIN}" --email "${EMAIL}" \
    --agree-tos --non-interactive --redirect
  echo "✅  SSL certificate installed for ${DOMAIN}"
fi

# ── 13. Start backend with PM2 ─────────────────────────────
cd /opt/rms
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

echo ""
echo "✅  RMS deployed successfully!"
echo "🌐  App:    http${DOMAIN:+s}://${DOMAIN:-YOUR_SERVER_IP}"
echo "📊  PM2:    pm2 status"
echo "📋  Logs:   pm2 logs rms-server"
echo "🔄  Update: cd /opt/rms && git pull && pm2 restart rms-server"
