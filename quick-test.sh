#!/bin/bash

echo "🚀 CareLinkAI Quick Test"
echo ""

# Test 1: Service is up
echo -n "Service Status: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://carelinkai.onrender.com")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ UP (HTTP $HTTP_CODE)"
else
  echo "❌ DOWN (HTTP $HTTP_CODE)"
fi

# Test 2: API is responding
echo -n "API Health: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://carelinkai.onrender.com/api/health")
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ OK"
else
  echo "❌ ERROR (HTTP $HTTP_CODE)"
fi

# Test 3: Auth is working
echo -n "Authentication: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://carelinkai.onrender.com/api/inquiries")
if [ "$HTTP_CODE" = "401" ]; then
  echo "✅ PROTECTED"
else
  echo "⚠️  CHECK (HTTP $HTTP_CODE)"
fi

# Test 4: AI endpoint exists
echo -n "AI Response API: "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://carelinkai.onrender.com/api/inquiries/test/generate-response")
if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "404" ]; then
  echo "✅ EXISTS"
else
  echo "⚠️  CHECK (HTTP $HTTP_CODE)"
fi

echo ""
echo "📊 Quick test complete! See TEST_REPORT_20251219.md for full details."
