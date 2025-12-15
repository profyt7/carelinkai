#!/bin/bash
# Cloudinary Deployment Verification Script
# This script verifies that the Cloudinary migration has been successfully deployed

set -e

echo "========================================="
echo "Cloudinary Deployment Verification"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production URL
PROD_URL="${PROD_URL:-https://carelinkai.onrender.com}"
echo "Production URL: $PROD_URL"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to check test result
check_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((TESTS_FAILED++))
  fi
}

echo "========================================="
echo "1. Checking CSP Headers"
echo "========================================="

# Fetch CSP header
echo "Fetching Content-Security-Policy header..."
CSP_HEADER=$(curl -sI "$PROD_URL" | grep -i "content-security-policy:" | tr -d '\r')

if [ -z "$CSP_HEADER" ]; then
  echo -e "${RED}✗ FAIL${NC}: CSP header not found"
  ((TESTS_FAILED++))
else
  echo "CSP Header found"
  
  # Check if res.cloudinary.com is in CSP
  if echo "$CSP_HEADER" | grep -q "res.cloudinary.com"; then
    check_result 0 "res.cloudinary.com found in CSP img-src directive"
  else
    check_result 1 "res.cloudinary.com NOT found in CSP img-src directive"
    echo -e "${YELLOW}WARNING${NC}: This is the primary issue preventing Cloudinary images from loading"
  fi
fi
echo ""

echo "========================================="
echo "2. Checking Next.js Image Optimization"
echo "========================================="

# Test Cloudinary image through Next.js optimization
CLOUDINARY_TEST_URL="https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830428/carelinkai/homes/home-1.jpg"
ENCODED_URL=$(echo "$CLOUDINARY_TEST_URL" | jq -sRr @uri)
IMAGE_OPT_URL="${PROD_URL}/_next/image?url=${ENCODED_URL}&w=640&q=75"

echo "Testing: $IMAGE_OPT_URL"
IMAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$IMAGE_OPT_URL")

if [ "$IMAGE_STATUS" = "200" ]; then
  check_result 0 "Next.js image optimization returns 200 for Cloudinary URL"
elif [ "$IMAGE_STATUS" = "400" ]; then
  check_result 1 "Next.js image optimization returns 400 (Bad Request)"
  echo -e "${YELLOW}INFO${NC}: This suggests CSP might be blocking or Next.js config issue"
else
  check_result 1 "Next.js image optimization returns $IMAGE_STATUS (Expected 200)"
fi
echo ""

echo "========================================="
echo "3. Checking Direct Cloudinary Access"
echo "========================================="

# Test direct Cloudinary URL
DIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CLOUDINARY_TEST_URL")

if [ "$DIRECT_STATUS" = "200" ]; then
  check_result 0 "Direct Cloudinary URL accessible (returns 200)"
else
  check_result 1 "Direct Cloudinary URL returns $DIRECT_STATUS (Expected 200)"
  echo -e "${YELLOW}WARNING${NC}: Cloudinary might be down or URL is invalid"
fi
echo ""

echo "========================================="
echo "4. Checking API Health"
echo "========================================="

# Test gallery upload endpoint authentication
GALLERY_ENDPOINT="${PROD_URL}/api/family/gallery/upload"
GALLERY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$GALLERY_ENDPOINT")

if [ "$GALLERY_STATUS" = "401" ]; then
  check_result 0 "Gallery upload endpoint requires authentication (401)"
  echo -e "${YELLOW}INFO${NC}: This is expected behavior - endpoint is protected"
elif [ "$GALLERY_STATUS" = "500" ]; then
  check_result 1 "Gallery upload endpoint returns 500 (Internal Server Error)"
  echo -e "${YELLOW}WARNING${NC}: Check server logs for Prisma or Cloudinary errors"
else
  echo -e "${YELLOW}INFO${NC}: Gallery upload endpoint returns $GALLERY_STATUS"
fi
echo ""

echo "========================================="
echo "5. Checking Build Information"
echo "========================================="

# Try to get build info from a meta tag or header
echo "Fetching homepage to check for build information..."
HOMEPAGE_CONTENT=$(curl -s "$PROD_URL")

# Check if Next.js build ID is present
if echo "$HOMEPAGE_CONTENT" | grep -q "_next/static"; then
  check_result 0 "Next.js build artifacts present"
else
  check_result 1 "Next.js build artifacts not found"
fi
echo ""

echo "========================================="
echo "6. Environment Check"
echo "========================================="

# Check if environment variables are likely set (indirect check)
echo "Checking for Cloudinary-related errors in console..."

# This is a rough check - in production you'd want to check actual logs
if [ "$CSP_HEADER" != "" ] && echo "$CSP_HEADER" | grep -q "cloudinary"; then
  check_result 0 "Environment appears to be configured for Cloudinary"
else
  echo -e "${YELLOW}INFO${NC}: Cannot directly verify environment variables from external check"
fi
echo ""

echo "========================================="
echo "VERIFICATION SUMMARY"
echo "========================================="
echo ""
echo -e "${GREEN}Tests Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Tests Failed:${NC} $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}=========================================${NC}"
  echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
  echo -e "${GREEN}=========================================${NC}"
  echo ""
  echo "The Cloudinary migration appears to be successfully deployed!"
  exit 0
else
  echo -e "${RED}=========================================${NC}"
  echo -e "${RED}✗ DEPLOYMENT VERIFICATION FAILED${NC}"
  echo -e "${RED}=========================================${NC}"
  echo ""
  echo "Issues found:"
  echo ""
  
  if ! echo "$CSP_HEADER" | grep -q "res.cloudinary.com"; then
    echo "1. CSP is missing res.cloudinary.com"
    echo "   Action: Verify that commit dc55733 is deployed to production"
    echo "   Solution: Trigger manual redeploy on Render"
  fi
  
  if [ "$IMAGE_STATUS" = "400" ]; then
    echo "2. Next.js image optimization failing with 400 errors"
    echo "   Action: Check next.config.js images configuration"
    echo "   Solution: Verify domains and remotePatterns include res.cloudinary.com"
  fi
  
  if [ "$GALLERY_STATUS" = "500" ]; then
    echo "3. Gallery upload API returning 500 errors"
    echo "   Action: Check server logs in Render dashboard"
    echo "   Solution: Verify Cloudinary env vars and Prisma Client generation"
  fi
  
  echo ""
  echo "See CLOUDINARY_MIGRATION_FIX_PLAN.md for detailed remediation steps"
  exit 1
fi
