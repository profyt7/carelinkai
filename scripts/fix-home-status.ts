/**
 * Fix Home Status Script
 * Updates Sunshine Care Home (home_1) status from DRAFT to ACTIVE
 * 
 * Usage: npx ts-node scripts/fix-home-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Starting Home Status Fix...\n');
  
  try {
    // Update homes with slug 'home_1' or containing 'Sunshine Care' in name
    const result = await prisma.assistedLivingHome.updateMany({
      where: {
        OR: [
          { slug: 'home_1' },
          { name: { contains: 'Sunshine Care' } }
        ]
      },
      data: {
        status: 'ACTIVE'
      }
    });
    
    console.log(`✅ Successfully updated ${result.count} home(s) to ACTIVE status`);
    
    // Verify the update
    const updatedHomes = await prisma.assistedLivingHome.findMany({
      where: {
        OR: [
          { slug: 'home_1' },
          { name: { contains: 'Sunshine Care' } }
        ]
      },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true
      }
    });
    
    console.log('\n📋 Updated Home(s):');
    updatedHomes.forEach(home => {
      console.log(`  - ${home.name} (slug: ${home.slug || 'N/A'})`);
      console.log(`    ID: ${home.id}`);
      console.log(`    Status: ${home.status}`);
    });
    
    console.log('\n✅ Home status fix completed successfully!');
  } catch (error) {
    console.error('❌ Error updating home status:', error);
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
