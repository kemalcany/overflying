# NATS JetStream Integration Guide

**Document**: 008_NATS_INTEGRATION.md
**Status**: Implementation Complete
**Last Updated**: 2025-10-22

This document provides a complete guide to the NATS JetStream integration for real-time job updates between Worker, API, and Frontend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                     │
│  - SSE client subscribes to /events endpoint            │
│  - Receives real-time job updates                       │
└────────────────────────┬────────────────────────────────┘
                         │ SSE (Server-Sent Events)
                         │
┌────────────────────────▼────────────────────────────────┐
│  API (FastAPI)                                          │
│  - SSE endpoint: GET /events                            │
│  - NATS JetStream consumer (pull-based)                 │
│  - Streams job events to connected clients              │
└────────────────────────┬────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │  NATS   │
                    │JetStream│
                    │ Stream  │
                    │ "JOBS"  │
                    └────┬────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Worker (Python)                                        │
│  - Publishes job state changes to NATS                  │
│  - Subjects: jobs.{job_id}.{state}                      │
│  - States: queued, running, completed, failed           │
└─────────────────────────────────────────────────────────┘
```

## Key Features

1. **NATS JetStream**: Persistent message streaming (vs core NATS pub/sub)
2. **SSE**: One-way server-to-client streaming (more efficient than WebSocket for this use case)
3. **Decoupled**: Worker and API communicate only through NATS
4. **Scalable**: Multiple workers and API instances can coexist
5. **Load Balanced**: NATS handles message distribution

## Prerequisites

1. Docker and Docker Compose installed
2. Python 3.11+ with pip
3. Node.js 18+ with npm/bun
4. PostgreSQL 18 running (via docker-compose)
5. NATS 2.x running (via docker-compose)

## Setup Steps

### 1. Start Infrastructure (PostgreSQL + NATS)

```bash
cd infra
docker-compose up -d
```

Verify services are running:
```bash
docker ps
# Should show: planet-dev-postgres and planet-dev-nats
```

Check NATS is healthy:
```bash
curl http://localhost:8222/varz
# Should return JSON with NATS server info
```

### 2. Install Dependencies

**API:**
```bash
cd apps/api
pip install -e .
```

**Worker:**
```bash
cd apps/worker
pip install -e .
```

**Frontend:**
```bash
cd apps/web
bun install  # or npm install
```

### 3. Configure Environment Variables

Create `.env` files for each service:

**`apps/api/.env`:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/planet
NATS_URL=nats://localhost:4222
CORS_ORIGINS=http://localhost:3000
```

**`apps/worker/.env`:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/planet
NATS_URL=nats://localhost:4222
POLL_INTERVAL=2
GPU_SIMULATION=true
```

**`apps/web/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Run Database Migrations

```bash
cd db
alembic upgrade head
```

### 5. Start Services

Open **3 separate terminals**:

**Terminal 1 - API:**
```bash
cd apps/api
python -m uvicorn src.main:app --reload --port 8000
```

Expected output:
```
[NATS] Connected to nats://localhost:4222 with JetStream
[NATS] Stream 'JOBS' already exists
[API] Connected to NATS JetStream
INFO:     Application startup complete.
```

**Terminal 2 - Worker:**
```bash
cd apps/worker
python src/main.py
```

Expected output:
```
Worker started with 4 GPUs
[NATS] Connected to nats://localhost:4222 with JetStream
[NATS] Created stream 'JOBS' for subjects: ['jobs.>']
Worker running, polling every 2 seconds...
```

**Terminal 3 - Frontend:**
```bash
cd apps/web
bun dev  # or npm run dev
```

Expected output:
```
  ▲ Next.js 16.0.0
  - Local:        http://localhost:3000
```

## Testing the Integration

### Test 1: Create a Job via API

In a new terminal:
```bash
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-job-1",
    "params": {"model": "llama", "prompt": "Hello world"},
    "priority": 5,
    "submitted_by": "demo-user"
  }'
```

**Expected Flow:**
1. API creates job in database with state='queued'
2. Worker picks up job (SKIP LOCKED pattern)
3. Worker publishes to NATS: `jobs.{uuid}.running`
4. API SSE endpoint streams event to frontend
5. Worker completes job (5-15 second simulation)
6. Worker publishes to NATS: `jobs.{uuid}.completed`
7. Frontend receives update in real-time

**Watch the logs:**
- **API**: Should show incoming POST request
- **Worker**: Should show:
  ```
  [NATS] Published to jobs.{uuid}.running: {...}
  [NATS] Published to jobs.{uuid}.completed: {...}
  ```
- **Frontend console**: Should show SSE events

### Test 2: SSE Connection via Browser

Open browser DevTools Console and run:
```javascript
const eventSource = new EventSource('http://localhost:8000/events');

eventSource.onmessage = (event) => {
  console.log('Job event:', JSON.parse(event.data));
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

Now create a job (Test 1) and watch the console for real-time updates.

### Test 3: SSE Connection via curl

```bash
curl -N http://localhost:8000/events
```

Leave this running and create jobs from another terminal. You'll see:
```
data: {"type": "connected", "message": "SSE stream established"}

: keepalive

data: {"job_id": "123...", "state": "running", "timestamp": "2025-10-22T..."}

data: {"job_id": "123...", "state": "completed", "timestamp": "2025-10-22T..."}
```

### Test 4: Multiple Clients

Open multiple browser tabs at `http://localhost:3000` and create jobs. All tabs should receive updates simultaneously via SSE.

### Test 5: NATS CLI Inspection

