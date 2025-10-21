# Quick Deploy Reference

Quick commands for common deployment tasks.

## Initial Setup (One-Time)

```bash
# 1. Create service account in the central cluster project
gcloud iam service-accounts create github-actions \
  --project=overflying-cluster \
  --display-name="GitHub Actions CI/CD"

# 2. Grant permissions
SA_EMAIL="github-actions@overflying-cluster.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding overflying-cluster \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.clusterViewer"

# 3. Create key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account="${SA_EMAIL}" \
  --project=overflying-cluster

# 4. Add key to GitHub Secrets as GCP_SA_KEY

# 5. Get GKE credentials
gcloud container clusters get-credentials overflying-autopilot \
  --region=europe-west1 \
  --project=overflying-cluster

# 6. Set up Kubernetes secrets
cd k8s/api
./setup-secrets.sh

# 7. Deploy Kubernetes manifests
kubectl apply -f staging-deployment.yaml
kubectl apply -f production-deployment.yaml
```

## GitHub Secrets Required

| Name | Value |
|------|-------|
| `GCP_SA_KEY` | Contents of `github-actions-key.json` |
| `CODECOV_TOKEN` | (Optional) Your Codecov token |

## Common Commands

### Check Deployment Status
```bash
# Staging
kubectl get pods -n staging -l app=api
kubectl get service api-service -n staging

# Production
kubectl get pods -n production -l app=api
kubectl get service api-service -n production
```

### View Logs
```bash
# Staging logs
kubectl logs -n staging -l app=api --tail=100 -f

# Production logs
kubectl logs -n production -l app=api --tail=100 -f
```

### Manually Restart Deployment
```bash
# Staging
kubectl rollout restart deployment/api-staging -n staging

# Production
kubectl rollout restart deployment/api-production -n production
```

### Update Secrets
```bash
# Update Secret Manager
gcloud secrets versions add db-url-staging \
  --data-file=- <<< "postgresql+psycopg2://user:pass@host:5432/dbname" \
  --project=overflying-cluster

# Re-run setup script
cd k8s/api
./setup-secrets.sh

# Restart deployments
kubectl rollout restart deployment/api-staging -n staging
kubectl rollout restart deployment/api-production -n production
```

### Scale Deployments
```bash
# Staging
kubectl scale deployment/api-staging -n staging --replicas=3

# Production
kubectl scale deployment/api-production -n production --replicas=5
```

### Get Service URLs
```bash
# Staging
kubectl get service api-service -n staging -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Production
kubectl get service api-service -n production -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

### Check Resource Usage
```bash
# Staging
kubectl top pods -n staging -l app=api

# Production
kubectl top pods -n production -l app=api
```

### Describe Resources
```bash
# Describe pods (useful for troubleshooting)
kubectl describe pods -n staging -l app=api
kubectl describe pods -n production -l app=api

# Describe services
kubectl describe service api-service -n staging
kubectl describe service api-service -n production
```

## Workflow Triggers

Workflow runs automatically on push to `main` when changes affect:
- `apps/api/**`
- `k8s/api/**`
- `.github/workflows/deploy-api.yml`

## Architecture Quick Reference

| Resource | Value |
|----------|-------|
| GKE Cluster | `overflying-autopilot` |
| Region | `europe-west1` |
| Registry | `europe-west1-docker.pkg.dev/overflying-cluster/overflying-images` |
| Image Name | `api` |
| Staging Namespace | `staging` |
| Production Namespace | `production` |
| Staging Service Account | `staging-app-sa` |
| Production Service Account | `production-app-sa` |

## Database Connections

Database URLs are stored in:
- Secret Manager: `db-url-staging` and `db-url-production` (overflying-cluster project)
- Kubernetes Secrets: `api-secrets` in each namespace

## Troubleshooting Quick Checks

```bash
# 1. Check pod status
kubectl get pods -n staging -l app=api
kubectl get pods -n production -l app=api

# 2. Check logs for errors
kubectl logs -n staging -l app=api --tail=50
kubectl logs -n production -l app=api --tail=50

# 3. Check service endpoints
kubectl get endpoints -n staging
kubectl get endpoints -n production

# 4. Verify secrets exist
kubectl get secrets -n staging
kubectl get secrets -n production

# 5. Check image in registry
gcloud artifacts docker images list \
  europe-west1-docker.pkg.dev/overflying-cluster/overflying-images/api \
  --project=overflying-cluster
```

## Emergency Rollback

```bash
# View rollout history
kubectl rollout history deployment/api-production -n production

# Rollback to previous version
kubectl rollout undo deployment/api-production -n production

# Rollback to specific revision
kubectl rollout undo deployment/api-production -n production --to-revision=2
```
