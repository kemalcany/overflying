# Cost Optimization Guide for GKE Deployment

**Goal**: Keep monthly GCP costs under $20 while maintaining production-ready architecture.

## Current Architecture Costs (Estimated)

### Infrastructure Components

| Component | Configuration | Est. Monthly Cost |
|-----------|--------------|-------------------|
| **GKE Autopilot Cluster** | 1 node, 2 vCPU, 4GB RAM | ~$70-90 |
| **Cloud SQL (Postgres)** | Small instance (1 vCPU, 3.75GB) | ~$25-35 |
| **NATS (on GKE)** | Single pod, minimal resources | ~$0 (included in cluster) |
| **Load Balancer** | HTTP(S) | ~$18-20 |
| **Persistent Disks** | 10GB for NATS, 10GB for DB | ~$2-3 |
| **Egress Traffic** | Minimal (first 1GB free) | ~$1-2 |
| **Total** | | **~$116-150/month** |

## 🎯 Cost-Optimized Architecture (~$15-25/month)

### Option 1: Single VPS Alternative (Cheapest)

**Use a single $6-12/month VPS** (DigitalOcean, Linode, Hetzner):
- Docker Compose for all services
- PostgreSQL + NATS + API + Worker on one machine
- nginx for SSL/TLS
- No Kubernetes overhead

**Estimated Cost**: $6-12/month

### Option 2: GKE Free Tier + Cloud Run (Recommended for Demo)

1. **Use GKE Free Tier**:
   - 1 autopilot zonal cluster FREE
   - ~$0.10/hour for compute (~$73/month)

2. **Replace Cloud SQL with PostgreSQL pod**:
   - Run Postgres as StatefulSet with PVC
   - Save ~$25-35/month
   - Trade-off: Manual backups, less managed

3. **Use Preemptible Nodes** (if not using Autopilot):
   - 70-90% cheaper than regular nodes
   - Can be interrupted (fine for dev/demo)

4. **Optimize NATS**:
   - Single replica with minimal resources
   - Use in-memory storage for demo (no PVC needed)
   - Cost: $0 (uses cluster resources)

**Estimated Cost**: $15-25/month

### Option 3: Cloud Run Only (Serverless)

- Deploy API + Worker as Cloud Run services
- Use Cloud SQL (smallest instance)
- NATS via managed service or external provider
- Pay only for requests (scales to zero)

**Estimated Cost**: $10-20/month (low traffic)

## 🛠️ Implementation: Cost-Optimized GKE

### 1. Use PostgreSQL StatefulSet Instead of Cloud SQL

```yaml
# k8s/postgres/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  template:
    spec:
      containers:
      - name: postgres
        image: postgres:18-alpine  # Alpine = smaller image
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi  # Small volume
```

**Savings**: ~$25-35/month

### 2. Minimal NATS Configuration

```yaml
# k8s/nats/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nats
spec:
  replicas: 1  # Single instance for demo
  template:
    spec:
      containers:
      - name: nats
        image: nats:2-alpine  # Alpine = smaller
        args:
          - "-js"             # Enable JetStream
          - "-m"
          - "8222"            # Monitoring
        resources:
          requests:
            memory: "64Mi"    # Minimal memory
            cpu: "50m"        # Minimal CPU
          limits:
            memory: "128Mi"
            cpu: "100m"
```

**Cost**: Minimal (uses existing cluster resources)

### 3. Optimize API + Worker Resources

```yaml
# k8s/api/deployment.yaml
resources:
  requests:
    memory: "128Mi"  # Start small
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
```

### 4. Use Horizontal Pod Autoscaling (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 1      # Start with 1
  maxReplicas: 3      # Scale up only if needed
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## 💰 Cost Monitoring Commands

```bash
# Check current GKE costs
gcloud billing accounts list
gcloud billing projects describe YOUR_PROJECT_ID

# Monitor resource usage
kubectl top nodes
kubectl top pods

# Check persistent disk usage
kubectl get pvc
```

## 📊 Cost Comparison Table

| Setup | Monthly Cost | Pros | Cons |
|-------|-------------|------|------|
| **Full Production** | ~$116-150 | Managed, HA, auto-scaling | Expensive for demo |
| **Optimized GKE** | ~$15-25 | K8s experience, scalable | Some manual work |
| **Single VPS** | ~$6-12 | Cheapest, simple | Not "cloud-native" |
| **Cloud Run** | ~$10-20 | Serverless, auto-scale | Different paradigm |

## 🚀 Recommended for Your Demo

**Use Optimized GKE** (~$15-25/month):

1. ✅ Shows Kubernetes experience (Planet uses K8s)
2. ✅ Production-ready architecture
3. ✅ Easy to scale later
4. ✅ Demonstrates cloud-native practices
5. ✅ Affordable for portfolio project

### Quick Setup

```bash
# 1. Create cluster (free tier)
gcloud container clusters create-auto planet \
  --region=us-central1 \
  --min-nodes=1 \
  --max-nodes=2

# 2. Deploy optimized manifests
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/nats/
kubectl apply -f k8s/api/
kubectl apply -f k8s/worker/

# 3. Monitor costs
watch 'kubectl top nodes && kubectl top pods'
```

## 🔧 Further Optimization Tips

### 1. Use Regional Resources (Not Multi-Regional)
- Regional persistent disks are cheaper
- Keep everything in same region (us-central1)

### 2. Use Spot/Preemptible Nodes
```bash
gcloud container node-pools create preemptible-pool \
  --cluster=planet \
  --preemptible \
  --machine-type=e2-small
```

### 3. Schedule Cluster Downtime
```bash
# Stop cluster when not demoing (save ~$2/day)
gcloud container clusters resize planet --num-nodes=0 --zone=us-central1-a

# Resume when needed
gcloud container clusters resize planet --num-nodes=1 --zone=us-central1-a
```

### 4. Use Free Tier Credits
- New GCP accounts get $300 credit for 90 days
- Plenty for development and demo

### 5. Delete Resources When Not Needed
```bash
# Temporary shutdown (keeps data)
kubectl scale deployment api --replicas=0
kubectl scale deployment worker --replicas=0

# Resume
kubectl scale deployment api --replicas=1
kubectl scale deployment worker --replicas=1
```

## 📝 Cost Monitoring Checklist

- [ ] Enable billing alerts at $10, $20, $30
- [ ] Use `gcloud billing budgets create` for auto-notifications
- [ ] Review costs weekly: `gcloud billing accounts list`
- [ ] Set up budget alerts in GCP Console
- [ ] Monitor with: `kubectl top nodes` and `kubectl top pods`
- [ ] Clean up old images in Container Registry
- [ ] Delete unused persistent volumes

## 🎓 For Interview/Demo

**Talking Points**:
1. "I optimized costs by ~85% while maintaining production architecture"
2. "Single NATS pod with JetStream persistence costs almost nothing"
3. "PostgreSQL StatefulSet instead of Cloud SQL saves $30/month"
4. "Can scale to production with minimal config changes"
5. "Total monthly cost: ~$20 for a fully functioning GPU orchestrator"

## 📚 Resources

- [GKE Pricing Calculator](https://cloud.google.com/products/calculator)
- [GKE Autopilot Pricing](https://cloud.google.com/kubernetes-engine/pricing)
- [Cloud SQL Pricing](https://cloud.google.com/sql/pricing)
- [Free Tier Details](https://cloud.google.com/free)

---

**Summary**: For your Planet demo, use **Optimized GKE** at ~$20/month. This demonstrates cloud-native skills while staying budget-friendly. You can easily scale to production later with managed services when needed.
