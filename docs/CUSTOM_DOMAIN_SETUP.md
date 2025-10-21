# Custom Domain Setup with SSL/TLS

This guide will help you configure custom domains for your API services with automatic SSL/TLS certificates.

## Your Current Setup

**Current IPs**:
- Staging: `34.77.11.73`
- Production: `34.140.208.108`

**Desired Domains**:
- Staging: `staging.api.overfly.ing`
- Production: `production.api.overfly.ing` (or just `api.overfly.ing`)

## Prerequisites

- Domain registered at Namecheap: `overfly.ing`
- Access to Namecheap DNS management
- kubectl access to your GKE cluster

## Option 1: Using Google-Managed SSL Certificates with Ingress (Recommended)

This is the easiest and most integrated approach for GKE. Google will automatically provision and renew SSL certificates.

### Step 1: Install NGINX Ingress Controller

```bash
# Add Ingress NGINX helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install NGINX Ingress Controller
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.externalTrafficPolicy=Local
```

Wait for the LoadBalancer to get an external IP:

```bash
kubectl get service nginx-ingress-ingress-nginx-controller -n ingress-nginx -w
```

Note the **EXTERNAL-IP** - you'll use this for DNS configuration.

### Step 2: Install cert-manager for SSL Certificates

cert-manager will automatically provision and renew Let's Encrypt SSL certificates.

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=available --timeout=300s \
  deployment/cert-manager -n cert-manager

kubectl wait --for=condition=available --timeout=300s \
  deployment/cert-manager-webhook -n cert-manager

kubectl wait --for=condition=available --timeout=300s \
  deployment/cert-manager-cainjector -n cert-manager
```

### Step 3: Create ClusterIssuer for Let's Encrypt

Create a ClusterIssuer for Let's Encrypt to issue certificates:

```bash
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com  # Change this to your email
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

**Important**: Replace `your-email@example.com` with your actual email address.

### Step 4: Configure DNS at Namecheap

1. Log in to **Namecheap**
2. Go to **Domain List** > Click **Manage** next to `overfly.ing`
3. Go to **Advanced DNS** tab
4. Add these A records:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `staging.api` | `<NGINX_INGRESS_IP>` | Automatic |
| A Record | `production.api` | `<NGINX_INGRESS_IP>` | Automatic |

Or if you prefer shorter URLs:
| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `staging-api` | `<NGINX_INGRESS_IP>` | Automatic |
| A Record | `api` | `<NGINX_INGRESS_IP>` | Automatic |

**Note**: Replace `<NGINX_INGRESS_IP>` with the external IP from Step 1.

**DNS Propagation**: It may take 5-30 minutes for DNS changes to propagate.

### Step 5: Create Ingress Resources

Now create Ingress resources that will route traffic and provision SSL certificates:

**For Staging:**

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-staging-ingress
  namespace: staging
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - staging.api.overfly.ing
    secretName: api-staging-tls
  rules:
  - host: staging.api.overfly.ing
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
EOF
```

**For Production:**

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-production-ingress
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - production.api.overfly.ing
    secretName: api-production-tls
  rules:
  - host: production.api.overfly.ing
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 80
EOF
```

### Step 6: Verify Certificate Issuance

Watch the certificate issuance process:

```bash
# Check certificate status
kubectl get certificate -n staging
kubectl get certificate -n production

# Check detailed certificate info
kubectl describe certificate api-staging-tls -n staging
kubectl describe certificate api-production-tls -n production

# Check certificate requests
kubectl get certificaterequest -n staging
kubectl get certificaterequest -n production
```

Certificates typically take 2-5 minutes to be issued.

### Step 7: Test Your Domains

Once DNS has propagated and certificates are issued:

```bash
# Test staging
curl https://staging.api.overfly.ing/health

# Test production
curl https://production.api.overfly.ing/health
```

Visit in your browser:
- https://staging.api.overfly.ing/
- https://production.api.overfly.ing/

You should see a valid SSL certificate with the green padlock!

### Step 8: Update Service Type (Optional)

Since you're now using Ingress, you can change your services from LoadBalancer to ClusterIP to save costs:

```bash
kubectl patch service api-service -n staging -p '{"spec":{"type":"ClusterIP"}}'
kubectl patch service api-service -n production -p '{"spec":{"type":"ClusterIP"}}'
```

