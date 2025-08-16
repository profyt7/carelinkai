const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const row = await prisma.family.findFirst({
      select: { id: true }
    });
    
    if (row) {
      console.log(`id:${row.id}`);
    } else {
      console.log('none');
    }
  } catch (error) {
    console.error('Error querying family:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
