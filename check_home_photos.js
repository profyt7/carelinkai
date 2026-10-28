const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Get all homes with their photos
    const homes = await prisma.assistedLivingHome.findMany({
      take: 5,
      include: {
        photos: true,
        address: true
      }
    });
    
    console.log('Found homes:', homes.length);
    
    for (const home of homes) {
      console.log('\n---');
      console.log('Home ID:', home.id);
      console.log('Home Name:', home.name);
      console.log('Photos count:', home.photos?.length || 0);
      
      if (home.photos && home.photos.length > 0) {
        console.log('Photo URLs:');
        home.photos.forEach(photo => {
          console.log(`  - ${photo.url} (primary: ${photo.isPrimary})`);
        });
      } else {
        console.log('No photos found for this home');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
