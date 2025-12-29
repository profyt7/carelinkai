const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkMigrations() {
  try {
    console.log('🔍 Checking database migration history...\n');
    
    // Check migration history
    const migrations = await prisma.$queryRaw`
      SELECT 
        migration_name,
        finished_at,
        started_at,
        applied_steps_count,
        logs,
        rolled_back_at,
        CASE 
          WHEN rolled_back_at IS NOT NULL THEN 'ROLLED_BACK'
          WHEN finished_at IS NULL THEN 'FAILED'
          WHEN logs IS NOT NULL THEN 'FAILED'
          ELSE 'SUCCESS'
        END as status
      FROM "_prisma_migrations"
      ORDER BY started_at DESC
      LIMIT 20;
    `;
    
    console.log('Recent migration history:\n');
    migrations.forEach(m => {
      const statusEmoji = m.status === 'SUCCESS' ? '✅' : 
                          m.status === 'ROLLED_BACK' ? '⏪' : '❌';
      console.log(`${statusEmoji} ${m.migration_name}`);
      console.log(`   Status: ${m.status}`);
      console.log(`   Started: ${m.started_at}`);
      console.log(`   Finished: ${m.finished_at || 'NULL'}`);
      console.log(`   Rolled back: ${m.rolled_back_at || 'NULL'}`);
      if (m.logs) {
        console.log(`   Logs: ${m.logs.substring(0, 200)}...`);
      }
      console.log('');
    });
    
    // Check for DocumentType enum
    console.log('\n🔍 Checking DocumentType enum in database...\n');
    const enumCheck = await prisma.$queryRaw`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'DocumentType'
      ORDER BY e.enumsortorder;
    `;
    
    if (enumCheck.length > 0) {
      console.log('✅ DocumentType enum EXISTS in database');
      console.log('Values:');
      enumCheck.forEach(row => {
        console.log(`  - ${row.enum_value}`);
      });
    } else {
      console.log('❌ DocumentType enum does NOT exist in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking migrations:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrations();
