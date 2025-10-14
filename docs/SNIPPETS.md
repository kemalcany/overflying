# While API is running

## Create jobs

curl -X POST http://localhost:8000/jobs \
 -H "Content-Type: application/json" \
 -d '{"name": "test-gpu-job", "priority": 10}'

## Activate VENV (for pip)

source .venv/bin/activate
(and then deactivate command deactivates it)
