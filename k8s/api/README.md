# API Kubernetes Manifests

This directory contains Kubernetes manifests for deploying the Overflying API to GKE.

## Files

- **`staging-deployment.yaml`**: Staging environment deployment and service
- **`production-deployment.yaml`**: Production environment deployment and service
- **`setup-secrets.sh`**: Script to create Kubernetes secrets from GCP Secret Manager

## Deployment Configuration

### Staging
- **Namespace**: `staging`
- **Replicas**: 2
- **Service Account**: `staging-app-sa`
- **Resources**:
  - Requests: 256Mi memory, 250m CPU
  - Limits: 512Mi memory, 500m CPU
- **Service Type**: LoadBalancer

### Production
- **Namespace**: `production`
- **Replicas**: 3
- **Service Account**: `production-app-sa`
- **Resources**:
  - Requests: 512Mi memory, 500m CPU
  - Limits: 1Gi memory, 1000m CPU
- **Service Type**: LoadBalancer

## Environment Variables

Both deployments use the following environment variables:

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Kubernetes Secret `api-secrets` | PostgreSQL connection string |
| `HOST` | Hardcoded | API host (0.0.0.0) |
| `PORT` | Hardcoded | API port (8000) |

## Secrets Setup

Secrets are fetched from GCP Secret Manager and stored in Kubernetes:

```bash
# Run the setup script
./setup-secrets.sh
```

This creates a secret named `api-secrets` in both `staging` and `production` namespaces with:
- `database-url`: PostgreSQL connection string

## Health Checks

Both deployments include:

**Liveness Probe**:
- Endpoint: `/health`
- Initial delay: 30s
- Period: 10s
- Timeout: 5s
- Failure threshold: 3

**Readiness Probe**:
- Endpoint: `/health`
- Initial delay: 10s
- Period: 5s
- Timeout: 3s
- Failure threshold: 3

## Service Configuration

Both services:
- Type: LoadBalancer
- Port: 80 (external)
- Target Port: 8000 (container)
- Session Affinity: ClientIP

## Workload Identity

Pods use Kubernetes Service Accounts bound to Google Service Accounts:

**Staging**:
- KSA: `staging-app-sa`
- GSA: `staging-workload-sa@overflying-cluster.iam.gserviceaccount.com`
- Permissions: Cloud SQL Client, Secret Manager access

**Production**:
- KSA: `production-app-sa`
- GSA: `production-workload-sa@overflying-cluster.iam.gserviceaccount.com`
- Permissions: Cloud SQL Client, Secret Manager access

## Deployment

### Initial Deployment

```bash
# Apply manifests
kubectl apply -f staging-deployment.yaml
kubectl apply -f production-deployment.yaml
```

### CI/CD Deployment

GitHub Actions automatically updates the image tag:

```bash
kubectl set image deployment/api-staging \
  api=europe-west1-docker.pkg.dev/overflying-cluster/overflying-images/api:${COMMIT_SHA} \
  --namespace=staging
```

## Monitoring

### Check Status
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
# Staging
kubectl logs -n staging -l app=api --tail=100 -f

# Production
kubectl logs -n production -l app=api --tail=100 -f
```

### Check Resources
```bash
# Staging
kubectl top pods -n staging -l app=api

# Production
kubectl top pods -n production -l app=api
```

## Troubleshooting

### Pods Not Starting
```bash
# Check pod events
kubectl describe pods -n staging -l app=api
kubectl describe pods -n production -l app=api

# Common issues:
# - ImagePullBackOff: Image doesn't exist or no permission
# - CrashLoopBackOff: Application error (check logs)
# - Pending: Resource constraints
```

### Database Connection Issues
```bash
# Verify secrets exist
kubectl get secret api-secrets -n staging -o yaml
kubectl get secret api-secrets -n production -o yaml

# Check service account binding
kubectl describe serviceaccount staging-app-sa -n staging
kubectl describe serviceaccount production-app-sa -n production
```

### Service Not Accessible
```bash
# Check if LoadBalancer has external IP
kubectl get service api-service -n staging
kubectl get service api-service -n production

# Check endpoints
kubectl get endpoints api-service -n staging
kubectl get endpoints api-service -n production
```

## Scaling

### Manual Scaling
```bash
# Scale staging
kubectl scale deployment/api-staging -n staging --replicas=5

# Scale production
kubectl scale deployment/api-production -n production --replicas=10
```

### Autoscaling (Future)
To enable HorizontalPodAutoscaler, create a new manifest:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-staging-hpa
  namespace: staging
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-staging
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Updating

### Update Image
```bash
# Staging
kubectl set image deployment/api-staging \
  api=europe-west1-docker.pkg.dev/overflying-cluster/overflying-images/api:new-tag \
  --namespace=staging

# Production
kubectl set image deployment/api-production \
  api=europe-west1-docker.pkg.dev/overflying-cluster/overflying-images/api:new-tag \
  --namespace=production
```

### Update Secrets
```bash
# Run setup script again
./setup-secrets.sh

# Restart deployments to pick up new secrets
kubectl rollout restart deployment/api-staging -n staging
kubectl rollout restart deployment/api-production -n production
```

### Update Manifests
```bash
# After modifying the YAML files
kubectl apply -f staging-deployment.yaml
kubectl apply -f production-deployment.yaml
```

## Rollback

```bash
# View history
kubectl rollout history deployment/api-staging -n staging
kubectl rollout history deployment/api-production -n production

# Undo last deployment
kubectl rollout undo deployment/api-staging -n staging
kubectl rollout undo deployment/api-production -n production

# Undo to specific revision
kubectl rollout undo deployment/api-staging -n staging --to-revision=2
kubectl rollout undo deployment/api-production -n production --to-revision=2
```
