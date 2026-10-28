/**
 * Demo Data Seed Script for Caregivers Module
 * Adds comprehensive, realistic certifications, assignments, and documents to demo caregivers
 * 
 * Run with: npm run seed:caregivers
 * or: npx tsx prisma/seed-caregiver-demo-data.ts
 */

import { PrismaClient, CertificationType, CertificationStatus, CaregiverDocumentType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive caregiver demo data seeding...\n');

  // Get all caregivers
  const caregivers = await prisma.caregiver.findMany({
    include: {
      user: true,
    }
  });

  if (caregivers.length === 0) {
    console.log('⚠️  No caregivers found. Please run the main seed script first.');
    return;
  }

  console.log(`📋 Found ${caregivers.length} caregivers\n`);

  // Get all residents for assignments
  const residents = await prisma.resident.findMany({
    where: {
      status: 'ACTIVE',
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    }
  });

  console.log(`👥 Found ${residents.length} active residents\n`);

  // Get admin user for assignment tracking
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  if (!adminUser) {
    console.log('⚠️  No admin user found for assignment tracking');
  }

  let certCount = 0;
  let assignmentCount = 0;
  let documentCount = 0;

  // Process each caregiver with varied data
  for (let i = 0; i < caregivers.length; i++) {
    const caregiver = caregivers[i];
    console.log(`\n👨‍⚕️ Processing ${caregiver.user.firstName} ${caregiver.user.lastName}...`);

    // ============ ADD CERTIFICATIONS ============
    console.log('  📜 Adding certifications...');

    // Clear existing certifications (idempotency)
    await prisma.caregiverCertification.deleteMany({
      where: { caregiverId: caregiver.id }
    });

    // Create varied certifications based on caregiver index
    const certifications = getCertificationsForCaregiver(i, caregiver.id, adminUser?.id);
    
    for (const cert of certifications) {
      await prisma.caregiverCertification.create({
        data: cert
      });
      certCount++;
    }

    console.log(`    ✅ Added ${certifications.length} certifications`);

    // ============ ADD RESIDENT ASSIGNMENTS ============
    console.log('  🔗 Adding resident assignments...');

    // Clear existing assignments (idempotency)
    await prisma.caregiverAssignment.deleteMany({
      where: { caregiverId: caregiver.id }
    });

    if (residents.length > 0) {
      const assignments = getAssignmentsForCaregiver(i, caregiver.id, caregiver.userId, residents, adminUser?.id);
      
      for (const assignment of assignments) {
        await prisma.caregiverAssignment.create({
          data: assignment
        });
        assignmentCount++;
      }

      console.log(`    ✅ Added ${assignments.length} assignments`);
    } else {
      console.log(`    ⚠️  No residents available for assignments`);
    }

    // ============ ADD DOCUMENTS ============
    console.log('  📄 Adding documents...');

    // Clear existing documents (idempotency)
    await prisma.caregiverDocument.deleteMany({
      where: { caregiverId: caregiver.id }
    });

    const documents = getDocumentsForCaregiver(i, caregiver.id, caregiver.user, adminUser?.id || caregiver.userId);
    
    for (const doc of documents) {
      await prisma.caregiverDocument.create({
        data: doc
      });
      documentCount++;
    }

    console.log(`    ✅ Added ${documents.length} documents`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Demo data seeding completed successfully!');
  console.log('='.repeat(60));
  console.log(`📊 Summary:`);
  console.log(`   - Caregivers processed: ${caregivers.length}`);
  console.log(`   - Certifications added: ${certCount}`);
  console.log(`   - Assignments added: ${assignmentCount}`);
  console.log(`   - Documents added: ${documentCount}`);
  console.log(`   - Total records: ${certCount + assignmentCount + documentCount}`);
  console.log('='.repeat(60) + '\n');
}

// ========== CERTIFICATION GENERATION ==========

function getCertificationsForCaregiver(
  index: number, 
  caregiverId: string, 
  adminUserId?: string
): any[] {
  const now = new Date();
  const certifications: any[] = [];

  // Different certification profiles based on index (varied across caregivers)
  const certProfiles = [
    // Profile 0: Senior CNA with many certs, all current
    [
      { type: CertificationType.CNA, monthsOld: 18, monthsValid: 24, status: CertificationStatus.CURRENT },
      { type: CertificationType.CPR, monthsOld: 6, monthsValid: 12, status: CertificationStatus.CURRENT },
      { type: CertificationType.FIRST_AID, monthsOld: 6, monthsValid: 12, status: CertificationStatus.CURRENT },
      { type: CertificationType.DEMENTIA_CARE, monthsOld: 12, monthsValid: 36, status: CertificationStatus.CURRENT },
      { type: CertificationType.MEDICATION_ADMINISTRATION, monthsOld: 24, monthsValid: 36, status: CertificationStatus.CURRENT },
    ],
    
    // Profile 1: HHA with some expiring soon
    [
      { type: CertificationType.HHA, monthsOld: 22, monthsValid: 24, status: CertificationStatus.EXPIRING_SOON },
      { type: CertificationType.CPR, monthsOld: 11, monthsValid: 12, status: CertificationStatus.EXPIRING_SOON },
      { type: CertificationType.ALZHEIMERS_CARE, monthsOld: 18, monthsValid: 36, status: CertificationStatus.CURRENT },
    ],
    
    // Profile 2: Newer caregiver with some expired
    [
      { type: CertificationType.CNA, monthsOld: 6, monthsValid: 24, status: CertificationStatus.CURRENT },
      { type: CertificationType.CPR, monthsOld: 14, monthsValid: 12, status: CertificationStatus.EXPIRED },
      { type: CertificationType.FIRST_AID, monthsOld: 8, monthsValid: 12, status: CertificationStatus.CURRENT },
    ],
    
    // Profile 3: Experienced with hospice care
    [
      { type: CertificationType.CNA, monthsOld: 30, monthsValid: 36, status: CertificationStatus.CURRENT },
      { type: CertificationType.HOSPICE_CARE, monthsOld: 12, monthsValid: 24, status: CertificationStatus.CURRENT },
      { type: CertificationType.CPR, monthsOld: 4, monthsValid: 12, status: CertificationStatus.CURRENT },
      { type: CertificationType.WOUND_CARE, monthsOld: 18, monthsValid: 24, status: CertificationStatus.CURRENT },
    ],
    
    // Profile 4: Specialized in dementia care
    [
      { type: CertificationType.HHA, monthsOld: 16, monthsValid: 24, status: CertificationStatus.CURRENT },
      { type: CertificationType.DEMENTIA_CARE, monthsOld: 10, monthsValid: 36, status: CertificationStatus.CURRENT },
      { type: CertificationType.ALZHEIMERS_CARE, monthsOld: 8, monthsValid: 36, status: CertificationStatus.CURRENT },
      { type: CertificationType.CPR, monthsOld: 11, monthsValid: 12, status: CertificationStatus.EXPIRING_SOON },
    ],
    
    // Profile 5: IV therapy specialist
    [
      { type: CertificationType.CNA, monthsOld: 24, monthsValid: 36, status: CertificationStatus.CURRENT },
      { type: CertificationType.IV_THERAPY, monthsOld: 10, monthsValid: 24, status: CertificationStatus.CURRENT },
      { type: CertificationType.CPR, monthsOld: 3, monthsValid: 12, status: CertificationStatus.CURRENT },
      { type: CertificationType.MEDICATION_ADMINISTRATION, monthsOld: 20, monthsValid: 36, status: CertificationStatus.CURRENT },
    ],
    
    // Profile 6: Mixed status certifications
    [
      { type: CertificationType.CNA, monthsOld: 20, monthsValid: 24, status: CertificationStatus.CURRENT },
      { type: CertificationType.CPR, monthsOld: 13, monthsValid: 12, status: CertificationStatus.EXPIRED },
      { type: CertificationType.FIRST_AID, monthsOld: 11, monthsValid: 12, status: CertificationStatus.EXPIRING_SOON },
      { type: CertificationType.DEMENTIA_CARE, monthsOld: 6, monthsValid: 36, status: CertificationStatus.CURRENT },
    ],
    
    // Profile 7: Newer with fewer certifications
    [
      { type: CertificationType.CNA, monthsOld: 3, monthsValid: 24, status: CertificationStatus.CURRENT },
      { type: CertificationType.CPR, monthsOld: 2, monthsValid: 12, status: CertificationStatus.CURRENT },
    ],
  ];

  const profile = certProfiles[index % certProfiles.length];

  for (const cert of profile) {
    const issueDate = new Date(now);
    issueDate.setMonth(issueDate.getMonth() - cert.monthsOld);
    
    const expiryDate = new Date(issueDate);
    expiryDate.setMonth(expiryDate.getMonth() + cert.monthsValid);

    certifications.push({
      caregiverId,
      certificationType: cert.type,
      certificationNumber: `${cert.type}-${generateCertNumber()}`,
      issuingOrganization: getIssuingOrganization(cert.type),
      issueDate,
      expiryDate,
      status: cert.status,
      documentUrl: `/documents/caregivers/${caregiverId}/cert-${cert.type.toLowerCase()}.pdf`,
      verifiedBy: adminUserId,
      verifiedAt: cert.status !== CertificationStatus.EXPIRED ? new Date() : null,
      notes: cert.status === CertificationStatus.EXPIRED 
        ? 'Renewal required - reminder sent' 
        : cert.status === CertificationStatus.EXPIRING_SOON 
        ? 'Renewal notice sent - expires soon' 
        : null,
    });
  }

  return certifications;
}

function getIssuingOrganization(certType: CertificationType): string {
  const orgs: Record<CertificationType, string> = {
    [CertificationType.CNA]: 'State Board of Nursing',
    [CertificationType.HHA]: 'State Department of Health',
    [CertificationType.CPR]: 'American Heart Association',
    [CertificationType.FIRST_AID]: 'American Red Cross',
    [CertificationType.MEDICATION_ADMINISTRATION]: 'State Board of Pharmacy',
    [CertificationType.DEMENTIA_CARE]: 'Alzheimer\'s Association',
    [CertificationType.ALZHEIMERS_CARE]: 'Alzheimer\'s Foundation of America',
    [CertificationType.HOSPICE_CARE]: 'National Hospice and Palliative Care Organization',
    [CertificationType.WOUND_CARE]: 'Wound Care Education Institute',
    [CertificationType.IV_THERAPY]: 'Infusion Nurses Society',
    [CertificationType.OTHER]: 'Professional Certification Board',
  };
  
  return orgs[certType] || 'Professional Certification Board';
}

function generateCertNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ========== ASSIGNMENT GENERATION ==========

function getAssignmentsForCaregiver(
  index: number,
  caregiverId: string,
  userId: string,
  residents: any[],
  adminUserId?: string
): any[] {
  const assignments: any[] = [];
  const now = new Date();

  // Different assignment patterns based on index
  const assignmentPatterns = [
    // Pattern 0: Primary for 2 residents, secondary for 1
    { primary: 2, secondary: 1, historical: 1 },
    
    // Pattern 1: Primary for 1, secondary for 2
    { primary: 1, secondary: 2, historical: 0 },
    
    // Pattern 2: Primary for 3 residents (busy caregiver)
    { primary: 3, secondary: 1, historical: 2 },
    
    // Pattern 3: Newer caregiver - only 1 primary
    { primary: 1, secondary: 0, historical: 0 },
    
    // Pattern 4: Balanced - 2 primary, 1 secondary
    { primary: 2, secondary: 1, historical: 1 },
    
    // Pattern 5: Senior caregiver - 2 primary, 2 secondary
    { primary: 2, secondary: 2, historical: 3 },
    
    // Pattern 6: Part-time - 1 primary, 1 secondary
    { primary: 1, secondary: 1, historical: 0 },
    
    // Pattern 7: Full-time - 2 primary, 1 secondary
    { primary: 2, secondary: 1, historical: 1 },
  ];

  const pattern = assignmentPatterns[index % assignmentPatterns.length];
  const availableResidents = [...residents];
  
  // Shuffle residents
  availableResidents.sort(() => 0.5 - Math.random());

  let residentIndex = 0;

  // Add primary assignments (current)
  for (let i = 0; i < pattern.primary && residentIndex < availableResidents.length; i++) {
    const resident = availableResidents[residentIndex++];
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 6) - 1); // Started 1-6 months ago

    assignments.push({
      caregiverId,
      residentId: resident.id,
      isPrimary: true,
      startDate,
      endDate: null, // Current assignment
      assignedBy: adminUserId || userId,
      notes: `Primary caregiver for ${resident.firstName} ${resident.lastName}. Responsible for daily care coordination, medication management, and family communication.`,
    });
  }

  // Add secondary assignments (current)
  for (let i = 0; i < pattern.secondary && residentIndex < availableResidents.length; i++) {
    const resident = availableResidents[residentIndex++];
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 4) - 1); // Started 1-4 months ago

    assignments.push({
      caregiverId,
      residentId: resident.id,
      isPrimary: false,
      startDate,
      endDate: null, // Current assignment
      assignedBy: adminUserId || userId,
      notes: `Secondary caregiver providing relief coverage and additional support. Assists with activities of daily living and social engagement.`,
    });
  }

  // Add historical assignments (completed)
  for (let i = 0; i < pattern.historical && residentIndex < availableResidents.length; i++) {
    const resident = availableResidents[residentIndex++];
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 12) - 6); // Started 6-18 months ago
    
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() - Math.floor(Math.random() * 3) - 1); // Ended 1-3 months ago

    assignments.push({
      caregiverId,
      residentId: resident.id,
      isPrimary: i === 0, // First historical was primary
      startDate,
      endDate,
      assignedBy: adminUserId || userId,
      notes: i === 0 
        ? `Former primary caregiver. Resident transferred to another facility.`
        : `Former secondary caregiver. Assignment concluded.`,
    });
  }

  return assignments;
}

