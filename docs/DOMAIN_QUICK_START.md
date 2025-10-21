# Custom Domain Quick Start

## Your Current IPs

**Direct access (no SSL)**:
- Staging: http://34.77.11.73/
- Production: http://34.140.208.108/

## Option A: Quick Test (5 minutes, no SSL)

Just want to test with custom domains quickly? Add DNS records:

### At Namecheap
1. Go to **Advanced DNS**
2. Add A records:
   - `staging.api` → `34.77.11.73`
   - `production.api` → `34.140.208.108`
3. Wait 5-30 minutes for DNS propagation

Access at:
- http://staging.api.overfly.ing/
- http://production.api.overfly.ing/

**⚠️ No SSL - not recommended for production!**

## Option B: Full Setup with SSL (30 minutes)

For production-ready setup with automatic SSL certificates:

### Prerequisites
- Helm 3 installed (`brew install helm`)
- kubectl connected to your cluster

### Automated Setup

```bash
cd k8s/ingress
./setup-ingress.sh
```

The script will:
1. ✅ Install NGINX Ingress Controller
2. ✅ Install cert-manager
3. ✅ Guide you through DNS setup
4. ✅ Configure Let's Encrypt
5. ✅ Issue SSL certificates
6. ✅ Set up HTTPS redirects

Follow the prompts and you'll have:
- https://staging.api.overfly.ing/
- https://production.api.overfly.ing/

### What You'll Need
- Your email address (for Let's Encrypt notifications)
- Access to Namecheap DNS settings
- 30 minutes total (most is waiting for DNS/certificates)

## Option C: Using Cloudflare (Alternative)

If you prefer Cloudflare for DNS and SSL:

### Steps
1. Create free Cloudflare account
2. Add domain `overfly.ing`
3. Update nameservers at Namecheap
4. Add A records in Cloudflare:
   - `staging.api` → `34.77.11.73`
   - `production.api` → `34.140.208.108`
5. Enable proxy (orange cloud icon)
6. Set SSL/TLS mode to "Flexible"

Done! Cloudflare handles SSL automatically.

## Recommendation

**For production**: Use **Option B** (Ingress + cert-manager)
- Professional setup
- Google-managed infrastructure
- Free SSL certificates
- Automatic renewal
- Saves $17/month vs individual LoadBalancers

**For quick testing**: Use **Option A**
- Test domains immediately
- Upgrade to Option B later

**If you use Cloudflare**: Use **Option C**
- Easiest SSL setup
- Additional DDoS protection
- Free tier available

## DNS Configuration Reference

### At Namecheap

Navigate to: Domain List → Manage → Advanced DNS

**For Option A (direct to services)**:
| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `staging.api` | `34.77.11.73` | Automatic |
| A Record | `production.api` | `34.140.208.108` | Automatic |

**For Option B (via Ingress)** - the script will tell you:
| Type | Host | Value | TTL |
|------|------|-------|-----|
| A Record | `staging.api` | `<INGRESS_IP>` | Automatic |
| A Record | `production.api` | `<INGRESS_IP>` | Automatic |

## Testing

### Check DNS Propagation
```bash
nslookup staging.api.overfly.ing
nslookup production.api.overfly.ing
```

### Test Endpoints
```bash
# Without SSL
curl http://staging.api.overfly.ing/health

# With SSL
curl https://staging.api.overfly.ing/health
```

### Check SSL Certificate
```bash
echo | openssl s_client -connect staging.api.overfly.ing:443 2>/dev/null | openssl x509 -noout -dates
```

## Common Issues

### DNS not resolving
- Wait 30 minutes for propagation
- Test with: `nslookup staging.api.overfly.ing 8.8.8.8`
- Clear DNS cache: `sudo dscacheutil -flushcache` (macOS)

### Certificate not issuing (Option B)
- Check DNS is propagated first
- View status: `kubectl get certificate -n staging`
- Check logs: `kubectl logs -n cert-manager deployment/cert-manager`

### 502 Bad Gateway
- Check pods are running: `kubectl get pods -n staging`
- Check logs: `kubectl logs -n staging -l app=api`

## Next Steps

After domains are working:
1. Update CORS settings in your API
2. Update GitHub workflow environment URLs
3. Test from your frontend application
4. Set up monitoring/uptime checks
5. Configure rate limiting if needed

## Documentation

Full guides available:
- [docs/CUSTOM_DOMAIN_SETUP.md](CUSTOM_DOMAIN_SETUP.md) - Complete setup guide
- [k8s/ingress/README.md](../k8s/ingress/README.md) - Ingress configuration details
- [docs/DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) - Original deployment guide

## Support

If you encounter issues:
1. Check the troubleshooting sections in the full guides
2. Verify kubectl access: `kubectl get pods --all-namespaces`
3. Check Ingress status: `kubectl get ingress --all-namespaces`
4. View logs for errors
