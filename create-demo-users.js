const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoUsers() {
  try {
    const password = await bcrypt.hash('DemoUser123!', 10);
    
    // Create demo admin
    const admin = await prisma.user.upsert({
      where: { email: 'demo.admin@carelinkai.test' },
      update: { status: 'ACTIVE' },
      create: {
        email: 'demo.admin@carelinkai.test',
        passwordHash: password,
        firstName: 'Demo',
        lastName: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
    console.log('✅ Created/Updated admin:', admin.email);
    
    // Create demo operator
    const operator = await prisma.user.upsert({
      where: { email: 'demo.operator@carelinkai.test' },
      update: { status: 'ACTIVE' },
      create: {
        email: 'demo.operator@carelinkai.test',
        passwordHash: password,
        firstName: 'Demo',
        lastName: 'Operator',
        role: 'OPERATOR',
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
    console.log('✅ Created/Updated operator:', operator.email);
    
    // Create demo caregiver/aide
    const caregiver = await prisma.user.upsert({
      where: { email: 'demo.aide@carelinkai.test' },
      update: { status: 'ACTIVE' },
      create: {
        email: 'demo.aide@carelinkai.test',
        passwordHash: password,
        firstName: 'Demo',
        lastName: 'Aide',
        role: 'CAREGIVER',
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
    console.log('✅ Created/Updated caregiver:', caregiver.email);
    
    // Create demo family
    const family = await prisma.user.upsert({
      where: { email: 'demo.family@carelinkai.test' },
      update: { status: 'ACTIVE' },
      create: {
        email: 'demo.family@carelinkai.test',
        passwordHash: password,
        firstName: 'Demo',
        lastName: 'Family',
        role: 'FAMILY',
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
    console.log('✅ Created/Updated family:', family.email);
    
    console.log('\n✅ All demo users created successfully!');
  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUsers();
