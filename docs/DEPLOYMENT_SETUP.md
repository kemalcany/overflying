# GCP Deployment Setup Guide

This guide will help you set up the complete CI/CD pipeline for deploying the Overflying API to Google Kubernetes Engine (GKE).

## Prerequisites

Before starting, ensure you have:
- GitHub repository with admin access
- GCP projects already configured (see architecture overview)
- `gcloud` CLI installed and authenticated
- `kubectl` installed

## Architecture Overview

### GCP Projects
- **overflying-db**: PostgreSQL databases
- **overflying-cluster**: Central infrastructure hub (GKE cluster, Artifact Registry, Secret Manager, CI/CD service account)
- **overflying-api**: (Optional) API-specific resources if needed
- **overflying-workers**: (Optional) Worker-specific resources if needed

### Resources
- **GKE Cluster**: `overflying-autopilot` in `europe-west1`
- **Artifact Registry**: `europe-west1-docker.pkg.dev/overflying-cluster/overflying-images`
- **Namespaces**: `staging` and `production`
- **Database**: `overflying-db:europe-west1:overflying-db`

## Step 1: Create Service Account for GitHub Actions

This service account will be used by ALL GitHub Actions workflows (API, workers, frontend, etc.) to deploy to GCP.

**IMPORTANT**: Create this in the `overflying-cluster` project since it's your central infrastructure hub.

```bash
# Set project to the central cluster project
gcloud config set project overflying-cluster

# Create service account
gcloud iam service-accounts create github-actions \
  --description="Service account for GitHub Actions CI/CD for all services" \
  --display-name="GitHub Actions CI/CD"

# Get the service account email
SA_EMAIL="github-actions@overflying-cluster.iam.gserviceaccount.com"
```

## Step 2: Grant Required Permissions

The service account needs permissions within the `overflying-cluster` project (all resources are here):

```bash
# Permission to push to Artifact Registry
gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

# Permission to deploy to GKE
gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.developer"

# Permission to get GKE credentials
gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.clusterViewer"

# Note: The service account is in the same project as the resources,
# so no cross-project permissions are needed!
```

## Step 3: Create Service Account Key

```bash
# Create and download key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account="${SA_EMAIL}"

# Display the key (you'll need this for GitHub)
cat github-actions-key.json
```

**IMPORTANT**:
- This key provides full access to your GCP resources. Keep it secure!
- You can reuse this same service account and key for **all future services** (workers, frontend, etc.)
- Store the key in a secure location - you'll need it for each service's GitHub repository

## Step 4: Configure GitHub Secrets

Go to your GitHub repository settings and add the following secret:

1. Navigate to: **Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Add the following secret:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `GCP_SA_KEY` | Contents of `github-actions-key.json` | Service account key for GCP authentication |

Optional (if using Codecov):
| Secret Name | Value | Description |
|-------------|-------|-------------|
| `CODECOV_TOKEN` | Your Codecov token | For uploading test coverage reports |

## Step 5: Set Up GitHub Environments

For approval-based deployments to production, configure GitHub environments:

1. Go to **Settings** > **Environments**
2. Create two environments:
   - **staging**: No protection rules needed
   - **production**: Add protection rules:
     - Required reviewers (recommended)
     - Wait timer (optional)

## Step 6: Deploy Kubernetes Resources

First, get your GKE credentials:

```bash
gcloud container clusters get-credentials overflying-autopilot \
  --region=europe-west1 \
  --project=overflying-cluster
```

### Create Kubernetes Secrets

Run the provided script to create secrets from GCP Secret Manager:

```bash
cd k8s/api
chmod +x setup-secrets.sh
./setup-secrets.sh
```

This script will:
- Fetch database URLs from Secret Manager
- Create Kubernetes secrets in both `staging` and `production` namespaces

### Deploy Initial Kubernetes Resources

```bash
# Deploy to staging
kubectl apply -f k8s/api/staging-deployment.yaml

# Deploy to production
kubectl apply -f k8s/api/production-deployment.yaml
```

**Note**: The initial deployment will fail because no image exists yet. This is expected - the first GitHub Actions run will push the image.

## Step 7: Verify Setup

Check that all resources are created:

```bash
# Check namespaces
kubectl get namespaces

# Check service accounts
kubectl get serviceaccounts -n staging
kubectl get serviceaccounts -n production

# Check secrets
kubectl get secrets -n staging
kubectl get secrets -n production

# Check deployments (will show ImagePullBackOff initially - this is OK)
kubectl get deployments -n staging
kubectl get deployments -n production
```

## Step 8: Trigger First Deployment

Push a change to the `main` branch that affects the API:

```bash
# Make a small change to trigger the workflow
git add .
git commit -m "feat: initial GCP deployment setup"
git push origin main
```

The GitHub Actions workflow will:
1. Run tests
2. Build and push Docker image
3. Deploy to staging
4. Deploy to production (after approval if configured)

## Step 9: Monitor Deployment

### In GitHub
- Go to **Actions** tab
- Watch the workflow progress

### In GCP Console
- Navigate to GKE workloads
- Monitor pod status in both namespaces

### Using kubectl

