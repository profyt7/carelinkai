/**
 * Join Admin to Family Script
 * 
 * This script adds the admin user to the first available family with OWNER role.
 * It's useful for testing the family portal features with the admin account.
 */

const { PrismaClient, FamilyMemberRole, FamilyMemberStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Find admin user
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@carelinkai.com' },
      select: { id: true }
    });

    if (!adminUser) {
      console.error('Admin user not found. Please ensure admin@carelinkai.com exists.');
      process.exit(1);
    }

    // Find first family
    const family = await prisma.family.findFirst({
      select: { id: true }
    });

    if (!family) {
      console.error('No family found in database. Please seed the database first.');
      process.exit(1);
    }

    // Upsert family member record
    const result = await prisma.familyMember.upsert({
      where: {
        familyId_userId: {
          familyId: family.id,
          userId: adminUser.id
        }
      },
      update: {
        role: FamilyMemberRole.OWNER,
        status: FamilyMemberStatus.ACTIVE,
        joinedAt: new Date()
      },
      create: {
        familyId: family.id,
        userId: adminUser.id,
        role: FamilyMemberRole.OWNER,
        status: FamilyMemberStatus.ACTIVE,
        joinedAt: new Date()
      }
    });

    console.log(`linked:${family.id}:${adminUser.id}`);
    
  } catch (error) {
    console.error('Error linking admin to family:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
