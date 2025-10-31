# Firebase App Hosting Setup Guide

This guide explains how to set up Firebase App Hosting for your Next.js SSR application with staging and production environments.

## Overview

Firebase App Hosting is designed for server-side rendered Next.js applications. Unlike static hosting, it runs your Next.js app in a Cloud Run container, enabling full SSR capabilities including:
- Server-side rendering
- API routes
- Dynamic routes
- Image optimization
- Incremental Static Regeneration (ISR)

## Configuration Files

- `apphosting.staging.yaml` - Staging environment configuration
- `apphosting.production.yaml` - Production environment configuration

## Initial Setup

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 2. Create App Hosting Backends

You need to create two separate backends in Firebase Console or via CLI:

#### Staging Backend

```bash
# Navigate to the web app directory
cd apps/web

# Create staging backend
firebase apphosting:backends:create \
  --project overflying-web \
  --location us-central1 \
  --app-id overflying-staging
```

When prompted:
- Backend ID: `overflying-staging`
- Link to GitHub repository (recommended for auto-deployments)
- Branch: `staging` or your staging branch
- Root directory: `apps/web`
- Config file: `apphosting.staging.yaml`

#### Production Backend

```bash
# Create production backend
firebase apphosting:backends:create \
  --project overflying-web \
  --location us-central1 \
  --app-id overflying-production
```

When prompted:
- Backend ID: `overflying-production`
- Link to GitHub repository (recommended for auto-deployments)
- Branch: `main` or your production branch
- Root directory: `apps/web`
- Config file: `apphosting.production.yaml`

### 3. Configure Environment Variables

Set up environment variables in Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `overflying-web`
3. Navigate to App Hosting
4. Select each backend (staging/production)
5. Go to "Configuration" tab
6. Add environment variables:
   - `NODE_ENV`: `production`
   - Add your API keys, database URLs, etc.

For secrets (API keys, tokens):
```bash
# Create a secret
firebase apphosting:secrets:set API_KEY --project overflying-web

# Grant access to the backend
firebase apphosting:secrets:grantaccess API_KEY --backend overflying-staging
firebase apphosting:secrets:grantaccess API_KEY --backend overflying-production
```

## Deployment

### Option 1: GitHub Integration (Recommended)

Once you've linked your GitHub repository:
- Pushes to `staging` branch auto-deploy to staging backend
- Pushes to `main` branch auto-deploy to production backend

### Option 2: Manual Deployment via CLI

```bash
# Deploy to staging
firebase apphosting:rollouts:create overflying-staging --project overflying-web

# Deploy to production
firebase apphosting:rollouts:create overflying-production --project overflying-web
```

### Option 3: GitHub Actions

Create `.github/workflows/deploy-app-hosting.yml`:

```yaml
name: Deploy to Firebase App Hosting

on:
  push:
    branches:
      - main
      - staging
    paths:
      - 'apps/web/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Staging
        if: github.ref == 'refs/heads/staging'
        run: |
          npm install -g firebase-tools
          firebase apphosting:rollouts:create overflying-staging --project overflying-web
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

      - name: Deploy to Production
        if: github.ref == 'refs/heads/main'
        run: |
          npm install -g firebase-tools
          firebase apphosting:rollouts:create overflying-production --project overflying-web
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

## Custom Domain Migration

You have two custom domains currently connected to Firebase Hosting. Here's how to migrate them to App Hosting:

### Step 1: Verify Current Domains

```bash
firebase hosting:sites:list --project overflying-web
```

### Step 2: Add Custom Domains to App Hosting

1. Go to Firebase Console → App Hosting
2. Select your production backend (`overflying-production`)
3. Click "Add custom domain"
4. Enter your domain name
5. Follow the verification steps (DNS records)

### Step 3: Update DNS Records

Firebase will provide you with new DNS records. Update your domain provider's DNS settings:

**For each domain:**
- Type: `A` record
- Name: `@` (or your subdomain)
- Value: Firebase App Hosting IP address (provided in console)

**For www subdomain:**
- Type: `CNAME`
- Name: `www`
- Value: Your App Hosting domain

### Step 4: SSL Certificates

Firebase automatically provisions SSL certificates. This process can take up to 24 hours.

### Step 5: Remove Old Hosting Domains (After Verification)

Once your custom domains are working with App Hosting:

```bash
# List current hosting sites
firebase hosting:sites:list --project overflying-web

