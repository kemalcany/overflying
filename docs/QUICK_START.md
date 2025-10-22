# Quick Start Guide - Plan A Implementation

This guide helps you quickly get started with the new DRY architecture for API and Worker services.

## What Changed?

We've implemented **Plan A** which centralizes shared infrastructure:
- ✅ Shared test database and NATS configs
- ✅ Reusable GitHub Actions workflows
- ✅ NATS deployed as shared infrastructure in GKE
- ✅ Worker service with K8s deployments

## Local Development

### 1. Start Development Services

```bash
# Start PostgreSQL and NATS (shared by API and Worker)
make dev

# In separate terminals:
make api
make worker
make web
```

### 2. Test with Shared Infrastructure

```bash
# Test API with shared DB + NATS
make test-api-local

# Test Worker with shared DB + NATS
make test-worker-local

# Run actual tests
cd apps/api && pytest
cd apps/worker && pytest
```

## GCP Deployment

### One-Time Setup

```bash
# 1. Authenticate to GCP
make gcp-auth

# 2. Set database URLs for secrets
export DATABASE_URL_STAGING="postgresql://user:pass@host:port/db"
export DATABASE_URL_PRODUCTION="postgresql://user:pass@host:port/db"

# 3. Deploy everything (NATS + Worker)
make gcp-deploy-all
```

### Individual Deployments

```bash
# Deploy just NATS
make gcp-deploy-nats

# Deploy just Worker
make gcp-deploy-worker
```

### Monitor Deployments

```bash
# Check status of all services
make gcp-status

# View logs
make gcp-logs-api
make gcp-logs-worker
make gcp-logs-nats
```

## Common Commands

### Development
```bash
make help              # Show all available commands
make dev               # Start infrastructure (PostgreSQL + NATS)
make api               # Run API locally
make worker            # Run Worker locally
make clean             # Stop all services
```

### Testing
```bash
make test-api-local    # Start API test infrastructure
make test-worker-local # Start Worker test infrastructure
make test              # Run all tests
```

### GCP
```bash
make gcp-auth          # Authenticate to GCP
make gcp-deploy-all    # Deploy everything
make gcp-status        # Check deployment status
make gcp-logs-worker   # View Worker logs
```

## Architecture Overview

```
Local Development:
  infra/docker-compose.yml → PostgreSQL + NATS
    ↓
  apps/api → Connects to local services
  apps/worker → Connects to local services

Testing:
  infra/docker-compose/test-db.yml (shared)
  infra/docker-compose/test-nats.yml (shared)
    ↓
  apps/api/docker-compose.test.yml → includes shared configs
  apps/worker/docker-compose.test.yml → includes shared configs

Production (GKE):
  infrastructure namespace → NATS (shared)
    ↓
  staging namespace → API + Worker
  production namespace → API + Worker
```

## What You Need to Know

### Shared Test Infrastructure
- Both API and Worker now use **the same** test database and NATS configs
- Located in `infra/docker-compose/test-db.yml` and `test-nats.yml`
- Changes to test infrastructure update both services automatically

### Reusable CI/CD Workflows
- Three reusable workflows in `.github/workflows/`:
  - `reusable-test-python.yml` - Python testing
  - `reusable-build-push-python.yml` - Docker build/push
  - `reusable-deploy-gke.yml` - GKE deployment
- Both `deploy-api.yml` and `deploy-worker.yml` use these
- To update deployment logic, edit the reusable workflows

### NATS as Shared Infrastructure
- NATS is deployed to the `infrastructure` namespace
- Accessible at: `nats://nats.infrastructure.svc.cluster.local:4222`
- Both API and Worker connect to the same NATS instance
- This enables pub/sub communication between services

### Worker Deployment
- Worker uses the **same GCP project** as API (`overflying-cluster`)
- Deploys to **same namespaces** (`staging` and `production`)
- Uses **same Artifact Registry** for Docker images
- Just a different image: `worker:latest` instead of `api:latest`

## Troubleshooting

### Local Development

**Issue**: Services can't connect to PostgreSQL or NATS
```bash
# Check if services are running
docker ps

# Restart infrastructure
make down
make dev
```

**Issue**: Port conflicts
```bash
# Clean up old processes
make clean

# Check ports
lsof -i :4222  # NATS
lsof -i :5432  # PostgreSQL
lsof -i :8000  # API
```

### GCP Deployment

**Issue**: Worker pods not starting
```bash
# Check pod status
kubectl get pods -n staging -l app=worker

# View logs
kubectl logs -n staging -l app=worker --tail=100

# Describe pod
kubectl describe pod -n staging -l app=worker
```

**Issue**: NATS connection failed
```bash
# Check NATS is running
kubectl get pods -n infrastructure

# Test DNS resolution from worker
kubectl exec -n staging deployment/worker-staging -- \
  nslookup nats.infrastructure.svc.cluster.local
```

**Issue**: Secrets not configured
```bash
# Re-run secret setup
export DATABASE_URL_STAGING="postgresql://..."
export DATABASE_URL_PRODUCTION="postgresql://..."
cd k8s/worker
./setup-secrets.sh
```

## Next Steps

1. **Read the full documentation**:
   - [Plan A Implementation Summary](./PLAN_A_IMPLEMENTATION_SUMMARY.md)
   - [GCP Setup Guide](./GCP_SETUP.md)
   - [Worker K8s README](../k8s/worker/README.md)

2. **Deploy to GCP**:
   ```bash
   make gcp-auth
   export DATABASE_URL_STAGING="..."
   export DATABASE_URL_PRODUCTION="..."
   make gcp-deploy-all
   ```

3. **Test the full workflow**:
   - API publishes job to NATS
   - Worker picks up job
   - Check job status updates

4. **Monitor in production**:
   - Set up alerts for Worker failures
   - Monitor NATS metrics
   - Track job processing times

## Key Files

### Shared Infrastructure
- `infra/docker-compose/test-db.yml` - Shared test database
- `infra/docker-compose/test-nats.yml` - Shared test NATS
- `k8s/infrastructure/nats-deployment.yaml` - NATS in GKE

### Worker
- `apps/worker/Dockerfile` - Worker container image
- `apps/worker/docker-compose.test.yml` - Test configuration
- `k8s/worker/staging-deployment.yaml` - Staging deployment
- `k8s/worker/production-deployment.yaml` - Production deployment

### CI/CD
- `.github/workflows/reusable-test-python.yml` - Shared test workflow
- `.github/workflows/reusable-build-push-python.yml` - Shared build workflow
- `.github/workflows/reusable-deploy-gke.yml` - Shared deploy workflow
- `.github/workflows/deploy-worker.yml` - Worker CI/CD pipeline

### Documentation
- `docs/PLAN_A_IMPLEMENTATION_SUMMARY.md` - Complete implementation details
- `docs/GCP_SETUP.md` - Detailed GCP setup instructions
- `k8s/worker/README.md` - Worker deployment documentation
- `scripts/deploy-infrastructure.sh` - Automated deployment script

## Getting Help

- **Makefile help**: `make help`
- **Check logs**: `make gcp-logs-worker` or `kubectl logs ...`
- **Verify status**: `make gcp-status`
- **Read documentation**: Start with [PLAN_A_IMPLEMENTATION_SUMMARY.md](./PLAN_A_IMPLEMENTATION_SUMMARY.md)

---

**Happy coding!** 🚀
