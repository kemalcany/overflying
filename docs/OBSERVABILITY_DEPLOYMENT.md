# Observability Deployment Guide

This guide covers deploying the complete observability stack for the Overflying platform using OpenTelemetry, Prometheus, and Grafana on Kubernetes (GKE).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Deployment Steps](#deployment-steps)
5. [Verification](#verification)
6. [Accessing Dashboards](#accessing-dashboards)
7. [Metrics Reference](#metrics-reference)
8. [Troubleshooting](#troubleshooting)

## Overview

The observability stack consists of:

- **OpenTelemetry**: Industry-standard instrumentation for metrics, traces, and logs
- **Prometheus**: Time-series database for metrics collection and storage
- **Grafana**: Visualization and dashboard platform
- **Instrumented Services**: API and Worker services with comprehensive metrics

### Key Features

- ✅ OpenTelemetry best practices implementation
- ✅ Automatic instrumentation (HTTP, Database, System metrics)
- ✅ Custom business metrics (Jobs, GPU, NATS events)
- ✅ Prometheus native metrics format
- ✅ Pre-configured Grafana dashboards
- ✅ Service discovery via Kubernetes annotations
- ✅ Multi-environment support (production, staging)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Observability Stack                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                    ┌──────────────┐      │
│  │   Grafana    │◄───────────────────│  Prometheus  │      │
│  │  (Port 3000) │    Query Metrics   │  (Port 9090) │      │
│  └──────────────┘                    └───────┬──────┘      │
│         │                                     │              │
│         │                                     │ Scrape       │
│         │                                     ▼              │
│         │                    ┌────────────────────────────┐ │
│         └────────────────────┤   Kubernetes Services      │ │
│              View Dashboards │  (prometheus.io/scrape)    │ │
│                              └─┬───────────────────────┬──┘ │
│                                │                       │     │
└────────────────────────────────┼───────────────────────┼────┘
                                 │                       │
                    ┌────────────▼──────────┐  ┌────────▼─────────┐
                    │   API Pods            │  │  Worker Pods     │
                    │   /metrics (8000)     │  │  /metrics (8000) │
                    │   OpenTelemetry       │  │  OpenTelemetry   │
                    │   Instrumentation     │  │  Instrumentation │
                    └───────────────────────┘  └──────────────────┘
```

### Metrics Flow

1. **Instrumentation**: API and Worker services expose `/metrics` endpoints
2. **Discovery**: Prometheus discovers services via `prometheus.io/scrape` annotations
3. **Collection**: Prometheus scrapes metrics every 15 seconds
4. **Storage**: Metrics stored in Prometheus TSDB (15-day retention)
5. **Visualization**: Grafana queries Prometheus and displays dashboards

## Prerequisites

### Required

- Kubernetes cluster (GKE Autopilot recommended)
- `kubectl` configured to access your cluster
- Namespaces: `observability`, `production`, `staging`, `infrastructure`

### Verify Cluster Access

```bash
kubectl cluster-info
kubectl get namespaces
```

## Deployment Steps

### Step 1: Create Observability Namespace

```bash
kubectl apply -f k8s/observability/prometheus-namespace.yaml
```

This creates the `observability` namespace for Prometheus and Grafana.

### Step 2: Deploy Prometheus

Deploy Prometheus with RBAC, ConfigMap, and storage:

```bash
# RBAC permissions for Kubernetes service discovery
kubectl apply -f k8s/observability/prometheus-rbac.yaml

# Prometheus configuration (scrape configs, targets)
kubectl apply -f k8s/observability/prometheus-configmap.yaml

# Prometheus deployment, service, and storage
kubectl apply -f k8s/observability/prometheus-deployment.yaml
```

**What this does:**
- Creates ServiceAccount with ClusterRole for pod/service discovery
- Configures scrape targets for API, Worker, NATS, and Kubernetes components
- Deploys Prometheus with 20Gi persistent storage
- Exposes Prometheus UI on ClusterIP service (port 9090)

**Verify Prometheus:**

```bash
# Check Prometheus pod is running
kubectl get pods -n observability -l app=prometheus

# Check Prometheus service
kubectl get svc -n observability prometheus

# Port-forward to access Prometheus UI (optional)
kubectl port-forward -n observability svc/prometheus 9090:9090
# Visit http://localhost:9090
```

### Step 3: Deploy Grafana

Deploy Grafana with datasources, dashboards, and storage:

```bash
# Grafana datasources (Prometheus connection)
kubectl apply -f k8s/observability/grafana-configmap.yaml

# Grafana dashboard definitions
kubectl apply -f k8s/observability/grafana-dashboards.yaml
kubectl apply -f k8s/observability/grafana-dashboards-detailed.yaml

# Grafana deployment, service, and storage
kubectl apply -f k8s/observability/grafana-deployment.yaml
```

**What this does:**
- Configures Prometheus as default datasource
- Loads pre-built dashboards for API and Worker
- Deploys Grafana with 10Gi persistent storage
- Exposes Grafana on LoadBalancer service (port 3000)

**Verify Grafana:**

```bash
# Check Grafana pod is running
kubectl get pods -n observability -l app=grafana

# Get Grafana LoadBalancer IP
kubectl get svc -n observability grafana

# Get default admin credentials
kubectl get secret -n observability grafana-admin -o jsonpath='{.data.username}' | base64 -d
kubectl get secret -n observability grafana-admin -o jsonpath='{.data.password}' | base64 -d
```

**Important**: Change the default Grafana admin password immediately in production!

### Step 4: Deploy Instrumented Services

The API and Worker deployments already include Prometheus annotations and OpenTelemetry instrumentation.

#### Deploy Production Services

```bash
# Deploy API
kubectl apply -f k8s/api/production-deployment.yaml

# Deploy Worker
kubectl apply -f k8s/worker/production-deployment.yaml
```

#### Deploy Staging Services

```bash
# Deploy API
kubectl apply -f k8s/api/staging-deployment.yaml

# Deploy Worker
kubectl apply -f k8s/worker/staging-deployment.yaml
```

**What this does:**
- Deploys services with `prometheus.io/scrape: "true"` annotations
- Exposes `/metrics` endpoints on port 8000
- Starts collecting OpenTelemetry metrics automatically

### Step 5: Verify Metrics Collection

Check that Prometheus is discovering and scraping targets:

```bash
# Port-forward Prometheus
kubectl port-forward -n observability svc/prometheus 9090:9090
```

Visit http://localhost:9090/targets and verify:
- ✅ `overflying-api-production` targets are UP
- ✅ `overflying-api-staging` targets are UP
- ✅ `overflying-worker-production` targets are UP
- ✅ `overflying-worker-staging` targets are UP

## Verification

### Check All Observability Components

```bash
# Check all pods in observability namespace
kubectl get pods -n observability

# Expected output:
# NAME                          READY   STATUS    RESTARTS   AGE
# prometheus-xxxxxxxxxx-xxxxx   1/1     Running   0          5m
# grafana-xxxxxxxxxx-xxxxx      1/1     Running   0          3m
```

### Test Metrics Endpoints

```bash
# Test API metrics endpoint
kubectl port-forward -n production <api-pod-name> 8000:8000
curl http://localhost:8000/metrics

# Test Worker metrics endpoint
kubectl port-forward -n production <worker-pod-name> 8000:8000
curl http://localhost:8000/metrics
```

You should see Prometheus-format metrics like:
```
# HELP overflying_jobs_created_total Total number of jobs created
# TYPE overflying_jobs_created_total counter
overflying_jobs_created_total{priority="1",submitted_by="user"} 42.0
```

### Query Metrics in Prometheus

```bash
# Port-forward Prometheus
kubectl port-forward -n observability svc/prometheus 9090:9090
```

Visit http://localhost:9090/graph and try these queries:

```promql
# API request rate
rate(http_server_requests_total[5m])

# Jobs processed by worker
rate(overflying_worker_jobs_processed_total[5m])

# Worker job execution time (95th percentile)
histogram_quantile(0.95, rate(overflying_worker_job_execution_time_bucket[5m]))

# Memory usage across all API pods
sum(process_resident_memory_bytes{job=~"overflying-api.*"}) by (pod)
```

## Accessing Dashboards

### Access Grafana

1. **Get Grafana URL:**

```bash
# Get LoadBalancer IP
kubectl get svc -n observability grafana

# If using LoadBalancer (GKE)
GRAFANA_IP=$(kubectl get svc -n observability grafana -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Grafana URL: http://$GRAFANA_IP:3000"
```

2. **Login:**
   - Username: `admin`
   - Password: `admin123` (change immediately!)

3. **Navigate to Dashboards:**
   - Click **Dashboards** → **Browse**
   - Open folder: **Overflying**
   - Select:
     - **Overflying API - Detailed Metrics**
     - **Overflying Worker - Detailed Metrics**

### Port-Forwarding (Development)

If you don't have a LoadBalancer:

```bash
# Grafana
kubectl port-forward -n observability svc/grafana 3000:3000

# Prometheus
kubectl port-forward -n observability svc/prometheus 9090:9090
```

Visit:
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090

## Metrics Reference

### API Metrics

#### HTTP Metrics (Auto-instrumented)
- `http_server_requests_total` - Total HTTP requests by method, route, status
- `http_server_request_duration_seconds` - Request duration histogram

#### Custom Business Metrics
- `overflying_jobs_created_total` - Jobs created counter (by priority, user)
- `overflying_jobs_total` - Current total jobs in system
- `overflying_jobs_by_status` - Jobs by status (queued, running, completed, failed)
- `overflying_sse_connections_active` - Active SSE connections
- `overflying_nats_events_published_total` - NATS events published
- `overflying_http_request_duration_seconds` - Custom request duration histogram

#### Database Metrics (Auto-instrumented)
- `db_pool_connections_total` - Database connection pool metrics
- `db_query_duration_seconds` - Database query duration

#### System Metrics (Auto-instrumented)
- `process_cpu_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `process_open_fds` - Open file descriptors

### Worker Metrics

#### Job Processing Metrics
- `overflying_worker_jobs_processed_total` - Jobs processed successfully (by job_name)
- `overflying_worker_jobs_failed_total` - Jobs failed (by job_name, error_type)
- `overflying_worker_jobs_in_progress` - Jobs currently processing
- `overflying_worker_job_execution_time_seconds` - Job execution duration histogram

#### GPU Metrics
- `overflying_worker_gpu_utilization` - GPU utilization % (by gpu_id)
- `overflying_worker_gpu_memory_used_bytes` - GPU memory used (by gpu_id)
- `overflying_worker_gpu_temperature_celsius` - GPU temperature (by gpu_id)

#### Worker Loop Metrics
- `overflying_worker_poll_cycles_total` - Poll cycles executed (by jobs_found)
- `overflying_worker_nats_events_published_total` - NATS events published

#### System Metrics (Auto-instrumented)
- `process_cpu_seconds_total` - CPU usage
- `process_resident_memory_bytes` - Memory usage
- `system_cpu_utilization` - System-wide CPU utilization

## Troubleshooting

### Prometheus Not Discovering Targets

**Issue**: API/Worker pods not appearing in Prometheus targets

**Solution**:
```bash
# Check pod annotations
kubectl get pods -n production -o yaml | grep prometheus.io

# Verify annotations exist:
# prometheus.io/scrape: "true"
# prometheus.io/port: "8000"
# prometheus.io/path: "/metrics"

# Check Prometheus logs
kubectl logs -n observability -l app=prometheus

# Restart Prometheus if needed
kubectl rollout restart deployment/prometheus -n observability
```

### Metrics Endpoint Not Responding

**Issue**: `/metrics` endpoint returns 404 or connection refused

**Solution**:
```bash
# Check if metrics server started
kubectl logs -n production <api-pod-name> | grep Metrics
# Should see: "[Metrics] OpenTelemetry metrics initialized"
# Should see: "[Metrics] Prometheus endpoint available at /metrics"

# For worker, check metrics HTTP server
kubectl logs -n production <worker-pod-name> | grep Metrics
# Should see: "[Metrics] HTTP server started on port 8000"

# Test metrics endpoint directly
kubectl exec -n production <pod-name> -- curl localhost:8000/metrics
```

### Grafana Dashboards Show "No Data"

**Issue**: Dashboards display but show no data

**Solution**:
```bash
# Check Grafana datasource connection
kubectl port-forward -n observability svc/grafana 3000:3000
# Visit http://localhost:3000/datasources
# Test the Prometheus datasource

# Verify Prometheus has data
kubectl port-forward -n observability svc/prometheus 9090:9090
# Visit http://localhost:9090/targets
# Check that targets are UP and Last Scrape shows recent timestamp

# Check metric names match dashboard queries
# In Prometheus, run: {__name__=~"overflying.*"}
```

### High Memory Usage

**Issue**: Prometheus or Grafana using too much memory

**Solution**:
```bash
# Check current resource usage
kubectl top pods -n observability

# Adjust resource limits in deployments
# Edit: k8s/observability/prometheus-deployment.yaml
# Increase memory limits if needed

# For Prometheus, adjust retention
# Edit prometheus args:
# --storage.tsdb.retention.time=7d (reduce from 15d)
# --storage.tsdb.retention.size=5GB (reduce from 10GB)

# Apply changes
kubectl apply -f k8s/observability/prometheus-deployment.yaml
```

### Missing Metrics After Deployment

**Issue**: Some custom metrics not appearing

**Solution**:
```bash
# Check if services are creating metrics
kubectl port-forward -n production <pod> 8000:8000
curl http://localhost:8000/metrics | grep overflying

# Verify OpenTelemetry initialization
kubectl logs -n production <pod> | grep -i "metric\|telemetry"

# Check for Python import errors
kubectl logs -n production <pod> | grep -i error

# Verify dependencies installed
kubectl exec -n production <pod> -- pip list | grep opentelemetry
```

## Best Practices

### Security

1. **Change Default Credentials**:
   ```bash
   # Update Grafana admin password
   kubectl edit secret -n observability grafana-admin
   ```

2. **Restrict Access**:
   - Use Kubernetes RBAC for namespace access
   - Configure Grafana authentication (OAuth, LDAP)
   - Use Network Policies to restrict traffic

3. **Sensitive Metrics**:
   - Avoid logging sensitive data in metric labels
   - Use metric relabeling to drop sensitive labels

### Performance

1. **Scrape Interval**: 15s is recommended for most use cases
   - Reduce to 30s for lower cardinality
   - Increase to 5s for high-frequency metrics (not recommended)

2. **Metric Cardinality**: Keep label cardinality low
   - ❌ Bad: `user_id` label (high cardinality)
   - ✅ Good: `user_type` label (low cardinality)

3. **Storage**: Monitor Prometheus disk usage
   ```bash
   kubectl exec -n observability <prometheus-pod> -- du -sh /prometheus
   ```

### Monitoring

1. **Set Up Alerts**: Configure Prometheus AlertManager
2. **Monitor the Monitors**: Track Prometheus/Grafana health
3. **Backup**: Regularly backup Grafana dashboards and Prometheus data

## Next Steps

- **Distributed Tracing**: Add Tempo/Jaeger for trace collection
- **Log Aggregation**: Deploy Loki for centralized logging
- **Alerting**: Configure Prometheus AlertManager and alert rules
- **Custom Dashboards**: Create team-specific dashboards in Grafana
- **Metric Exporters**: Add exporters for PostgreSQL, NATS metrics

## References

- [OpenTelemetry Python Documentation](https://opentelemetry.io/docs/languages/python/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Kubernetes Monitoring Guide](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)
