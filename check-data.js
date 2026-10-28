const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const count = await prisma.assistedLivingHome.count();
    console.log('Homes in database:', count);
    
    if (count > 0) {
      const homes = await prisma.assistedLivingHome.findMany({
        select: { name: true, careLevel: true, priceMin: true, priceMax: true }
      });
      console.log('Sample homes:');
      homes.forEach(home => {
        console.log(`- ${home.name}: ${home.careLevel.join(', ')} ($${home.priceMin}-$${home.priceMax})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
