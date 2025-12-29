const { PrismaClient } = require('@prisma/client');

async function checkEnum() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking DocumentType enum values...\n');
    
    const result = await prisma.$queryRaw`
      SELECT e.enumlabel as value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'DocumentType'
      ORDER BY e.enumsortorder;
    `;
    
    console.log('✅ Current DocumentType values:');
    result.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.value}`);
    });
    
    console.log(`\n📊 Total: ${result.length} values\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnum();
