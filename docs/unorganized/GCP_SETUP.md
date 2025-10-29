# GCP Infrastructure Setup Guide

This guide walks you through setting up the complete GCP infrastructure for the Planet monorepo, including API, Worker, and NATS services.

## Overview

The infrastructure consists of:
- **GKE Cluster**: `overflying-autopilot` (Autopilot mode in `europe-west1`)
- **Artifact Registry**: `overflying-images` (stores Docker images)
- **Three Namespaces**:
  - `infrastructure`: Shared services (NATS)
  - `staging`: Staging environment for API and Worker
  - `production`: Production environment for API and Worker

## Prerequisites

1. **Google Cloud SDK** installed locally:
   ```bash
   # macOS
   brew install google-cloud-sdk

   # Verify installation
   gcloud --version
   ```

2. **kubectl** installed:
   ```bash
   # macOS
   brew install kubectl

   # Verify installation
   kubectl version --client
   ```

3. **GCP Project** with billing enabled:
   ```bash
   # Set your project
   gcloud config set project overflying-cluster

   # Verify
   gcloud config get-value project
   ```

4. **Required APIs enabled**:
   ```bash
   gcloud services enable container.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

## Step-by-Step Setup

### 1. Authenticate to GCP

```bash
# Authenticate with your Google account
gcloud auth login

# Set default region
gcloud config set compute/region europe-west1
```

### 2. Verify GKE Cluster Exists

```bash
# Check if cluster exists
gcloud container clusters describe overflying-autopilot --region=europe-west1

# If cluster doesn't exist, create it (this is already done in your case)
# gcloud container clusters create-auto overflying-autopilot \
#   --region=europe-west1 \
#   --project=overflying-cluster
```

### 3. Get GKE Credentials

```bash
# Configure kubectl to use your cluster
gcloud container clusters get-credentials overflying-autopilot \
  --region=europe-west1 \
  --project=overflying-cluster

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### 4. Create Kubernetes Namespaces

```bash
# Create infrastructure namespace (for NATS)
kubectl create namespace infrastructure

# Verify staging and production namespaces exist
kubectl get namespaces

# If they don't exist, create them:
kubectl create namespace staging
kubectl create namespace production
```

### 5. Deploy NATS (Shared Infrastructure)

```bash
# Deploy NATS to infrastructure namespace
kubectl apply -f k8s/infrastructure/nats-deployment.yaml

# Verify NATS is running
kubectl get pods -n infrastructure
kubectl get svc -n infrastructure

# Check NATS logs
kubectl logs -n infrastructure -l app=nats --tail=50

# Wait for NATS to be ready
kubectl wait --for=condition=ready pod -l app=nats -n infrastructure --timeout=120s
```

### 6. Configure Secrets for API

```bash
# Set environment variables for API secrets
export DATABASE_URL_STAGING="postgresql://user:pass@host:port/db_staging"
export DATABASE_URL_PRODUCTION="postgresql://user:pass@host:port/db_production"

# Run API setup script
cd k8s/api
chmod +x setup-secrets.sh
./setup-secrets.sh
cd ../..

# Verify secrets
kubectl get secrets -n staging | grep api-secrets
kubectl get secrets -n production | grep api-secrets
```

### 7. Configure Secrets for Worker

```bash
# Worker can reuse the same database or have its own
# If using same database as API, skip this and modify worker deployment to use api-secrets
# Otherwise, set worker-specific secrets:

export DATABASE_URL_STAGING="postgresql://user:pass@host:port/db_staging"
export DATABASE_URL_PRODUCTION="postgresql://user:pass@host:port/db_production"

# Run Worker setup script
cd k8s/worker
chmod +x setup-secrets.sh
./setup-secrets.sh
cd ../..

# Verify secrets
kubectl get secrets -n staging | grep worker-secrets
kubectl get secrets -n production | grep worker-secrets
```

### 8. Deploy API (Initial Deployment)

```bash
# Deploy API to staging
kubectl apply -f k8s/api/staging-deployment.yaml

# Verify deployment
kubectl get deployments -n staging
kubectl get pods -n staging
kubectl logs -n staging -l app=api --tail=50

# Deploy API to production (once staging is verified)
kubectl apply -f k8s/api/production-deployment.yaml

# Verify deployment
kubectl get deployments -n production
kubectl get pods -n production
```

### 9. Deploy Worker (Initial Deployment)

```bash
# Deploy Worker to staging
kubectl apply -f k8s/worker/staging-deployment.yaml

# Verify deployment
kubectl get deployments -n staging
kubectl get pods -n staging -l app=worker
kubectl logs -n staging -l app=worker --tail=50

# Deploy Worker to production
kubectl apply -f k8s/worker/production-deployment.yaml

# Verify deployment
kubectl get deployments -n production
kubectl get pods -n production -l app=worker
```

### 10. Set Up Ingress (Optional - for API external access)

```bash
# Install ingress-nginx controller
kubectl apply -f k8s/ingress/setup-ingress.sh

# Apply ingress rules
kubectl apply -f k8s/ingress/staging-ingress.yaml
kubectl apply -f k8s/ingress/production-ingress.yaml

# Get external IP
kubectl get ingress -n staging
kubectl get ingress -n production
```

## Verification Checklist

After setup, verify everything is running:

```bash
# 1. Check all namespaces
kubectl get namespaces

# 2. Check NATS (infrastructure)
kubectl get all -n infrastructure

# 3. Check API and Worker (staging)
kubectl get all -n staging

# 4. Check API and Worker (production)
kubectl get all -n production

# 5. Test NATS connectivity from API
kubectl exec -it -n staging deployment/api-staging -- \
  python -c "from src.nats_client import NATSManager; import asyncio; asyncio.run(NATSManager('nats://nats.infrastructure.svc.cluster.local:4222').connect())"

# 6. Test NATS connectivity from Worker
kubectl exec -it -n staging deployment/worker-staging -- \
  python -c "from src.nats_client import NATSManager; import asyncio; asyncio.run(NATSManager('nats://nats.infrastructure.svc.cluster.local:4222').connect())"
```

