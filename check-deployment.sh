#!/bin/bash

# Quick Deployment Status Check Script
# Run this to check if deployment is in progress

echo "============================================"
echo "🔍 CARELINKAI DEPLOYMENT STATUS CHECK"
echo "============================================"
echo ""

# Check current git status
echo "📊 Git Status:"
echo "-------------"
cd /home/ubuntu/carelinkai-project
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_COMMIT_SHORT=$(git rev-parse --short HEAD)
echo "Current commit: $CURRENT_COMMIT_SHORT"
echo "Full hash: $CURRENT_COMMIT"
echo ""

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Check if push was successful
echo "🔗 Remote Status:"
echo "----------------"
git remote -v | grep origin
echo ""

# Show latest commit details
echo "📝 Latest Commit:"
echo "----------------"
git log -1 --oneline
echo ""

# Expected commit for deployment
EXPECTED_COMMIT="1f59d9b"
echo "✅ Expected deployment commit: $EXPECTED_COMMIT"
echo ""

if [[ "$CURRENT_COMMIT_SHORT" == "$EXPECTED_COMMIT" ]]; then
  echo "✅ You are on the correct commit!"
else
  echo "⚠️  Warning: Current commit ($CURRENT_COMMIT_SHORT) doesn't match expected ($EXPECTED_COMMIT)"
fi

echo ""
echo "============================================"
echo "📋 NEXT STEPS:"
echo "============================================"
echo ""
echo "1. Check Render Dashboard:"
echo "   https://dashboard.render.com/web/srv-d3iso13uibrs73d5fm1g/deploys"
echo ""
echo "2. Look for deployment with commit: $CURRENT_COMMIT_SHORT"
echo ""
echo "3. Expected timeline:"
echo "   - Detection: 2-5 minutes"
echo "   - Build: 5-10 minutes"
echo "   - Total: ~7-15 minutes"
echo ""
echo "4. What to look for in logs:"
echo "   ✅ 'STEP 2.5: RUN DATABASE MIGRATIONS'"
echo "   ✅ 'All migrations have been successfully applied'"
echo "   ✅ 'Build complete'"
echo ""
echo "============================================"
echo ""
