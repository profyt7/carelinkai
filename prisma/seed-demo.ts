/**
 * Demo Seed Script for CareLinkAI
 * Creates 5 demo accounts with realistic data for live walkthroughs
 */

import { PrismaClient, UserRole, LeadTargetType, LeadStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'DemoUser123!';

async function main() {
  console.log('🌱 Starting demo seed...\n');

  // Hash password once for all accounts
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ==================== DEMO ACCOUNTS ====================
  
  console.log('📝 Creating demo accounts...');

  // 1. Demo Family Account
  const demoFamily = await prisma.user.upsert({
    where: { email: 'demo.family@carelinkai.test' },
    update: {},
    create: {
      email: 'demo.family@carelinkai.test',
      passwordHash: hashedPassword,
      firstName: 'Jennifer',
      lastName: 'Martinez',
      phone: '(555) 123-4567',
      role: UserRole.FAMILY,
      status: 'ACTIVE',
      emailVerified: new Date(),
      family: {
        create: {
          primaryContactName: 'Jennifer Martinez',
          phone: '(555) 123-4567',
          relationshipToRecipient: 'Daughter',
          recipientAge: 82,
          primaryDiagnosis: 'Early-stage Alzheimer\'s disease, mild mobility issues',
          mobilityLevel: 'Needs Assistance',
          careNotes: 'Mom needs help with daily activities and medication management. She\'s still social and enjoys music and reading. Looking for compassionate care 4-5 hours per day, Monday through Friday.',
        },
      },
    },
  });
  console.log('  ✓ Family account created: demo.family@carelinkai.test');

  // 2. Demo Operator Account
  const demoOperator = await prisma.user.upsert({
    where: { email: 'demo.operator@carelinkai.test' },
    update: {},
    create: {
      email: 'demo.operator@carelinkai.test',
      passwordHash: hashedPassword,
      firstName: 'Michael',
      lastName: 'Chen',
      phone: '(555) 234-5678',
      role: UserRole.OPERATOR,
      status: 'ACTIVE',
      emailVerified: new Date(),
      operator: {
        create: {
          companyName: 'CareLink Services Inc.',
          businessLicense: 'CA-ALF-2024-1234',
        },
      },
    },
  });
  console.log('  ✓ Operator account created: demo.operator@carelinkai.test');

  // 3. Demo Aide/Caregiver Account
  const demoAide = await prisma.user.upsert({
    where: { email: 'demo.aide@carelinkai.test' },
    update: {},
    create: {
      email: 'demo.aide@carelinkai.test',
      passwordHash: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Thompson',
      phone: '(555) 345-6789',
      role: UserRole.CAREGIVER,
      status: 'ACTIVE',
      emailVerified: new Date(),
      caregiver: {
        create: {
          bio: 'Compassionate caregiver with 7 years of experience specializing in Alzheimer\'s and dementia care. Certified in CPR, First Aid, and medication management. I believe in treating every client with dignity and respect while providing personalized care that promotes independence and quality of life.',
          yearsExperience: 7,
          hourlyRate: 32.00,
          availability: {
            monday: ['9:00 AM - 5:00 PM'],
            tuesday: ['9:00 AM - 5:00 PM'],
            wednesday: ['9:00 AM - 5:00 PM'],
            thursday: ['9:00 AM - 5:00 PM'],
            friday: ['9:00 AM - 3:00 PM'],
          },
          backgroundCheckStatus: 'CLEAR',
          specialties: ['Alzheimer\'s Care', 'Dementia Care', 'Medication Management', 'Companionship'],
          settings: ['Home', 'Assisted Living'],
          careTypes: ['Memory Care', 'Personal Care'],
          isVisibleInMarketplace: true,
        },
      },
    },
  });
  console.log('  ✓ Aide account created: demo.aide@carelinkai.test');

  // 4. Demo Provider Account
  const demoProvider = await prisma.user.upsert({
    where: { email: 'demo.provider@carelinkai.test' },
    update: {},
    create: {
      email: 'demo.provider@carelinkai.test',
      passwordHash: hashedPassword,
      firstName: 'Robert',
      lastName: 'Williams',
      phone: '(555) 456-7890',
      role: UserRole.PROVIDER,
      status: 'ACTIVE',
      emailVerified: new Date(),
      provider: {
        create: {
          businessName: 'Golden Years Home Care',
          contactName: 'Robert Williams',
          contactEmail: 'demo.provider@carelinkai.test',
          contactPhone: '(555) 456-7890',
          bio: 'Golden Years Home Care has been serving the Bay Area for over 15 years. We specialize in comprehensive in-home care services for seniors, including personal care, companionship, medication management, and specialized dementia care. Our caregivers are carefully screened, trained, and bonded.',
          website: 'https://goldenyearshomecare.example.com',
          insuranceInfo: 'We accept most major insurance plans including Medicare, Medicaid, and private long-term care insurance.',
          licenseNumber: 'CA-HCA-123456',
          yearsInBusiness: 15,
          isVerified: true,
          isActive: true,
          serviceTypes: ['Personal Care', 'Companionship', 'Medication Management', 'Dementia Care', 'Respite Care'],
          coverageArea: {
            cities: ['San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Palo Alto'],
            states: ['CA'],
            zipCodes: ['94102', '94103', '94104', '94105', '94110'],
          },
        },
      },
    },
  });
  console.log('  ✓ Provider account created: demo.provider@carelinkai.test');

  // 5. Demo Admin Account
  const demoAdmin = await prisma.user.upsert({
    where: { email: 'demo.admin@carelinkai.test' },
    update: {},
    create: {
      email: 'demo.admin@carelinkai.test',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '(555) 567-8901',
      role: UserRole.ADMIN,
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
  });
  console.log('  ✓ Admin account created: demo.admin@carelinkai.test\n');

  // ==================== ADDITIONAL CAREGIVERS ====================
  
  console.log('👥 Creating additional caregivers...');

  const additionalCaregivers = [
    {
      email: 'maria.garcia@test.com',
      firstName: 'Maria',
      lastName: 'Garcia',
      phone: '(555) 111-2222',
      bio: 'Bilingual caregiver (English/Spanish) with 5 years experience. Specializing in post-surgery care and physical therapy assistance.',
      yearsExperience: 5,
      hourlyRate: 28.00,
      city: 'San Jose',
      specialties: ['Post-Surgery Care', 'Physical Therapy', 'Bilingual Care'],
    },
    {
      email: 'james.wilson@test.com',
      firstName: 'James',
      lastName: 'Wilson',
      phone: '(555) 222-3333',
      bio: 'Male caregiver with nursing background. Experienced in wound care, diabetes management, and chronic illness support.',
      yearsExperience: 10,
      hourlyRate: 35.00,
      city: 'Oakland',
      specialties: ['Diabetes Care', 'Wound Care', 'Chronic Illness Support'],
    },
    {
      email: 'lisa.anderson@test.com',
      firstName: 'Lisa',
      lastName: 'Anderson',
      phone: '(555) 333-4444',
      bio: 'Gentle and patient caregiver specializing in end-of-life care and hospice support. Trained in grief counseling.',
      yearsExperience: 8,
      hourlyRate: 30.00,
      city: 'San Francisco',
      specialties: ['Hospice Care', 'End-of-Life Care', 'Grief Support'],
    },
    {
      email: 'david.nguyen@test.com',
      firstName: 'David',
      lastName: 'Nguyen',
      phone: '(555) 444-5555',
      bio: 'Active caregiver who loves taking clients on outings. Specializes in mobility assistance and fall prevention.',
      yearsExperience: 4,
      hourlyRate: 26.00,
      city: 'Berkeley',
      specialties: ['Mobility Assistance', 'Fall Prevention', 'Transportation'],
    },
    {
      email: 'emily.brown@test.com',
      firstName: 'Emily',
      lastName: 'Brown',
      phone: '(555) 555-6666',
      bio: 'Experienced dementia care specialist with certifications in validation therapy and sensory stimulation.',
      yearsExperience: 6,
      hourlyRate: 33.00,
      city: 'Palo Alto',
      specialties: ['Dementia Care', 'Memory Care', 'Validation Therapy'],
    },
    {
      email: 'antonio.rodriguez@test.com',
      firstName: 'Antonio',
      lastName: 'Rodriguez',
      phone: '(555) 666-7777',
      bio: 'Warm and caring aide with focus on meal preparation and nutrition. Experienced with diabetic and heart-healthy diets.',
      yearsExperience: 3,
      hourlyRate: 25.00,
      city: 'Sacramento',
      specialties: ['Meal Preparation', 'Nutrition Support', 'Dietary Management'],
    },
  ];

  for (const cg of additionalCaregivers) {
    await prisma.user.upsert({
      where: { email: cg.email },
      update: {},
      create: {
        email: cg.email,
        passwordHash: hashedPassword,
        firstName: cg.firstName,
        lastName: cg.lastName,
        phone: cg.phone,
        role: UserRole.CAREGIVER,
        status: 'ACTIVE',
        emailVerified: new Date(),
        caregiver: {
          create: {
            bio: cg.bio,
            yearsExperience: cg.yearsExperience,
            hourlyRate: cg.hourlyRate,
            availability: {
              monday: ['8:00 AM - 6:00 PM'],
              tuesday: ['8:00 AM - 6:00 PM'],
              wednesday: ['8:00 AM - 6:00 PM'],
              thursday: ['8:00 AM - 6:00 PM'],
              friday: ['8:00 AM - 4:00 PM'],
            },
            backgroundCheckStatus: 'CLEAR',
            specialties: cg.specialties,
            settings: ['Home', 'Assisted Living'],
            careTypes: ['Personal Care', 'Companionship'],
            isVisibleInMarketplace: true,
          },
        },
      },
    });
    console.log(`  ✓ Created caregiver: ${cg.firstName} ${cg.lastName} (${cg.city})`);
  }
  console.log('');

  // ==================== ADDITIONAL PROVIDERS ====================
  
  console.log('🏢 Creating additional providers...');

  const additionalProviders = [
    {
      email: 'provider.compassioncare@test.com',
      firstName: 'Linda',
      lastName: 'Johnson',
      businessName: 'Compassion Home Health',
      city: 'San Francisco',
      serviceTypes: ['Personal Care', 'Skilled Nursing', 'Physical Therapy'],
      yearsInBusiness: 8,
    },
    {
      email: 'provider.seniorhelpers@test.com',
      firstName: 'Thomas',
      lastName: 'Davis',
      businessName: 'Senior Helpers of the Bay Area',
      city: 'San Jose',
      serviceTypes: ['Dementia Care', 'Companionship', 'Respite Care'],
      yearsInBusiness: 12,
    },
    {
      email: 'provider.homeinstead@test.com',
      firstName: 'Patricia',
      lastName: 'Miller',
      businessName: 'Home Instead Senior Care',
      city: 'Oakland',
      serviceTypes: ['Personal Care', 'Alzheimer\'s Care', 'Companionship'],
      yearsInBusiness: 20,
    },
    {
      email: 'provider.visitingangels@test.com',
      firstName: 'Richard',
      lastName: 'Moore',
      businessName: 'Visiting Angels',
      city: 'Berkeley',
      serviceTypes: ['Personal Care', 'Medication Management', 'Meal Preparation'],
      yearsInBusiness: 10,
    },
    {
      email: 'provider.rightathome@test.com',
      firstName: 'Susan',
      lastName: 'Taylor',
      businessName: 'Right at Home Bay Area',
      city: 'Palo Alto',
      serviceTypes: ['Personal Care', 'Companionship', 'Transportation'],
      yearsInBusiness: 7,
    },
  ];

  for (const prov of additionalProviders) {
    await prisma.user.upsert({
      where: { email: prov.email },
      update: {},
      create: {
        email: prov.email,
        passwordHash: hashedPassword,
        firstName: prov.firstName,
        lastName: prov.lastName,
        phone: `(555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
        role: UserRole.PROVIDER,
        status: 'ACTIVE',
        emailVerified: new Date(),
        provider: {
          create: {
            businessName: prov.businessName,
            contactName: `${prov.firstName} ${prov.lastName}`,
            contactEmail: prov.email,
            contactPhone: `(555) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`,
            bio: `${prov.businessName} provides high-quality in-home care services to seniors in the ${prov.city} area. Our trained and compassionate caregivers are available 24/7 to provide the support your loved ones need.`,
            website: `https://${prov.businessName.toLowerCase().replace(/\s+/g, '')}.example.com`,
            insuranceInfo: 'We accept Medicare, Medicaid, and most private insurance plans.',
            licenseNumber: `CA-HCA-${Math.floor(100000 + Math.random() * 900000)}`,
            yearsInBusiness: prov.yearsInBusiness,
            isVerified: true,
            isActive: true,
            serviceTypes: prov.serviceTypes,
            coverageArea: {
              cities: [prov.city, 'San Francisco', 'Oakland'],
              states: ['CA'],
              zipCodes: ['94102', '94103', '94104'],
            },
          },
        },
      },
    });
    console.log(`  ✓ Created provider: ${prov.businessName} (${prov.city})`);
  }
  console.log('');

  // ==================== LEADS ====================
  
  console.log('📋 Creating demo leads...');

  // Get the family and their linked profile
  const family = await prisma.family.findUnique({
    where: { userId: demoFamily.id },
  });

  // Get demo aide/caregiver
  const aide = await prisma.caregiver.findUnique({
    where: { userId: demoAide.id },
  });

  // Get demo provider
  const provider = await prisma.provider.findUnique({
    where: { userId: demoProvider.id },
  });

  // Get additional caregivers and providers for leads
  const mariaCg = await prisma.user.findUnique({
    where: { email: 'maria.garcia@test.com' },
    include: { caregiver: true },
  });

  const compassionProvider = await prisma.user.findUnique({
    where: { email: 'provider.compassioncare@test.com' },
    include: { provider: true },
  });

  if (family && aide && provider) {
    // Lead 1: Family → Demo Aide (NEW status)
    await prisma.lead.upsert({
      where: { id: 'demo-lead-1' },
      update: {},
      create: {
        id: 'demo-lead-1',
        familyId: family.id,
        targetType: LeadTargetType.AIDE,
        aideId: aide.id,
        status: LeadStatus.NEW,
        message: 'Hi Sarah, I saw your profile and I\'m impressed by your experience with Alzheimer\'s care. My mother needs care Monday through Friday, 9 AM - 1 PM. Would you be available to discuss this opportunity?',
        preferredStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        expectedHoursPerWeek: 20,
        location: 'San Francisco, CA',
      },
    });
    console.log('  ✓ Created lead: Family → Demo Aide (NEW)');

    // Lead 2: Family → Demo Provider (IN_REVIEW status, assigned to operator)
    await prisma.lead.upsert({
      where: { id: 'demo-lead-2' },
      update: {},
      create: {
        id: 'demo-lead-2',
        familyId: family.id,
        targetType: LeadTargetType.PROVIDER,
        providerId: provider.id,
        status: LeadStatus.IN_REVIEW,
        message: 'I\'m looking for a reliable home care agency to provide daily care for my mother. She has early-stage Alzheimer\'s and needs medication management and companionship.',
        preferredStartDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        expectedHoursPerWeek: 25,
        location: 'San Francisco, CA',
        assignedOperatorId: demoOperator.id,
        operatorNotes: 'Good fit - Golden Years has excellent Alzheimer\'s care program. Scheduled intro call for next week.',
      },
    });
    console.log('  ✓ Created lead: Family → Demo Provider (IN_REVIEW)');

    // Lead 3: Family → Maria (CONTACTED status)
    if (mariaCg?.caregiver) {
      await prisma.lead.upsert({
        where: { id: 'demo-lead-3' },
        update: {},
        create: {
          id: 'demo-lead-3',
          familyId: family.id,
          targetType: LeadTargetType.AIDE,
          aideId: mariaCg.caregiver.id,
          status: LeadStatus.CONTACTED,
          message: 'Hi Maria, we\'re looking for bilingual care. Are you available for part-time work?',
          preferredStartDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          expectedHoursPerWeek: 15,
          location: 'San Jose, CA',
          assignedOperatorId: demoOperator.id,
          operatorNotes: 'Maria confirmed availability. Waiting for family to schedule meet-and-greet.',
        },
      });
      console.log('  ✓ Created lead: Family → Maria (CONTACTED)');
    }

    // Lead 4: Family → Compassion Home Health (NEW status)
    if (compassionProvider?.provider) {
      await prisma.lead.upsert({
        where: { id: 'demo-lead-4' },
        update: {},
        create: {
          id: 'demo-lead-4',
          familyId: family.id,
          targetType: LeadTargetType.PROVIDER,
          providerId: compassionProvider.provider.id,
          status: LeadStatus.NEW,
          message: 'I\'m interested in your skilled nursing services. Do you have availability for ongoing care?',
          preferredStartDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          expectedHoursPerWeek: 30,
          location: 'San Francisco, CA',
        },
      });
      console.log('  ✓ Created lead: Family → Compassion Home Health (NEW)');
    }
  }
  console.log('');

  // ==================== MESSAGES ====================
  
  console.log('💬 Creating demo messages...');

  // Conversation 1: Family ↔ Operator (about care needs)
  await prisma.message.create({
    data: {
      senderId: demoFamily.id,
      receiverId: demoOperator.id,
      content: 'Hi Michael, I just signed up and I\'m looking for care options for my mother. She has early-stage Alzheimer\'s and needs daily assistance. Can you help me understand my options?',
      status: 'READ',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      senderId: demoOperator.id,
      receiverId: demoFamily.id,
      content: 'Hi Jennifer! Welcome to CareLinkAI. I\'d be happy to help you find the right care for your mother. Based on your care needs, I can recommend both individual caregivers and home care agencies. Would you prefer in-home care or are you open to assisted living facilities as well?',
      status: 'READ',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // 30 min later
      readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      senderId: demoFamily.id,
      receiverId: demoOperator.id,
      content: 'We\'re definitely interested in in-home care for now. Mom is still very comfortable in her own home. What would be the next steps?',
      status: 'READ',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      senderId: demoOperator.id,
      receiverId: demoFamily.id,
      content: 'Perfect! I\'ve reviewed your care needs and I have several great matches for you. Check out Sarah Thompson and Golden Years Home Care - both have excellent experience with Alzheimer\'s care. I can help coordinate intro calls if you\'re interested.',
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('  ✓ Created conversation: Family ↔ Operator');

  // Conversation 2: Operator ↔ Demo Aide (about a lead)
  await prisma.message.create({
    data: {
      senderId: demoOperator.id,
      receiverId: demoAide.id,
      content: 'Hi Sarah! I have a great opportunity for you. The Martinez family is looking for an Alzheimer\'s care specialist for their mother, 20 hours/week. Your profile is a perfect match. Are you interested?',
      status: 'READ',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      senderId: demoAide.id,
      receiverId: demoOperator.id,
      content: 'Hi Michael, yes I\'m very interested! Can you tell me more about the schedule and location?',
      status: 'READ',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      senderId: demoOperator.id,
      receiverId: demoAide.id,
      content: 'They\'re in San Francisco, looking for Monday-Friday care, 9 AM - 1 PM. The daughter Jennifer is very organized and caring. I think you two would work great together. Shall I make an introduction?',
      status: 'SENT',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('  ✓ Created conversation: Operator ↔ Aide');

  // Conversation 3: Operator ↔ Provider (about a lead)
  await prisma.message.create({
    data: {
      senderId: demoOperator.id,
      receiverId: demoProvider.id,
      content: 'Hi Robert, I have a new inquiry from the Martinez family. They\'re looking for comprehensive Alzheimer\'s care, 25 hours/week starting in 2 weeks. Are you accepting new clients?',
      status: 'READ',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      readAt: new Date(Date.now() - 23 * 60 * 60 * 1000),
    },
  });

  await prisma.message.create({
    data: {
      senderId: demoProvider.id,
      receiverId: demoOperator.id,
      content: 'Hi Michael, absolutely! We have availability and our Alzheimer\'s care team is excellent. I\'d love to schedule a consultation with the family. Can you share their contact information?',
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
  });

  console.log('  ✓ Created conversation: Operator ↔ Provider');

  // Conversation 4: Family ↔ Aide (direct inquiry)
  await prisma.message.create({
    data: {
      senderId: demoFamily.id,
      receiverId: demoAide.id,
      content: 'Hi Sarah, I found your profile and I\'m very impressed with your background in Alzheimer\'s care. Would you be available for a phone call this week to discuss a care opportunity for my mother?',
      status: 'SENT',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  });

  console.log('  ✓ Created conversation: Family ↔ Aide');

  // Conversation 5: Family ↔ Provider (direct inquiry)
  await prisma.message.create({
    data: {
      senderId: demoFamily.id,
      receiverId: demoProvider.id,
      content: 'Hello! I\'m interested in learning more about your services for Alzheimer\'s care. Do you offer a free consultation?',
      status: 'DELIVERED',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  });

  console.log('  ✓ Created conversation: Family ↔ Provider');

  // Additional message (Provider response)
  await prisma.message.create({
    data: {
      senderId: demoProvider.id,
      receiverId: demoFamily.id,
      content: 'Hi Jennifer! Yes, we offer free in-home consultations. I\'d be happy to visit and discuss your mother\'s care needs. Are you available tomorrow afternoon or Thursday morning?',
      status: 'SENT',
      createdAt: new Date(Date.now() - 11 * 60 * 60 * 1000),
    },
  });

  console.log('');

  // ==================== SUMMARY ====================
  
  console.log('✅ Demo seed completed!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📧 DEMO ACCOUNTS (Password: DemoUser123!)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('1. Family:   demo.family@carelinkai.test');
  console.log('2. Operator: demo.operator@carelinkai.test');
  console.log('3. Aide:     demo.aide@carelinkai.test');
  console.log('4. Provider: demo.provider@carelinkai.test');
  console.log('5. Admin:    demo.admin@carelinkai.test');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n📊 Created:`);
  console.log(`   • 5 demo accounts with realistic profiles`);
  console.log(`   • 6 additional caregivers (various cities)`);
  console.log(`   • 5 additional providers (various cities)`);
  console.log(`   • 4 leads (various statuses)`);
  console.log(`   • 11 messages across 5 conversations\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during demo seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
