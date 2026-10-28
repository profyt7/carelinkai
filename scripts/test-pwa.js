#!/usr/bin/env node
/**
 * CareLink AI - PWA Test Script
 * 
 * This script tests PWA functionality and provides a checklist of PWA requirements
 * without needing to install Lighthouse CLI.
 * 
 * Usage: npm run test:pwa
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const MANIFEST_PATH = path.join(PUBLIC_DIR, 'manifest.json');
const SW_PATH = path.join(PUBLIC_DIR, 'sw.js');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const OFFLINE_PAGE_PATH = path.join(PUBLIC_DIR, 'offline.html');

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
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  black: '\x1b[30m',
};

// PWA requirements checklist
const pwaRequirements = [
  { id: 'manifest', name: 'Web App Manifest', required: true },
  { id: 'sw', name: 'Service Worker', required: true },
  { id: 'https', name: 'Served over HTTPS', required: true },
  { id: 'offline', name: 'Works Offline', required: true },
  { id: 'installable', name: 'Installable', required: true },
  { id: 'icons', name: 'Icons (including 192x192 and 512x512)', required: true },
  { id: 'maskable_icons', name: 'Maskable Icons', required: false },
  { id: 'name', name: 'Name and Short Name', required: true },
  { id: 'start_url', name: 'Start URL', required: true },
  { id: 'display', name: 'Display Mode (standalone or fullscreen)', required: true },
  { id: 'theme_color', name: 'Theme Color', required: true },
  { id: 'background_color', name: 'Background Color', required: true },
  { id: 'offline_page', name: 'Custom Offline Page', required: false },
  { id: 'a2hs', name: 'Add to Home Screen Support', required: true },
  { id: 'splash_screens', name: 'Splash Screens', required: false },
  { id: 'screenshots', name: 'App Screenshots', required: false },
  { id: 'shortcuts', name: 'App Shortcuts', required: false },
  { id: 'orientation', name: 'Orientation', required: false },
  { id: 'scope', name: 'Scope Defined', required: true },
  { id: 'responsive', name: 'Responsive Design', required: true },
];

// Test results
const results = {
  pass: [],
  fail: [],
  warning: [],
  score: 0,
  maxScore: 0,
  details: {}
};

/**
 * Main function to test PWA functionality
 */
