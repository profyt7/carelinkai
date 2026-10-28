const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function investigateDatabase() {
  try {
    console.log('🔍 INVESTIGATING PRODUCTION DATABASE\n');
    console.log('='.repeat(80) + '\n');
    
    // 1. Check all migrations
    console.log('📋 MIGRATION HISTORY:\n');
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
          WHEN logs IS NOT NULL AND logs != '' THEN 'FAILED_WITH_LOGS'
          ELSE 'SUCCESS'
        END as status
      FROM "_prisma_migrations"
      ORDER BY started_at DESC;
    `;
    
    console.log(`Total migrations: ${migrations.length}\n`);
    
    let successCount = 0;
    let failedCount = 0;
    let rolledBackCount = 0;
    
    migrations.forEach((m, idx) => {
      const statusIcon = m.status === 'SUCCESS' ? '✅' : 
                        m.status === 'ROLLED_BACK' ? '🔄' : '❌';
      console.log(`${statusIcon} [${idx + 1}] ${m.migration_name}`);
      console.log(`   Status: ${m.status}`);
      console.log(`   Started: ${m.started_at}`);
      console.log(`   Finished: ${m.finished_at || 'NULL'}`);
      console.log(`   Rolled Back: ${m.rolled_back_at || 'NULL'}`);
      if (m.logs) {
        console.log(`   Logs: ${m.logs.substring(0, 100)}...`);
      }
      console.log('');
      
      if (m.status === 'SUCCESS') successCount++;
      else if (m.status === 'ROLLED_BACK') rolledBackCount++;
      else failedCount++;
    });
    
    console.log('='.repeat(80) + '\n');
    console.log('📊 MIGRATION SUMMARY:\n');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`   🔄 Rolled Back: ${rolledBackCount}`);
    console.log(`   📦 Total: ${migrations.length}\n`);
    
    // 2. Check DocumentType enum
    console.log('='.repeat(80) + '\n');
    console.log('🔍 CHECKING DocumentType ENUM:\n');
    
    const enumCheck = await prisma.$queryRaw`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value,
        e.enumsortorder as sort_order
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'DocumentType'
      ORDER BY e.enumsortorder;
    `;
    
    if (enumCheck.length > 0) {
      console.log('✅ DocumentType enum EXISTS in database\n');
      console.log('Values:');
      enumCheck.forEach(row => {
        console.log(`   ${row.sort_order}. ${row.enum_value}`);
      });
    } else {
      console.log('❌ DocumentType enum does NOT exist in database');
    }
    
    // 3. Check Document table columns
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('🔍 CHECKING Document TABLE COLUMNS:\n');
    
    const columns = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'Document'
      AND column_name IN (
        'documentType',
        'autoClassified',
        'classificationConfidence',
        'classificationReasoning',
        'reviewStatus',
        'reviewedAt',
        'reviewedBy',
        'validationErrors',
        'validationStatus'
      )
      ORDER BY column_name;
    `;
    
    console.log(`Found ${columns.length} Phase 3 columns:\n`);
    columns.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });
    
    if (columns.length === 0) {
      console.log('   ⚠️  No Phase 3 columns found!');
    }
    
    // 4. Identify problematic migrations
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('🚨 PROBLEMATIC MIGRATIONS:\n');
    
    const problematic = migrations.filter(m => 
      m.status === 'FAILED' || m.status === 'FAILED_WITH_LOGS'
    );
    
    if (problematic.length > 0) {
      console.log(`Found ${problematic.length} failed migrations:\n`);
      problematic.forEach((m, idx) => {
        console.log(`❌ [${idx + 1}] ${m.migration_name}`);
        console.log(`   Started: ${m.started_at}`);
        console.log(`   Finished: ${m.finished_at || 'NULL'}`);
        if (m.logs) {
          console.log(`   Error: ${m.logs.substring(0, 200)}`);
        }
        console.log('');
      });
    } else {
      console.log('✅ No failed migrations found!');
    }
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('❌ Error investigating database:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateDatabase();
