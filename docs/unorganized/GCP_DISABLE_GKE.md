# 1. Scale down all deployments
kubectl scale deployment api-production worker-production --replicas=0 -n production
kubectl scale deployment api-staging worker-staging --replicas=0 -n staging
kubectl scale deployment prometheus grafana --replicas=0 -n observability
kubectl scale deployment nats --replicas=0 -n infrastructure
kubectl scale deployment nginx-ingress-ingress-nginx-controller --replicas=0 -n ingress-nginx
kubectl scale deployment cert-manager cert-manager-cainjector cert-manager-webhook --replicas=0 -n cert-manager

# 2. Delete LoadBalancers (saves €60-90/month)
kubectl delete svc nginx-ingress-ingress-nginx-controller -n ingress-nginx
kubectl delete svc api-service -n production
kubectl delete svc api-service -n staging

# 3. Optional: Delete storage (saves €3-4/month)
kubectl delete pvc grafana-storage prometheus-storage -n observability

# Then to restore

bash# 1. Scale everything back up
kubectl scale deployment api-production --replicas=3 -n production
kubectl scale deployment worker-production --replicas=2 -n production
kubectl scale deployment api-staging --replicas=2 -n staging
kubectl scale deployment worker-staging --replicas=1 -n staging
kubectl scale deployment prometheus --replicas=1 -n observability
kubectl scale deployment grafana --replicas=1 -n observability
kubectl scale deployment nats --replicas=1 -n infrastructure
kubectl scale deployment nginx-ingress-ingress-nginx-controller --replicas=1 -n ingress-nginx

# 2. Recreate LoadBalancers
kubectl apply -f your-service-manifests.yaml
# (or use helm upgrade if you used Helm)