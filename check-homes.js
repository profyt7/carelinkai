const { PrismaClient } = require('@prisma/client');

async function checkHomes() {
  const prisma = new PrismaClient();
  
  try {
    const count = await prisma.assistedLivingHome.count();
    console.log(`Total AssistedLivingHomes: ${count}`);
    
    if (count === 0) {
      console.log('\n⚠️ Database is empty! No assisted living homes found.');
    } else {
      // Get sample homes
      const homes = await prisma.assistedLivingHome.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          status: true,
          careLevel: true,
          capacity: true,
          currentOccupancy: true,
        }
      });
      
      console.log('\nSample homes:');
      homes.forEach((home, i) => {
        console.log(`${i + 1}. ${home.name} (${home.status})`);
        console.log(`   Care levels: ${home.careLevel.join(', ')}`);
        console.log(`   Capacity: ${home.currentOccupancy}/${home.capacity}`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkHomes();
