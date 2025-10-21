# While API is running

## Create jobs

curl -X POST http://localhost:8000/jobs \
 -H "Content-Type: application/json" \
 -d '{"name": "test-gpu-job", "priority": 10}'

## Activate VENV (for pip)

source .venv/bin/activate
(and then deactivate command deactivates it)

## Managing GCP costs (not being used since Autopilot is on with overflying resources)

```
# When you're NOT using the cluster (nights/weekends):
gcloud container clusters resize overfly-api \
  --num-nodes=0 \
  --zone=europe-west1-b

# Cost: $0/month when scaled to zero ✅

# When you want to use it again:
gcloud container clusters resize overfly-api \
  --num-nodes=1 \
  --zone=europe-west1-b
```

## Adding network

```
gcloud sql instances patch overflying-db \
  --authorized-networks=109.41.115.135 (curl ifconfig.me -4)
```
