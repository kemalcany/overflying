# Ingress Configuration for Custom Domains

This directory contains configuration for setting up custom domains with automatic SSL/TLS certificates.

## Quick Start

### Automated Setup

Run the setup script to install everything:

```bash
cd k8s/ingress
./setup-ingress.sh
```

The script will:
1. Install NGINX Ingress Controller
2. Install cert-manager
3. Guide you through DNS configuration
4. Create Let's Encrypt ClusterIssuer
5. Apply Ingress resources
6. Monitor certificate issuance

### Manual Setup

If you prefer manual setup, follow the steps below.

## Files

- **`letsencrypt-issuer.yaml`**: ClusterIssuer for Let's Encrypt SSL certificates
- **`staging-ingress.yaml`**: Ingress configuration for staging environment
- **`production-ingress.yaml`**: Ingress configuration for production environment
- **`setup-ingress.sh`**: Automated setup script

## Prerequisites

- Helm 3 installed
- kubectl access to your GKE cluster
- Domain registered at Namecheap (or any registrar)

## Manual Setup Steps

### 1. Install Helm (if not already installed)

```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 2. Install NGINX Ingress Controller

```bash
# Add repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.externalTrafficPolicy=Local

# Get the external IP
kubectl get service nginx-ingress-ingress-nginx-controller -n ingress-nginx
```

Wait for the `EXTERNAL-IP` to be assigned (2-3 minutes).

### 3. Install cert-manager

```bash
# Install cert-manager CRDs and resources
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for it to be ready
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-webhook -n cert-manager
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager-cainjector -n cert-manager
```

### 4. Configure DNS

At Namecheap (or your DNS provider):

1. Go to **Advanced DNS**
2. Add A records pointing to the Ingress LoadBalancer IP:

| Type | Host | Value |
|------|------|-------|
| A Record | `staging.api` | `<INGRESS_IP>` |
| A Record | `production.api` | `<INGRESS_IP>` |

Wait 5-30 minutes for DNS propagation.

Verify DNS:
```bash
nslookup staging.api.overfly.ing
nslookup production.api.overfly.ing
```

### 5. Create ClusterIssuer

Edit `letsencrypt-issuer.yaml` and replace `your-email@example.com` with your email:

```yaml
email: your-email@example.com
```

Then apply:
```bash
kubectl apply -f letsencrypt-issuer.yaml
```

### 6. Apply Ingress Resources

```bash
kubectl apply -f staging-ingress.yaml
kubectl apply -f production-ingress.yaml
```

### 7. Monitor Certificate Issuance

```bash
# Watch certificate status
kubectl get certificate -n staging -w
kubectl get certificate -n production -w

# Check detailed status
kubectl describe certificate api-staging-tls -n staging
kubectl describe certificate api-production-tls -n production
```

Certificates typically take 2-5 minutes to be issued.

### 8. Verify Setup

```bash
# Test endpoints
curl https://staging.api.overfly.ing/health
curl https://production.api.overfly.ing/health

# Check SSL certificate
echo | openssl s_client -connect staging.api.overfly.ing:443 2>/dev/null | openssl x509 -noout -issuer -subject -dates
```

### 9. Convert Services to ClusterIP (Optional)

Save costs by removing individual LoadBalancers:

```bash
kubectl patch service api-service -n staging -p '{"spec":{"type":"ClusterIP"}}'
kubectl patch service api-service -n production -p '{"spec":{"type":"ClusterIP"}}'
```

This saves approximately $34/month.

## Configuration

### CORS Settings

Edit the Ingress YAML files to configure CORS for your frontend:

```yaml
nginx.ingress.kubernetes.io/cors-allow-origin: "https://your-frontend-domain.com"
```

### Rate Limiting

Adjust rate limits in the Ingress annotations:

```yaml
nginx.ingress.kubernetes.io/rate-limit: "100"  # requests per second
```

### Upload Size Limits

Adjust maximum upload size:

```yaml
nginx.ingress.kubernetes.io/proxy-body-size: "10m"  # 10 megabytes
```

### Timeouts

Configure connection timeouts:

```yaml
nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
```

## Monitoring

### Check Certificate Status

```bash
# List all certificates
kubectl get certificate --all-namespaces

# Check specific certificate
kubectl describe certificate api-staging-tls -n staging

# View certificate details
kubectl get secret api-staging-tls -n staging -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text
```

### Check Ingress Status

```bash
# List all ingresses
kubectl get ingress --all-namespaces

# Detailed ingress info
kubectl describe ingress api-staging-ingress -n staging

# Check Ingress controller logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-ingress-nginx-controller
```

### Check cert-manager Status

```bash
# cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Certificate requests
kubectl get certificaterequest --all-namespaces

# ACME orders
kubectl get order --all-namespaces

# ACME challenges
kubectl get challenge --all-namespaces
```

## Troubleshooting

### Certificate Not Issuing

1. **Check DNS is propagated**:
   ```bash
   nslookup staging.api.overfly.ing 8.8.8.8
   ```

2. **Check cert-manager logs**:
   ```bash
   kubectl logs -n cert-manager deployment/cert-manager
   ```

3. **Check certificate order**:
   ```bash
   kubectl describe certificaterequest -n staging
   kubectl describe order -n staging
   kubectl describe challenge -n staging
   ```

4. **Common issues**:
   - DNS not propagated (wait 30 minutes)
   - Wrong email in ClusterIssuer
   - HTTP-01 challenge failing (check Ingress is accessible)
   - Rate limit hit (use letsencrypt-staging for testing)

### 502 Bad Gateway

Service not responding:

```bash
# Check pods
kubectl get pods -n staging

# Check service
kubectl get service api-service -n staging

# Check endpoints
kubectl get endpoints api-service -n staging

# Check pod logs
kubectl logs -n staging -l app=api
```

### Ingress Not Working

```bash
# Check Ingress controller
kubectl get pods -n ingress-nginx

# Check Ingress logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-ingress-nginx-controller

# Check Ingress configuration
kubectl describe ingress api-staging-ingress -n staging
```

## Updating Domains

To change domains:

1. Update DNS records
2. Edit Ingress YAML files with new domains
3. Apply changes:
   ```bash
   kubectl apply -f staging-ingress.yaml
   kubectl apply -f production-ingress.yaml
   ```
4. Certificates will be automatically reissued

## Certificate Renewal

cert-manager automatically renews certificates 30 days before expiry. No manual action needed.

To force renewal:
```bash
# Delete the certificate (it will be recreated)
kubectl delete certificate api-staging-tls -n staging

# Or trigger renewal via annotation
kubectl annotate certificate api-staging-tls -n staging cert-manager.io/issue-temporary-certificate="true" --overwrite
```

## Cleanup

To remove everything:

```bash
# Remove Ingress resources
kubectl delete -f staging-ingress.yaml
kubectl delete -f production-ingress.yaml
kubectl delete -f letsencrypt-issuer.yaml

# Uninstall cert-manager
kubectl delete -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Uninstall NGINX Ingress
helm uninstall nginx-ingress -n ingress-nginx
kubectl delete namespace ingress-nginx
```

## Cost Breakdown

| Item | Monthly Cost |
|------|--------------|
| Ingress LoadBalancer | ~$17 |
| cert-manager | Free |
| Let's Encrypt | Free |
| **Total** | **~$17/month** |

Compare to 2 service LoadBalancers: ~$34/month
**Savings: ~$17/month**

## Additional Resources

- [NGINX Ingress Documentation](https://kubernetes.github.io/ingress-nginx/)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
