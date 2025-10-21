#!/bin/bash
# Script to set up Ingress controller and cert-manager for custom domains

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Setting Up Ingress & SSL/TLS${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Step 1: Install NGINX Ingress Controller
echo -e "${GREEN}Step 1: Installing NGINX Ingress Controller...${NC}"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer \
  --set controller.service.externalTrafficPolicy=Local

echo -e "${YELLOW}Waiting for Ingress LoadBalancer IP...${NC}"
echo "This may take 2-3 minutes..."
echo ""

# Wait for external IP
for i in {1..60}; do
  INGRESS_IP=$(kubectl get service nginx-ingress-ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
  if [ -n "$INGRESS_IP" ]; then
    break
  fi
  sleep 5
  echo -n "."
done

echo ""
echo ""

if [ -z "$INGRESS_IP" ]; then
  echo -e "${RED}Failed to get Ingress IP. Check status with:${NC}"
  echo "  kubectl get service nginx-ingress-ingress-nginx-controller -n ingress-nginx"
  exit 1
fi

echo -e "${GREEN}Ingress Controller Installed!${NC}"
echo -e "External IP: ${YELLOW}$INGRESS_IP${NC}"
echo ""

# Step 2: Install cert-manager
echo -e "${GREEN}Step 2: Installing cert-manager...${NC}"
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

echo -e "${YELLOW}Waiting for cert-manager to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s \
  deployment/cert-manager -n cert-manager
kubectl wait --for=condition=available --timeout=300s \
  deployment/cert-manager-webhook -n cert-manager
kubectl wait --for=condition=available --timeout=300s \
  deployment/cert-manager-cainjector -n cert-manager

echo -e "${GREEN}cert-manager installed!${NC}"
echo ""

# Step 3: Configure DNS
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   IMPORTANT: Configure DNS${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${YELLOW}Before proceeding, you MUST configure DNS at Namecheap:${NC}"
echo ""
echo "1. Log in to Namecheap"
echo "2. Go to your domain 'overfly.ing' > Advanced DNS"
echo "3. Add these A records:"
echo ""
echo "   Type      | Host              | Value"
echo "   ----------|-------------------|------------------"
echo "   A Record  | staging.api       | $INGRESS_IP"
echo "   A Record  | production.api    | $INGRESS_IP"
echo ""
echo -e "${YELLOW}Wait 5-30 minutes for DNS propagation${NC}"
echo ""
echo "Test DNS with:"
echo "  nslookup staging.api.overfly.ing"
echo "  nslookup production.api.overfly.ing"
echo ""
read -p "Press Enter once DNS is configured and propagated..."

# Step 4: Create ClusterIssuer
echo ""
echo -e "${GREEN}Step 3: Creating Let's Encrypt ClusterIssuer...${NC}"
echo -e "${YELLOW}Enter your email address for Let's Encrypt notifications:${NC}"
read -p "Email: " EMAIL

if [ -z "$EMAIL" ]; then
  echo -e "${RED}Email is required!${NC}"
  exit 1
fi

# Update the email in the issuer file
sed "s/your-email@example.com/$EMAIL/g" letsencrypt-issuer.yaml > /tmp/letsencrypt-issuer-updated.yaml
kubectl apply -f /tmp/letsencrypt-issuer-updated.yaml
rm /tmp/letsencrypt-issuer-updated.yaml

echo -e "${GREEN}ClusterIssuer created!${NC}"
echo ""

# Step 5: Apply Ingress resources
echo -e "${GREEN}Step 4: Creating Ingress resources...${NC}"
kubectl apply -f staging-ingress.yaml
kubectl apply -f production-ingress.yaml

echo -e "${GREEN}Ingress resources created!${NC}"
echo ""

# Step 6: Monitor certificate issuance
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Monitoring Certificate Issuance${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${YELLOW}Waiting for certificates to be issued...${NC}"
echo "This typically takes 2-5 minutes..."
echo ""

for i in {1..60}; do
  STAGING_CERT=$(kubectl get certificate api-staging-tls -n staging -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
  PROD_CERT=$(kubectl get certificate api-production-tls -n production -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)

  if [ "$STAGING_CERT" = "True" ] && [ "$PROD_CERT" = "True" ]; then
    break
  fi
  sleep 5
  echo -n "."
done

echo ""
echo ""

# Check final status
echo -e "${GREEN}Certificate Status:${NC}"
kubectl get certificate -n staging
kubectl get certificate -n production
echo ""

# Step 7: Convert services to ClusterIP (optional but recommended)
echo -e "${YELLOW}Would you like to convert services from LoadBalancer to ClusterIP?${NC}"
echo "This will save ~\$34/month by removing individual LoadBalancers."
echo "All traffic will go through the Ingress controller instead."
read -p "Convert to ClusterIP? (y/n): " CONVERT

if [ "$CONVERT" = "y" ] || [ "$CONVERT" = "Y" ]; then
  echo -e "${GREEN}Converting services to ClusterIP...${NC}"
  kubectl patch service api-service -n staging -p '{"spec":{"type":"ClusterIP"}}'
  kubectl patch service api-service -n production -p '{"spec":{"type":"ClusterIP"}}'
  echo -e "${GREEN}Services converted!${NC}"
  echo ""
fi

# Final summary
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   Setup Complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""
echo -e "${GREEN}Your APIs are now accessible at:${NC}"
echo ""
echo "  Staging:    https://staging.api.overfly.ing"
echo "  Production: https://production.api.overfly.ing"
echo ""
echo -e "${YELLOW}Test your endpoints:${NC}"
echo "  curl https://staging.api.overfly.ing/health"
echo "  curl https://production.api.overfly.ing/health"
echo ""
echo -e "${YELLOW}Monitor certificates:${NC}"
echo "  kubectl get certificate -n staging"
echo "  kubectl get certificate -n production"
echo ""
echo -e "${YELLOW}View Ingress details:${NC}"
echo "  kubectl get ingress -n staging"
echo "  kubectl get ingress -n production"
echo ""
echo -e "${GREEN}SSL certificates will auto-renew before expiry.${NC}"
echo ""
echo -e "${BLUE}=========================================${NC}"
