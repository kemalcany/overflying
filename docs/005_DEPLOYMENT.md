# Deployment Guide

This guide covers deploying Constellation to production environments.

## Deployment Options

### Option 1: Google Kubernetes Engine (Current)

Production deployment on GKE with:
- Kubernetes Autopilot cluster
- Artifact Registry for Docker images
- Cloud SQL for PostgreSQL
- GitHub Actions for CI/CD
- Custom domains with SSL/TLS

**Best for**: Production-scale, enterprise deployment

### Option 2: Render (Easy)

Quick deployment to Render's platform:
- Managed PostgreSQL
- Auto-deploy from GitHub
- Free tier available

**Best for**: Demo, prototyping, small scale

### Option 3: Railway / Fly.io

Alternative platform-as-a-service options.

**Best for**: Medium scale, simple deployments

---

## Google Kubernetes Engine Deployment

### Architecture

```
GitHub → GitHub Actions → GCP Artifact Registry → GKE Cluster
                              ↓
                      staging / production namespaces
                              ↓
                    Cloud SQL PostgreSQL
```

### Prerequisites

- GCP account with billing enabled
- GitHub repository with admin access
- `gcloud` CLI installed
- `kubectl` installed

### GCP Project Structure

- `overflying-cluster`: Central infrastructure (GKE, Artifact Registry, Secrets)
- `overflying-db`: PostgreSQL databases (staging, production)

### Initial Setup (One-Time)

#### 1. Create Service Account

```bash
# Set project
gcloud config set project overflying-cluster

# Create service account
gcloud iam service-accounts create github-actions \
  --description="Service account for GitHub Actions CI/CD" \
  --display-name="GitHub Actions CI/CD"

SA_EMAIL="github-actions@overflying-cluster.iam.gserviceaccount.com"

# Grant permissions
gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.clusterViewer"

# Create key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account="${SA_EMAIL}"
```

#### 2. Configure GitHub Secrets

Go to GitHub repository settings:

1. Navigate to **Settings** > **Secrets and variables** > **Actions**
2. Add secrets:
   - `GCP_SA_KEY`: Contents of `github-actions-key.json`
   - `CODECOV_TOKEN`: (Optional) Your Codecov token

#### 3. Setup GitHub Environments

Create environments for approval workflows:

1. Go to **Settings** > **Environments**
2. Create `staging` (no restrictions)
3. Create `production` (add required reviewers)

#### 4. Get GKE Credentials

```bash
gcloud container clusters get-credentials overflying-autopilot \
  --region=europe-west1 \
  --project=overflying-cluster
```

#### 5. Setup Kubernetes Secrets

```bash
cd k8s/api
chmod +x setup-secrets.sh
./setup-secrets.sh
```

This fetches database URLs from Secret Manager and creates Kubernetes secrets.

#### 6. Deploy Kubernetes Resources

```bash
# Deploy to both environments
kubectl apply -f k8s/api/staging-deployment.yaml
kubectl apply -f k8s/api/production-deployment.yaml
```

**Note**: Initial deployment will fail (no image yet). First GitHub Actions run will push the image.

### Custom Domain Setup

#### Quick Setup (Recommended)

```bash
cd k8s/ingress
./setup-ingress.sh
```

This script will:
1. Install NGINX Ingress Controller
2. Install cert-manager for SSL
3. Create Let's Encrypt ClusterIssuer
4. Guide you through DNS setup
5. Create Ingress resources with SSL

#### Manual Setup

See [Custom Domain Setup Guide](old/CUSTOM_DOMAIN_SETUP.md) for detailed instructions.

#### Current Setup

- Staging: https://staging.api.overfly.ing
- Production: https://production.api.overfly.ing

### Deployment Workflow

#### Automatic Deployments

Deployments trigger automatically on push to `main` when files change in:
- `apps/api/**`
- `k8s/api/**`
- `.github/workflows/deploy-api.yml`

#### Workflow Steps

