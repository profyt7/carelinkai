/**
 * Residents Demo Seed Script for CareLinkAI
 * - Creates a demo Family and three Residents with basic notes/incidents/assessments
 * - Safe to re-run (upserts by email for family user)
 */
import { PrismaClient, UserRole, UserStatus, ResidentStatus, ComplianceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding residents demo data...');

  // Create a family owner
  const pwd = await bcrypt.hash('Family123!', 10);
  const familyUser = await prisma.user.upsert({
    where: { email: 'family@carelinkai.com' },
    update: { passwordHash: pwd, status: UserStatus.ACTIVE },
    create: {
      email: 'family@carelinkai.com',
      firstName: 'Pat',
      lastName: 'Family',
      passwordHash: pwd,
      role: UserRole.FAMILY,
      status: UserStatus.ACTIVE,
    }
  });
  const family = await prisma.family.upsert({
    where: { userId: familyUser.id },
    update: {},
    create: { userId: familyUser.id }
  });

  // Reuse or create an operator/home to attach residents
  const opUser = await prisma.user.findFirst({ where: { role: UserRole.OPERATOR } });
  let home = await prisma.assistedLivingHome.findFirst();
  if (!home && opUser) {
    const op = await prisma.operator.upsert({ where: { userId: opUser.id }, update: {}, create: { userId: opUser.id, companyName: 'CareLink Demo Ops' } });
    home = await prisma.assistedLivingHome.create({ data: { operatorId: op.id, name: 'CareLink Demo Home', description: 'Demo Home', capacity: 20, currentOccupancy: 5, amenities: [] } });
  }

  // Additional family to meet prompt target
  const familyUser2 = await prisma.user.upsert({
    where: { email: 'family2@carelinkai.com' },
    update: { passwordHash: pwd, status: UserStatus.ACTIVE },
    create: { email: 'family2@carelinkai.com', firstName: 'Alex', lastName: 'Family', passwordHash: pwd, role: UserRole.FAMILY, status: UserStatus.ACTIVE }
  });
  const family2 = await prisma.family.upsert({ where: { userId: familyUser2.id }, update: {}, create: { userId: familyUser2.id } });

  // Demo Residents (5-6 with comprehensive realistic data for demo)
  const demoResidents = [
    // firstName, lastName, gender, status, age, roomNumber, payer, careLevel, photoUrl
    ['Margaret','Thompson','FEMALE','ACTIVE', 82, '101', 'Medicare', 'Assisted Living', 'https://i.pravatar.cc/300?img=45'],
    ['Robert','Martinez','MALE','ACTIVE', 78, '205A', 'Private', 'Memory Care', 'https://i.pravatar.cc/300?img=12'],
    ['Dorothy','Chen','FEMALE','ACTIVE', 75, '312', 'Medicare', 'Assisted Living', 'https://i.pravatar.cc/300?img=47'],
    ['William','Johnson','MALE','INQUIRY', 84, null, 'Private', 'Independent Living', 'https://i.pravatar.cc/300?img=13'],
    ['Barbara','Williams','FEMALE','PENDING', 79, null, 'Medicaid', 'Skilled Nursing', 'https://i.pravatar.cc/300?img=44'],
    ['James','Davis','MALE','ACTIVE', 81, '118', 'Medicare', 'Assisted Living', 'https://i.pravatar.cc/300?img=11'],
  ] as const;

  // Sample medical data for variation
  const allergiesSamples = [
    'Penicillin, Shellfish',
    'None known',
    'Sulfa drugs, Latex',
    'Peanuts, Tree nuts',
    null,
    'None',
    'Aspirin',
  ];
  
  const dietarySamples = [
    'Low sodium, Diabetic diet',
    'Pureed texture, Thickened liquids',
    'No restrictions',
    'Vegetarian',
    null,
    'Gluten-free',
    'Low cholesterol, Heart healthy',
  ];

  let toggle = false;
  for (const [firstName, lastName, gender, status, age, roomNumber, payer, careLevel, photoUrl] of demoResidents) {
    const fam = toggle ? family2 : family;
    toggle = !toggle;
    
    // Calculate DOB based on age (current year - age)
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - (age as number);
    const dob = new Date(birthYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    
    // Random medical info selection
    const allergies = allergiesSamples[Math.floor(Math.random() * allergiesSamples.length)];
    const dietary = dietarySamples[Math.floor(Math.random() * dietarySamples.length)];
    
    // Build careNeeds JSON with payer, room, and care level info
    const careNeeds: any = {
      payerType: payer,
      careLevel: careLevel,
    };
    if (roomNumber) {
      careNeeds.roomNumber = roomNumber;
    }
    
    const admissionDate = status === 'ACTIVE' ? new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) : null;
    
    const created = await prisma.resident.create({
      data: {
        familyId: fam.id,
        homeId: home?.id ?? null,
        firstName, 
        lastName,
        dateOfBirth: dob,
        gender: gender as any,
        status: status as ResidentStatus,
        admissionDate: admissionDate as any,
        photoUrl: photoUrl as string | null,
        allergies: allergies || null,
        dietaryRestrictions: dietary || null,
        careNeeds,
      }
    });
    
    // Emergency Contacts (2-3 per resident)
    await prisma.residentContact.createMany({ data: [
      { 
        residentId: created.id, 
        name: `Sarah ${lastName}`, 
        relationship: 'Daughter', 
        email: `sarah.${lastName.toLowerCase()}@email.com`, 
        phone: '(555) 123-4567', 
        isPrimary: true 
      },
      { 
        residentId: created.id, 
        name: `Michael ${lastName}`, 
        relationship: 'Son', 
        email: `michael.${lastName.toLowerCase()}@email.com`,
        phone: '(555) 234-5678', 
        isPrimary: false 
      },
      { 
        residentId: created.id, 
        name: `Dr. Emily Watson`, 
        relationship: 'Primary Physician', 
        phone: '(555) 789-0123', 
        isPrimary: false 
      },
    ]});
    
    // Compliance items (varied by status)
    await prisma.residentComplianceItem.createMany({ data: [
      { 
        residentId: created.id, 
        type: 'CARE_PLAN_REVIEW', 
        title: 'Quarterly Care Plan Review', 
        status: 'OPEN' as ComplianceStatus, 
        dueDate: new Date(Date.now()+14*24*60*60*1000),
        severity: 'MEDIUM'
      },
      { 
        residentId: created.id, 
        type: 'FLU_SHOT', 
        title: 'Annual Flu Shot', 
        status: 'COMPLETED' as ComplianceStatus, 
        completedAt: new Date(Date.now() - 30*24*60*60*1000),
        severity: 'LOW'
      },
      {
        residentId: created.id,
        type: 'TB_TEST',
        title: 'Annual TB Test',
        status: status === 'ACTIVE' ? 'COMPLETED' as ComplianceStatus : 'OPEN' as ComplianceStatus,
        completedAt: status === 'ACTIVE' ? new Date(Date.now() - 90*24*60*60*1000) : null,
        dueDate: status === 'ACTIVE' ? null : new Date(Date.now()+7*24*60*60*1000),
        severity: 'HIGH'
      },
    ]});
    
    // Clinical assessments
    await prisma.assessmentResult.create({ 
      data: { 
        residentId: created.id, 
        type: 'ADL', 
        score: Math.floor(15 + Math.random() * 10), 
        data: { 
          ambulation: ['independent', 'assisted', 'wheelchair'][Math.floor(Math.random() * 3)],
          bathing: 'assisted',
          dressing: 'independent'
        } 
      } 
    });
    
    // Incidents (only for active residents)
    if (status === 'ACTIVE' && Math.random() > 0.5) {
      await prisma.residentIncident.create({ 
        data: { 
          residentId: created.id, 
          type: 'Fall', 
          severity: 'LOW', 
          occurredAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), 
          description: 'Minor fall in room. No injuries reported. Resident was assisted back to bed.' 
        } 
      });
    }
    
    // Notes (3-5 realistic notes)
    const noteContents = [
      `${firstName} is settling in well. Family visited today and were pleased with care.`,
      `Medication review completed. All prescriptions up to date.`,
      `Participated in morning activities. Showed good engagement with other residents.`,
      `Blood pressure check: Normal range. Vitals stable.`,
      `Requested dietary modification. Coordinating with kitchen staff.`,
    ];
    
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      await prisma.residentNote.create({ 
        data: { 
          residentId: created.id, 
          content: noteContents[i % noteContents.length], 
          visibility: 'INTERNAL' as any,
          createdAt: new Date(Date.now() - (i * 2 + Math.random()) * 24 * 60 * 60 * 1000)
        } 
      });
    }
    
    // Timeline events (for active residents)
    if (status === 'ACTIVE' && admissionDate) {
      await prisma.careTimelineEvent.createMany({
        data: [
          {
            residentId: created.id,
            eventType: 'admission',
            title: 'Admission to Facility',
            description: `${firstName} ${lastName} was admitted to the facility.`,
            scheduledAt: admissionDate,
            completedAt: admissionDate,
          },
          {
            residentId: created.id,
            eventType: 'assessment',
            title: 'Initial Health Assessment',
            description: 'Comprehensive health assessment completed by nursing staff.',
            scheduledAt: new Date(admissionDate.getTime() + 24*60*60*1000),
            completedAt: new Date(admissionDate.getTime() + 24*60*60*1000),
          },
          {
            residentId: created.id,
            eventType: 'appointment',
            title: 'Quarterly Care Review',
            description: 'Scheduled quarterly care plan review with family.',
            scheduledAt: new Date(Date.now() + 14*24*60*60*1000),
          },
        ]
      });
    }
  }

  console.log(`✅ Residents demo data seeded successfully!`);
  console.log(`   📊 ${demoResidents.length} residents created with:`);
  console.log(`      • Profile photos and demographics`);
  console.log(`      • Emergency contacts (3 per resident)`);
  console.log(`      • Compliance items and medical assessments`);
  console.log(`      • Care notes and timeline events`);
  console.log(`      • Varied statuses (Active, Inquiry, Pending)`);
  console.log(`   🏠 Ready for demo in Operator portal at /operator/residents`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
