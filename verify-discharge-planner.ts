import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'demo.discharge@carelinkai.com' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      emailVerified: true,
      createdAt: true,
    }
  });

  console.log('\n=== Discharge Planner Demo Account ===');
  console.log(JSON.stringify(user, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);
