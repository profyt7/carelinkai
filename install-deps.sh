#!/bin/bash
set -e

echo "========================================"
echo "📦 INSTALLING DEPENDENCIES"
echo "========================================"
echo ""

echo "Installing document processing libraries..."
npm install tesseract.js pdf-lib react-pdf cloudinary @types/pdf-lib

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Dependencies installed successfully"
else
  echo ""
  echo "❌ Failed to install dependencies"
  exit 1
fi

echo ""
echo "Installed versions:"
npm list tesseract.js pdf-lib react-pdf cloudinary --depth=0

echo ""
echo "✅ All dependencies installed!"
