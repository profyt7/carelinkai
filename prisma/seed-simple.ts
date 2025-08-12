/**
 * Simple Database Seed Script for CareLinkAI
 * 
 * This script creates:
 * 1. An admin user (admin@carelinkai.com / Admin123!)
 * 2. One assisted living home for testing
 */

import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  UserRole,
  UserStatus,
  HomeStatus,
  CareLevel,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@carelinkai.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      phone: '555-123-4567',
    }
  });
  
  console.log(`Created admin user: ${adminUser.email}`);
  
  // Create operator user
  const operatorUser = await prisma.user.create({
    data: {
      email: 'operator@carelinkai.com',
      firstName: 'John',
      lastName: 'Operator',
      passwordHash,
      role: UserRole.OPERATOR,
      status: UserStatus.ACTIVE,
      phone: '555-987-6543',
    }
  });
  
  // Create operator profile
  const operator = await prisma.operator.create({
    data: {
      userId: operatorUser.id,
      companyName: 'Sunshine Valley Care',
    }
  });
  
  console.log(`Created operator: ${operator.companyName}`);
  
  // Create assisted living home
  const home = await prisma.assistedLivingHome.create({
    data: {
      operatorId: operator.id,
      name: 'Sunshine Valley Care Home',
      description: 'A beautiful assisted living facility with 24/7 care, located in a peaceful neighborhood with gardens and walking paths.',
      status: HomeStatus.ACTIVE,
      careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE],
      capacity: 50,
      currentOccupancy: 42,
      priceMin: 3500,
      priceMax: 5000,
      amenities: [
        'Private Rooms',
        'Dining Room',
        'Garden',
        'Activity Room',
        'Library',
        'Fitness Center',
        'Beauty Salon',
        'Transportation Services'
      ],
      address: {
        create: {
          street: '123 Care Lane',
          city: 'Pleasantville',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
          latitude: 34.0522,
          longitude: -118.2437
        }
      }
    }
  });
  
  console.log(`Created assisted living home: ${home.name}`);
  
  // Add a photo for the home
  await prisma.homePhoto.create({
    data: {
      homeId: home.id,
      url: 'https://example.com/home-photo.jpg',
      caption: 'Front view of Sunshine Valley Care Home',
      isPrimary: true,
      sortOrder: 1
    }
  });

  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
