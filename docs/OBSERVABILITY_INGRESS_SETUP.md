# Observability Ingress Setup Guide

## Summary

Your existing ingress setup is **safe and unchanged**! I've configured Grafana and Prometheus to use your existing **NGINX Ingress Controller** (cost-free) instead of creating expensive LoadBalancers.

## ✅ What's Safe

### Your Existing Setup (Unchanged)

- **Production API**: `api.overfly.ing` → Works as before
- **Staging API**: `staging.api.overfly.ing` → Works as before
- **Ingress Controller**: NGINX Ingress (no additional LoadBalancer costs)
- **SSL Certificates**: cert-manager + Let's Encrypt (free)

### What I Changed

- ❌ **Did NOT** modify your API service types or ingress
- ✅ **Added** Prometheus annotations to pod templates (for metrics scraping)
- ✅ **Changed** Grafana from LoadBalancer → ClusterIP (saves ~$18-20/month)
- ✅ **Created** ingress rules for Grafana and Prometheus

## Architecture After Changes

```
                    NGINX Ingress Controller
                    (Single LoadBalancer - already exists)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  api.overfly.ing    grafana.overfly.ing   prometheus.overfly.ing
        │                     │                     │
        ▼                     ▼                     ▼
   API Service         Grafana Service      Prometheus Service
   (ClusterIP)          (ClusterIP)          (ClusterIP)
```

**Cost**: $0 additional (uses existing NGINX Ingress LoadBalancer)

## Deployment Steps

### 1. Deploy Observability Stack

```bash
./scripts/deploy-observability.sh
```

This will:
- Deploy Prometheus (ClusterIP)
- Deploy Grafana (ClusterIP)
- Create ingress rules with SSL via cert-manager
- No additional LoadBalancers created ✅

### 2. Configure DNS Records

Add these DNS records to your domain registrar (same as you did for api.overfly.ing):

```
grafana.overfly.ing    →  <NGINX_INGRESS_IP>
prometheus.overfly.ing →  <NGINX_INGRESS_IP>
```

**Get your NGINX Ingress IP:**
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

This should show an existing LoadBalancer with an EXTERNAL-IP. Use that same IP.

### 3. Wait for SSL Certificates

cert-manager will automatically provision Let's Encrypt certificates (2-5 minutes):

```bash
# Watch certificate status
kubectl get certificate -n observability -w

# Expected output:
# NAME             READY   SECRET           AGE
# grafana-tls      True    grafana-tls      2m
# prometheus-tls   True    prometheus-tls   2m
```

### 4. Access Your Dashboards

Once DNS propagates and certificates are ready:

**Grafana**: https://grafana.overfly.ing
- Username: `admin`
- Password: `admin123` (change immediately!)
- Navigate to: Dashboards → Browse → Overflying

**Prometheus**: https://prometheus.overfly.ing
- No auth by default (see security section below)
- Check targets: https://prometheus.overfly.ing/targets

## Security: Enable Authentication

### ⚠️ IMPORTANT: Currently Unprotected!

Both Grafana and Prometheus are accessible without authentication (except Grafana's built-in login).

### Enable Basic Auth on Ingress

1. **Create basic auth credentials:**

```bash
# Install htpasswd (if not already)
# macOS: brew install htpasswd
# Ubuntu: apt-get install apache2-utils

# Create auth file
htpasswd -c auth admin

# Create Kubernetes secrets
kubectl create secret generic grafana-basic-auth \
  --from-file=auth \
  -n observability

kubectl create secret generic prometheus-basic-auth \
  --from-file=auth \
  -n observability
```

2. **Enable auth in ingress:**

Edit [k8s/observability/observability-ingress.yaml](../k8s/observability/observability-ingress.yaml):

```yaml
# Uncomment these lines in both Grafana and Prometheus ingress:
nginx.ingress.kubernetes.io/auth-type: basic
nginx.ingress.kubernetes.io/auth-secret: grafana-basic-auth  # or prometheus-basic-auth
nginx.ingress.kubernetes.io/auth-realm: 'Authentication Required - Grafana'
```

3. **Apply changes:**

```bash
kubectl apply -f k8s/observability/observability-ingress.yaml
```

## Accessing Dashboards

### Production (via Ingress)

**Grafana**:
- URL: https://grafana.overfly.ing
- Shared dashboard for both staging and production environments
- Filter by `namespace` label in queries to see staging vs production

**Prometheus**:
- URL: https://prometheus.overfly.ing
- View all metrics from both environments
- Use filters: `{namespace="production"}` or `{namespace="staging"}`

### Staging vs Production

**Single Observability Stack** monitors both:
- Prometheus scrapes metrics from `production` and `staging` namespaces
- Grafana dashboards can filter by environment
- Use dashboard variables or manual filters:
  - Production: `{namespace="production"}`
  - Staging: `{namespace="staging"}`

**Why single stack?**
- Cost-effective (one set of resources)
- Unified view across environments
- Less operational overhead

### Local Development (via Port-Forward)

If DNS/SSL isn't set up yet:

```bash
# Grafana
kubectl port-forward -n observability svc/grafana 3000:3000
# Visit: http://localhost:3000

# Prometheus
kubectl port-forward -n observability svc/prometheus 9090:9090
# Visit: http://localhost:9090
```

## Dashboard URLs Summary

| Service | Production URL | Environment |
|---------|---------------|-------------|
| API | https://api.overfly.ing | Production |
| API | https://staging.api.overfly.ing | Staging |
| Grafana | https://grafana.overfly.ing | Shared (Both) |
| Prometheus | https://prometheus.overfly.ing | Shared (Both) |

## Cost Comparison

### Before (if I hadn't fixed it)
- Existing NGINX Ingress LoadBalancer: ~$18/month
- Grafana LoadBalancer: ~$18/month ❌
- **Total**: ~$36/month

### After (current setup)
- Existing NGINX Ingress LoadBalancer: ~$18/month
- Grafana via Ingress: $0 ✅
- Prometheus via Ingress: $0 ✅
- **Total**: ~$18/month (no change!)

**Savings**: $18/month (~$216/year)

## Troubleshooting

### DNS Not Resolving

```bash
# Check if DNS is propagated
dig grafana.overfly.ing
dig prometheus.overfly.ing

# Should return your NGINX Ingress IP
```

### SSL Certificate Not Issuing

```bash
# Check certificate status
kubectl describe certificate grafana-tls -n observability

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager

# Common issue: DNS not propagated yet (wait 5-10 minutes)
```

### Can't Access Dashboard

```bash
# Check ingress status
kubectl get ingress -n observability

# Check Grafana/Prometheus pods
kubectl get pods -n observability

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

### Wrong NGINX Ingress IP

```bash
# Get the correct IP
kubectl get svc -n ingress-nginx

# Update your DNS records to point to this IP
```

## Next Steps

1. ✅ Run `./scripts/deploy-observability.sh`
2. ✅ Configure DNS (grafana.overfly.ing, prometheus.overfly.ing)
3. ✅ Wait for SSL certificates
4. ✅ Enable authentication (edit observability-ingress.yaml)
5. ✅ Access dashboards at https://grafana.overfly.ing
6. ✅ Deploy instrumented services

## References

- [Full Deployment Guide](./OBSERVABILITY_DEPLOYMENT.md)
- [Ingress Configuration](../k8s/observability/observability-ingress.yaml)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [NGINX Ingress Controller](https://kubernetes.github.io/ingress-nginx/)
