#!/bin/bash
# Script to set up Kubernetes secrets from GCP Secret Manager
# This should be run once to set up the secrets in each namespace

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up Kubernetes secrets for API...${NC}"

# Staging environment
echo -e "${GREEN}Creating staging secrets...${NC}"
kubectl create secret generic api-secrets \
  --from-literal=database-url="$(gcloud secrets versions access latest --secret=db-url-staging --project=overflying-cluster)" \
  --namespace=staging \
  --dry-run=client -o yaml | kubectl apply -f -

# Production environment
echo -e "${GREEN}Creating production secrets...${NC}"
kubectl create secret generic api-secrets \
  --from-literal=database-url="$(gcloud secrets versions access latest --secret=db-url-production --project=overflying-cluster)" \
  --namespace=production \
  --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}Secrets created successfully!${NC}"
echo -e "${BLUE}Note: Secrets are now stored in Kubernetes. Update them if the database credentials change.${NC}"
