#!/bin/bash
# Setup secrets for Worker in GKE
# This should be run once to set up the secrets in each namespace

set -e

echo "Setting up Worker secrets in GKE..."

# Check if required environment variables are set
if [ -z "$DATABASE_URL_STAGING" ] || [ -z "$DATABASE_URL_PRODUCTION" ]; then
  echo "Error: DATABASE_URL_STAGING and DATABASE_URL_PRODUCTION must be set"
  echo "Example:"
  echo "  export DATABASE_URL_STAGING='postgresql://user:pass@host/db'"
  echo "  export DATABASE_URL_PRODUCTION='postgresql://user:pass@host/db'"
  exit 1
fi

# Staging secrets
echo "Creating secrets for staging namespace..."
kubectl create secret generic worker-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL_STAGING" \
  --from-literal=NATS_URL="nats://nats.infrastructure.svc.cluster.local:4222" \
  --namespace=staging \
  --dry-run=client -o yaml | kubectl apply -f -

# Production secrets
echo "Creating secrets for production namespace..."
kubectl create secret generic worker-secrets \
  --from-literal=DATABASE_URL="$DATABASE_URL_PRODUCTION" \
  --from-literal=NATS_URL="nats://nats.infrastructure.svc.cluster.local:4222" \
  --namespace=production \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Worker secrets created successfully!"
echo ""
echo "To verify:"
echo "  kubectl get secrets -n staging | grep worker-secrets"
echo "  kubectl get secrets -n production | grep worker-secrets"