This removes the individual LoadBalancers and routes all traffic through the Ingress controller.

## Option 2: Using Cloudflare (Alternative)

If you prefer using Cloudflare for DNS and SSL:

### Step 1: Transfer DNS to Cloudflare

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain `overfly.ing`
3. Update nameservers at Namecheap to Cloudflare's nameservers
4. Wait for DNS to propagate (24-48 hours)

### Step 2: Configure DNS in Cloudflare

Add A records:
- `staging.api.overfly.ing` → `34.77.11.73`
- `production.api.overfly.ing` → `34.140.208.108`

Enable the **orange cloud** (proxied) for automatic SSL/TLS.

### Step 3: Configure SSL/TLS

In Cloudflare dashboard:
1. Go to **SSL/TLS** > **Overview**
2. Set encryption mode to **Flexible** (Cloudflare to visitor: encrypted, Cloudflare to your server: unencrypted)
3. Or use **Full** if you want end-to-end encryption (requires additional setup)

Done! Cloudflare will handle SSL automatically.

## Option 3: Simple DNS without SSL (Not Recommended)

If you just want to test without SSL first:

### Configure DNS at Namecheap

Add A records:
- `staging.api` → `34.77.11.73`
- `production.api` → `34.140.208.108`

Access via:
- http://staging.api.overfly.ing/
- http://production.api.overfly.ing/

**Note**: This is NOT recommended for production. Always use SSL/TLS.

## Troubleshooting

### DNS Not Resolving

```bash
# Check DNS propagation
nslookup staging.api.overfly.ing
dig staging.api.overfly.ing

# Check from different DNS servers
nslookup staging.api.overfly.ing 8.8.8.8
```

### Certificate Not Issuing

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check certificate order details
kubectl describe certificaterequest -n staging
kubectl describe order -n staging
kubectl describe challenge -n staging
```

Common issues:
- DNS not propagated yet (wait 30 minutes)
- Email address not set in ClusterIssuer
- HTTP-01 challenge failing (check Ingress is working)

### Ingress Not Working

```bash
# Check Ingress controller logs
kubectl logs -n ingress-nginx deployment/nginx-ingress-ingress-nginx-controller

# Check Ingress status
kubectl get ingress -n staging
kubectl describe ingress api-staging-ingress -n staging
```

### 502 Bad Gateway

This usually means the backend service is not responding:

```bash
# Check pods are running
kubectl get pods -n staging
kubectl get pods -n production

# Check service endpoints
kubectl get endpoints api-service -n staging
kubectl get endpoints api-service -n production

# Check pod logs
kubectl logs -n staging -l app=api
```

## Cost Considerations

- **Ingress LoadBalancer**: ~$17/month (single IP for all services)
- **Service LoadBalancers**: ~$17/month each (you currently have 2)
- **cert-manager**: Free (Let's Encrypt)
- **Cloudflare**: Free tier available

**Recommendation**: Use Option 1 (Ingress + cert-manager) and convert services to ClusterIP to save ~$34/month.

## Updating GitHub Workflow

After setting up custom domains, update the environment URLs in your workflow:

```yaml
# In .github/workflows/deploy-api.yml
deploy-staging:
  environment:
    name: staging
    url: https://staging.api.overfly.ing

deploy-production:
  environment:
    name: production
    url: https://production.api.overfly.ing
```

## Security Best Practices

1. **Always use HTTPS** in production
2. **Force SSL redirect** (already configured in Ingress annotations)
3. **Use HSTS headers** for additional security
4. **Enable CORS carefully** - update allowed origins in your FastAPI app
5. **Monitor certificate expiry** (cert-manager auto-renews, but monitor anyway)

## Monitoring

Set up monitoring for your domains:

```bash
# Check SSL certificate expiry
echo | openssl s_client -connect staging.api.overfly.ing:443 2>/dev/null | openssl x509 -noout -dates

# Uptime monitoring
# Use services like UptimeRobot, Pingdom, or Google Cloud Monitoring
```

## Next Steps

1. Set up rate limiting in Ingress
2. Configure Web Application Firewall (WAF)
3. Set up CDN for static assets
4. Configure CORS properly in FastAPI
5. Add monitoring and alerting for SSL expiry
6. Set up API versioning (e.g., v1.api.overfly.ing)
