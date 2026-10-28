#!/bin/bash
# Deployment Verification Script for CareLinkAI

echo "🔍 CareLinkAI Deployment Verification"
echo "======================================"
echo ""

# Test 1: Check if home images are accessible
echo "Test 1: Home Images Accessibility"
echo "---------------------------------"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://carelinkai.onrender.com/images/homes/1.jpg)
if [ "$STATUS" = "200" ]; then
    echo "✅ PASS - Home images are accessible (HTTP $STATUS)"
else
    echo "❌ FAIL - Home images blocked (HTTP $STATUS)"
fi
echo ""

# Test 2: Check if site is responding
echo "Test 2: Site Health"
echo "-------------------"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://carelinkai.onrender.com/)
if [ "$STATUS" = "200" ]; then
    echo "✅ PASS - Site is responding (HTTP $STATUS)"
else
    echo "⚠️  WARN - Site returned HTTP $STATUS"
fi
echo ""

# Test 3: Check search page
echo "Test 3: Search Page"
echo "-------------------"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://carelinkai.onrender.com/search)
if [ "$STATUS" = "200" ]; then
    echo "✅ PASS - Search page accessible (HTTP $STATUS)"
else
    echo "❌ FAIL - Search page error (HTTP $STATUS)"
fi
echo ""

echo "======================================"
echo "Manual Test URLs:"
echo "  • Search: https://carelinkai.onrender.com/search"
echo "  • Details: https://carelinkai.onrender.com/homes/home_1"
echo "  • Image: https://carelinkai.onrender.com/images/homes/1.jpg"
