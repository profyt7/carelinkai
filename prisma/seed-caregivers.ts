import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding caregiver demo data...');

  // Get existing operator for assignments
  const operator = await prisma.user.findFirst({
    where: { role: 'OPERATOR' },
    include: { operator: true },
  });

  if (!operator || !operator.operator) {
    console.log('❌ No operator found. Please create an operator first.');
    return;
  }

  // Get some existing residents for assignments
  // First, get homes managed by this operator
  const operatorHomes = await prisma.assistedLivingHome.findMany({
    where: { operatorId: operator.operator.id },
    select: { id: true },
  });

  const homeIds = operatorHomes.map(h => h.id);

  const residents = await prisma.resident.findMany({
    take: 5,
    where: homeIds.length > 0 ? { homeId: { in: homeIds } } : undefined,
  });

  if (residents.length === 0) {
    console.log('⚠️  No residents found. Caregivers will be created without assignments.');
  }

  const caregiverData = [
    {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@carelink.demo',
      phoneNumber: '(555) 123-4567',
      dateOfBirth: new Date('1985-03-15'),
      address: '123 Care Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      employmentType: 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      hireDate: new Date('2020-01-15'),
      specializations: ['Alzheimer\'s Care', 'Dementia Care', 'Medication Management'],
      languages: ['English', 'Spanish'],
      yearsOfExperience: 12,
      bio: 'Experienced caregiver specializing in memory care with over 12 years of dedication to senior wellness.',
      certifications: [
        {
          type: 'CNA - Certified Nursing Assistant',
          certificationNumber: 'CNA-CA-123456',
          issuingOrganization: 'California Board of Nursing',
          issueDate: new Date('2019-01-01'),
          expiryDate: new Date('2025-01-01'),
          documentUrl: 'https://example.com/certs/cna-sarah.pdf',
        },
        {
          type: 'CPR - Cardiopulmonary Resuscitation',
          certificationNumber: 'CPR-2024-789',
          issuingOrganization: 'American Heart Association',
          issueDate: new Date('2024-06-01'),
          expiryDate: new Date('2026-06-01'),
          documentUrl: 'https://example.com/certs/cpr-sarah.pdf',
        },
        {
          type: 'Alzheimer\'s Care Specialist',
          issuingOrganization: 'Alzheimer\'s Association',
          issueDate: new Date('2021-03-15'),
          expiryDate: new Date('2024-12-15'), // Expiring soon
        },
      ],
      documents: [
        {
          type: 'Background Check',
          title: 'Criminal Background Check 2024',
          uploadDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          documentUrl: 'https://example.com/docs/bg-sarah.pdf',
        },
        {
          type: 'TB Test',
          title: 'Tuberculosis Screening',
          uploadDate: new Date('2024-06-01'),
          expiryDate: new Date('2025-06-01'),
          documentUrl: 'https://example.com/docs/tb-sarah.pdf',
        },
      ],
    },
    {
      firstName: 'Michael',
      lastName: 'Chen',
      email: 'michael.chen@carelink.demo',
      phoneNumber: '(555) 234-5678',
      dateOfBirth: new Date('1990-07-22'),
      address: '456 Wellness Ave',
      city: 'Oakland',
      state: 'CA',
      zipCode: '94601',
      employmentType: 'FULL_TIME',
      employmentStatus: 'ACTIVE',
      hireDate: new Date('2021-06-01'),
      specializations: ['Physical Therapy', 'Post-Surgery Care', 'Fall Prevention'],
      languages: ['English', 'Mandarin', 'Cantonese'],
      yearsOfExperience: 8,
      bio: 'Dedicated physical therapy aide with a passion for helping seniors regain mobility and independence.',
      certifications: [
        {
          type: 'Physical Therapy Assistant',
          certificationNumber: 'PTA-CA-98765',
          issuingOrganization: 'California Physical Therapy Board',
          issueDate: new Date('2020-01-01'),
          expiryDate: new Date('2026-01-01'),
        },
        {
          type: 'CPR - Cardiopulmonary Resuscitation',
          certificationNumber: 'CPR-2024-123',
          issuingOrganization: 'American Heart Association',
          issueDate: new Date('2024-03-01'),
          expiryDate: new Date('2026-03-01'),
        },
        {
          type: 'First Aid',
          issuingOrganization: 'Red Cross',
          issueDate: new Date('2023-01-15'),
          expiryDate: new Date('2024-01-15'), // Expired
        },
      ],
      documents: [
        {
          type: 'Background Check',
          title: 'Criminal Background Check 2024',
          uploadDate: new Date('2024-02-01'),
          expiryDate: new Date('2025-02-01'),
        },
      ],
    },
    {
      firstName: 'Emily',
      lastName: 'Rodriguez',
      email: 'emily.rodriguez@carelink.demo',
      phoneNumber: '(555) 345-6789',
      dateOfBirth: new Date('1988-11-30'),
      address: '789 Health Blvd',
      city: 'Berkeley',
      state: 'CA',
      zipCode: '94704',
      employmentType: 'PART_TIME',
      employmentStatus: 'ACTIVE',
      hireDate: new Date('2022-03-15'),
      specializations: ['Wound Care', 'Diabetes Management', 'Medication Management'],
      languages: ['English', 'Spanish'],
      yearsOfExperience: 10,
      bio: 'Skilled in chronic disease management and wound care with a compassionate approach to patient care.',
      certifications: [
        {
          type: 'HHA - Home Health Aide',
          certificationNumber: 'HHA-CA-54321',
          issuingOrganization: 'California Department of Public Health',
          issueDate: new Date('2019-06-01'),
          expiryDate: new Date('2025-06-01'),
        },
        {
          type: 'Wound Care Certification',
          certificationNumber: 'WCC-2023-456',
          issuingOrganization: 'Wound Care Education Institute',
          issueDate: new Date('2023-01-01'),
          expiryDate: new Date('2025-01-01'),
        },
      ],
      documents: [
        {
          type: 'Background Check',
          title: 'Criminal Background Check 2024',
          uploadDate: new Date('2024-03-01'),
          expiryDate: new Date('2025-03-01'),
        },
        {
          type: 'Insurance',
          title: 'Professional Liability Insurance',
          uploadDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
        },
      ],
    },
    {
      firstName: 'David',
      lastName: 'Williams',
      email: 'david.williams@carelink.demo',
      phoneNumber: '(555) 456-7890',
      dateOfBirth: new Date('1982-05-10'),
      address: '321 Senior Lane',
      city: 'San Jose',
      state: 'CA',
      zipCode: '95110',
      employmentType: 'PER_DIEM',
      employmentStatus: 'ACTIVE',
      hireDate: new Date('2023-01-10'),
      specializations: ['Hospice Care', 'Dementia Care'],
      languages: ['English'],
      yearsOfExperience: 15,
      bio: 'Compassionate hospice caregiver providing end-of-life care with dignity and respect.',
      certifications: [
        {
          type: 'CNA - Certified Nursing Assistant',
          certificationNumber: 'CNA-CA-11111',
          issuingOrganization: 'California Board of Nursing',
          issueDate: new Date('2018-01-01'),
          expiryDate: new Date('2025-01-01'),
        },
      ],
      documents: [],
    },
    {
      firstName: 'Lisa',
      lastName: 'Patel',
      email: 'lisa.patel@carelink.demo',
      phoneNumber: '(555) 567-8901',
      dateOfBirth: new Date('1992-09-25'),
      address: '654 Comfort Court',
      city: 'Palo Alto',
      state: 'CA',
      zipCode: '94301',
      employmentType: 'FULL_TIME',
      employmentStatus: 'ON_LEAVE',
      hireDate: new Date('2021-08-01'),
      specializations: ['Occupational Therapy', 'Fall Prevention'],
      languages: ['English', 'Hindi'],
      yearsOfExperience: 6,
      bio: 'Occupational therapy assistant focused on helping seniors maintain independence in daily activities.',
      certifications: [
        {
          type: 'Occupational Therapy Assistant',
          certificationNumber: 'OTA-CA-22222',
          issuingOrganization: 'California Occupational Therapy Board',
          issueDate: new Date('2020-06-01'),
          expiryDate: new Date('2026-06-01'),
        },
      ],
      documents: [],
    },
  ];

  for (const data of caregiverData) {
    console.log(`\n👤 Creating caregiver: ${data.firstName} ${data.lastName}...`);

    // Create user
    const hashedPassword = await bcrypt.hash('Demo123!', 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        emailVerified: new Date(),
        role: 'CAREGIVER',
      },
    });

    console.log(`  ✓ Created user: ${user.email}`);

    // Create caregiver profile
    const caregiver = await prisma.caregiver.create({
      data: {
        userId: user.id,
        operatorId: operator.operator.id,
        dateOfBirth: data.dateOfBirth,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        employmentType: data.employmentType,
        employmentStatus: data.employmentStatus,
        hireDate: data.hireDate,
        specializations: data.specializations,
        languages: data.languages,
        yearsOfExperience: data.yearsOfExperience,
        bio: data.bio,
      },
    });

    console.log(`  ✓ Created caregiver profile`);

    // Create certifications
    for (const cert of data.certifications) {
      await prisma.caregiverCertification.create({
        data: {
          caregiverId: caregiver.id,
          ...cert,
        },
      });
    }
    console.log(`  ✓ Created ${data.certifications.length} certifications`);

    // Create documents
    for (const doc of data.documents) {
      await prisma.caregiverDocument.create({
        data: {
          caregiverId: caregiver.id,
          ...doc,
        },
      });
    }
    console.log(`  ✓ Created ${data.documents.length} documents`);

    // Create assignments to residents
    if (residents.length > 0) {
      const numAssignments = Math.min(2, residents.length);
      const assignedResidents = residents.slice(0, numAssignments);

      for (let i = 0; i < assignedResidents.length; i++) {
        await prisma.caregiverAssignment.create({
          data: {
            caregiverId: caregiver.id,
            residentId: assignedResidents[i].id,
            isPrimary: i === 0, // First assignment is primary
            startDate: new Date(),
            notes: `${data.firstName} is assigned as ${i === 0 ? 'primary' : 'backup'} caregiver`,
          },
        });
      }
      console.log(`  ✓ Created ${numAssignments} resident assignments`);
    }
  }

  console.log('\n✅ Caregiver demo data seeding complete!');
  console.log('\nDemo Caregiver Logins:');
  caregiverData.forEach((data) => {
    console.log(`  • ${data.email} / Demo123!`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding caregiver data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
