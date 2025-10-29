#!/bin/bash

# Observability Stack Deployment Script for Overflying
# This script deploys Prometheus, Grafana, and related components to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check cluster connectivity
log_info "Checking Kubernetes cluster connectivity..."
if ! kubectl cluster-info &> /dev/null; then
    log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

log_info "Connected to cluster: $(kubectl config current-context)"

# Determine script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
K8S_DIR="$PROJECT_ROOT/k8s"

# Verify k8s directory exists
if [ ! -d "$K8S_DIR" ]; then
    log_error "k8s directory not found at $K8S_DIR"
    exit 1
fi

log_info "Starting observability stack deployment..."
echo ""

# Step 1: Create observability namespace
log_info "Step 1/5: Creating observability namespace..."
kubectl apply -f "$K8S_DIR/observability/prometheus-namespace.yaml"
sleep 2

# Step 2: Deploy Prometheus
log_info "Step 2/5: Deploying Prometheus..."
log_info "  - Applying RBAC configuration..."
kubectl apply -f "$K8S_DIR/observability/prometheus-rbac.yaml"

log_info "  - Applying Prometheus configuration..."
kubectl apply -f "$K8S_DIR/observability/prometheus-configmap.yaml"

log_info "  - Deploying Prometheus..."
kubectl apply -f "$K8S_DIR/observability/prometheus-deployment.yaml"

log_info "  - Waiting for Prometheus to be ready..."
kubectl wait --for=condition=ready pod -l app=prometheus -n observability --timeout=180s || {
    log_warn "Prometheus pod not ready after 180s, continuing anyway..."
}

# Step 3: Deploy Grafana
log_info "Step 3/5: Deploying Grafana..."
log_info "  - Applying Grafana datasources..."
kubectl apply -f "$K8S_DIR/observability/grafana-configmap.yaml"

log_info "  - Applying Grafana dashboards..."
kubectl apply -f "$K8S_DIR/observability/grafana-dashboards.yaml"
kubectl apply -f "$K8S_DIR/observability/grafana-dashboards-detailed.yaml"

log_info "  - Deploying Grafana..."
kubectl apply -f "$K8S_DIR/observability/grafana-deployment.yaml"

log_info "  - Waiting for Grafana to be ready..."
kubectl wait --for=condition=ready pod -l app=grafana -n observability --timeout=180s || {
    log_warn "Grafana pod not ready after 180s, continuing anyway..."
}

# Step 4: Verify deployment
log_info "Step 4/5: Verifying deployment..."
echo ""

log_info "Pods in observability namespace:"
kubectl get pods -n observability

echo ""
log_info "Services in observability namespace:"
kubectl get svc -n observability

# Step 5: Display access information
log_info "Step 5/5: Displaying access information..."
echo ""
echo "=========================================="
log_info "Observability Stack Deployed Successfully!"
echo "=========================================="
echo ""

# Prometheus info
PROMETHEUS_SVC=$(kubectl get svc -n observability prometheus -o jsonpath='{.spec.clusterIP}')
log_info "Prometheus:"
echo "  - Cluster IP: $PROMETHEUS_SVC:9090"
echo "  - Access via port-forward: kubectl port-forward -n observability svc/prometheus 9090:9090"
echo "  - Then visit: http://localhost:9090"
echo ""

# Grafana info
GRAFANA_TYPE=$(kubectl get svc -n observability grafana -o jsonpath='{.spec.type}')
log_info "Grafana:"
if [ "$GRAFANA_TYPE" == "LoadBalancer" ]; then
    log_info "  - Type: LoadBalancer (external access enabled)"
    echo "  - Checking for external IP..."

    # Wait up to 60 seconds for LoadBalancer IP
    for i in {1..12}; do
        GRAFANA_IP=$(kubectl get svc -n observability grafana -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null)
        if [ -n "$GRAFANA_IP" ]; then
            break
        fi
        echo "    Waiting for LoadBalancer IP... ($i/12)"
        sleep 5
    done

    if [ -n "$GRAFANA_IP" ]; then
        log_info "  - External URL: http://$GRAFANA_IP:3000"
    else
        log_warn "  - LoadBalancer IP not yet assigned. Check with: kubectl get svc -n observability grafana"
    fi
else
    echo "  - Access via port-forward: kubectl port-forward -n observability svc/grafana 3000:3000"
    echo "  - Then visit: http://localhost:3000"
fi

echo ""
log_info "Grafana Credentials:"
GRAFANA_USER=$(kubectl get secret -n observability grafana-admin -o jsonpath='{.data.username}' 2>/dev/null | base64 -d)
GRAFANA_PASS=$(kubectl get secret -n observability grafana-admin -o jsonpath='{.data.password}' 2>/dev/null | base64 -d)
echo "  - Username: $GRAFANA_USER"
echo "  - Password: $GRAFANA_PASS"
log_warn "  ⚠️  Change the default password immediately in production!"
echo ""

# Verification steps
log_info "Next Steps:"
echo "  1. Verify Prometheus targets:"
echo "     kubectl port-forward -n observability svc/prometheus 9090:9090"
echo "     Visit http://localhost:9090/targets"
echo ""
echo "  2. Access Grafana dashboards:"
echo "     Navigate to Dashboards → Browse → Overflying folder"
echo ""
echo "  3. Deploy instrumented services:"
echo "     kubectl apply -f $K8S_DIR/api/production-deployment.yaml"
echo "     kubectl apply -f $K8S_DIR/worker/production-deployment.yaml"
echo ""

log_info "For detailed documentation, see: docs/OBSERVABILITY_DEPLOYMENT.md"
echo ""

log_info "Deployment complete! 🎉"