// ========== DOCUMENT GENERATION ==========

function getDocumentsForCaregiver(
  index: number,
  caregiverId: string,
  user: any,
  uploadedBy: string
): any[] {
  const documents: any[] = [];
  const now = new Date();

  // Different document sets based on index
  const documentSets = [
    // Set 0: Complete documentation
    [
      { type: CaregiverDocumentType.CONTRACT, title: 'Employment Contract 2024', hasExpiry: false },
      { type: CaregiverDocumentType.CERTIFICATION, title: 'CNA License Certificate', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.BACKGROUND_CHECK, title: 'Criminal Background Check', hasExpiry: true, months: 12 },
      { type: CaregiverDocumentType.TRAINING, title: 'CPR Training Certificate', hasExpiry: true, months: 12 },
      { type: CaregiverDocumentType.REFERENCE, title: 'Professional Reference - Dr. Smith', hasExpiry: false },
    ],
    
    // Set 1: Standard documentation
    [
      { type: CaregiverDocumentType.CONTRACT, title: 'Employment Agreement', hasExpiry: false },
      { type: CaregiverDocumentType.CERTIFICATION, title: 'Home Health Aide Certificate', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.BACKGROUND_CHECK, title: 'Background Verification', hasExpiry: true, months: 12 },
      { type: CaregiverDocumentType.TRAINING, title: 'Dementia Care Training', hasExpiry: true, months: 36 },
    ],
    
    // Set 2: Newer employee
    [
      { type: CaregiverDocumentType.CONTRACT, title: 'New Hire Employment Contract', hasExpiry: false },
      { type: CaregiverDocumentType.CERTIFICATION, title: 'CNA Certification', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.BACKGROUND_CHECK, title: 'Pre-Employment Background Check', hasExpiry: true, months: 12 },
    ],
    
    // Set 3: Experienced with many documents
    [
      { type: CaregiverDocumentType.CONTRACT, title: 'Senior Caregiver Employment Contract', hasExpiry: false },
      { type: CaregiverDocumentType.CERTIFICATION, title: 'Multiple State Licenses', hasExpiry: true, months: 36 },
      { type: CaregiverDocumentType.BACKGROUND_CHECK, title: 'FBI Background Check', hasExpiry: true, months: 12 },
      { type: CaregiverDocumentType.TRAINING, title: 'Advanced Care Training Certificate', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.TRAINING, title: 'Medication Administration Training', hasExpiry: true, months: 36 },
      { type: CaregiverDocumentType.REFERENCE, title: 'Professional References (3)', hasExpiry: false },
    ],
    
    // Set 4: Standard with ID
    [
      { type: CaregiverDocumentType.CONTRACT, title: 'Employment Contract', hasExpiry: false },
      { type: CaregiverDocumentType.CERTIFICATION, title: 'State Certification', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.IDENTIFICATION, title: 'Driver License Copy', hasExpiry: true, months: 60 },
      { type: CaregiverDocumentType.BACKGROUND_CHECK, title: 'Background Check Report', hasExpiry: true, months: 12 },
    ],
    
    // Set 5: Comprehensive
    [
      { type: CaregiverDocumentType.CONTRACT, title: 'Full-Time Employment Agreement', hasExpiry: false },
      { type: CaregiverDocumentType.CERTIFICATION, title: 'Professional Certifications', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.BACKGROUND_CHECK, title: 'Criminal & Employment History Check', hasExpiry: true, months: 12 },
      { type: CaregiverDocumentType.TRAINING, title: 'Hospice Care Training', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.REFERENCE, title: 'Employment References', hasExpiry: false },
      { type: CaregiverDocumentType.OTHER, title: 'TB Test Results', hasExpiry: true, months: 12 },
    ],
    
    // Set 6: Minimal documentation
    [
      { type: CaregiverDocumentType.CONTRACT, title: 'Part-Time Employment Contract', hasExpiry: false },
      { type: CaregiverDocumentType.CERTIFICATION, title: 'Basic Certification', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.BACKGROUND_CHECK, title: 'Background Check', hasExpiry: true, months: 12 },
    ],
    
    // Set 7: Standard with extra training
    [
      { type: CaregiverDocumentType.CONTRACT, title: 'Employment Contract 2023', hasExpiry: false },
      { type: CaregiverDocumentType.CERTIFICATION, title: 'State License', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.BACKGROUND_CHECK, title: 'Background Verification Report', hasExpiry: true, months: 12 },
      { type: CaregiverDocumentType.TRAINING, title: 'Fall Prevention Training', hasExpiry: true, months: 24 },
      { type: CaregiverDocumentType.TRAINING, title: 'Infection Control Training', hasExpiry: true, months: 12 },
    ],
  ];

  const docSet = documentSets[index % documentSets.length];

  for (let i = 0; i < docSet.length; i++) {
    const doc = docSet[i];
    const uploadDate = new Date(now);
    uploadDate.setMonth(uploadDate.getMonth() - Math.floor(Math.random() * 18) - 1); // Uploaded 1-18 months ago

    let expiryDate: Date | null = null;
    if (doc.hasExpiry && doc.months) {
      expiryDate = new Date(uploadDate);
      expiryDate.setMonth(expiryDate.getMonth() + doc.months);
    }

    const description = getDocumentDescription(doc.type, doc.title, user);

    documents.push({
      caregiverId,
      documentType: doc.type,
      title: doc.title,
      description,
      documentUrl: `/documents/caregivers/${caregiverId}/${doc.title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      uploadDate,
      expiryDate,
      uploadedBy,
    });
  }

  return documents;
}

function getDocumentDescription(type: CaregiverDocumentType, title: string, user: any): string {
  const descriptions: Record<CaregiverDocumentType, string> = {
    [CaregiverDocumentType.CONTRACT]: `Employment contract for ${user.firstName} ${user.lastName}. Includes job duties, compensation, benefits, and terms of employment.`,
    [CaregiverDocumentType.CERTIFICATION]: `Professional certification document for ${user.firstName} ${user.lastName}. Verifies qualifications and credentials.`,
    [CaregiverDocumentType.BACKGROUND_CHECK]: `Criminal background check and employment verification for ${user.firstName} ${user.lastName}. Required for HIPAA compliance.`,
    [CaregiverDocumentType.TRAINING]: `Training completion certificate for ${user.firstName} ${user.lastName}. Documents required continuing education.`,
    [CaregiverDocumentType.IDENTIFICATION]: `Government-issued identification for ${user.firstName} ${user.lastName}. Used for employment verification.`,
    [CaregiverDocumentType.REFERENCE]: `Professional references for ${user.firstName} ${user.lastName} from previous employers and supervisors.`,
    [CaregiverDocumentType.OTHER]: `Additional documentation for ${user.firstName} ${user.lastName}. Required for compliance and record-keeping.`,
  };

  return descriptions[type] || `Document: ${title}`;
}

// ========== MAIN EXECUTION ==========

main()
  .catch((e) => {
    console.error('\n❌ Error seeding caregiver demo data:', e);
    console.error(e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
