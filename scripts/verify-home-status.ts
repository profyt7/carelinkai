/**
 * Verify Home Status Script
 * Checks the current status of Sunshine Care Home
 * 
 * Usage: npx ts-node scripts/verify-home-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Home Status...\n');
  
  try {
    const homes = await prisma.assistedLivingHome.findMany({
      where: {
        OR: [
          { slug: 'home_1' },
          { name: { contains: 'Sunshine' } }
        ]
      },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        city: true,
        state: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (homes.length === 0) {
      console.log('⚠️  No homes found matching criteria');
      console.log('   Searched for: slug=\'home_1\' OR name containing \'Sunshine\'');
      return;
    }
    
    console.log(`📋 Found ${homes.length} home(s):\n`);
    
    homes.forEach((home, index) => {
      console.log(`Home ${index + 1}:`);
      console.log(`  Name: ${home.name}`);
      console.log(`  Slug: ${home.slug || 'N/A'}`);
      console.log(`  Status: ${home.status}`);
      console.log(`  Location: ${home.city}, ${home.state}`);
      console.log(`  ID: ${home.id}`);
      console.log(`  Created: ${home.createdAt.toISOString()}`);
      console.log(`  Updated: ${home.updatedAt.toISOString()}`);
      console.log('');
      
      if (home.status === 'ACTIVE') {
        console.log('  ✅ Status is ACTIVE - Tours should work!');
      } else {
        console.log(`  ⚠️  Status is ${home.status} - Tours may not work!`);
      }
      console.log('\n' + '-'.repeat(60) + '\n');
    });
    
    // Additional checks
    const activeCount = homes.filter(h => h.status === 'ACTIVE').length;
    const draftCount = homes.filter(h => h.status === 'DRAFT').length;
    
    console.log('\n📊 Summary:');
    console.log(`  Total homes: ${homes.length}`);
    console.log(`  Active: ${activeCount}`);
    console.log(`  Draft: ${draftCount}`);
    
    if (activeCount === homes.length) {
      console.log('\n✅ All homes are ACTIVE - Database fix successful!');
    } else if (draftCount > 0) {
      console.log('\n⚠️  Some homes are still in DRAFT status - Fix may need to be re-run');
    }
    
  } catch (error) {
    console.error('❌ Error verifying home status:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