1. **Test**: Run pytest with PostgreSQL service
2. **Build**: Build Docker image
3. **Push**: Push to Artifact Registry
4. **Deploy Staging**: Update staging namespace
5. **Deploy Production**: Update production (after staging succeeds)

#### Manual Deployment

Trigger workflow manually:
1. Go to GitHub **Actions** tab
2. Select **Deploy API** workflow
3. Click **Run workflow**
4. Choose branch

### Monitoring Deployment

#### GitHub Actions

```bash
# View in GitHub UI
# Actions tab → Deploy API workflow

# Or use GitHub CLI
gh workflow view "Deploy API"
gh run list --workflow="Deploy API"
gh run watch <run-id>
```

#### Kubernetes

```bash
# Check pods
kubectl get pods -n staging -l app=api
kubectl get pods -n production -l app=api

# Watch deployment
kubectl rollout status deployment/api-staging -n staging
kubectl rollout status deployment/api-production -n production

# View logs
kubectl logs -n staging -l app=api --tail=100 -f
kubectl logs -n production -l app=api --tail=100 -f

# Get service URLs
kubectl get service api-service -n staging
kubectl get service api-service -n production
```

### Common Operations

#### Update Secrets

```bash
# Update in Secret Manager
gcloud secrets versions add db-url-staging \
  --data-file=- <<< "postgresql+psycopg2://user:pass@host:5432/db" \
  --project=overflying-cluster

# Re-run setup script
cd k8s/api
./setup-secrets.sh

# Restart deployments
kubectl rollout restart deployment/api-staging -n staging
kubectl rollout restart deployment/api-production -n production
```

#### Scale Deployment

```bash
# Scale up
kubectl scale deployment/api-production -n production --replicas=3

# Scale down
kubectl scale deployment/api-production -n production --replicas=1

# Auto-scale (future)
kubectl autoscale deployment/api-production -n production \
  --min=2 --max=10 --cpu-percent=70
```

#### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/api-production -n production

# Rollback to previous version
kubectl rollout undo deployment/api-production -n production

# Rollback to specific revision
kubectl rollout undo deployment/api-production -n production --to-revision=2
```

#### View Resource Usage

```bash
# CPU and memory usage
kubectl top pods -n staging -l app=api
kubectl top pods -n production -l app=api

# Resource limits
kubectl describe deployment api-production -n production
```

### Troubleshooting

#### ImagePullBackOff

```bash
# Check if image exists
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/overflying-cluster/overflying-images/api \
  --project=overflying-cluster

# Check image pull secrets
kubectl get secrets -n staging
kubectl describe pod <pod-name> -n staging
```

#### Database Connection Errors

```bash
# Verify secrets exist
kubectl get secret api-secrets -n staging -o yaml
kubectl get secret api-secrets -n production -o yaml

# Check pod logs for error details
kubectl logs -n staging -l app=api --tail=100

# Test database connection from pod
kubectl exec -it -n staging <pod-name> -- \
  psql "$DATABASE_URL" -c "SELECT 1"
```

#### Pods Crashing (CrashLoopBackOff)

```bash
# Check logs
kubectl logs -n staging <pod-name>
kubectl logs -n staging <pod-name> --previous  # Previous crash

# Describe pod for events
kubectl describe pod <pod-name> -n staging

# Check resource limits
kubectl describe deployment api-staging -n staging
```

#### SSL Certificate Not Issuing

```bash
# Check certificate status
kubectl get certificate -n staging
kubectl get certificate -n production

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Describe certificate for details
kubectl describe certificate api-staging-tls -n staging

# Check certificate request
kubectl get certificaterequest -n staging
kubectl describe certificaterequest -n staging
```

---

## Render Deployment (Alternative)

### Quick Deploy

1. Go to https://render.com
2. Connect GitHub repository
3. Create **Web Service**:
   - Runtime: Python
   - Build: `pip install -r requirements.txt`
   - Start: `cd apps/api && uvicorn src.main:app --host 0.0.0.0 --port $PORT`
4. Create **PostgreSQL** database
5. Add environment variable:
   - `DATABASE_URL` = (Render PostgreSQL URL)
6. Deploy!

### Run Migrations

After first deploy:

```bash
# In Render Shell (Dashboard → Shell)
cd db
alembic upgrade head
```

### Render Notes

- Free tier spins down after 15 min inactivity
- First request after sleep takes ~30s
- Database limited to 90 days on free tier
- Upgrade to $7/month for no sleep

---

## Railway / Fly.io Deployment

### Railway

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Add PostgreSQL
railway add

# Deploy
railway up
```

