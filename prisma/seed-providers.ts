/**
 * Provider Seed Script for CareLinkAI
 * Creates test Provider accounts with diverse, realistic data
 * 
 * Usage: npm run seed:providers or tsx prisma/seed-providers.ts
 */

import { PrismaClient, UserRole, UserStatus, CredentialStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Test provider data
const providerData = [
  {
    email: 'homecare.plus@example.com',
    password: 'Provider123!',
    firstName: 'Sarah',
    lastName: 'Johnson',
    phone: '(555) 123-4567',
    provider: {
      businessName: 'HomeCare Plus',
      contactName: 'Sarah Johnson',
      contactEmail: 'homecare.plus@example.com',
      contactPhone: '(555) 123-4567',
      serviceTypes: ['Home Care', 'Personal Care', 'Companionship'],
      coverageArea: {
        cities: ['San Francisco', 'Oakland', 'Berkeley'],
        states: ['CA'],
        zipCodes: ['94102', '94103', '94607', '94704']
      },
      bio: 'HomeCare Plus has been providing compassionate in-home care services to seniors in the Bay Area since 2010. Our team of experienced caregivers is dedicated to helping seniors maintain their independence and dignity while receiving the care they need.',
      website: 'https://homecareplus.example.com',
      insuranceInfo: 'Licensed and insured. Accepts Medicare, Medicaid, and most private insurance plans.',
      licenseNumber: 'CA-HC-123456',
      yearsInBusiness: 14,
      isVerified: true,
      isActive: true
    },
    credentials: [
      {
        type: 'Business License',
        status: 'VERIFIED' as CredentialStatus,
        expiresAt: new Date('2025-12-31'),
        notes: 'State business license verified'
      },
      {
        type: 'Insurance Certificate',
        status: 'VERIFIED' as CredentialStatus,
        expiresAt: new Date('2025-06-30'),
        notes: 'Liability insurance certificate on file'
      }
    ]
  },
  {
    email: 'senior.services@example.com',
    password: 'Provider123!',
    firstName: 'Michael',
    lastName: 'Chen',
    phone: '(555) 234-5678',
    provider: {
      businessName: 'Senior Services Inc',
      contactName: 'Michael Chen',
      contactEmail: 'senior.services@example.com',
      contactPhone: '(555) 234-5678',
      serviceTypes: ['Medical Transport', 'Home Care', 'Meal Delivery'],
      coverageArea: {
        cities: ['San Jose', 'Sunnyvale', 'Mountain View', 'Palo Alto'],
        states: ['CA'],
        zipCodes: ['95112', '95113', '94086', '94043', '94301']
      },
      bio: 'Senior Services Inc specializes in comprehensive care solutions for seniors, including medical transportation, home care assistance, and nutritious meal delivery. We pride ourselves on our reliable, professional service and our commitment to improving the quality of life for our clients.',
      website: 'https://seniorservicesinc.example.com',
      insuranceInfo: 'Fully insured and bonded. Accepts Medicare and most major insurance providers.',
      licenseNumber: 'CA-HC-234567',
      yearsInBusiness: 8,
      isVerified: true,
      isActive: true
    },
    credentials: [
      {
        type: 'Business License',
        status: 'VERIFIED' as CredentialStatus,
        expiresAt: new Date('2025-11-30'),
        notes: 'Valid state business license'
      }
    ]
  },
  {
    email: 'comfort.care@example.com',
    password: 'Provider123!',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    phone: '(555) 345-6789',
    provider: {
      businessName: 'Comfort Care Solutions',
      contactName: 'Emily Rodriguez',
      contactEmail: 'comfort.care@example.com',
      contactPhone: '(555) 345-6789',
      serviceTypes: ['Hospice Care', 'Memory Care', 'Personal Care', 'Home Care'],
      coverageArea: {
        cities: ['Sacramento', 'Elk Grove', 'Roseville'],
        states: ['CA'],
        zipCodes: ['95814', '95815', '95624', '95678']
      },
      bio: 'Comfort Care Solutions offers specialized care for seniors with memory-related conditions and those requiring end-of-life hospice support. Our compassionate team is trained in advanced dementia care techniques and provides 24/7 support to families during difficult times.',
      website: 'https://comfortcaresolutions.example.com',
      insuranceInfo: 'Medicare certified hospice provider. Accepts most insurance plans.',
      licenseNumber: 'CA-HC-345678',
      yearsInBusiness: 12,
      isVerified: true,
      isActive: true
    },
    credentials: [
      {
        type: 'Business License',
        status: 'VERIFIED' as CredentialStatus,
        expiresAt: new Date('2026-01-31'),
        notes: 'State business license in good standing'
      },
      {
        type: 'Medicare Certification',
        status: 'VERIFIED' as CredentialStatus,
        expiresAt: new Date('2025-09-30'),
        notes: 'Medicare certified provider'
      }
    ]
  },
  {
    email: 'golden.years@example.com',
    password: 'Provider123!',
    firstName: 'David',
    lastName: 'Williams',
    phone: '(555) 456-7890',
    provider: {
      businessName: 'Golden Years Home Care',
      contactName: 'David Williams',
      contactEmail: 'golden.years@example.com',
      contactPhone: '(555) 456-7890',
      serviceTypes: ['Personal Care', 'Companionship', 'Light Housekeeping', 'Meal Preparation'],
      coverageArea: {
        cities: ['Los Angeles', 'Pasadena', 'Glendale'],
        states: ['CA'],
        zipCodes: ['90001', '90012', '91101', '91201']
      },
      bio: 'Golden Years Home Care provides personalized, non-medical home care services to help seniors live independently in the comfort of their own homes. From companionship to meal preparation and light housekeeping, we tailor our services to meet each client\'s unique needs.',
      website: 'https://goldenyearshomecare.example.com',
      insuranceInfo: 'Licensed and insured. Private pay and long-term care insurance accepted.',
      licenseNumber: 'CA-HC-456789',
      yearsInBusiness: 6,
      isVerified: false,
      isActive: true
    }
  },
  {
    email: 'carebridge@example.com',
    password: 'Provider123!',
    firstName: 'Jennifer',
    lastName: 'Martinez',
    phone: '(555) 567-8901',
    provider: {
      businessName: 'CareBridge Services',
      contactName: 'Jennifer Martinez',
      contactEmail: 'carebridge@example.com',
      contactPhone: '(555) 567-8901',
      serviceTypes: ['Respite Care', 'Home Care', 'Personal Care', 'Physical Therapy Support'],
      coverageArea: {
        cities: ['San Diego', 'Chula Vista', 'La Jolla'],
        states: ['CA'],
        zipCodes: ['92101', '92102', '91910', '92037']
      },
      bio: 'CareBridge Services connects families with quality in-home care solutions, specializing in respite care for family caregivers and physical therapy support for seniors recovering from surgery or injury. Our licensed professionals are committed to excellence in care.',
      website: 'https://carebridgeservices.example.com',
      insuranceInfo: 'Accepts most major insurance plans including Medicare Advantage.',
      licenseNumber: 'CA-HC-567890',
      yearsInBusiness: 4,
      isVerified: false,
      isActive: true
    }
  }
];

async function seedProviders() {
  console.log('🌱 Starting Provider seed process...');
  
  let createdCount = 0;
  let updatedCount = 0;

  for (const data of providerData) {
    try {
      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Upsert user
      const user = await prisma.user.upsert({
        where: { email: data.email },
        update: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: UserRole.PROVIDER,
          status: UserStatus.ACTIVE,
          passwordHash,
        },
        create: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: UserRole.PROVIDER,
          status: UserStatus.ACTIVE,
          passwordHash,
        },
      });

      // Check if this is a new user or update
      const isNewUser = user.createdAt.getTime() === user.updatedAt.getTime();
      if (isNewUser) {
        createdCount++;
      } else {
        updatedCount++;
      }

      console.log(`${isNewUser ? '✨ Created' : '♻️  Updated'} user: ${user.email} (${user.id})`);

      // Upsert provider profile
      const provider = await prisma.provider.upsert({
        where: { userId: user.id },
        update: {
          businessName: data.provider.businessName,
          contactName: data.provider.contactName,
          contactEmail: data.provider.contactEmail,
          contactPhone: data.provider.contactPhone,
          serviceTypes: data.provider.serviceTypes,
          coverageArea: data.provider.coverageArea,
          bio: data.provider.bio,
          website: data.provider.website,
          insuranceInfo: data.provider.insuranceInfo,
          licenseNumber: data.provider.licenseNumber,
          yearsInBusiness: data.provider.yearsInBusiness,
          isVerified: data.provider.isVerified,
          isActive: data.provider.isActive,
        },
        create: {
          userId: user.id,
          businessName: data.provider.businessName,
          contactName: data.provider.contactName,
          contactEmail: data.provider.contactEmail,
          contactPhone: data.provider.contactPhone,
          serviceTypes: data.provider.serviceTypes,
          coverageArea: data.provider.coverageArea,
          bio: data.provider.bio,
          website: data.provider.website,
          insuranceInfo: data.provider.insuranceInfo,
          licenseNumber: data.provider.licenseNumber,
          yearsInBusiness: data.provider.yearsInBusiness,
          isVerified: data.provider.isVerified,
          isActive: data.provider.isActive,
        },
      });

      console.log(`   📋 Provider profile: ${provider.businessName} (verified: ${provider.isVerified})`);

      // Create credentials if provided
      if (data.credentials && data.credentials.length > 0) {
        for (const credData of data.credentials) {
          const credential = await prisma.providerCredential.upsert({
            where: {
              // Use a composite unique lookup (if you don't have one, we'll use create-only with skipDuplicates)
              id: `${provider.id}-${credData.type}`.substring(0, 25), // Temporary ID for upsert logic
            },
            update: {},
            create: {
              providerId: provider.id,
              type: credData.type,
              status: credData.status,
              expiresAt: credData.expiresAt,
              notes: credData.notes,
              verifiedAt: credData.status === 'VERIFIED' ? new Date() : null,
            },
          }).catch(async () => {
            // If upsert fails due to ID not existing, try to find existing or create
            const existing = await prisma.providerCredential.findFirst({
              where: {
                providerId: provider.id,
                type: credData.type,
              },
            });

            if (existing) {
              return existing;
            }

            return await prisma.providerCredential.create({
              data: {
                providerId: provider.id,
                type: credData.type,
                status: credData.status,
                expiresAt: credData.expiresAt,
                notes: credData.notes,
                verifiedAt: credData.status === 'VERIFIED' ? new Date() : null,
              },
            });
          });

          console.log(`      🔐 Credential: ${credential.type} (${credential.status})`);
        }
      }

      console.log('');
    } catch (error) {
      console.error(`❌ Error seeding provider ${data.email}:`, error);
    }
  }

  console.log('✅ Provider seed complete!');
  console.log(`   📊 Summary: ${createdCount} created, ${updatedCount} updated`);
  console.log('');
}

async function main() {
  console.log('==========================================');
  console.log('  Provider Seed Script - CareLinkAI');
  console.log('==========================================');
  console.log('');

  await seedProviders();

  // Display summary
  const totalProviders = await prisma.provider.count();
  const verifiedProviders = await prisma.provider.count({ where: { isVerified: true } });
  const totalCredentials = await prisma.providerCredential.count();

  console.log('📈 Database Summary:');
  console.log(`   Total Providers: ${totalProviders}`);
  console.log(`   Verified Providers: ${verifiedProviders}`);
  console.log(`   Total Credentials: ${totalCredentials}`);
  console.log('');
  console.log('==========================================');
}

main()
  .catch((error) => {
    console.error('❌ Fatal error during Provider seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