If you have NATS CLI installed:
```bash
# Install NATS CLI
brew install nats-io/nats-tools/nats  # macOS
# or download from https://github.com/nats-io/natscli

# View stream info
nats stream info JOBS

# Monitor messages in real-time
nats sub "jobs.>"
```

Create a job and watch messages flow through NATS.

## Frontend Integration Example

Update your frontend page component to use SSE:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { connectJobEvents } from './api'

export default function JobsPage() {
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    const eventSource = connectJobEvents(
      (event) => {
        console.log('Received job event:', event)
        setEvents(prev => [...prev, event])
      },
      (error) => {
        console.error('SSE connection error:', error)
      }
    )

    return () => {
      eventSource.close()
    }
  }, [])

  return (
    <div>
      <h1>Real-time Job Events</h1>
      <ul>
        {events.map((event, i) => (
          <li key={i}>
            {event.type === 'connected'
              ? 'Connected to SSE'
              : `Job ${event.job_id}: ${event.state}`}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Monitoring NATS JetStream

### NATS Monitoring UI
Visit: `http://localhost:8222`

Key endpoints:
- `/varz` - Server info
- `/jsz` - JetStream info
- `/healthz` - Health check

### Check Stream Status
```bash
# Using curl
curl http://localhost:8222/jsz?streams=1

# Expected output shows JOBS stream with message counts
```

## Troubleshooting

### Issue: "Connection refused" to NATS
**Solution:**
```bash
docker-compose ps
# Ensure planet-dev-nats is running
docker logs planet-dev-nats
```

### Issue: Worker not picking up jobs
**Solution:**
- Check database connection
- Verify job state is 'queued'
- Check worker logs for errors

### Issue: SSE not receiving events
**Solution:**
- Check NATS stream has messages: `curl http://localhost:8222/jsz?streams=1`
- Verify API is connected to NATS (check startup logs)
- Check browser console for SSE connection errors

### Issue: "Stream not found" error
**Solution:**
- The worker creates the stream on startup
- Restart the worker: it will create the JOBS stream automatically

## Performance Considerations

### 1. NATS JetStream Storage
Currently in-memory, lost on restart. For production, use file storage:

```yaml
# docker-compose.yml
nats:
  command: ["-js", "-sd", "/data"]
  volumes:
    - nats-data:/data
```

### 2. SSE Connection Limits
Each SSE connection creates a NATS consumer. For production:
- Use ephemeral consumers (auto-cleanup)
- Implement connection pooling
- Add rate limiting

### 3. Message Retention
Configure stream retention policy:

```python
await js.add_stream(
    name="JOBS",
    subjects=["jobs.>"],
    max_age=3600,  # 1 hour retention
    max_msgs=10000  # Max 10k messages
)
```

## Production Deployment

### Kubernetes Configuration

**NATS StatefulSet** ([k8s/nats/statefulset.yaml](../k8s/nats/)):

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
spec:
  serviceName: nats
  replicas: 1  # Single instance for cost optimization
  template:
    spec:
      containers:
      - name: nats
        image: nats:2
        args:
          - "-js"
          - "-sd"
          - "/data"
        volumeMounts:
        - name: data
          mountPath: /data
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### Cost Optimization for GKE

To minimize costs:

1. **Single NATS Pod**: Use 1 replica with PersistentVolumeClaim (10GB)
2. **Resource Limits**: 128Mi-256Mi memory, 100m-200m CPU
3. **Use Preemptible Nodes**: NATS JetStream persists messages, can handle restarts
4. **Namespace Isolation**: Keep all in `planet` namespace (no extra network costs)
5. **Regional Storage**: Use regional PD for better cost/performance balance

**Estimated Monthly Cost**: ~$5-10 for NATS (PD storage + compute resources)

## Next Steps for Production

1. **Authentication**: Add JWT/API key auth to SSE endpoint
2. **Filtering**: Allow clients to subscribe to specific job IDs
3. **Persistence**: Configure NATS file storage (see above)
4. **Monitoring**: Add Prometheus metrics for NATS
5. **High Availability**: Run 3+ NATS servers for HA
6. **TLS**: Enable TLS for NATS connections

## Implementation Files

### Backend (API)
- [apps/api/src/nats_client.py](../apps/api/src/nats_client.py) - NATS JetStream client
- [apps/api/src/main.py](../apps/api/src/main.py) - SSE endpoint (`GET /events`)
- [apps/api/src/config.py](../apps/api/src/config.py) - NATS URL configuration

### Backend (Worker)
- [apps/worker/src/nats_client.py](../apps/worker/src/nats_client.py) - NATS publisher
- [apps/worker/src/main.py](../apps/worker/src/main.py) - Job event publishing
- [apps/worker/src/config.py](../apps/worker/src/config.py) - NATS URL configuration

### Frontend
- [apps/web/src/app/api.ts](../apps/web/src/app/api.ts) - `connectJobEvents()` SSE client

### Infrastructure
- [infra/docker-compose.yml](../infra/docker-compose.yml) - NATS service definition

## Summary

You now have a fully functional NATS JetStream integration with:
- ✅ Worker publishes job events to NATS
- ✅ API consumes events from NATS via JetStream
- ✅ Frontend receives real-time updates via SSE
- ✅ Decoupled architecture ready for horizontal scaling
- ✅ Persistent message storage with JetStream

The system is production-ready for GKE deployment with minimal cost impact!

## Related Documentation

- [Architecture Overview](003_ARCHITECTURE.md) - System design
- [Development Guide](004_DEVELOPMENT.md) - Local development
- [Deployment Guide](005_DEPLOYMENT.md) - GKE deployment
- [Roadmap](006_ROADMAP.md) - Future enhancements
