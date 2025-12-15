/**
 * Script to upload home images to Cloudinary
 * 
 * This script uploads all home images from /public/images/homes/
 * to Cloudinary under the "carelinkai/homes" folder.
 * 
 * Run with: npx ts-node scripts/upload-homes-to-cloudinary.ts
 */

import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env['CLOUDINARY_CLOUD_NAME'],
  api_key: process.env['CLOUDINARY_API_KEY'],
  api_secret: process.env['CLOUDINARY_API_SECRET'],
  secure: true,
});

interface UploadResult {
  filename: string;
  publicId: string;
  url: string;
  secureUrl: string;
  success: boolean;
  error?: string;
}

async function uploadHomeImages(): Promise<void> {
  console.log('🚀 Starting Cloudinary home images upload...\n');
  
  const imagesDir = path.join(process.cwd(), 'public/images/homes');
  const results: UploadResult[] = [];
  
  try {
    // Check if directory exists
    if (!fs.existsSync(imagesDir)) {
      throw new Error(`Images directory not found: ${imagesDir}`);
    }
    
    // Get all image files
    const files = fs.readdirSync(imagesDir).filter(file => 
      /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
    );
    
    console.log(`📁 Found ${files.length} images to upload\n`);
    
    // Upload each file
    for (const file of files) {
      const filePath = path.join(imagesDir, file);
      const fileNameWithoutExt = path.parse(file).name;
      
      try {
        console.log(`⬆️  Uploading ${file}...`);
        
        const result = await cloudinary.uploader.upload(filePath, {
          folder: 'carelinkai/homes',
          public_id: `home-${fileNameWithoutExt}`,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 800, crop: 'fill', quality: 'auto' },
          ],
          overwrite: true, // Overwrite if already exists
        });
        
        results.push({
          filename: file,
          publicId: result.public_id,
          url: result.url,
          secureUrl: result.secure_url,
          success: true,
        });
        
        console.log(`   ✅ Success! Public ID: ${result.public_id}`);
        console.log(`   🔗 URL: ${result.secure_url}\n`);
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({
          filename: file,
          publicId: '',
          url: '',
          secureUrl: '',
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
      console.log('✅ SUCCESSFUL UPLOADS:');
      console.log('─'.repeat(60));
      successful.forEach(r => {
        console.log(`${r.filename.padEnd(15)} → ${r.publicId}`);
      });
      console.log('');
    }
    
    if (failed.length > 0) {
      console.log('❌ FAILED UPLOADS:');
      console.log('─'.repeat(60));
      failed.forEach(r => {
        console.log(`${r.filename.padEnd(15)} → ${r.error}`);
      });
      console.log('');
    }
    
    // Save results to JSON file for reference
    const outputPath = path.join(process.cwd(), 'scripts/cloudinary-home-uploads.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`💾 Results saved to: ${outputPath}\n`);
    
    // Generate mock data template
    if (successful.length > 0) {
      console.log('📝 CLOUDINARY URLS FOR MOCK DATA:');
      console.log('─'.repeat(60));
      console.log('Copy these URLs to your mock data files:\n');
      successful.forEach((r, index) => {
        console.log(`  "${r.secureUrl}",`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the upload
uploadHomeImages()
  .then(() => {
    console.log('✨ Upload process completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Upload process failed:', error);
    process.exit(1);
  });