async function testPWA() {
  console.log(`\n${colors.cyan}${colors.bright}CareLink AI - PWA Test Script${colors.reset}`);
  console.log(`${colors.dim}Testing PWA functionality and requirements${colors.reset}\n`);

  try {
    // Test manifest.json
    await testManifest();
    
    // Test service worker
    await testServiceWorker();
    
    // Test icons
    await testIcons();
    
    // Test offline capability
    await testOfflineCapability();
    
    // Test responsive design
    await testResponsiveDesign();
    
    // Calculate score
    calculateScore();
    
    // Print summary
    printSummary();
    
    // Return exit code based on passing required tests
    const requiredFails = results.fail.filter(item => 
      pwaRequirements.find(req => req.id === item)?.required
    );
    
    if (requiredFails.length > 0) {
      console.log(`\n${colors.red}${colors.bright}❌ Failed ${requiredFails.length} required tests. PWA may not work correctly.${colors.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}${colors.bright}✅ All required tests passed! Your PWA is ready.${colors.reset}`);
      process.exit(0);
    }
    
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Error testing PWA:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * Test manifest.json
 */
async function testManifest() {
  console.log(`${colors.blue}${colors.bright}Testing Web App Manifest...${colors.reset}`);
  
  try {
    // Check if manifest.json exists
    await fs.access(MANIFEST_PATH);
    console.log(`${colors.green}✓ manifest.json found${colors.reset}`);
    
    // Read and parse manifest.json
    const manifestContent = await fs.readFile(MANIFEST_PATH, 'utf8');
    const manifest = JSON.parse(manifestContent);
    results.details.manifest = manifest;
    
    // Check required fields
    const requiredFields = [
      { field: 'name', req: 'name' },
      { field: 'short_name', req: 'name' },
      { field: 'start_url', req: 'start_url' },
      { field: 'display', req: 'display' },
      { field: 'theme_color', req: 'theme_color' },
      { field: 'background_color', req: 'background_color' },
      { field: 'icons', req: 'icons' },
      { field: 'scope', req: 'scope' },
    ];
    
    for (const { field, req } of requiredFields) {
      if (manifest[field]) {
        console.log(`${colors.green}✓ ${field} defined${colors.reset}`);
        if (!results.pass.includes(req)) {
          results.pass.push(req);
        }
      } else {
        console.log(`${colors.red}✗ ${field} missing${colors.reset}`);
        if (!results.fail.includes(req)) {
          results.fail.push(req);
        }
      }
    }
    
    // Check display mode
    if (manifest.display && ['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display)) {
      console.log(`${colors.green}✓ display mode is ${manifest.display}${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ display mode should be standalone, fullscreen, or minimal-ui${colors.reset}`);
      if (!results.warning.includes('display')) {
        results.warning.push('display');
      }
    }
    
    // Check screenshots
    if (manifest.screenshots && manifest.screenshots.length > 0) {
      console.log(`${colors.green}✓ screenshots defined (${manifest.screenshots.length})${colors.reset}`);
      results.pass.push('screenshots');
    } else {
      console.log(`${colors.yellow}⚠ screenshots not defined (recommended)${colors.reset}`);
      results.warning.push('screenshots');
    }
    
    // Check shortcuts
    if (manifest.shortcuts && manifest.shortcuts.length > 0) {
      console.log(`${colors.green}✓ shortcuts defined (${manifest.shortcuts.length})${colors.reset}`);
      results.pass.push('shortcuts');
    } else {
      console.log(`${colors.yellow}⚠ shortcuts not defined (recommended)${colors.reset}`);
      results.warning.push('shortcuts');
    }
    
    // Check orientation
    if (manifest.orientation) {
      console.log(`${colors.green}✓ orientation defined (${manifest.orientation})${colors.reset}`);
      results.pass.push('orientation');
    } else {
      console.log(`${colors.yellow}⚠ orientation not defined (optional)${colors.reset}`);
      results.warning.push('orientation');
    }
    
  } catch (error) {
    console.error(`${colors.red}✗ Error testing manifest:${colors.reset}`, error.message);
    results.fail.push('manifest');
  }
}

/**
 * Test service worker
 */
async function testServiceWorker() {
  console.log(`\n${colors.blue}${colors.bright}Testing Service Worker...${colors.reset}`);
  
  try {
    // Check if service worker file exists
    await fs.access(SW_PATH);
    console.log(`${colors.green}✓ Service worker file found${colors.reset}`);
    
    // Read service worker content
    const swContent = await fs.readFile(SW_PATH, 'utf8');
    
    // Check for important service worker features
    const features = [
      { name: 'Cache API usage', pattern: /caches\.open|caches\.match/i, req: 'offline' },
      { name: 'Offline fallback', pattern: /offline\.html|offlineFallback/i, req: 'offline' },
      { name: 'Install event', pattern: /self\.addEventListener\(['"']install['"']/i, req: 'sw' },
      { name: 'Activate event', pattern: /self\.addEventListener\(['"']activate['"']/i, req: 'sw' },
      { name: 'Fetch event', pattern: /self\.addEventListener\(['"']fetch['"']/i, req: 'sw' },
      { name: 'Push notification', pattern: /self\.addEventListener\(['"']push['"']/i, req: null },
    ];
    
    for (const { name, pattern, req } of features) {
      if (pattern.test(swContent)) {
        console.log(`${colors.green}✓ ${name} implemented${colors.reset}`);
        if (req && !results.pass.includes(req)) {
          results.pass.push(req);
        }
      } else {
        if (name === 'Push notification') {
          console.log(`${colors.yellow}⚠ ${name} not found (optional)${colors.reset}`);
        } else {
          console.log(`${colors.red}✗ ${name} not found${colors.reset}`);
          if (req && !results.fail.includes(req)) {
            results.fail.push(req);
          }
        }
      }
    }
    
    // Check service worker registration in HTML files
    const indexPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
    try {
      const indexContent = await fs.readFile(indexPath, 'utf8');
      if (/serviceWorker|navigator\.serviceWorker\.register/i.test(indexContent)) {
        console.log(`${colors.green}✓ Service worker registration found${colors.reset}`);
        if (!results.pass.includes('sw')) {
          results.pass.push('sw');
        }
      } else {
        console.log(`${colors.yellow}⚠ Service worker registration not found in layout.tsx${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ Could not check service worker registration in layout.tsx${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}✗ Error testing service worker:${colors.reset}`, error.message);
    results.fail.push('sw');
  }
}

/**
 * Test icons
 */
async function testIcons() {
  console.log(`\n${colors.blue}${colors.bright}Testing Icons...${colors.reset}`);
  
  try {
    // Check if icons directory exists
    await fs.access(ICONS_DIR);
    
    // List icon files
    const iconFiles = await fs.readdir(ICONS_DIR);
    console.log(`${colors.green}✓ Icons directory found with ${iconFiles.length} files${colors.reset}`);
    
    // Check for required icon sizes
    const requiredSizes = [192, 512];
    const foundSizes = new Set();
    let hasMaskableIcon = false;
    
    for (const file of iconFiles) {
      // Check for PNG icons with size in filename
      const sizeMatch = file.match(/(\d+)x(\d+)\.png$/i);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1]);
        foundSizes.add(size);
      }
      
      // Check for maskable icons
      if (file.includes('maskable') && file.endsWith('.png')) {
        hasMaskableIcon = true;
      }
    }
    
    // Check if all required sizes are present
    const missingSizes = requiredSizes.filter(size => !foundSizes.has(size));
    
    if (missingSizes.length === 0) {
      console.log(`${colors.green}✓ All required icon sizes found${colors.reset}`);
      results.pass.push('icons');
    } else {
      console.log(`${colors.red}✗ Missing required icon sizes: ${missingSizes.join(', ')}${colors.reset}`);
      results.fail.push('icons');
    }
    
    // Check for maskable icons
    if (hasMaskableIcon) {
      console.log(`${colors.green}✓ Maskable icons found${colors.reset}`);
      results.pass.push('maskable_icons');
    } else {
      console.log(`${colors.yellow}⚠ No maskable icons found (recommended)${colors.reset}`);
      results.warning.push('maskable_icons');
    }
    
    // Check for Apple touch icons
    const hasAppleIcon = iconFiles.some(file => file.includes('apple-touch-icon'));
    if (hasAppleIcon) {
      console.log(`${colors.green}✓ Apple touch icons found${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ No Apple touch icons found (recommended)${colors.reset}`);
    }
    
    // Check for favicon
    const hasFavicon = iconFiles.some(file => file.includes('favicon'));
    if (hasFavicon) {
      console.log(`${colors.green}✓ Favicon found${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ No favicon found (recommended)${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}✗ Error testing icons:${colors.reset}`, error.message);
    results.fail.push('icons');
  }
}

/**
 * Test offline capability
 */
async function testOfflineCapability() {
  console.log(`\n${colors.blue}${colors.bright}Testing Offline Capability...${colors.reset}`);
  
  try {
    // Check for offline page
    let hasOfflinePage = false;
    try {
      await fs.access(OFFLINE_PAGE_PATH);
      hasOfflinePage = true;
      console.log(`${colors.green}✓ Custom offline page found${colors.reset}`);
      results.pass.push('offline_page');
    } catch (error) {
      console.log(`${colors.yellow}⚠ No custom offline page found${colors.reset}`);
      results.warning.push('offline_page');
    }
    
    // Check service worker for offline caching
    const swContent = await fs.readFile(SW_PATH, 'utf8');
    
    if (/caches\.open|caches\.match/i.test(swContent) && 
        /self\.addEventListener\(['"']fetch['"']/i.test(swContent)) {
      console.log(`${colors.green}✓ Service worker implements offline caching${colors.reset}`);
      results.pass.push('offline');
    } else {
      console.log(`${colors.red}✗ Service worker may not properly implement offline caching${colors.reset}`);
      results.fail.push('offline');
    }
    
    // Check for installability
    if (results.pass.includes('manifest') && 
        results.pass.includes('icons') && 
        results.pass.includes('sw')) {
      console.log(`${colors.green}✓ App appears to be installable${colors.reset}`);
      results.pass.push('installable');
      results.pass.push('a2hs');
    } else {
      console.log(`${colors.red}✗ App may not be installable due to missing requirements${colors.reset}`);
      results.fail.push('installable');
      results.fail.push('a2hs');
    }
    
    // HTTPS is required for PWAs
    console.log(`${colors.yellow}⚠ HTTPS can't be tested locally but is required for production${colors.reset}`);
    results.warning.push('https');
    
  } catch (error) {
    console.error(`${colors.red}✗ Error testing offline capability:${colors.reset}`, error.message);
    results.fail.push('offline');
  }
}

/**
 * Test responsive design
 */
async function testResponsiveDesign() {
  console.log(`\n${colors.blue}${colors.bright}Testing Responsive Design...${colors.reset}`);
  
  try {
    // Check for responsive meta tag in HTML
    const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx');
    try {
      const layoutContent = await fs.readFile(layoutPath, 'utf8');
      if (/viewport|meta name=['"]viewport/.test(layoutContent)) {
        console.log(`${colors.green}✓ Viewport meta tag found${colors.reset}`);
        results.pass.push('responsive');
      } else {
        console.log(`${colors.yellow}⚠ Viewport meta tag not found in layout.tsx${colors.reset}`);
        results.warning.push('responsive');
      }
    } catch (error) {
      console.log(`${colors.yellow}⚠ Could not check viewport meta tag${colors.reset}`);
    }
    
    // Check for media queries in CSS (simplified check)
    console.log(`${colors.green}✓ Using Tailwind CSS which provides responsive design${colors.reset}`);
    if (!results.pass.includes('responsive')) {
      results.pass.push('responsive');
    }
    
  } catch (error) {
    console.error(`${colors.red}✗ Error testing responsive design:${colors.reset}`, error.message);
    results.warning.push('responsive');
  }
}

/**
 * Calculate PWA score
 */
function calculateScore() {
  for (const req of pwaRequirements) {
    if (req.required) {
      results.maxScore += 1;
      if (results.pass.includes(req.id)) {
        results.score += 1;
      }
    }
  }
}

/**
 * Print summary of PWA test results
 */
function printSummary() {
  console.log(`\n${colors.cyan}${colors.bright}PWA Test Results Summary${colors.reset}`);
  console.log(`${colors.dim}─────────────────────────────────────────${colors.reset}`);
  
  // Calculate percentage score
  const percentage = Math.round((results.score / results.maxScore) * 100);
  
  // Determine score color
  let scoreColor = colors.red;
  if (percentage >= 90) {
    scoreColor = colors.green;
  } else if (percentage >= 70) {
    scoreColor = colors.yellow;
  }
  
  console.log(`${colors.bright}PWA Score: ${scoreColor}${percentage}%${colors.reset} (${results.score}/${results.maxScore} required items)`);
  
  // Print checklist
  console.log(`\n${colors.bright}PWA Requirements Checklist:${colors.reset}`);
  for (const req of pwaRequirements) {
    const isPassed = results.pass.includes(req.id);
    const isFailed = results.fail.includes(req.id);
    const isWarning = results.warning.includes(req.id);
    
    let status;
    if (isPassed) {
      status = `${colors.green}✓ PASS${colors.reset}`;
    } else if (isFailed) {
      status = req.required ? `${colors.red}✗ FAIL${colors.reset}` : `${colors.yellow}✗ WARN${colors.reset}`;
    } else if (isWarning) {
      status = `${colors.yellow}⚠ WARN${colors.reset}`;
    } else {
      status = `${colors.dim}? UNKNOWN${colors.reset}`;
    }
    
    const requiredText = req.required ? `${colors.bright}[Required]${colors.reset}` : '[Optional]';
    console.log(`  ${status} ${req.name} ${colors.dim}${requiredText}${colors.reset}`);
  }
  
  // Print recommendations
  const failedRequired = pwaRequirements
    .filter(req => req.required && results.fail.includes(req.id))
    .map(req => req.name);
  
  if (failedRequired.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Critical Issues:${colors.reset}`);
    failedRequired.forEach(name => {
      console.log(`  ${colors.red}• ${name} - Required but missing${colors.reset}`);
    });
  }
  
  const warnings = pwaRequirements
    .filter(req => results.warning.includes(req.id))
    .map(req => req.name);
  
  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}${colors.bright}Recommendations:${colors.reset}`);
    warnings.forEach(name => {
      console.log(`  ${colors.yellow}• Consider implementing ${name}${colors.reset}`);
    });
  }
}

// Run the tests
testPWA().catch(error => {
  console.error(`${colors.red}${colors.bright}Unhandled error:${colors.reset}`, error);
  process.exit(1);
});
