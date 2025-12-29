const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function verifyMigrations() {
  try {
    const failedMigrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, logs
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL
      ORDER BY started_at DESC
    `;
    
    console.log('=== FAILED MIGRATIONS CHECK ===');
    if (failedMigrations.length > 0) {
      console.log(`Found ${failedMigrations.length} failed migrations:`);
      failedMigrations.forEach((m, i) => {
        console.log(`\n${i+1}. ${m.migration_name}`);
        console.log(`   Status: NOT FINISHED`);
      });
    } else {
      console.log('✅ No failed migrations found!');
      console.log('✅ Database migration state is clean!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigrations();
