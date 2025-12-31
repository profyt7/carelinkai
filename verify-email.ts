import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyEmail() {
  try {
    console.log('🔍 Connecting to database...');
    
    // Update emailVerified for the test account
    const result = await prisma.user.update({
      where: {
        email: 'discharge.planner@carelinkai.com',
      },
      data: {
        emailVerified: new Date(),
      },
    });
    
    console.log('✅ Email verified successfully!');
    console.log('\n📋 Updated User Record:');
    console.log('ID:', result.id);
    console.log('Email:', result.email);
    console.log('Email Verified:', result.emailVerified);
    console.log('Role:', result.role);
    console.log('Created At:', result.createdAt);
    
    // Query to verify the update
    const user = await prisma.user.findUnique({
      where: {
        email: 'discharge.planner@carelinkai.com',
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true,
      },
    });
    
    console.log('\n✅ Verification Query Result:');
    console.log(JSON.stringify(user, null, 2));
    
  } catch (error) {
    console.error('❌ Error verifying email:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyEmail();
