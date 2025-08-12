/**
 * Database Connection Test for CareLinkAI
 * 
 * This script tests connectivity to the database and displays basic stats.
 * Run with: node test-connection.js
 */

const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    // Test user count
    const userCount = await prisma.user.count();
    console.log('✅ Database connection successful!');
    console.log(`📊 Total users in database: ${userCount}`);
    
    // Get user counts by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true
      }
    });
    
    console.log('\n📋 Users by role:');
    usersByRole.forEach(role => {
      console.log(`   ${role.role}: ${role._count.id}`);
    });
    
    // Get user counts by status
    const usersByStatus = await prisma.user.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });
    
    console.log('\n📋 Users by status:');
    usersByStatus.forEach(status => {
      console.log(`   ${status.status}: ${status._count.id}`);
    });
    
    // Check if tables exist by counting records
    const tables = [
      { name: 'User', query: () => prisma.user.count() },
      { name: 'Family', query: () => prisma.family.count() },
      { name: 'Operator', query: () => prisma.operator.count() },
      { name: 'Caregiver', query: () => prisma.caregiver.count() },
      { name: 'Affiliate', query: () => prisma.affiliate.count() },
      { name: 'Address', query: () => prisma.address.count() },
      { name: 'AuditLog', query: () => prisma.auditLog.count() }
    ];
    
    console.log('\n📋 Database tables:');
    for (const table of tables) {
      try {
        const count = await table.query();
        console.log(`   ${table.name}: ${count} records`);
      } catch (err) {
        console.log(`   ${table.name}: ❌ Error: ${err.message}`);
      }
    }
    
    // Database connection info
    console.log('\n🔍 Database connection info:');
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:secure_password_change_me@localhost:5433/carelinkai';
    // Hide password in output
    const sanitizedUrl = databaseUrl.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`   URL: ${sanitizedUrl}`);
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'P1001') {
      console.error('\n🔍 Troubleshooting tips:');
      console.error('1. Make sure your database server is running');
      console.error('   - Check Docker: docker ps | findstr postgres');
      console.error('2. Check your DATABASE_URL in .env file');
      console.error('3. Verify network connectivity to the database server');
      console.error('4. Ensure PostgreSQL is running on port 5433');
    }
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseConnection();
