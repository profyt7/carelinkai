/**
 * Demo Data Seed Script for Caregivers Module
 * Adds certifications, assignments, and documents to existing demo caregivers
 * 
 * Run with: npx tsx prisma/seed-caregivers-demo-data.ts
 */

import { PrismaClient, CertificationType, CertificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting caregiver demo data seeding...\n');

  // Get all caregivers
  const caregivers = await prisma.caregiver.findMany({
    include: {
      user: true,
      employments: {
        where: { isActive: true },
        include: {
          operator: true
        }
      }
    }
  });

  if (caregivers.length === 0) {
    console.log('⚠️  No caregivers found. Please run the main seed script first.');
    return;
  }

  console.log(`📋 Found ${caregivers.length} caregivers\n`);

  // Get all residents for assignments
  const residents = await prisma.resident.findMany({
    include: {
      user: true
    }
  });

  console.log(`👥 Found ${residents.length} residents\n`);

  // Get admin user for assignments
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminUser) {
    console.log('⚠️  No admin user found for assignment tracking');
  }

  let certCount = 0;
  let assignmentCount = 0;
  let documentCount = 0;

  // Process each caregiver
  for (const caregiver of caregivers) {
    console.log(`\n👨‍⚕️ Processing ${caregiver.user.firstName} ${caregiver.user.lastName}...`);

    // ============ ADD CERTIFICATIONS ============
    console.log('  📜 Adding certifications...');

    // Check for existing certifications
    const existingCerts = await prisma.caregiverCertification.findMany({
      where: { caregiverId: caregiver.id }
    });

    if (existingCerts.length > 0) {
      console.log(`    ℹ️  Already has ${existingCerts.length} certifications, skipping...`);
    } else {
      // Create 3-5 certifications per caregiver
      const certTypes = [
        CertificationType.CNA,
        CertificationType.LPN,
        CertificationType.RN,
        CertificationType.CPR_FIRST_AID,
        CertificationType.MEDICATION_ADMIN,
        CertificationType.DEMENTIA_CARE,
        CertificationType.ALZHEIMERS_CARE,
        CertificationType.HOSPICE_CARE,
      ];

      // Select 3-4 random certification types
      const numCerts = Math.floor(Math.random() * 2) + 3;
      const selectedTypes = certTypes.sort(() => 0.5 - Math.random()).slice(0, numCerts);

      for (let i = 0; i < selectedTypes.length; i++) {
        const certType = selectedTypes[i];
        const isExpired = Math.random() < 0.1; // 10% chance of expired
        const isExpiringSoon = !isExpired && Math.random() < 0.2; // 20% chance of expiring soon

        let expiryDate: Date;
        let status: CertificationStatus;

        if (isExpired) {
          // Expired 1-6 months ago
          expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() - Math.floor(Math.random() * 6) - 1);
          status = CertificationStatus.EXPIRED;
        } else if (isExpiringSoon) {
          // Expiring in next 1-30 days
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + Math.floor(Math.random() * 30) + 1);
          status = CertificationStatus.PENDING_RENEWAL;
        } else {
          // Active, expires in 6-24 months
          expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + Math.floor(Math.random() * 18) + 6);
          status = CertificationStatus.ACTIVE;
        }

        const issueDate = new Date(expiryDate);
        issueDate.setFullYear(issueDate.getFullYear() - Math.floor(Math.random() * 3) - 1);

        await prisma.caregiverCertification.create({
          data: {
            caregiverId: caregiver.id,
            certificationType: certType,
            certificationNumber: `CERT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
            issuedBy: getIssuingOrganization(certType),
            issuedDate: issueDate,
            expiryDate: expiryDate,
            status: status,
            documentUrl: `https://example.com/certs/${caregiver.id}/${certType.toLowerCase()}.pdf`,
            verifiedBy: adminUser?.id,
            verifiedAt: new Date(),
            notes: status === CertificationStatus.EXPIRED 
              ? 'Renewal required' 
              : status === CertificationStatus.PENDING_RENEWAL 
              ? 'Reminder sent to renew' 
              : null,
          }
        });

        certCount++;
      }

      console.log(`    ✅ Added ${selectedTypes.length} certifications`);
    }

    // ============ ADD RESIDENT ASSIGNMENTS ============
    console.log('  🔗 Adding resident assignments...');

    // Check for existing assignments
    const existingAssignments = await prisma.caregiverAssignment.findMany({
      where: { 
        caregiverId: caregiver.id,
        endDate: null 
      }
    });

    if (existingAssignments.length > 0) {
      console.log(`    ℹ️  Already has ${existingAssignments.length} assignments, skipping...`);
    } else {
      // Assign to 2-4 residents
      const numAssignments = Math.min(Math.floor(Math.random() * 3) + 2, residents.length);
      const selectedResidents = residents.sort(() => 0.5 - Math.random()).slice(0, numAssignments);

      for (let i = 0; i < selectedResidents.length; i++) {
        const resident = selectedResidents[i];
        const isPrimary = i === 0; // First assignment is primary

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6));

        await prisma.caregiverAssignment.create({
          data: {
            caregiverId: caregiver.id,
            residentId: resident.id,
            isPrimary: isPrimary,
            startDate: startDate,
            assignedBy: adminUser?.id || caregiver.userId,
            notes: isPrimary 
              ? 'Primary caregiver responsible for daily care plan' 
              : 'Secondary caregiver providing additional support',
          }
        });

        assignmentCount++;
      }

      console.log(`    ✅ Added ${numAssignments} assignments`);
    }

    // ============ ADD DOCUMENTS ============
    console.log('  📄 Adding documents...');

    // Check for existing documents
    const existingDocs = await prisma.document.findMany({
      where: {
        entityType: 'CAREGIVER',
        entityId: caregiver.id
      }
    });

    if (existingDocs.length > 0) {
      console.log(`    ℹ️  Already has ${existingDocs.length} documents, skipping...`);
    } else {
      // Add 2-4 documents
      const documentCategories = [
        { category: 'Employment Contract', title: 'Employment Agreement', fileType: 'application/pdf' },
        { category: 'Background Check', title: 'Background Verification Report', fileType: 'application/pdf' },
        { category: 'Training Records', title: 'Annual Training Completion Certificate', fileType: 'application/pdf' },
        { category: 'References', title: 'Professional References', fileType: 'application/pdf' },
        { category: 'Other', title: 'Emergency Contact Information', fileType: 'application/pdf' },
      ];

      const numDocs = Math.floor(Math.random() * 3) + 2;
      const selectedDocs = documentCategories.sort(() => 0.5 - Math.random()).slice(0, numDocs);

      for (const doc of selectedDocs) {
        const createdDate = new Date();
        createdDate.setMonth(createdDate.getMonth() - Math.floor(Math.random() * 12));

        const hasExpiry = doc.category === 'Background Check';
        let expiryDate: Date | null = null;
        if (hasExpiry) {
          expiryDate = new Date(createdDate);
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        await prisma.document.create({
          data: {
            title: doc.title,
            description: `${doc.category} for ${caregiver.user.firstName} ${caregiver.user.lastName}`,
            fileUrl: `https://example.com/documents/${caregiver.id}/${doc.title.replace(/\s+/g, '-').toLowerCase()}.pdf`,
            fileType: doc.fileType,
            fileSize: Math.floor(Math.random() * 2000000) + 500000, // 500KB - 2.5MB
            category: doc.category,
            expiryDate: expiryDate,
            status: 'ACTIVE',
            entityType: 'CAREGIVER',
            entityId: caregiver.id,
            uploadedBy: adminUser?.id || caregiver.userId,
            createdAt: createdDate,
          }
        });

        documentCount++;
      }

      console.log(`    ✅ Added ${numDocs} documents`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Demo data seeding completed!');
  console.log('='.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   - Certifications: ${certCount}`);
  console.log(`   - Assignments: ${assignmentCount}`);
  console.log(`   - Documents: ${documentCount}`);
  console.log('='.repeat(60) + '\n');
}

function getIssuingOrganization(certType: CertificationType): string {
  const orgs: Record<string, string> = {
    [CertificationType.CNA]: 'National Nurse Aide Assessment Program',
    [CertificationType.LPN]: 'State Board of Nursing',
    [CertificationType.RN]: 'State Board of Nursing',
    [CertificationType.CPR_FIRST_AID]: 'American Heart Association',
    [CertificationType.MEDICATION_ADMIN]: 'State Department of Health',
    [CertificationType.DEMENTIA_CARE]: 'Alzheimer\'s Association',
    [CertificationType.ALZHEIMERS_CARE]: 'Alzheimer\'s Association',
    [CertificationType.HOSPICE_CARE]: 'National Hospice and Palliative Care Organization',
    [CertificationType.WOUND_CARE]: 'Wound Care Education Institute',
    [CertificationType.INFECTION_CONTROL]: 'Centers for Disease Control and Prevention',
    [CertificationType.FALL_PREVENTION]: 'National Council on Aging',
    [CertificationType.NUTRITION]: 'Academy of Nutrition and Dietetics',
    [CertificationType.DIABETES_CARE]: 'American Diabetes Association',
    [CertificationType.OTHER]: 'Professional Certification Board',
  };
  
  return orgs[certType] || 'Professional Certification Board';
}

main()
  .catch((e) => {
    console.error('\n❌ Error seeding demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
