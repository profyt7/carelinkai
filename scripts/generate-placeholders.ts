/**
 * Script to generate and upload placeholder images to Cloudinary
 * 
 * This script creates placeholder images for profiles, caregivers, and providers
 * and uploads them to Cloudinary under the "carelinkai/placeholders" folder.
 * 
 * Run with: npx ts-node scripts/generate-placeholders.ts
 */

import { v2 as cloudinary } from 'cloudinary';
import { createCanvas } from 'canvas';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
  api_key: process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_API_SECRET'],
  secure: true,
});

interface PlaceholderConfig {
  name: string;
  color: string;
  initials: string;
  category: 'profile' | 'caregiver' | 'provider';
}

const placeholders: PlaceholderConfig[] = [
  // Profile placeholders (neutral colors)
  { name: 'profile-default', color: '#6366F1', initials: 'U', category: 'profile' },
  { name: 'profile-male', color: '#3B82F6', initials: 'M', category: 'profile' },
  { name: 'profile-female', color: '#EC4899', initials: 'F', category: 'profile' },
  { name: 'profile-admin', color: '#8B5CF6', initials: 'A', category: 'profile' },
  
  // Caregiver placeholders (warm, caring colors)
  { name: 'caregiver-default', color: '#10B981', initials: 'C', category: 'caregiver' },
  { name: 'caregiver-nurse', color: '#14B8A6', initials: 'N', category: 'caregiver' },
  { name: 'caregiver-aide', color: '#06B6D4', initials: 'CA', category: 'caregiver' },
  
  // Provider placeholders (professional colors)
  { name: 'provider-default', color: '#F59E0B', initials: 'P', category: 'provider' },
  { name: 'provider-medical', color: '#EF4444', initials: 'MD', category: 'provider' },
  { name: 'provider-facility', color: '#6366F1', initials: 'F', category: 'provider' },
];

function generatePlaceholderImage(config: PlaceholderConfig): Buffer {
  const size = 400; // 400x400 px
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Draw background circle
  ctx.fillStyle = config.color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw initials
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size / 3}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.initials, size / 2, size / 2);
  
  return canvas.toBuffer('image/png');
}

async function uploadPlaceholders(): Promise<void> {
  console.log('🚀 Starting placeholder generation and upload...\n');
  
  const results = [];
  
  for (const config of placeholders) {
    try {
      console.log(`🎨 Generating ${config.name}...`);
      
      // Generate image buffer
      const buffer = generatePlaceholderImage(config);
      
      console.log(`⬆️  Uploading to Cloudinary...`);
      
      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `carelinkai/placeholders/${config.category}`,
            public_id: config.name,
            resource_type: 'image',
            overwrite: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(buffer);
      });
      
      results.push({
        name: config.name,
        category: config.category,
        publicId: result.public_id,
        url: result.secure_url,
        success: true,
      });
      
      console.log(`   ✅ Success! URL: ${result.secure_url}\n`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({
        name: config.name,
        category: config.category,
        publicId: '',
        url: '',
        success: false,
        error: errorMsg,
      });
      console.error(`   ❌ Failed: ${errorMsg}\n`);
    }
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 UPLOAD SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);
  
  if (successful.length > 0) {
    console.log('✅ SUCCESSFUL UPLOADS BY CATEGORY:');
    console.log('─'.repeat(60));
    
    ['profile', 'caregiver', 'provider'].forEach(category => {
      const categoryResults = successful.filter(r => r.category === category);
      if (categoryResults.length > 0) {
        console.log(`\n${category.toUpperCase()}:`);
        categoryResults.forEach(r => {
          console.log(`  ${r.name.padEnd(25)} → ${r.url}`);
        });
      }
    });
    console.log('');
  }
  
  if (failed.length > 0) {
    console.log('❌ FAILED UPLOADS:');
    console.log('─'.repeat(60));
    failed.forEach(r => {
      console.log(`${r.name.padEnd(25)} → ${r.error}`);
    });
    console.log('');
  }
  
  // Save results to JSON file
  const outputPath = 'scripts/cloudinary-placeholder-uploads.json';
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`💾 Results saved to: ${outputPath}\n`);
}

// Run the upload
uploadPlaceholders()
  .then(() => {
    console.log('✨ Placeholder generation and upload completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Process failed:', error);
    process.exit(1);
  });