```bash
# Watch staging deployment
kubectl get pods -n staging -w

# Watch production deployment
kubectl get pods -n production -w

# Check logs
kubectl logs -n staging -l app=api --tail=100
kubectl logs -n production -l app=api --tail=100
```

## Step 10: Get Service URLs

Once deployed, get the external IP addresses:

```bash
# Staging
kubectl get service api-service -n staging

# Production
kubectl get service api-service -n production
```

Access your API at:
- Staging: `http://<STAGING_EXTERNAL_IP>/`
- Production: `http://<PRODUCTION_EXTERNAL_IP>/`

## Workflow Behavior

### Automatic Deployments
The workflow runs automatically when:
- Code is pushed to `main` branch
- Changes affect:
  - `apps/api/**`
  - `k8s/api/**`
  - `.github/workflows/deploy-api.yml`

### Workflow Steps
1. **Test API**: Runs pytest with PostgreSQL
2. **Build and Push**: Builds Docker image and pushes to Artifact Registry
3. **Deploy Staging**: Deploys to staging namespace
4. **Deploy Production**: Deploys to production namespace (sequential after staging)

### Pull Requests
On pull requests, only tests run. No deployment occurs.

## Updating Database Connection

If you need to update database credentials:

```bash
# Update the secret in Secret Manager
gcloud secrets versions add db-url-staging \
  --data-file=- <<< "postgresql+psycopg2://user:pass@host:5432/dbname" \
  --project=overflying-cluster

# Re-run the setup script to update Kubernetes secrets
cd k8s/api
./setup-secrets.sh

# Restart the deployments to pick up new secrets
kubectl rollout restart deployment/api-staging -n staging
kubectl rollout restart deployment/api-production -n production
```

## Troubleshooting

### Deployment Fails with "ImagePullBackOff"
```bash
# Check if image exists in Artifact Registry
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/overflying-cluster/overflying-images/api \
  --project=overflying-cluster
```

### Pods Crash with Database Connection Error
```bash
# Verify secrets exist
kubectl get secret api-secrets -n staging -o yaml
kubectl get secret api-secrets -n production -o yaml

# Check pod logs
kubectl logs -n staging -l app=api --tail=100
```

### Cannot Authenticate to GCP
```bash
# Verify service account permissions
gcloud projects get-iam-policy overflying-cluster \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:github-actions@overflying-cluster.iam.gserviceaccount.com"
```

### Workflow Fails to Push Image
- Ensure `GCP_SA_KEY` secret is correctly set in GitHub
- Verify service account has `artifactregistry.writer` role
- Check Artifact Registry repository exists

## Security Best Practices

1. **Service Account Key**: Store securely, never commit to git
2. **Database Credentials**: Use Secret Manager, not environment variables
3. **Workload Identity**: Already configured for pods to access GCP services
4. **Network Policies**: Consider adding Kubernetes network policies
5. **Image Scanning**: Enable Artifact Registry vulnerability scanning

## Cleanup (if needed)

To remove all resources:

```bash
# Delete Kubernetes resources
kubectl delete -f k8s/api/staging-deployment.yaml
kubectl delete -f k8s/api/production-deployment.yaml

# Delete secrets
kubectl delete secret api-secrets -n staging
kubectl delete secret api-secrets -n production

# Delete service account key
gcloud iam service-accounts keys delete <KEY_ID> \
  --iam-account=github-actions@overflying-cluster.iam.gserviceaccount.com

# Delete service account
gcloud iam service-accounts delete github-actions@overflying-cluster.iam.gserviceaccount.com \
  --project=overflying-cluster
```

## Deploying Additional Services (Workers, Frontend, etc.)

The service account you created is **reusable for all services**. When you're ready to deploy workers or other services:

1. **Create Kubernetes manifests** similar to the API:
   ```bash
   # Example structure
   k8s/workers/staging-deployment.yaml
   k8s/workers/production-deployment.yaml
   ```

2. **Create a new GitHub workflow** (e.g., `.github/workflows/deploy-workers.yml`):
   - Copy the API workflow structure
   - Change `IMAGE_NAME: api` to `IMAGE_NAME: workers`
   - Update paths to trigger on worker code changes
   - Use the **same `GCP_SA_KEY` secret** - no new setup needed!

3. **Add worker-specific secrets** to Kubernetes if needed:
   ```bash
   kubectl create secret generic worker-secrets \
     --from-literal=key=value \
     --namespace=staging
   ```

The beauty of centralizing in `overflying-cluster` is that you don't need to create new service accounts or manage cross-project permissions for each service!

## Next Steps

1. Set up custom domain names for staging and production
2. Configure SSL/TLS certificates (use Google-managed certificates or cert-manager)
3. Set up monitoring and alerting (Cloud Monitoring, Prometheus, or Grafana)
4. Configure auto-scaling policies (HorizontalPodAutoscaler)
5. Implement database migration strategy (Alembic or similar)
6. Set up logging aggregation (Cloud Logging or ELK stack)
7. Create deployment workflow for workers service
8. Set up frontend deployment pipeline

## Support

For issues with:
- GitHub Actions: Check workflow logs in GitHub Actions tab
- GKE: Check GCP Console > Kubernetes Engine > Workloads
- Database: Check Cloud SQL logs in GCP Console
