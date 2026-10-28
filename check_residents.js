const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function checkResidents() {
  try {
    console.log('📊 Fetching all residents...\n');
    
    const residents = await prisma.resident.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        status: true,
        medicalConditions: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Total Residents: ${residents.length}\n`);
    console.log('='.repeat(80));
    
    residents.forEach((resident, index) => {
      console.log(`\n${index + 1}. Resident ID: ${resident.id}`);
      console.log(`   First Name: ${resident.firstName || '❌ NULL/UNDEFINED'}`);
      console.log(`   Last Name: ${resident.lastName || '❌ NULL/UNDEFINED'}`);
      console.log(`   DOB: ${resident.dateOfBirth || '❌ NULL/UNDEFINED'}`);
      console.log(`   Gender: ${resident.gender || '❌ NULL/UNDEFINED'}`);
      console.log(`   Status: ${resident.status || '❌ NULL/UNDEFINED'}`);
      console.log(`   Medical Conditions: ${resident.medicalConditions || 'N/A'}`);
      
      // Check for issues
      const issues = [];
      if (!resident.firstName) issues.push('Missing firstName');
      if (!resident.lastName) issues.push('Missing lastName');
      if (!resident.dateOfBirth) issues.push('Missing dateOfBirth');
      if (!resident.gender) issues.push('Missing gender');
      
      if (issues.length > 0) {
        console.log(`   ⚠️  ISSUES: ${issues.join(', ')}`);
      } else {
        console.log(`   ✅ All required fields present`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:');
    
    const withFirstName = residents.filter(r => r.firstName).length;
    const withLastName = residents.filter(r => r.lastName).length;
    const withDOB = residents.filter(r => r.dateOfBirth).length;
    const withGender = residents.filter(r => r.gender).length;
    
    console.log(`Residents with firstName: ${withFirstName}/${residents.length}`);
    console.log(`Residents with lastName: ${withLastName}/${residents.length}`);
    console.log(`Residents with DOB: ${withDOB}/${residents.length}`);
    console.log(`Residents with gender: ${withGender}/${residents.length}`);
    
    const complete = residents.filter(r => 
      r.firstName && r.lastName && r.dateOfBirth && r.gender
    ).length;
    
    console.log(`\nComplete residents: ${complete}/${residents.length}`);
    console.log(`Incomplete residents: ${residents.length - complete}/${residents.length}`);
    
  } catch (error) {
    console.error('❌ Error checking residents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkResidents();
