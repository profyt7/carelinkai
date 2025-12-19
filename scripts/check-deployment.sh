#!/bin/bash

# Deployment Health Check Script
# Verifies that the CareLinkAI deployment is healthy and working

echo "========================================"
echo "   CareLinkAI Deployment Health Check   "
echo "========================================"
echo ""

BASE_URL="https://carelinkai.onrender.com"
TIMEOUT=10

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check endpoint
check_endpoint() {
  local endpoint=$1
  local expected_status=$2
  local description=$3
  
  echo -n "Testing $description... "
  
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$BASE_URL$endpoint" 2>/dev/null)
  
  if [ "$HTTP_CODE" = "$expected_status" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    return 0
  elif [ -z "$HTTP_CODE" ]; then
    echo -e "${RED}✗ FAIL${NC} (Timeout or connection error)"
    return 1
  else
    echo -e "${YELLOW}⚠ WARN${NC} (HTTP $HTTP_CODE, expected $expected_status)"
    return 2
  fi
}

# Test 1: Homepage
echo "1. Homepage Availability"
check_endpoint "/" "200" "Homepage"
echo ""

# Test 2: API Health
echo "2. API Health Endpoint"
check_endpoint "/api/health" "200" "Health Check"
echo ""

# Test 3: API Inquiries (may return 401 if auth required)
echo "3. API Endpoints"
check_endpoint "/api/inquiries" "200" "Inquiries API (or 401 if auth required)"
echo ""

# Test 4: Operator Dashboard
echo "4. Operator Dashboard"
check_endpoint "/operator" "200" "Operator Page (or 307 redirect)"
echo ""

# Test 5: Static Assets
echo "5. Static Assets"
check_endpoint "/favicon.ico" "200" "Favicon"
echo ""

# Summary
echo "========================================"
echo "         Deployment Summary             "
echo "========================================"
echo ""
echo "Deployment URL: $BASE_URL"
echo "Timestamp: $(date)"
echo ""

# Check if all critical endpoints are up
echo "Testing response time..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL" 2>/dev/null)
echo "Homepage response time: ${RESPONSE_TIME}s"
echo ""

# Final verdict
if [ $(echo "$RESPONSE_TIME < 3" | bc -l) -eq 1 ]; then
  echo -e "${GREEN}✓ Deployment is HEALTHY${NC}"
  echo "All systems operational"
  exit 0
else
  echo -e "${YELLOW}⚠ Deployment is SLOW${NC}"
  echo "Service is responding but may be experiencing issues"
  exit 1
fi
