# Observability Stack

This directory contains Kubernetes manifests for deploying the complete observability stack for Overflying, following OpenTelemetry best practices.

## Quick Start

### One-Command Deployment

```bash
# From project root
./scripts/deploy-observability.sh
```

### Manual Deployment

```bash
# 1. Create namespace
kubectl apply -f prometheus-namespace.yaml

# 2. Deploy Prometheus
kubectl apply -f prometheus-rbac.yaml
kubectl apply -f prometheus-configmap.yaml
kubectl apply -f prometheus-deployment.yaml

# 3. Deploy Grafana
kubectl apply -f grafana-configmap.yaml
kubectl apply -f grafana-dashboards.yaml
kubectl apply -f grafana-dashboards-detailed.yaml
kubectl apply -f grafana-deployment.yaml
```

## Components

### Prometheus (`prometheus-*.yaml`)

- **Purpose**: Metrics collection and time-series storage
- **Scrape Interval**: 15 seconds
- **Retention**: 15 days / 10GB
- **Storage**: 20Gi persistent volume
- **Port**: 9090 (ClusterIP)

**Key Features:**
- Kubernetes service discovery
- Auto-discovery via `prometheus.io/scrape` annotations
- Pre-configured scrape configs for API, Worker, NATS
- RBAC permissions for cluster-wide discovery

### Grafana (`grafana-*.yaml`)

- **Purpose**: Metrics visualization and dashboards
- **Port**: 3000 (LoadBalancer)
- **Storage**: 10Gi persistent volume
- **Default Credentials**: admin/admin123 (change in production!)

**Key Features:**
- Pre-configured Prometheus datasource
- Built-in dashboards for API and Worker
- Auto-provisioned dashboard from ConfigMaps
- Persistent storage for custom dashboards

### Dashboards

#### Grafana Dashboards (`grafana-dashboards.yaml`)
- Kubernetes Cluster Overview
- Basic API and Worker dashboards

#### Detailed Dashboards (`grafana-dashboards-detailed.yaml`)
- **Overflying API - Detailed Metrics**
  - HTTP request rate and duration
  - Jobs created metrics
  - SSE connections
  - Database connection pool
  - Memory usage

- **Overflying Worker - Detailed Metrics**
  - Job processing rate and execution time
  - GPU utilization, memory, temperature
  - Poll cycles and efficiency
  - Worker memory usage

## Architecture

```
Grafana (3000) ──queries──> Prometheus (9090)
                                  │
                                  │ scrapes (15s)
                                  │
                     ┌────────────┴────────────┐
                     │                         │
                 API Pods                 Worker Pods
                 /metrics                 /metrics
                 (port 8000)             (port 8000)
```

## Accessing Services

### Port-Forwarding (Development)

```bash
# Prometheus
kubectl port-forward -n observability svc/prometheus 9090:9090

# Grafana
kubectl port-forward -n observability svc/grafana 3000:3000
```

### LoadBalancer (Production)

```bash
# Get Grafana external IP
kubectl get svc -n observability grafana

# Get credentials
kubectl get secret -n observability grafana-admin -o jsonpath='{.data.username}' | base64 -d
kubectl get secret -n observability grafana-admin -o jsonpath='{.data.password}' | base64 -d
```

## Metrics Endpoints

The following services expose Prometheus metrics:

| Service | Namespace | Port | Path | Annotation |
|---------|-----------|------|------|------------|
| API (Production) | production | 8000 | /metrics | `prometheus.io/scrape: "true"` |
| API (Staging) | staging | 8000 | /metrics | `prometheus.io/scrape: "true"` |
| Worker (Production) | production | 8000 | /metrics | `prometheus.io/scrape: "true"` |
| Worker (Staging) | staging | 8000 | /metrics | `prometheus.io/scrape: "true"` |
| NATS | infrastructure | 7777 | /metrics | `prometheus.io/scrape: "true"` |

## Verification

### Check Deployment Status

```bash
# Check all pods
kubectl get pods -n observability

# Check services
kubectl get svc -n observability

# Check PVCs
kubectl get pvc -n observability
```

### Verify Prometheus Targets

```bash
kubectl port-forward -n observability svc/prometheus 9090:9090
```

Visit http://localhost:9090/targets and ensure targets are "UP".

