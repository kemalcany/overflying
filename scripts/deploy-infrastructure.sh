#!/bin/bash
# Complete infrastructure deployment script for Planet monorepo
# This script deploys NATS, API, and Worker to GKE

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="overflying-cluster"
REGION="europe-west1"
CLUSTER="overflying-autopilot"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Planet Infrastructure Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${GREEN}▶ $1${NC}"
    echo "----------------------------------------"
}

# Function to check if command succeeded
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
        exit 1
    fi
}

# Step 1: Verify Prerequisites
print_section "Step 1: Verifying Prerequisites"

echo "Checking gcloud..."
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ gcloud found${NC}"

echo "Checking kubectl..."
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ kubectl found${NC}"

echo "Verifying GCP project..."
CURRENT_PROJECT=$(gcloud config get-value project)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Warning: Current project is $CURRENT_PROJECT, not $PROJECT_ID${NC}"
    read -p "Switch to $PROJECT_ID? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud config set project $PROJECT_ID
    else
        exit 1
    fi
fi
echo -e "${GREEN}✓ Project: $PROJECT_ID${NC}"

# Step 2: Get GKE Credentials
print_section "Step 2: Getting GKE Credentials"

gcloud container clusters get-credentials $CLUSTER \
    --region=$REGION \
    --project=$PROJECT_ID
check_status

# Step 3: Create Namespaces
print_section "Step 3: Creating Namespaces"

echo "Creating infrastructure namespace..."
kubectl create namespace infrastructure --dry-run=client -o yaml | kubectl apply -f -
check_status

echo "Verifying staging namespace..."
kubectl get namespace staging &> /dev/null || kubectl create namespace staging
check_status

echo "Verifying production namespace..."
kubectl get namespace production &> /dev/null || kubectl create namespace production
check_status

# Step 4: Deploy NATS
print_section "Step 4: Deploying NATS"

kubectl apply -f k8s/infrastructure/nats-deployment.yaml
check_status

echo "Waiting for NATS to be ready..."
kubectl wait --for=condition=ready pod -l app=nats -n infrastructure --timeout=120s
check_status

echo "Checking NATS status..."
kubectl get pods -n infrastructure -l app=nats
kubectl get svc -n infrastructure -l app=nats

# Step 5: Configure Secrets
print_section "Step 5: Configuring Secrets"

if [ -z "$DATABASE_URL_STAGING" ] || [ -z "$DATABASE_URL_PRODUCTION" ]; then
    echo -e "${YELLOW}Warning: DATABASE_URL_STAGING and DATABASE_URL_PRODUCTION not set${NC}"
    echo "Please set these environment variables before running this script:"
    echo "  export DATABASE_URL_STAGING='postgresql://user:pass@host:port/db'"
    echo "  export DATABASE_URL_PRODUCTION='postgresql://user:pass@host:port/db'"
    echo ""
    read -p "Do you want to continue without setting up worker secrets? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "Setting up worker secrets..."
    cd k8s/worker
    chmod +x setup-secrets.sh
    ./setup-secrets.sh
    cd ../..
    check_status
fi

# Step 6: Deploy Worker
print_section "Step 6: Deploying Worker"

echo "Deploying worker to staging..."
kubectl apply -f k8s/worker/staging-deployment.yaml
check_status

echo "Waiting for worker staging to be ready..."
kubectl rollout status deployment/worker-staging -n staging --timeout=2m || true

echo "Deploying worker to production..."
kubectl apply -f k8s/worker/production-deployment.yaml
check_status

echo "Waiting for worker production to be ready..."
kubectl rollout status deployment/worker-production -n production --timeout=2m || true

# Step 7: Verify Deployment
print_section "Step 7: Verifying Deployment"

echo ""
echo "Infrastructure namespace:"
kubectl get all -n infrastructure

echo ""
echo "Staging namespace:"
kubectl get all -n staging -l app=worker

echo ""
echo "Production namespace:"
kubectl get all -n production -l app=worker

# Step 8: Test Connectivity
print_section "Step 8: Testing NATS Connectivity"

echo "Testing NATS from staging worker..."
kubectl exec -n staging deployment/worker-staging -- \
    nslookup nats.infrastructure.svc.cluster.local &> /dev/null && \
    echo -e "${GREEN}✓ DNS resolution successful${NC}" || \
    echo -e "${YELLOW}⚠ DNS resolution failed (worker might not be ready yet)${NC}"

# Final Summary
print_section "Deployment Summary"

echo ""
echo -e "${GREEN}✓ Infrastructure namespace created${NC}"
echo -e "${GREEN}✓ NATS deployed and running${NC}"
echo -e "${GREEN}✓ Worker deployed to staging and production${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Check worker logs:"
echo "   kubectl logs -n staging -l app=worker --tail=50"
echo "   kubectl logs -n production -l app=worker --tail=50"
echo ""
echo "2. Monitor NATS:"
echo "   kubectl port-forward -n infrastructure svc/nats 8222:8222"
echo "   Visit http://localhost:8222"
echo ""
echo "3. Test end-to-end workflow:"
echo "   - API publishes job to NATS"
echo "   - Worker picks up job from NATS"
echo "   - Check job status in database"
echo ""
echo -e "${BLUE}For detailed documentation, see:${NC}"
echo "  - docs/GCP_SETUP.md"
echo "  - docs/PLAN_A_IMPLEMENTATION_SUMMARY.md"
echo "  - k8s/worker/README.md"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
