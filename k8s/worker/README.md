# Worker Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the Constellation Worker service to GKE.

## Overview

The Worker service:
- Polls the database for pending GPU jobs
- Executes jobs (with GPU simulation in staging, real GPU in production)
- Publishes job status updates to NATS
- Connects to shared NATS service in `infrastructure` namespace

## Prerequisites

1. GKE cluster is running (`overflying-autopilot`)
2. `staging` and `production` namespaces exist
3. `infrastructure` namespace exists with NATS deployed
4. Worker secrets are configured (see setup below)

## Initial Setup

### 1. Deploy NATS (Infrastructure Dependency)

If NATS is not yet deployed:

```bash
# Deploy NATS to infrastructure namespace
kubectl apply -f ../infrastructure/nats-deployment.yaml

# Verify NATS is running
kubectl get pods -n infrastructure
kubectl get svc -n infrastructure
```

### 2. Configure Secrets

Set your database URLs:

```bash
export DATABASE_URL_STAGING="postgresql://user:pass@host:port/db"
export DATABASE_URL_PRODUCTION="postgresql://user:pass@host:port/db"
```

Run the setup script:

```bash
chmod +x setup-secrets.sh
./setup-secrets.sh
```

This creates a secret named `worker-secrets` in both `staging` and `production` namespaces with:
- `DATABASE_URL`: Connection string for PostgreSQL
- `NATS_URL`: Connection string for NATS (auto-configured to shared service)

### 3. Deploy Worker

Deploy to staging:

```bash
kubectl apply -f staging-deployment.yaml
```

Deploy to production:

```bash
kubectl apply -f production-deployment.yaml
```

## Deployment Details

### Staging

- **Namespace**: `staging`
- **Replicas**: 1
- **Resources**:
  - Requests: 250m CPU, 512Mi memory
  - Limits: 1000m CPU, 2Gi memory
- **Environment**:
  - `GPU_SIMULATION=true` (simulates GPU work)
  - `POLL_INTERVAL=5` (check for jobs every 5 seconds)
- **NATS Connection**: `nats://nats.infrastructure.svc.cluster.local:4222`

### Production

- **Namespace**: `production`
- **Replicas**: 2
- **Resources**:
  - Requests: 500m CPU, 1Gi memory
  - Limits: 2000m CPU, 4Gi memory
- **Environment**:
  - `GPU_SIMULATION=false` (uses real GPU)
  - `POLL_INTERVAL=5`
- **Service Account**: `production-app-sa`
- **NATS Connection**: `nats://nats.infrastructure.svc.cluster.local:4222`

## Verification

Check deployment status:

```bash
# Staging
kubectl get deployments -n staging
kubectl get pods -n staging -l app=worker
kubectl logs -n staging -l app=worker --tail=50

# Production
kubectl get deployments -n production
kubectl get pods -n production -l app=worker
kubectl logs -n production -l app=worker --tail=50
```

Check NATS connectivity:

```bash
# Port-forward to NATS monitoring
kubectl port-forward -n infrastructure svc/nats 8222:8222

# Visit http://localhost:8222 to see NATS monitoring dashboard
```

## CI/CD

Worker is automatically deployed via GitHub Actions:

- **Workflow**: `.github/workflows/deploy-worker.yml`
- **Trigger**: Push to `main` branch with changes in `apps/worker/**`
- **Process**:
  1. Run tests with pytest
  2. Build Docker image
  3. Push to Artifact Registry: `europe-west1-docker.pkg.dev/overflying-cluster/overflying-images/worker`
  4. Deploy to staging
  5. Deploy to production (after staging succeeds)

## Scaling

Scale worker replicas:

```bash
# Staging
kubectl scale deployment worker-staging --replicas=2 -n staging

# Production
kubectl scale deployment worker-production --replicas=3 -n production
```

## Troubleshooting

### Worker not connecting to NATS

Check NATS is running:

```bash
kubectl get pods -n infrastructure
kubectl logs -n infrastructure -l app=nats
```

Test DNS resolution from worker pod:

```bash
kubectl exec -it -n staging deployment/worker-staging -- \
  nslookup nats.infrastructure.svc.cluster.local
```

### Worker not processing jobs

Check logs:

```bash
kubectl logs -n staging -l app=worker --tail=100 -f
```

Check database connectivity:

```bash
kubectl exec -it -n staging deployment/worker-staging -- \
  python -c "from src.config import settings; print(settings.database_url)"
```

### Update secrets

```bash
# Delete existing secret
kubectl delete secret worker-secrets -n staging

# Re-run setup script
./setup-secrets.sh
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Infrastructure Namespace               │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │  NATS StatefulSet                         │  │
│  │  - Port 4222 (client)                     │  │
│  │  - Port 8222 (monitoring)                 │  │
│  │  - JetStream enabled                      │  │
│  │  - Persistent storage (10Gi)              │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
└─────────────────────────────────────────────────┘
                       ▲
                       │ nats://nats.infrastructure:4222
                       │
     ┌─────────────────┴─────────────────┐
     │                                   │
┌────▼─────────────────┐    ┌───────────▼──────────┐
│  Staging Namespace   │    │  Production Namespace │
│                      │    │                       │
│  Worker Deployment   │    │  Worker Deployment    │
│  - 1 replica         │    │  - 2 replicas         │
│  - GPU simulation    │    │  - Real GPU           │
│  - Connects to NATS  │    │  - Connects to NATS   │
│  - Polls DB for jobs │    │  - Polls DB for jobs  │
└──────────────────────┘    └───────────────────────┘
```

## Related Documentation

- [API Kubernetes Deployment](../api/README.md)
- [NATS Deployment](../infrastructure/nats-deployment.yaml)
- [Worker Application Code](../../apps/worker/)
