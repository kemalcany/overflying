#!/bin/bash
#
# NATS Integration Demo Script
# Quickly test the NATS JetStream integration
#

set -e

API_URL=${API_URL:-http://localhost:8000}

echo "=================================================="
echo "NATS Integration Demo"
echo "=================================================="
echo ""

# Check if services are running
echo "1. Checking services..."
echo ""

# Check NATS
if curl -s http://localhost:8222/varz > /dev/null 2>&1; then
    echo "✅ NATS is running"
else
    echo "❌ NATS is not running. Start it with: cd infra && docker-compose up -d"
    exit 1
fi

# Check API
if curl -s ${API_URL}/health > /dev/null 2>&1; then
    echo "✅ API is running"
else
    echo "❌ API is not running. Start it with: cd apps/api && python3 -m src.run"
    exit 1
fi

echo ""
echo "=================================================="
echo "2. Creating test jobs..."
echo "=================================================="
echo ""

# Create 3 test jobs
for i in {1..3}; do
    echo "Creating job $i..."
    JOB_ID=$(curl -s -X POST ${API_URL}/jobs \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"demo-job-$i\",
            \"params\": {\"iteration\": $i, \"test\": true},
            \"priority\": $((10 - i)),
            \"submitted_by\": \"demo-script\"
        }" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")

    echo "  Job ID: $JOB_ID"
done

echo ""
echo "=================================================="
echo "3. Monitoring SSE stream..."
echo "=================================================="
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Monitor SSE endpoint
curl -N ${API_URL}/events 2>/dev/null | while read line; do
    if [[ $line == data:* ]]; then
        # Extract and pretty print JSON
        echo "$line" | sed 's/^data: //' | python3 -m json.tool 2>/dev/null || echo "$line"
    elif [[ $line == :* ]]; then
        # Keepalive, skip
        :
    else
        echo "$line"
    fi
done
