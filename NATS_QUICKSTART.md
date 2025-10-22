# NATS Integration - Quick Start Guide

**5-Minute Demo**: Test NATS JetStream with SSE real-time updates on your dev machine.

## What's Implemented

✅ **Worker → NATS JetStream**: Worker publishes job state changes
✅ **NATS → API**: API consumes events from JetStream
✅ **API → Frontend**: SSE streams real-time updates to browser
✅ **Decoupled Architecture**: Services communicate only via NATS

## Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+ (with bun or npm)

## Quick Start

### 1. Start Infrastructure

```bash
cd infra
docker-compose up -d
```

Verify NATS is running:
```bash
curl http://localhost:8222/varz
```

### 2. Install Dependencies

```bash
# API
cd apps/api && pip install -e .

# Worker
cd apps/worker && pip install -e .

# Frontend
cd apps/web && bun install
```

### 3. Configure Environment

Create `.env` files:

**`apps/api/.env`:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/planet
NATS_URL=nats://localhost:4222
```

**`apps/worker/.env`:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/planet
NATS_URL=nats://localhost:4222
GPU_SIMULATION=true
```

**`apps/web/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Run Migrations

```bash
cd db && alembic upgrade head
```

### 5. Start Services (3 terminals)

**Terminal 1 - API:**
```bash
cd apps/api
python -m uvicorn src.main:app --reload
```

**Terminal 2 - Worker:**
```bash
cd apps/worker
python src/main.py
```

**Terminal 3 - Frontend:**
```bash
cd apps/web
bun dev
```

### 6. Test It!

**Option A: Use the demo script**
```bash
./demo-nats.sh
```

**Option B: Manual test**
```bash
# Terminal 4: Create a job
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-job",
    "params": {"test": true},
    "priority": 5,
    "submitted_by": "demo"
  }'

# Terminal 5: Watch SSE events
curl -N http://localhost:8000/events
```

**Option C: Browser console**
```javascript
const es = new EventSource('http://localhost:8000/events');
es.onmessage = e => console.log(JSON.parse(e.data));
```

## Expected Flow

1. **Job created** → Database (state=queued)
2. **Worker picks up job** → Updates to state=running → **Publishes to NATS**
3. **API consumes from NATS** → **Streams via SSE** → Frontend receives update
4. **Job completes** → Worker publishes → Frontend receives completion event

## Verify It Works

You should see:
- Worker logs: `[NATS] Published to jobs.{id}.running`
- API logs: SSE client connections
- Frontend/curl: JSON events streaming in real-time

## Troubleshooting

**NATS not running?**
```bash
docker ps  # Check planet-dev-nats is up
docker logs planet-dev-nats
```

**No events received?**
```bash
curl http://localhost:8222/jsz?streams=1  # Check JOBS stream exists
```

**Worker not processing jobs?**
- Check database connection
- Verify job state='queued' in DB
- Review worker logs for errors

## Architecture

```
Frontend (Browser) ←── SSE ←── API ←── NATS JetStream ←── Worker
```

**Benefits:**
- Decoupled services
- Horizontal scaling ready
- Load balancing via NATS
- Persistent messaging (survives restarts)

## Next Steps

- Read [Full Documentation](docs/008_NATS_INTEGRATION.md)
- Deploy to GKE (see [Deployment Guide](docs/005_DEPLOYMENT.md))
- Add authentication to SSE endpoint
- Configure NATS persistence for production

## Files Changed

### New Files
- `apps/api/src/nats_client.py` - NATS JetStream client
- `apps/worker/src/nats_client.py` - NATS publisher
- `docs/008_NATS_INTEGRATION.md` - Full documentation
- `demo-nats.sh` - Demo script

### Modified Files
- `apps/api/src/main.py` - Added SSE endpoint `/events`
- `apps/api/src/config.py` - Added `nats_url` setting
- `apps/worker/src/main.py` - Made async, publishes to NATS
- `apps/worker/src/config.py` - Added `nats_url` setting
- `apps/web/src/app/api.ts` - Added `connectJobEvents()` SSE client
- `apps/api/pyproject.toml` - Added `nats-py` dependency
- `apps/worker/pyproject.toml` - Added `nats-py` dependency
- `README.md` - Added link to NATS docs

## Production Ready

This implementation is GKE-ready with:
- Persistent storage (JetStream file backend)
- Horizontal scaling (multiple API/worker pods)
- Cost-optimized (single NATS pod with PVC)
- Estimated cost: ~$5-10/month for NATS

---

**Questions?** See [docs/008_NATS_INTEGRATION.md](docs/008_NATS_INTEGRATION.md) for detailed guide.
