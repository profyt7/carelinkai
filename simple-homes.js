const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🏠 Generating sample homes...');
  
  // Create 3 operators if they don't exist
  const operators = [
    { email: 'sunrise@example.com', name: 'Sunrise', company: 'Sunrise Senior Living' },
    { email: 'brookdale@example.com', name: 'Brookdale', company: 'Brookdale Senior Living' },
    { email: 'fivestar@example.com', name: 'Five Star', company: 'Five Star Senior Living' }
  ];
  
  const createdOperators = [];
  for (const op of operators) {
    const user = await prisma.user.upsert({
      where: { email: op.email },
      update: {},
      create: {
        email: op.email,
        passwordHash: '$2a$12$dummy.hash.for.testing',
        firstName: op.name,
        lastName: 'Living',
        role: 'OPERATOR',
        status: 'ACTIVE',
        phone: '555-123-4567'
      }
    });
    
    const operator = await prisma.operator.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        companyName: op.company,
        taxId: '12-3456789',
        businessLicense: 'BL-12345'
      }
    });
    
    createdOperators.push(operator);
  }
  
  // Sample homes
  const homes = [
    { name: 'Sunrise Manor', careLevel: ['ASSISTED', 'MEMORY_CARE'], priceMin: 3500, priceMax: 5200, capacity: 30, occupancy: 22 },
    { name: 'Golden Years Residence', careLevel: ['INDEPENDENT', 'ASSISTED'], priceMin: 2800, priceMax: 4100, capacity: 40, occupancy: 28 },
    { name: 'Peaceful Pines', careLevel: ['MEMORY_CARE', 'SKILLED_NURSING'], priceMin: 4200, priceMax: 7800, capacity: 25, occupancy: 22 },
    { name: 'Harbor View Commons', careLevel: ['INDEPENDENT'], priceMin: 2200, priceMax: 3500, capacity: 50, occupancy: 35 },
    { name: 'Brookdale Heights', careLevel: ['ASSISTED'], priceMin: 3200, priceMax: 4800, capacity: 35, occupancy: 29 },
    { name: 'Valley Springs', careLevel: ['INDEPENDENT', 'ASSISTED'], priceMin: 2600, priceMax: 4200, capacity: 45, occupancy: 35 }
  ];
  
  // Create homes
  for (let i = 0; i < homes.length; i++) {
    const home = homes[i];
    const operator = createdOperators[i % createdOperators.length];
    
    await prisma.assistedLivingHome.create({
      data: {
        name: home.name,
        description: `Beautiful community offering ${home.careLevel.join(' and ').toLowerCase()} services.`,
        careLevel: home.careLevel,
        priceMin: home.priceMin,
        priceMax: home.priceMax,
        capacity: home.capacity,
        currentOccupancy: home.occupancy,
        amenities: ['WiFi', 'Garden', 'Dining', 'Transportation'],
        status: 'ACTIVE',
        operatorId: operator.id
      }
    });
    
    console.log('✅ Created:', home.name);
  }
  
  console.log('🎉 Done! Created 6 sample homes.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
