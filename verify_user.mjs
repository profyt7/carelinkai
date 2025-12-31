import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://carelinkai_user:carelinkai_secure_pass_2024@dpg-ctqvvn08fa8c73a5rvog-a.oregon-postgres.render.com/carelinkai_db?sslmode=require'
});

async function main() {
  try {
    console.log('Checking user...');
    const user = await prisma.user.findUnique({
      where: { email: 'discharge.planner@carelinkai.com' }
    });

    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log('Current user:', {
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role
    });

    if (!user.emailVerified || user.role !== 'DISCHARGE_PLANNER') {
      console.log('\nUpdating user...');
      const updated = await prisma.user.update({
        where: { email: 'discharge.planner@carelinkai.com' },
        data: {
          emailVerified: new Date(),
          role: 'DISCHARGE_PLANNER'
        }
      });

      console.log('Updated user:', {
        email: updated.email,
        emailVerified: updated.emailVerified,
        role: updated.role
      });
    } else {
      console.log('\nUser already verified and has correct role!');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
