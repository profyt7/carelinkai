const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const residents = await prisma.resident.count();
  const operators = await prisma.operator.count();
  const homes = await prisma.assistedLivingHome.count();
  const families = await prisma.family.count();
  
  console.log('Database Stats:');
  console.log('  Residents:', residents);
  console.log('  Operators:', operators);
  console.log('  Homes:', homes);
  console.log('  Families:', families);
  
  // Check if there are any operator users
  const opUsers = await prisma.user.findMany({
    where: { role: 'OPERATOR' },
    select: { id: true, email: true, firstName: true }
  });
  console.log('\nOperator Users:', opUsers.length);
  opUsers.forEach(u => console.log('  -', u.email, u.firstName));
  
  // Check operator-home relationships
  if (operators > 0) {
    const ops = await prisma.operator.findMany({
      include: {
        _count: {
          select: { homes: true }
        }
      },
      take: 3
    });
    console.log('\nOperator-Home Relationships:');
    ops.forEach(op => console.log(`  Operator ${op.id}: ${op._count.homes} homes`));
  }
  
  // Check resident-home relationships
  if (residents > 0) {
    const ress = await prisma.resident.findMany({
      select: { id: true, firstName: true, lastName: true, homeId: true },
      take: 5
    });
    console.log('\nSample Residents:');
    ress.forEach(r => console.log(`  ${r.firstName} ${r.lastName}: homeId=${r.homeId || 'NULL'}`));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
