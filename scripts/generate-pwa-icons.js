#!/usr/bin/env node
/**
 * CareLink AI - PWA Icon Generator
 * 
 * This script converts SVG icons to PNG format for PWA compatibility.
 * It uses Sharp to convert the SVG files with proper sizes and optimization.
 * 
 * Usage: npm run generate:icons
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

// Configuration
const ICONS_DIR = path.join(process.cwd(), 'public', 'icons');
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'icons');
const FAVICON_DIR = path.join(process.cwd(), 'public');

// Standard PWA icon sizes
const PWA_ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const APPLE_ICON_SIZES = [120, 152, 167, 180];
const FAVICON_SIZES = [16, 32, 48];

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

/**
 * Main function to generate all PWA icons
 */
async function generatePWAIcons() {
  console.log(`\n${colors.cyan}${colors.bright}CareLink AI - PWA Icon Generator${colors.reset}`);
  console.log(`${colors.dim}Converting SVG icons to PNG format for PWA compatibility${colors.reset}\n`);

  try {
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    // Get list of SVG files
    const files = await fs.readdir(ICONS_DIR);
    const svgFiles = files.filter(file => file.endsWith('.svg'));

    if (svgFiles.length === 0) {
      console.log(`${colors.yellow}No SVG files found in ${ICONS_DIR}${colors.reset}`);
      return;
    }

    console.log(`${colors.blue}Found ${svgFiles.length} SVG files to convert${colors.reset}`);

    // Process standard icons
    await processIconFile('icon', PWA_ICON_SIZES);
    
    // Process maskable icons (with padding for safe area)
    await processIconFile('maskable-icon', PWA_ICON_SIZES, true);
    
    // Process Apple touch icon
    await processIconFile('apple-touch-icon', APPLE_ICON_SIZES);
    
    // Process favicon
    await processFavicon();

    // Generate manifest icons array
    await generateManifestIconsArray();

    console.log(`\n${colors.green}${colors.bright}✓ All icons generated successfully!${colors.reset}`);
    console.log(`${colors.blue}Icons saved to: ${OUTPUT_DIR}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Error generating icons:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * Process an icon file for multiple sizes
 */
async function processIconFile(baseName, sizes, isMaskable = false) {
  console.log(`\n${colors.cyan}Processing ${baseName} icons:${colors.reset}`);

  for (const size of sizes) {
    const svgFile = path.join(ICONS_DIR, `${baseName}-${size}x${size}.svg`);
    const svgFileGeneric = path.join(ICONS_DIR, `${baseName}.svg`);
    const pngFile = path.join(OUTPUT_DIR, `${baseName}-${size}x${size}.png`);
    
    try {
      // Check if specific size SVG exists, otherwise use generic
      const sourceFile = await fileExists(svgFile) ? svgFile : svgFileGeneric;
      
      if (!await fileExists(sourceFile)) {
        console.log(`${colors.yellow}⚠ Source file not found: ${sourceFile}${colors.reset}`);
        continue;
      }
      
      // Read SVG content
      const svgBuffer = await fs.readFile(sourceFile);
      
      // Create Sharp instance
      let image = sharp(svgBuffer);
      
      // Resize to target size
      image = image.resize(size, size);
      
      // Apply padding for maskable icons (safe area)
      if (isMaskable) {
        // Add 10% padding for maskable icons (safe area)
        const padding = Math.floor(size * 0.1);
        image = image.extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 0, g: 153, b: 230, alpha: 1 } // #0099e6 background
        });
        
        // Resize back to target size after padding
        image = image.resize(size, size);
      }
      
      // Convert to PNG with optimization
      await image
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(pngFile);
      
      console.log(`${colors.green}✓ Generated:${colors.reset} ${baseName}-${size}x${size}.png`);
    } catch (error) {
      console.error(`${colors.red}✗ Error processing ${baseName}-${size}x${size}:${colors.reset}`, error.message);
    }
  }
}

/**
 * Process favicon files
 */
async function processFavicon() {
  console.log(`\n${colors.cyan}Processing favicon:${colors.reset}`);
  
  try {
    const svgFile = path.join(ICONS_DIR, 'favicon.svg');
    
    if (!await fileExists(svgFile)) {
      console.log(`${colors.yellow}⚠ Favicon SVG not found: ${svgFile}${colors.reset}`);
      return;
    }
    
    // Read SVG content
    const svgBuffer = await fs.readFile(svgFile);
    
    // Generate ICO file (multi-size favicon)
    const icoFile = path.join(FAVICON_DIR, 'favicon.ico');
    
    // Generate individual PNG files for each favicon size
    for (const size of FAVICON_SIZES) {
      const pngFile = path.join(OUTPUT_DIR, `favicon-${size}x${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png({ quality: 100 })
        .toFile(pngFile);
      
      console.log(`${colors.green}✓ Generated:${colors.reset} favicon-${size}x${size}.png`);
    }
    
    // Copy 32x32 as main favicon.png
    await fs.copyFile(
      path.join(OUTPUT_DIR, 'favicon-32x32.png'),
      path.join(FAVICON_DIR, 'favicon.png')
    );
    
    console.log(`${colors.green}✓ Generated:${colors.reset} favicon.png`);
  } catch (error) {
    console.error(`${colors.red}✗ Error processing favicon:${colors.reset}`, error.message);
  }
}

/**
 * Generate manifest icons array for manifest.json
 */
async function generateManifestIconsArray() {
  console.log(`\n${colors.cyan}Generating manifest icons array:${colors.reset}`);
  
  try {
    const manifestFile = path.join(process.cwd(), 'public', 'manifest.json');
    
    if (!await fileExists(manifestFile)) {
      console.log(`${colors.yellow}⚠ Manifest file not found: ${manifestFile}${colors.reset}`);
      return;
    }
    
    // Read manifest file
    const manifestContent = await fs.readFile(manifestFile, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    // Create icons array
    const icons = [];
    
    // Add standard icons
    for (const size of PWA_ICON_SIZES) {
      icons.push({
        src: `/icons/icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png'
      });
    }
    
    // Add maskable icons
    for (const size of [192, 512]) {
      icons.push({
        src: `/icons/maskable-icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'maskable'
      });
    }
    
    // Update manifest
    manifest.icons = icons;
    
    // Write updated manifest
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
    
    console.log(`${colors.green}✓ Updated manifest.json with ${icons.length} icons${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Error updating manifest:${colors.reset}`, error.message);
  }
}

/**
 * Helper function to check if a file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Run the script
generatePWAIcons().catch(error => {
  console.error(`${colors.red}${colors.bright}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