### Test Metrics

```bash
# Test API metrics
kubectl port-forward -n production <api-pod> 8000:8000
curl http://localhost:8000/metrics

# Test Worker metrics
kubectl port-forward -n production <worker-pod> 8000:8000
curl http://localhost:8000/metrics
```

## Prometheus Configuration

### Scrape Configs

Prometheus is configured to scrape:

1. **Kubernetes API Server** - Cluster health
2. **Kubernetes Nodes** - Node metrics
3. **Kubernetes Pods** - Auto-discovery via annotations
4. **Kubernetes Services** - Service-level metrics
5. **Overflying API** - Production and Staging
6. **Overflying Worker** - Production and Staging
7. **NATS** - Message broker metrics

### Service Discovery

Services are auto-discovered using these annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"    # Enable scraping
  prometheus.io/port: "8000"       # Metrics port
  prometheus.io/path: "/metrics"   # Metrics endpoint
```

## Storage

### Prometheus Storage

- **Type**: Persistent Volume Claim (PVC)
- **Size**: 20Gi
- **Storage Class**: `standard-rwo` (GKE)
- **Retention**: 15 days or 10GB (whichever comes first)

### Grafana Storage

- **Type**: Persistent Volume Claim (PVC)
- **Size**: 10Gi
- **Storage Class**: `standard-rwo` (GKE)
- **Contents**: Grafana configuration, custom dashboards

## Resource Allocation

### Prometheus

```yaml
requests:
  cpu: 500m
  memory: 1Gi
limits:
  cpu: 2000m
  memory: 4Gi
```

### Grafana

```yaml
requests:
  cpu: 250m
  memory: 512Mi
limits:
  cpu: 1000m
  memory: 2Gi
```

## Troubleshooting

### Prometheus Not Discovering Services

```bash
# Check RBAC permissions
kubectl get clusterrolebinding prometheus

# Check Prometheus logs
kubectl logs -n observability -l app=prometheus

# Verify service annotations
kubectl get pods -n production -o yaml | grep prometheus.io
```

### Grafana Shows No Data

```bash
# Test Prometheus datasource
kubectl port-forward -n observability svc/grafana 3000:3000
# Visit http://localhost:3000/datasources

# Verify Prometheus has data
kubectl port-forward -n observability svc/prometheus 9090:9090
# Visit http://localhost:9090/graph
# Run query: up{job=~"overflying.*"}
```

### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n observability

# Reduce Prometheus retention
kubectl edit deployment -n observability prometheus
# Modify args: --storage.tsdb.retention.time=7d
```

## Security Considerations

### Change Default Credentials

```bash
# Update Grafana admin password
kubectl edit secret -n observability grafana-admin

# Or create new secret
kubectl create secret generic grafana-admin \
  --from-literal=username=admin \
  --from-literal=password=<NEW_PASSWORD> \
  -n observability \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Grafana
kubectl rollout restart deployment/grafana -n observability
```

### Network Policies

Consider implementing Network Policies to restrict traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: observability-network-policy
  namespace: observability
spec:
  podSelector:
    matchLabels:
      component: monitoring
  policyTypes:
    - Ingress
  ingress:
    - from:
      - namespaceSelector:
          matchLabels:
            name: production
      - namespaceSelector:
          matchLabels:
            name: staging
```

## Next Steps

1. **Deploy Services**: Deploy instrumented API and Worker services
2. **Configure Alerts**: Set up Prometheus AlertManager
3. **Add Tracing**: Deploy Tempo/Jaeger for distributed tracing
4. **Log Aggregation**: Add Loki for centralized logging
5. **Custom Dashboards**: Create team-specific dashboards

## Documentation

- **Full Deployment Guide**: [../../docs/OBSERVABILITY_DEPLOYMENT.md](../../docs/OBSERVABILITY_DEPLOYMENT.md)
- **Metrics Reference**: See deployment guide for complete metrics list
- **OpenTelemetry**: https://opentelemetry.io/docs/languages/python/
- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/

## Support

For issues or questions:
1. Check logs: `kubectl logs -n observability <pod-name>`
2. Review deployment guide: `docs/OBSERVABILITY_DEPLOYMENT.md`
3. Verify service health: `kubectl get pods -n observability`
