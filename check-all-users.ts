import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllUsers() {
  try {
    console.log('🔍 Checking all users in database...\n');
    
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`📊 Total Users: ${users.length}\n`);
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    // Count by role
    const roleCounts = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true,
      },
    });
    
    console.log('\n📈 Users by Role:');
    roleCounts.forEach(rc => {
      console.log(`   ${rc.role}: ${rc._count.role}`);
    });
    
    // Count verified emails
    const verifiedCount = users.filter(u => u.emailVerified).length;
    const unverifiedCount = users.length - verifiedCount;
    
    console.log('\n📧 Email Verification Status:');
    console.log(`   ✅ Verified: ${verifiedCount}`);
    console.log(`   ❌ Unverified: ${unverifiedCount}`);
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllUsers();