### Fly.io

```bash
# Install flyctl
brew install flyctl

# Login
flyctl auth login

# Launch
flyctl launch

# Deploy
flyctl deploy
```

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `PORT` | Server port | `8000` (local), `$PORT` (Render/Railway) |
| `ENVIRONMENT` | Environment name | `production`, `staging`, `development` |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `NATS_URL` | NATS server URL (future) |
| `REDIS_URL` | Redis URL (future) |
| `SENTRY_DSN` | Error tracking (future) |
| `LOG_LEVEL` | Logging level (`DEBUG`, `INFO`, `ERROR`) |

---

## Cost Estimates

### GKE (Current Setup)

| Resource | Cost (Monthly) |
|----------|----------------|
| GKE Autopilot | ~$75 (varies with usage) |
| Cloud SQL (staging) | ~$10 |
| Cloud SQL (production) | ~$50 |
| Ingress LoadBalancer | ~$17 |
| Artifact Registry | ~$1 (storage) |
| **Total** | **~$153/month** |

**Cost Optimization**:
- Use Autopilot's auto-scaling (pays for actual usage)
- Scale down staging outside work hours
- Use GCP free tier credits ($300 for 90 days)

### Render (Free Tier)

| Resource | Cost |
|----------|------|
| Web Service | Free (with sleep) |
| PostgreSQL | Free (90 days), then $7/mo |

### Railway

| Resource | Cost |
|----------|------|
| Free Credit | $5/month |
| Beyond Free | ~$5-10/month |

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy-api.yml
name: Deploy API

on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'k8s/api/**'

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - run: cd apps/api && pytest

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment:
      name: staging
      url: https://staging.api.overfly.ing
    steps:
      - name: Deploy to GKE
        # ... deployment steps

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://production.api.overfly.ing
    steps:
      - name: Deploy to GKE
        # ... deployment steps
```

### Pipeline Features

- ✅ Automated testing before deployment
- ✅ Parallel builds and tests
- ✅ Staging deployment (automatic)
- ✅ Production deployment (with approval)
- ✅ Rollback on failure
- ✅ Slack/email notifications (future)

---

## Security Best Practices

### Secrets Management

- ✅ Use GCP Secret Manager (not environment variables)
- ✅ Kubernetes Secrets for runtime
- ✅ Never commit secrets to git
- ✅ Rotate service account keys regularly

### Network Security

- ✅ TLS/SSL for all external traffic
- ✅ Internal services use ClusterIP
- ✅ Database in private VPC
- ✅ Restrict IAM permissions (principle of least privilege)

### Container Security

- ✅ Use official base images
- ✅ Run as non-root user
- ✅ Scan images for vulnerabilities
- ✅ Keep dependencies updated

---

## Next Steps

- [Monitoring Setup](old/DEPLOYMENT_SETUP.md#monitoring) - Add observability
- [Scaling Guide](old/DEPLOYMENT_SETUP.md#scalability) - Handle more traffic
- [Database Backups](#database-backups) - Protect your data

---

## Quick Reference

**Get Service URLs**
```bash
kubectl get ingress --all-namespaces
```

**View Logs**
```bash
kubectl logs -n production -l app=api --tail=100 -f
```

**Check Deployment Status**
```bash
kubectl get pods -n production -l app=api
```

**Restart Deployment**
```bash
kubectl rollout restart deployment/api-production -n production
```

**Scale Up**
```bash
kubectl scale deployment/api-production -n production --replicas=3
```

For more commands, see [Quick Deploy Reference](old/QUICK_DEPLOY_REFERENCE.md).
