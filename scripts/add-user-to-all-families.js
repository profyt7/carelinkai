/**
 * Add User to All Families Script
 * 
 * This script ensures a user is an active member in all families in the system.
 * Useful for testing mentions across different family contexts.
 * 
 * Usage:
 *   USER_ID=user_id_here node scripts/add-user-to-all-families.js
 */

const { PrismaClient, FamilyMemberRole, FamilyMemberStatus } = require('@prisma/client');

async function addUserToAllFamilies() {
  const userId = process.env.USER_ID;
  
  if (!userId) {
    console.error('Error: USER_ID environment variable is required');
    console.error('Usage: USER_ID=user_id_here node scripts/add-user-to-all-families.js');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const added = [];
  const already = [];
  
  try {
    console.log(`Adding user ${userId} to all families...`);
    
    // Get all families
    const families = await prisma.family.findMany({
      select: { id: true }
    });
    
    console.log(`Found ${families.length} families`);
    
    // Process each family
    for (const family of families) {
      // Check if user is already a member
      const existingMembership = await prisma.familyMember.findUnique({
        where: {
          familyId_userId: {
            familyId: family.id,
            userId
          }
        }
      });
      
      if (existingMembership) {
        already.push(family.id);
        continue;
      }
      
      // Add user to the family
      await prisma.familyMember.create({
        data: {
          familyId: family.id,
          userId,
          role: FamilyMemberRole.MEMBER,
          status: FamilyMemberStatus.ACTIVE,
          joinedAt: new Date()
        }
      });
      
      added.push(family.id);
    }
    
    // Log summary
    const summary = {
      ok: true,
      userId,
      added,
      already
    };
    
    console.log(JSON.stringify(summary, null, 2));
    
    return summary;
  } catch (error) {
    console.error('Error adding user to families:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
addUserToAllFamilies().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
