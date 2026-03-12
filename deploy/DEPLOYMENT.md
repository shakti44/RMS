# RMS Deployment Guide

## Option A — Railway + Vercel (Free, 15 min)

### 1. Push to GitHub
```bash
cd C:\Users\Lenovo\HMS
git init
git add .
git commit -m "initial commit"
gh repo create rms --public --push   # or push to existing repo
```

### 2. Deploy Backend → Railway
1. Go to **railway.app** → New Project → Deploy from GitHub repo
2. Select your repo
3. Add a **PostgreSQL** plugin (Railway provides it free)
4. Set environment variables in Railway dashboard:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `DB_HOST` | *(copy from Railway Postgres plugin → Variables → PGHOST)* |
| `DB_PORT` | *(PGPORT)* |
| `DB_NAME` | *(PGDATABASE)* |
| `DB_USER` | *(PGUSER)* |
| `DB_PASSWORD` | *(PGPASSWORD)* |
| `JWT_ACCESS_SECRET` | *(run: `openssl rand -hex 64`)* |
| `JWT_REFRESH_SECRET` | *(run: `openssl rand -hex 64`)* |
| `CLIENT_URL` | *(your Vercel URL — add after step 3)* |

5. Railway auto-deploys. Copy the generated URL: `https://rms-xxx.railway.app`

6. **Run DB schema** — in Railway dashboard → your service → Shell:
```bash
psql $DATABASE_URL < server/src/db/migrations/001_initial_schema.sql
npm run seed
```

### 3. Deploy Frontend → Vercel
1. Go to **vercel.com** → New Project → Import GitHub repo
2. **Root Directory**: `client`
3. **Framework**: Vite (auto-detected)
4. Add environment variable:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://rms-xxx.railway.app` (your Railway URL) |

5. Deploy. Copy Vercel URL and update `CLIENT_URL` in Railway.

### 4. Seed demo data
In Railway Shell:
```bash
cd server && npm run seed
```

**Done.** Your app is live at your Vercel URL.

---

## Option B — DigitalOcean VPS + Docker (Production, $6/mo)

### 1. Create Droplet
- Image: **Ubuntu 24.04**
- Size: **Basic $6/mo** (1 vCPU, 1GB RAM) — handles ~50 concurrent users
- Add your SSH key
- Note the IP address

### 2. Point your domain (optional)
Add an **A record** in your DNS: `@ → YOUR_IP`

### 3. SSH and run setup script
```bash
ssh root@YOUR_SERVER_IP

# Clone repo
git clone https://github.com/YOUR_USERNAME/rms.git /opt/rms
cd /opt/rms

# Configure environment
cp .env.example .env
nano .env
# Fill in: DB_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
# CLIENT_URL = https://yourdomain.com

# Run setup (with domain + SSL)
bash deploy/setup-vps.sh yourdomain.com your@email.com

# OR without domain (IP only)
bash deploy/setup-vps.sh
```

### 4. Useful commands on VPS
```bash
pm2 status                    # Process status
pm2 logs rms-server           # Live logs
pm2 restart rms-server        # Restart backend
pm2 monit                     # CPU/RAM monitor

bash /opt/rms/deploy/update.sh   # Pull & deploy updates

# Database backup
docker exec rms_postgres pg_dump -U postgres rms_db > backup_$(date +%Y%m%d).sql
```

---

## Option C — Docker Compose (any server)

```bash
# 1. SSH into server, clone repo
git clone https://github.com/YOUR_USERNAME/rms.git && cd rms

# 2. Set secrets
cp .env.example .env && nano .env

# 3. Deploy
docker compose up -d --build

# 4. Seed
docker compose exec server npm run seed
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DB_HOST` | ✅ | PostgreSQL host |
| `DB_PORT` | ✅ | PostgreSQL port (default 5432) |
| `DB_NAME` | ✅ | Database name |
| `DB_USER` | ✅ | Database user |
| `DB_PASSWORD` | ✅ | Database password |
| `JWT_ACCESS_SECRET` | ✅ | 64-char random hex |
| `JWT_REFRESH_SECRET` | ✅ | Different 64-char random hex |
| `JWT_ACCESS_EXPIRY` | | Default: `15m` |
| `JWT_REFRESH_EXPIRY` | | Default: `7d` |
| `CLIENT_URL` | ✅ | Frontend URL (for CORS) |
| `PORT` | | Default: `4000` |
| `NODE_ENV` | | `production` |
| `LOG_LEVEL` | | `info` (prod) / `debug` (dev) |

Generate secrets:
```bash
# Linux/Mac
openssl rand -hex 64

# Windows PowerShell
[System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64)).Replace("-","").ToLower()
```

---

## Architecture in Production

```
Browser / Mobile
      │
      ▼
  Vercel CDN          (React static assets, global edge)
      │
      │  /api/*  →
      │  /socket.io/*  →
      ▼
  Railway / Nginx
      │
      ▼
  Node.js + Socket.io  (PM2 cluster, 4000)
      │
      ▼
  PostgreSQL           (Railway plugin / Docker container)
```
