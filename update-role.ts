import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateRole() {
  try {
    console.log('🔍 Updating user role to DISCHARGE_PLANNER...');
    
    // Update role for the test account
    const result = await prisma.user.update({
      where: {
        email: 'discharge.planner@carelinkai.com',
      },
      data: {
        role: 'DISCHARGE_PLANNER',
      },
    });
    
    console.log('✅ Role updated successfully!');
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
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });
    
    console.log('\n✅ Final Verification:');
    console.log(JSON.stringify(user, null, 2));
    
  } catch (error) {
    console.error('❌ Error updating role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateRole();