# Delete old hosting sites (optional, after migration is complete)
firebase hosting:sites:delete overflying-staging --project overflying-web
firebase hosting:sites:delete overflying-production --project overflying-web
```

**⚠️ Warning:** Don't delete the old hosting sites until you've verified that:
1. Custom domains are working with App Hosting
2. DNS has propagated globally
3. SSL certificates are active
4. All functionality works correctly

## Configuration Details

### Staging Configuration (`apphosting.staging.yaml`)

- **CPU:** 1 core
- **Memory:** 1 GiB
- **Min Instances:** 0 (scales to zero when not in use)
- **Max Instances:** 4
- **Concurrency:** 100 requests per instance

### Production Configuration (`apphosting.production.yaml`)

- **CPU:** 2 cores
- **Memory:** 2 GiB
- **Min Instances:** 1 (always warm, no cold starts)
- **Max Instances:** 10
- **Concurrency:** 100 requests per instance

You can adjust these values based on your traffic and performance needs.

## Monitoring

View logs and metrics:
```bash
# View logs for staging
firebase apphosting:logs --backend overflying-staging --project overflying-web

# View logs for production
firebase apphosting:logs --backend overflying-production --project overflying-web
```

Or in Firebase Console:
1. Go to App Hosting
2. Select your backend
3. Navigate to "Logs" or "Metrics" tab

## Rollback

If you need to rollback to a previous version:

```bash
# List rollouts
firebase apphosting:rollouts:list --backend overflying-production --project overflying-web

# Rollback to specific rollout
firebase apphosting:rollouts:rollback ROLLOUT_ID --backend overflying-production --project overflying-web
```

## Local Development

App Hosting works with standard Next.js development:

```bash
cd apps/web
npm run dev  # or yarn dev, bun dev
```

Your app runs at `http://localhost:3000` with full SSR capabilities.

## Troubleshooting

### Build Failures

Check your build logs:
```bash
firebase apphosting:logs --backend overflying-staging --project overflying-web
```

Common issues:
- Missing environment variables
- Node.js version mismatch (App Hosting uses Node 18+ by default)
- Missing dependencies in `package.json`

### Memory Issues

If you see OOM (Out of Memory) errors, increase `memoryMiB` in your `apphosting.yaml`:
```yaml
runConfig:
  memoryMiB: 2048  # or 4096
```

### Cold Starts

For production, keep `minInstances: 1` to avoid cold starts. For staging, you can use `minInstances: 0` to save costs.

## Cost Optimization

- **Staging:** Set `minInstances: 0` to scale to zero when not in use
- **Production:** Balance between `minInstances` (reduces cold starts) and cost
- **Memory:** Start with lower values and increase if needed
- **Max Instances:** Set based on expected peak traffic

## Migration Checklist

- [ ] Install Firebase CLI
- [ ] Create staging backend in Firebase Console or via CLI
- [ ] Create production backend in Firebase Console or via CLI
- [ ] Configure environment variables for staging
- [ ] Configure environment variables for production
- [ ] Test deployment to staging
- [ ] Test deployment to production
- [ ] Verify SSR functionality works
- [ ] Add custom domains to App Hosting backends
- [ ] Update DNS records for custom domains
- [ ] Wait for SSL certificate provisioning
- [ ] Test custom domains
- [ ] Monitor for 24-48 hours
- [ ] Remove old Firebase Hosting sites (optional)

## Resources

- [Firebase App Hosting Documentation](https://firebase.google.com/docs/app-hosting)
- [Next.js on Firebase App Hosting](https://firebase.google.com/docs/app-hosting/frameworks/nextjs)
- [App Hosting Pricing](https://firebase.google.com/pricing)
- [Custom Domains Setup](https://firebase.google.com/docs/app-hosting/custom-domains)
