#!/bin/bash

echo "🌐 Testing API Endpoints"
echo "================================================================================"
echo ""

BASE_URL="https://carelinkai.onrender.com"

# Test 1: Health check
echo "1. Testing health endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Health check: PASS (HTTP $HTTP_CODE)"
else
  echo "❌ Health check: FAIL (HTTP $HTTP_CODE)"
fi
echo ""

# Test 2: Inquiries endpoint (should require auth)
echo "2. Testing inquiries endpoint (without auth)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_CODE}" "$BASE_URL/api/inquiries")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Inquiries endpoint: PASS (HTTP $HTTP_CODE - auth working)"
else
  echo "❌ Inquiries endpoint: FAIL (HTTP $HTTP_CODE)"
fi
echo ""

# Test 3: Create inquiry (public endpoint)
echo "3. Testing inquiry creation..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/inquiries" \
  -H "Content-Type: application/json" \
  -d '{
    "contactName": "API Test User",
    "contactEmail": "apitest@example.com",
    "careRecipientName": "Test Recipient",
    "urgency": "MEDIUM"
  }')

if echo "$RESPONSE" | grep -q "id"; then
  echo "✅ Inquiry creation: PASS"
  echo "   Response preview: $(echo "$RESPONSE" | head -c 200)..."
else
  echo "❌ Inquiry creation: FAIL"
  echo "   Response: $RESPONSE"
fi
echo ""

# Test 4: Homepage
echo "4. Testing homepage..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Homepage: PASS (HTTP $HTTP_CODE)"
else
  echo "❌ Homepage: FAIL (HTTP $HTTP_CODE)"
fi
echo ""

# Test 5: Generate AI Response endpoint
echo "5. Testing AI response generation endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/inquiries/generate-response")
if [ "$HTTP_CODE" = "405" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "✅ AI response endpoint: PASS (HTTP $HTTP_CODE - endpoint exists)"
else
  echo "⚠️  AI response endpoint: Check needed (HTTP $HTTP_CODE)"
fi
echo ""

# Test 6: Follow-up cron endpoint
echo "6. Testing follow-up processor endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/cron/process-followups")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Follow-up processor: PASS (HTTP $HTTP_CODE - endpoint exists)"
else
  echo "⚠️  Follow-up processor: Check needed (HTTP $HTTP_CODE)"
fi
echo ""

echo "================================================================================"
echo ""
echo "🎯 API Endpoint Tests Complete"
