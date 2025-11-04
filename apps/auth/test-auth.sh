#!/bin/bash

# Start the auth service in the background
echo "Starting auth service..."
cd "$(dirname "$0")"
deno task start > /tmp/auth-test.log 2>&1 &
AUTH_PID=$!
echo "Auth service started with PID: $AUTH_PID"

# Wait for service to start
sleep 3

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\n========================================="
echo -e "Testing Auth Service"
echo -e "=========================================\n"

# Test 1: Health check
echo -e "${GREEN}Test 1: Health Check${NC}"
curl -s http://localhost:9100/health | jq '.'
echo -e "\n"

# Test 2: Login with valid credentials
echo -e "${GREEN}Test 2: Login with user@planet.com${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:9100/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@planet.com","password":"123"}')
echo "$LOGIN_RESPONSE" | jq '.'

# Extract tokens
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.refreshToken')
echo -e "\n"

# Test 3: Get user info with access token
echo -e "${GREEN}Test 3: Get User Info (/me)${NC}"
curl -s http://localhost:9100/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq '.'
echo -e "\n"

# Test 4: Refresh token
echo -e "${GREEN}Test 4: Refresh Token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:9100/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo "$REFRESH_RESPONSE" | jq '.'

# Extract new tokens
NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.data.accessToken')
echo -e "\n"

# Test 5: Logout
echo -e "${GREEN}Test 5: Logout${NC}"
curl -s -X POST http://localhost:9100/logout \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo -e "\n"

# Test 6: Invalid credentials
echo -e "${GREEN}Test 6: Login with Invalid Credentials${NC}"
curl -s -X POST http://localhost:9100/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@planet.com","password":"wrong"}' | jq '.'
echo -e "\n"

# Test 7: Rate limiting (should fail after 5 requests)
echo -e "${GREEN}Test 7: Rate Limiting (6 rapid login attempts)${NC}"
for i in {1..6}; do
  echo "Attempt $i:"
  curl -s -X POST http://localhost:9100/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' | jq -c '{success, message}'
done
echo -e "\n"

# Cleanup
echo "Stopping auth service (PID: $AUTH_PID)..."
kill $AUTH_PID 2>/dev/null
echo "Done!"
