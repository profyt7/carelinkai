const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('=== DATABASE STATE CHECK ===\n');

  // 1. Check migration status
  try {
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, logs 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 5
    `;
    console.log('📋 Recent migrations:');
    migrations.forEach(m => {
      console.log(`  - ${m.migration_name} (${m.finished_at ? '✅' : '❌'})`);
    });
  } catch (e) {
    console.log('⚠️ Could not check migrations:', e.message);
  }

  // 2. Check ImpersonationSession table
  try {
    const count = await prisma.impersonationSession.count();
    console.log(`\n✅ ImpersonationSession table exists (${count} sessions)`);
  } catch (e) {
    console.log('\n❌ ImpersonationSession table missing:', e.message);
  }

  // 3. Count users by role
  const userCount = await prisma.user.count();
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: true
  });
  
  console.log(`\n👥 Total users: ${userCount}`);
  usersByRole.forEach(r => {
    console.log(`  - ${r.role}: ${r._count}`);
  });

  // 4. Seed users if needed
  const nonAdminUsers = await prisma.user.count({
    where: { role: { not: 'ADMIN' } }
  });

  if (nonAdminUsers === 0) {
    console.log('\n🌱 No non-admin users found. Seeding test users...\n');
    
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);

    // Create FAMILY users
    const family1 = await prisma.user.create({
      data: {
        email: 'family1@test.com',
        password: hashedPassword,
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'FAMILY',
        status: 'ACTIVE',
        phone: '555-0101'
      }
    });
    console.log(`✅ Created FAMILY user: ${family1.email}`);

    const family2 = await prisma.user.create({
      data: {
        email: 'family2@test.com',
        password: hashedPassword,
        firstName: 'Michael',
        lastName: 'Chen',
        role: 'FAMILY',
        status: 'ACTIVE',
        phone: '555-0102'
      }
    });
    console.log(`✅ Created FAMILY user: ${family2.email}`);

    const family3 = await prisma.user.create({
      data: {
        email: 'family3@test.com',
        password: hashedPassword,
        firstName: 'Emily',
        lastName: 'Rodriguez',
        role: 'FAMILY',
        status: 'ACTIVE',
        phone: '555-0103'
      }
    });
    console.log(`✅ Created FAMILY user: ${family3.email}`);

    // Create OPERATOR users
    const operator1 = await prisma.user.create({
      data: {
        email: 'operator1@test.com',
        password: hashedPassword,
        firstName: 'David',
        lastName: 'Williams',
        role: 'OPERATOR',
        status: 'ACTIVE',
        phone: '555-0201'
      }
    });
    console.log(`✅ Created OPERATOR user: ${operator1.email}`);

    const operator2 = await prisma.user.create({
      data: {
        email: 'operator2@test.com',
        password: hashedPassword,
        firstName: 'Lisa',
        lastName: 'Martinez',
        role: 'OPERATOR',
        status: 'ACTIVE',
        phone: '555-0202'
      }
    });
    console.log(`✅ Created OPERATOR user: ${operator2.email}`);

    console.log('\n🎉 Seeding complete!');
  } else {
    console.log(`\n✅ Found ${nonAdminUsers} non-admin users - no seeding needed`);
  }

  // 5. Final verification
  console.log('\n=== FINAL USER COUNT ===');
  const finalUsers = await prisma.user.findMany({
    select: { email: true, role: true, status: true, firstName: true, lastName: true }
  });
  
  finalUsers.forEach(u => {
    console.log(`  ${u.role.padEnd(10)} | ${u.status.padEnd(10)} | ${u.firstName} ${u.lastName} (${u.email})`);
  });

  console.log('\n✅ Database check complete\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
