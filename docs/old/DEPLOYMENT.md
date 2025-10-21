# Deployment Guide

This guide explains how to deploy the Constellation API to production.

## Deploy to Render (Recommended - Free Tier)

### Prerequisites

1. GitHub account with this repo pushed
2. Render account (sign up at https://render.com)

### Quick Deploy

**Option 1: One-Click Deploy (Easiest)**

1. Go to https://render.com/deploy
2. Connect your GitHub repository
3. Render will auto-detect `render.yaml`
4. Click **Create** and wait 3-5 minutes
5. Your API will be live at: `https://constellation-api.onrender.com`

**Option 2: Manual Setup**

1. **Create Web Service:**
   - Go to https://dashboard.render.com
   - Click **New +** → **Web Service**
   - Connect your GitHub repo
   - Configure:
     - **Name:** `constellation-api`
     - **Region:** Oregon (US West)
     - **Branch:** `main`
     - **Runtime:** Python
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `cd apps/api && uvicorn src.main:app --host 0.0.0.0 --port $PORT`
     - **Plan:** Free

2. **Create Database:**
   - Click **New +** → **PostgreSQL**
   - **Name:** `constellation-db`
   - **Database:** `planet`
   - **Plan:** Free
   - Copy the **Internal Database URL**

3. **Set Environment Variables:**
   - In your web service settings, add:
     - `DATABASE_URL` = (paste Internal Database URL)
     - `PYTHON_VERSION` = `3.11`

4. **Deploy:**
   - Click **Create Web Service**
   - Wait 3-5 minutes for deployment

### Run Database Migrations

After first deploy, run migrations via Render Shell:

```bash
# In Render Dashboard → Web Service → Shell
cd /opt/render/project/src
python3 -m alembic -c db/alembic.ini upgrade head
```

Or set up automatic migrations by updating `render.yaml`:

```yaml
services:
  - type: web
    buildCommand: |
      pip install -r requirements.txt
      cd db && alembic upgrade head
```

### Verify Deployment

Visit these URLs:

- **API Info:** https://constellation-api.onrender.com/
- **Health Check:** https://constellation-api.onrender.com/health
- **API Docs:** https://constellation-api.onrender.com/docs
- **List Jobs:** https://constellation-api.onrender.com/jobs

### Important Notes

**Free Tier Limitations:**
- ⚠️ Service spins down after 15 minutes of inactivity
- ⚠️ First request after sleep takes ~30 seconds to wake up
- ⚠️ Database limited to 90 days on free tier (then $7/month)

**Upgrade to Paid ($7/month per service):**
- No sleep/spin-down
- Faster performance
- Persistent database

---

## Deploy to Railway (Alternative)

### Quick Deploy

1. Go to https://railway.app
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway auto-detects Python
5. Add PostgreSQL database (click **New** → **Database** → **PostgreSQL**)
6. Set environment variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Railway reference)
7. Deploy!

**Cost:** $5 free credit/month, then ~$5-10/month

---

## Deploy to Fly.io (Advanced)

### Setup

```bash
# Install flyctl
brew install flyctl

# Login
flyctl auth login

# Launch app
flyctl launch
```

### Configure `fly.toml`

```toml
app = "constellation-api"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

### Deploy

```bash
flyctl deploy
```

**Cost:** 3 free VMs, ~$5-10/month after

---

## Environment Variables

Required environment variables for production:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/planet` |
| `PORT` | Server port (auto-set by host) | `8000` (local), `$PORT` (Render) |
| `HOST` | Server host | `0.0.0.0` |
| `PYTHON_VERSION` | Python version | `3.11` |

---

## Health Checks

All platforms can use the `/health` endpoint:

```bash
curl https://your-api.onrender.com/health
# Response: {"status": "healthy"}
```

---

## Monitoring

### View Logs

**Render:**
```bash
# In dashboard → Logs tab
# Or use Render CLI:
render logs constellation-api
```

**Railway:**
```bash
# In dashboard → Deployments → View Logs
```

---

## Troubleshooting

### Database Connection Issues

If you see `connection refused` errors:

1. Check `DATABASE_URL` is set correctly
2. Ensure database is in same region as web service
3. Check database is running (not paused)

### Port Binding Errors

Make sure your app reads `$PORT` from environment:

```python
# In config.py
port: int = int(os.getenv("PORT", 8000))
```

### Import Errors

Ensure `requirements.txt` includes all dependencies:

```bash
pip freeze > requirements.txt
```

---

## Costs Summary

| Platform | Free Tier | Paid (Basic) |
|----------|-----------|--------------|
| **Render** | ✅ 750hrs/month + 90-day DB | $7/month web + $7/month DB |
| **Railway** | ✅ $5 credit/month | ~$10-15/month |
| **Fly.io** | ✅ 3 VMs | ~$5-10/month |
| **Heroku** | ❌ No free tier | $7/month minimum |

---

## Next Steps

1. ✅ Deploy API to Render
2. ⬜ Set up CI/CD (GitHub Actions)
3. ⬜ Add monitoring (Sentry, LogRocket)
4. ⬜ Set up custom domain
5. ⬜ Configure CORS for frontend

See [LOCAL_DEV.md](LOCAL_DEV.md) for local development setup.
