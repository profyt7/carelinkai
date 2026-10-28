#!/bin/bash

# Caregivers API Verification Script
# Tests the /api/operator/caregivers endpoint

set -e

BASE_URL="${BASE_URL:-https://carelinkai.onrender.com}"
API_ENDPOINT="/api/operator/caregivers"

echo "========================================="
echo "Caregivers API Verification"
echo "========================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Endpoint: $API_ENDPOINT"
echo ""

# Test 1: Check endpoint accessibility (will return 401 without auth, which is expected)
echo "Test 1: Checking endpoint accessibility..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL$API_ENDPOINT")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" == "401" ]; then
    echo "✅ PASS: Endpoint returns 401 (Unauthorized) as expected for unauthenticated requests"
    echo "Response: $BODY"
elif [ "$HTTP_CODE" == "200" ]; then
    echo "✅ PASS: Endpoint accessible and returns data"
    echo "Response preview:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" == "500" ]; then
    echo "❌ FAIL: Server error detected"
    echo "Response: $BODY"
    echo ""
    echo "Check Render logs for detailed error information:"
    echo "Look for lines starting with [Caregivers API]"
    exit 1
else
    echo "⚠️  WARN: Unexpected status code: $HTTP_CODE"
    echo "Response: $BODY"
fi

echo ""
echo "========================================="
echo "Verification Notes:"
echo "========================================="
echo "1. Unauthenticated requests should return 401"
echo "2. Authenticated Operator/Admin requests should return 200"
echo "3. Server errors (500) indicate a problem - check logs"
echo ""
echo "To test with authentication:"
echo "1. Log in to $BASE_URL/auth/login"
echo "2. Copy session cookie from browser dev tools"
echo "3. Run: curl -H 'Cookie: next-auth.session-token=YOUR_TOKEN' $BASE_URL$API_ENDPOINT"
echo ""
echo "========================================="
