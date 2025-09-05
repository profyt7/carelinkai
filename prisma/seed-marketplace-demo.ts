/**
 * Marketplace Demo Seed Script for CareLinkAI
 * 
 * This script seeds demo data for the marketplace feature:
 * - Operator user
 * - Caregiver user
 * - Marketplace listing
 * - Marketplace application
 */

import { PrismaClient, UserRole, UserStatus, ApplicationStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting marketplace demo seed...');
  
  // ==========================================
  // Create/ensure operator user exists
  // ==========================================
  const operatorPasswordHash = await bcrypt.hash('Operator123!', 10);
  
  const operatorUser = await prisma.user.upsert({
    where: { email: 'operator@carelinkai.com' },
    update: {
      passwordHash: operatorPasswordHash,
      status: UserStatus.ACTIVE
    },
    create: {
      email: 'operator@carelinkai.com',
      firstName: 'John',
      lastName: 'Operator',
      passwordHash: operatorPasswordHash,
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
      phone: '555-987-6543',
    }
  });
  
  console.log(`Operator user: ${operatorUser.email} (${operatorUser.id})`);
  
  // Create/ensure operator profile
  const operator = await prisma.operator.upsert({
    where: { userId: operatorUser.id },
    update: {
      companyName: 'Sunshine Valley Care',
    },
    create: {
      userId: operatorUser.id,
      companyName: 'Sunshine Valley Care',
    }
  });
  
  console.log(`Operator profile: ${operator.companyName} (${operator.id})`);
  
  // ==========================================
  // Create/ensure caregiver user exists
  // ==========================================
  const caregiverPasswordHash = await bcrypt.hash('Caregiver123!', 10);
  
  const caregiverUser = await prisma.user.upsert({
    where: { email: 'caregiver@carelinkai.com' },
    update: {
      passwordHash: caregiverPasswordHash,
      status: UserStatus.ACTIVE
    },
    create: {
      email: 'caregiver@carelinkai.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      passwordHash: caregiverPasswordHash,
      role: UserRole.CAREGIVER,
      status: UserStatus.ACTIVE,
      phone: '555-123-4567',
    }
  });
  
  console.log(`Caregiver user: ${caregiverUser.email} (${caregiverUser.id})`);
  
  // Create/ensure caregiver profile
  const caregiver = await prisma.caregiver.upsert({
    where: { userId: caregiverUser.id },
    update: {
      yearsExperience: 5,
      specialties: ['Dementia Care', 'Companionship'],
      hourlyRate: 25.50,
    },
    create: {
      userId: caregiverUser.id,
      yearsExperience: 5,
      specialties: ['Dementia Care', 'Companionship'],
      hourlyRate: 25.50,
      bio: 'Experienced caregiver specializing in dementia care with a compassionate approach.',
    }
  });
  
  console.log(`Caregiver profile: ID ${caregiver.id}, ${caregiver.yearsExperience} years experience`);
  
  // ==========================================
  // Create marketplace listing
  // ==========================================
  const startTime = new Date();
  startTime.setDate(startTime.getDate() + 3); // Start 3 days from now
  
  const endTime = new Date();
  endTime.setDate(endTime.getDate() + 30); // End 30 days from now
  
  const listingTitle = 'Evening Companion Care Needed';
  
  const listing = await prisma.marketplaceListing.upsert({
    where: {
      id: 'demo-listing-1', // This will always create a new listing if it doesn't exist with this ID
    },
    update: {
      title: listingTitle,
      description: 'We are seeking a compassionate caregiver to provide evening companion care for our residents at Sunshine Valley Care. The ideal candidate will engage residents in meaningful activities, assist with evening routines, and provide emotional support. Experience with memory care residents is a plus. This position offers flexible scheduling and a supportive work environment.',
      hourlyRateMin: 22,
      hourlyRateMax: 28,
      setting: 'assisted-living',
      careTypes: ['companion-care'],
      services: ['medication-prompting', 'transportation'],
      specialties: ['companionship'],
      city: 'Pleasantville',
      state: 'CA',
      zipCode: '90210',
      startTime,
      endTime,
      status: 'OPEN',
    },
    create: {
      id: 'demo-listing-1',
      title: listingTitle,
      description: 'We are seeking a compassionate caregiver to provide evening companion care for our residents at Sunshine Valley Care. The ideal candidate will engage residents in meaningful activities, assist with evening routines, and provide emotional support. Experience with memory care residents is a plus. This position offers flexible scheduling and a supportive work environment.',
      hourlyRateMin: 22,
      hourlyRateMax: 28,
      setting: 'assisted-living',
      careTypes: ['companion-care'],
      services: ['medication-prompting', 'transportation'],
      specialties: ['companionship'],
      city: 'Pleasantville',
      state: 'CA',
      zipCode: '90210',
      startTime,
      endTime,
      status: 'OPEN',
      postedByUserId: operatorUser.id,
    }
  });
  
  console.log(`Marketplace listing: "${listing.title}" (${listing.id})`);
  
  // ==========================================
  // Create marketplace application
  // ==========================================
  const application = await prisma.marketplaceApplication.upsert({
    where: {
      listingId_caregiverId: {
        listingId: listing.id,
        caregiverId: caregiver.id,
      }
    },
    update: {
      status: ApplicationStatus.APPLIED,
      note: 'I have extensive experience with companion care and would be a great fit for this position. I am available for all the requested evening shifts.',
    },
    create: {
      listingId: listing.id,
      caregiverId: caregiver.id,
      status: ApplicationStatus.APPLIED,
      note: 'I have extensive experience with companion care and would be a great fit for this position. I am available for all the requested evening shifts.',
    }
  });
  
  console.log(`Marketplace application: ID ${application.id}, status ${application.status}`);
  
  // ==========================================
  // Summary
  // ==========================================
  console.log('\nMarketplace demo seed completed successfully!');
  console.log('Summary:');
  console.log(`- Users: 2 (Operator: ${operatorUser.id}, Caregiver: ${caregiverUser.id})`);
  console.log(`- Listings: 1 (ID: ${listing.id})`);
  console.log(`- Applications: 1 (ID: ${application.id})`);
}

main()
  .catch((e) => {
    console.error('Error seeding marketplace demo data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
