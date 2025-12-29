#!/bin/bash

# Script to add dynamic export to all API routes that don't have it

FIXED=0
SKIPPED=0
ERRORS=0

echo "Processing API routes..."
echo ""

# Find all route.ts files in src/app/api
find src/app/api -name "route.ts" | while read -r file; do
  # Check if file already has dynamic export
  if grep -q "export const dynamic" "$file" 2>/dev/null; then
    echo "⏭️  Skipping (already has dynamic): $file"
    ((SKIPPED++))
  else
    # Check if file uses headers, cookies, or other dynamic functions
    # Add dynamic export to the file
    
    # Create a temporary file with the new content
    {
      echo "// Force dynamic rendering for this API route"
      echo "export const dynamic = 'force-dynamic';"
      echo ""
      cat "$file"
    } > "$file.tmp"
    
    # Replace the original file
    if mv "$file.tmp" "$file"; then
      echo "✅ Fixed: $file"
      ((FIXED++))
    else
      echo "❌ Error fixing: $file"
      rm -f "$file.tmp"
      ((ERRORS++))
    fi
  fi
done

echo ""
echo "========================================================================"
echo "Summary:"
echo "  Fixed: $FIXED files"
echo "  Skipped: $SKIPPED files"
echo "  Errors: $ERRORS files"
echo "========================================================================"