## GitHub Actions Setup

### 1. Create GCP Service Account

```bash
# Create service account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions CI/CD" \
  --project=overflying-cluster

# Grant necessary permissions
gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:github-actions@overflying-cluster.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:github-actions@overflying-cluster.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@overflying-cluster.iam.gserviceaccount.com

# Display the key (copy this to GitHub Secrets)
cat github-actions-key.json
```

### 2. Add Secrets to GitHub

Go to your repository settings on GitHub:

1. Navigate to: `Settings` → `Secrets and variables` → `Actions`
2. Add the following secrets:

   - **GCP_SA_KEY**: Paste the contents of `github-actions-key.json`
   - **CODECOV_TOKEN**: Your Codecov token (if using Codecov)

### 3. Test GitHub Actions

```bash
# Push a change to trigger CI/CD
git add .
git commit -m "test: trigger CI/CD pipeline"
git push origin main

# Monitor in GitHub Actions tab
```

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                     GCP Project: overflying-cluster            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │          GKE Cluster: overflying-autopilot               │  │
│  │                    (europe-west1)                         │  │
│  │                                                           │  │
│  │  ┌───────────────────────────────────────────────────┐  │  │
│  │  │         Namespace: infrastructure                  │  │  │
│  │  │                                                     │  │  │
│  │  │  NATS StatefulSet                                  │  │  │
│  │  │  - nats:4222 (client)                              │  │  │
│  │  │  - nats:8222 (monitoring)                          │  │  │
│  │  │  - JetStream enabled                               │  │  │
│  │  │  - 10Gi persistent storage                         │  │  │
│  │  │                                                     │  │  │
│  │  └───────────────────────────────────────────────────┘  │  │
│  │                           ▲                               │  │
│  │                           │                               │  │
│  │  ┌────────────────────────┴────────────────────────┐    │  │
│  │  │         Namespace: staging                       │    │  │
│  │  │                                                   │    │  │
│  │  │  API Deployment (2 replicas)                     │    │  │
│  │  │  - Connects to NATS                              │    │  │
│  │  │  - Exposes /health, REST endpoints               │    │  │
│  │  │  - LoadBalancer service                          │    │  │
│  │  │                                                   │    │  │
│  │  │  Worker Deployment (1 replica)                   │    │  │
│  │  │  - Connects to NATS                              │    │  │
│  │  │  - GPU simulation enabled                        │    │  │
│  │  │  - Polls DB for jobs                             │    │  │
│  │  │                                                   │    │  │
│  │  └───────────────────────────────────────────────────┘    │  │
│  │                           ▲                               │  │
│  │                           │                               │  │
│  │  ┌────────────────────────┴────────────────────────┐    │  │
│  │  │         Namespace: production                    │    │  │
│  │  │                                                   │    │  │
│  │  │  API Deployment (3 replicas)                     │    │  │
│  │  │  - Connects to NATS                              │    │  │
│  │  │  - LoadBalancer + Ingress                        │    │  │
│  │  │  - api.overfly.ing                               │    │  │
│  │  │                                                   │    │  │
│  │  │  Worker Deployment (2 replicas)                  │    │  │
│  │  │  - Connects to NATS                              │    │  │
│  │  │  - Real GPU processing                           │    │  │
│  │  │  - Polls DB for jobs                             │    │  │
│  │  │                                                   │    │  │
│  │  └───────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │      Artifact Registry: overflying-images                │  │
│  │                                                           │  │
│  │  - api:latest, api:<sha>                                 │  │
│  │  - worker:latest, worker:<sha>                           │  │
│  │                                                           │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
```

## Cost Estimation

Based on your current setup:

- **GKE Autopilot**: ~$70-150/month (varies by workload)
- **Artifact Registry**: ~$0.10/GB/month (minimal for Docker images)
- **Load Balancers**: ~$18/month per LB
- **Persistent Disks**: ~$0.17/GB/month (for NATS storage)

**Total estimated**: ~$100-200/month for staging + production

## Maintenance

### Updating NATS

```bash
# Edit nats-deployment.yaml to change image version
kubectl apply -f k8s/infrastructure/nats-deployment.yaml
kubectl rollout status statefulset/nats -n infrastructure
```

### Scaling Services

```bash
# Scale API in production
kubectl scale deployment api-production --replicas=5 -n production

# Scale Worker in staging
kubectl scale deployment worker-staging --replicas=2 -n staging
```

### Monitoring

```bash
# View logs
kubectl logs -n staging -l app=api --tail=100 -f
kubectl logs -n staging -l app=worker --tail=100 -f

# Port-forward to NATS monitoring
kubectl port-forward -n infrastructure svc/nats 8222:8222
# Visit http://localhost:8222
```

## Troubleshooting

See individual README files:
- [API Troubleshooting](../k8s/api/README.md#troubleshooting)
- [Worker Troubleshooting](../k8s/worker/README.md#troubleshooting)

## Next Steps

1. Set up monitoring with Prometheus/Grafana (infrastructure exists in `infra/`)
2. Configure alerting for production incidents
3. Set up database backups
4. Configure autoscaling for API based on load
5. Set up GPU node pools for Worker in production

## Support

For issues or questions, refer to:
- [Planet Main README](../README.md)
- [API Documentation](../apps/api/README.md)
- [Worker Documentation](../apps/worker/README.md)
