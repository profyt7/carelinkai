/**
 * Database Seed Script for CareLinkAI
 * 
 * This script populates the database with sample data for development and testing.
 * It creates users with different roles, assisted living homes, residents, and other
 * sample data to demonstrate the application's functionality.
 * 
 * Run with: npm run seed
 */
/* -----------------------------------------------------------------
   SAMPLE ACCOUNTS CREATED BY THIS SCRIPT
   ----------------------------------------------------------------
   Admin:      admin@carelinkai.com   /  Admin123!
   Families:   family1@example.com – family5@example.com / Family123!
   Operators:  operator1@example.com – operator3@example.com / Operator123!
   Caregivers, Affiliates, etc. – see generated output or Prisma Studio
   ----------------------------------------------------------------- */

import { PrismaClient, UserRole, UserStatus, HomeStatus, CareLevel, InquiryStatus, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed process...');

  // Clear existing data (comment out if you want to keep existing data)
  // NOTE:
  // ------------------------------------------------------------------
  // Seeding previously removed ALL existing data including real users.
  // Commenting-out the next line preserves current records while still
  // allowing new sample data to be inserted.  Re-enable ONLY if you
  // intentionally want a clean slate.
  // await clearDatabase();

  // Create admin user
  const adminUser = await createAdminUser();

  // Create family users and their residents
  const familyUsers = await createFamilyUsers(5);

  // Create operator users and their assisted living homes
  const operatorUsers = await createOperatorUsers(3);

  // Create caregiver users
  const caregiverUsers = await createCaregiverUsers(10);

  // Create affiliate users
  const affiliateUsers = await createAffiliateUsers(2);

  // Create inquiries and bookings
  await createInquiriesAndBookings(familyUsers, operatorUsers);

  // Create reviews
  await createReviews(familyUsers, operatorUsers, caregiverUsers);

  // Create messages between users
  await createMessages(familyUsers, operatorUsers, caregiverUsers);

  // Create audit logs
  await createAuditLogs(adminUser.id);

  console.log('✅ Database seeding completed successfully!');
}

/**
 * Clear all existing data from the database
 */
async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  // Delete in order to respect foreign key constraints
  await prisma.auditLog.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.homeReview.deleteMany({});
  await prisma.caregiverReview.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.familyWallet.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.inquiry.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.careTimelineEvent.deleteMany({});
  await prisma.resident.deleteMany({});
  await prisma.credential.deleteMany({});
  await prisma.caregiverShift.deleteMany({});
  await prisma.caregiverEmployment.deleteMany({});
  await prisma.inspection.deleteMany({});
  await prisma.license.deleteMany({});
  await prisma.homePhoto.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.assistedLivingHome.deleteMany({});
  await prisma.affiliateReferral.deleteMany({});
  await prisma.affiliate.deleteMany({});
  await prisma.caregiver.deleteMany({});
  await prisma.operator.deleteMany({});
  await prisma.family.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({});
  
  console.log('✅ Database cleared');
}

/**
 * Create an admin user
 */
async function createAdminUser() {
  console.log('👤 Creating admin user...');
  
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@carelinkai.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      phone: '555-123-4567',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      profileImageUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
      lastLoginAt: new Date(),
    },
  });
  
  console.log(`✅ Created admin user: ${admin.email}`);
  return admin;
}

/**
 * Create family users with residents
 */
async function createFamilyUsers(count: number) {
  console.log(`👨‍👩‍👧‍👦 Creating ${count} family users with residents...`);
  
  const familyUsers = [];
  
  for (let i = 1; i <= count; i++) {
    const hashedPassword = await bcrypt.hash('Family123!', 12);
    
    const user = await prisma.user.create({
      data: {
        email: `family${i}@example.com`,
        passwordHash: hashedPassword,
        firstName: `Family${i}`,
        lastName: `User`,
        phone: `555-${100 + i}-${1000 + i}`,
        role: UserRole.FAMILY,
        status: UserStatus.ACTIVE,
        profileImageUrl: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'women' : 'men'}/${i + 10}.jpg`,
        lastLoginAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      },
    });
    
    // Create family record
    const family = await prisma.family.create({
      data: {
        userId: user.id,
        emergencyContact: `Emergency Contact ${i}`,
        emergencyPhone: `555-${200 + i}-${2000 + i}`,
      },
    });
    
    // Create family wallet
    const wallet = await prisma.familyWallet.create({
      data: {
        familyId: family.id,
        balance: 1000 * i,
        stripeCustomerId: `cus_${generateRandomString(14)}`,
      },
    });
    
    // Add wallet transactions
    await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: 1000 * i,
        type: 'DEPOSIT',
        description: 'Initial deposit',
      },
    });
    
    // Create 1-3 residents per family
    const residentCount = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 1; j <= residentCount; j++) {
      const gender = j % 2 === 0 ? 'FEMALE' : 'MALE';
      const birthYear = 1930 + Math.floor(Math.random() * 30);
      const birthMonth = Math.floor(Math.random() * 12) + 1;
      const birthDay = Math.floor(Math.random() * 28) + 1;
      
      await prisma.resident.create({
        data: {
          familyId: family.id,
          firstName: gender === 'FEMALE' ? getRandomFemaleName() : getRandomMaleName(),
          lastName: `${user.lastName}${j > 1 ? '-Relative' : ''}`,
          dateOfBirth: new Date(birthYear, birthMonth - 1, birthDay),
          gender,
          status: 'INQUIRY',
          careNeeds: {
            mobilityAssistance: Math.random() > 0.5,
            medicationManagement: Math.random() > 0.3,
            bathing: Math.random() > 0.4,
            dressing: Math.random() > 0.4,
            toileting: Math.random() > 0.6,
            eating: Math.random() > 0.7,
            transferring: Math.random() > 0.5,
            continenceManagement: Math.random() > 0.6,
          },
          medicalConditions: "Hypertension, Arthritis",
          medications: "Lisinopril 10mg daily, Metformin 500mg twice daily",
          notes: "Prefers activities in the morning. Enjoys reading and classical music.",
        },
      });
    }
    
    console.log(`✅ Created family user: ${user.email} with ${residentCount} residents`);
    familyUsers.push({ user, family });
  }
  
  return familyUsers;
}

/**
 * Create operator users with assisted living homes
 */
async function createOperatorUsers(count: number) {
  console.log(`🏢 Creating ${count} operator users with assisted living homes...`);
  
  const operatorUsers = [];
  
  for (let i = 1; i <= count; i++) {
    const hashedPassword = await bcrypt.hash('Operator123!', 12);
    
    const user = await prisma.user.create({
      data: {
        email: `operator${i}@example.com`,
        passwordHash: hashedPassword,
        firstName: `Operator${i}`,
        lastName: `Manager`,
        phone: `555-${300 + i}-${3000 + i}`,
        role: UserRole.OPERATOR,
        status: UserStatus.ACTIVE,
        profileImageUrl: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'women' : 'men'}/${i + 20}.jpg`,
        lastLoginAt: new Date(Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000),
      },
    });
    
    // Create operator record
    const operator = await prisma.operator.create({
      data: {
        userId: user.id,
        companyName: `${user.firstName}'s Care Homes`,
        taxId: `12-345${i}678`,
        businessLicense: `BL-${10000 + i}`,
      },
    });
    
    // Create 1-3 assisted living homes per operator
    const homeCount = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 1; j <= homeCount; j++) {
      const homeName = getRandomHomeName();
      const careLevel = getRandomCareLevels();
      const capacity = 20 + Math.floor(Math.random() * 80);
      const currentOccupancy = Math.floor(capacity * (0.5 + Math.random() * 0.4));
      const priceMin = 3000 + Math.floor(Math.random() * 2000);
      const priceMax = priceMin + 1000 + Math.floor(Math.random() * 3000);
      
      const home = await prisma.assistedLivingHome.create({
        data: {
          operatorId: operator.id,
          name: homeName,
          description: `${homeName} is a warm and welcoming assisted living community dedicated to providing personalized care in a comfortable environment. Our trained staff is available 24/7 to assist with daily activities while promoting independence and dignity. We offer spacious accommodations, delicious meals, engaging activities, and a range of amenities to enhance quality of life.`,
          status: HomeStatus.ACTIVE,
          careLevel,
          capacity,
          currentOccupancy,
          genderRestriction: Math.random() > 0.8 ? (Math.random() > 0.5 ? 'MALE' : 'FEMALE') : null,
          priceMin,
          priceMax,
          amenities: getRandomAmenities(),
        },
      });
      
      // Create address for the home
      await prisma.address.create({
        data: {
          homeId: home.id,
          street: `${1000 + Math.floor(Math.random() * 9000)} ${getRandomStreetName()}`,
          city: getRandomCity(),
          state: getRandomState(),
          zipCode: `${10000 + Math.floor(Math.random() * 90000)}`,
          country: 'USA',
          latitude: 37.7749 + (Math.random() - 0.5) * 2,
          longitude: -122.4194 + (Math.random() - 0.5) * 2,
        },
      });
      
      // Create photos for the home
      const photoCount = Math.floor(Math.random() * 5) + 3;
      for (let k = 1; k <= photoCount; k++) {
        await prisma.homePhoto.create({
          data: {
            homeId: home.id,
            url: `https://source.unsplash.com/random/800x600/?senior,home,${k}`,
            caption: k === 1 ? `${homeName} Main View` : getRandomPhotoCaption(),
            isPrimary: k === 1,
            sortOrder: k,
          },
        });
      }
      
      // Create licenses for the home
      await prisma.license.create({
        data: {
          homeId: home.id,
          type: 'Assisted Living Facility',
          licenseNumber: `ALF-${10000 + i * 100 + j}`,
          issueDate: new Date(new Date().setFullYear(new Date().getFullYear() - 2)),
          expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          status: 'ACTIVE',
          documentUrl: `https://example.com/licenses/alf-${i}-${j}.pdf`,
        },
      });
      
      // Create inspections for the home
      await prisma.inspection.create({
        data: {
          homeId: home.id,
          inspectionDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
          inspectionType: 'Annual',
          inspector: 'State Department of Health',
          result: Math.random() > 0.8 ? 'NEEDS_IMPROVEMENT' : 'PASSED',
          findings: Math.random() > 0.8 ? 'Minor issues with documentation. To be addressed within 30 days.' : 'All standards met.',
          documentUrl: `https://example.com/inspections/report-${i}-${j}.pdf`,
        },
      });
    }
    
    console.log(`✅ Created operator user: ${user.email} with ${homeCount} homes`);
    operatorUsers.push({ user, operator });
  }
  
  return operatorUsers;
}

/**
 * Create caregiver users
 */
async function createCaregiverUsers(count: number) {
  console.log(`👩‍⚕️ Creating ${count} caregiver users...`);
  
  const caregiverUsers = [];
  
  for (let i = 1; i <= count; i++) {
    const hashedPassword = await bcrypt.hash('Caregiver123!', 12);
    const gender = i % 2 === 0 ? 'female' : 'male';
    
    const user = await prisma.user.create({
      data: {
        email: `caregiver${i}@example.com`,
        passwordHash: hashedPassword,
        firstName: gender === 'female' ? getRandomFemaleName() : getRandomMaleName(),
        lastName: `Caregiver`,
        phone: `555-${400 + i}-${4000 + i}`,
        role: UserRole.CAREGIVER,
        status: UserStatus.ACTIVE,
        profileImageUrl: `https://randomuser.me/api/portraits/${gender}/${30 + i}.jpg`,
        lastLoginAt: new Date(Date.now() - Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000),
      },
    });
    
    // Create caregiver record
    const caregiver = await prisma.caregiver.create({
      data: {
        userId: user.id,
        bio: `Experienced caregiver with ${1 + Math.floor(Math.random() * 15)} years of experience in assisted living and memory care. Compassionate and dedicated to providing quality care.`,
        yearsExperience: 1 + Math.floor(Math.random() * 15),
        hourlyRate: 18 + Math.floor(Math.random() * 12),
        availability: {
          monday: { morning: Math.random() > 0.3, afternoon: Math.random() > 0.3, evening: Math.random() > 0.3, night: Math.random() > 0.7 },
          tuesday: { morning: Math.random() > 0.3, afternoon: Math.random() > 0.3, evening: Math.random() > 0.3, night: Math.random() > 0.7 },
          wednesday: { morning: Math.random() > 0.3, afternoon: Math.random() > 0.3, evening: Math.random() > 0.3, night: Math.random() > 0.7 },
          thursday: { morning: Math.random() > 0.3, afternoon: Math.random() > 0.3, evening: Math.random() > 0.3, night: Math.random() > 0.7 },
          friday: { morning: Math.random() > 0.3, afternoon: Math.random() > 0.3, evening: Math.random() > 0.3, night: Math.random() > 0.7 },
          saturday: { morning: Math.random() > 0.5, afternoon: Math.random() > 0.5, evening: Math.random() > 0.5, night: Math.random() > 0.7 },
          sunday: { morning: Math.random() > 0.5, afternoon: Math.random() > 0.5, evening: Math.random() > 0.5, night: Math.random() > 0.7 },
        },
      },
    });
    
    // Create credentials for the caregiver
    const credentials = [
      {
        type: 'CPR Certification',
        issueDate: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      },
      {
        type: 'First Aid',
        issueDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      },
      {
        type: 'Medication Management',
        issueDate: new Date(new Date().setMonth(new Date().getMonth() - 8)),
        expirationDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)),
      },
    ];
    
    for (const credential of credentials) {
      await prisma.credential.create({
        data: {
          caregiverId: caregiver.id,
          type: credential.type,
          documentUrl: `https://example.com/credentials/${user.id}-${credential.type.toLowerCase().replace(' ', '-')}.pdf`,
          issueDate: credential.issueDate,
          expirationDate: credential.expirationDate,
          isVerified: Math.random() > 0.2,
          verifiedBy: Math.random() > 0.2 ? 'admin@carelinkai.com' : null,
          verifiedAt: Math.random() > 0.2 ? new Date(new Date().setDate(new Date().getDate() - Math.floor(Math.random() * 30))) : null,
        },
      });
    }
    
    console.log(`✅ Created caregiver user: ${user.email}`);
    caregiverUsers.push({ user, caregiver });
  }
  
  return caregiverUsers;
}

/**
 * Create affiliate users
 */
async function createAffiliateUsers(count: number) {
  console.log(`🤝 Creating ${count} affiliate users...`);
  
  const affiliateUsers = [];
  
  for (let i = 1; i <= count; i++) {
    const hashedPassword = await bcrypt.hash('Affiliate123!', 12);
    
    const user = await prisma.user.create({
      data: {
        email: `affiliate${i}@example.com`,
        passwordHash: hashedPassword,
        firstName: `Affiliate${i}`,
        lastName: `Partner`,
        phone: `555-${500 + i}-${5000 + i}`,
        role: UserRole.AFFILIATE,
        status: UserStatus.ACTIVE,
        profileImageUrl: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'women' : 'men'}/${40 + i}.jpg`,
        lastLoginAt: new Date(Date.now() - Math.floor(Math.random() * 15) * 24 * 60 * 60 * 1000),
      },
    });
    
    // Create affiliate record
    const affiliate = await prisma.affiliate.create({
      data: {
        userId: user.id,
        affiliateCode: `${user.firstName.substring(0, 3)}${user.lastName.substring(0, 3)}${1000 + i}`.toUpperCase(),
        organization: `${user.firstName}'s Senior Placement Services`,
        commissionRate: 5 + Math.floor(Math.random() * 10),
        paymentDetails: {
          paymentMethod: 'direct_deposit',
          bankName: 'First National Bank',
          accountNumber: `XXXX-XXXX-${1000 + i}`,
          routingNumber: 'XXXX-XXXX',
        },
      },
    });
    
    // Create affiliate referrals
    const referralCount = Math.floor(Math.random() * 5) + 2;
    
    for (let j = 1; j <= referralCount; j++) {
      const referredEmail = `referred${i}${j}@example.com`;
      const status = Math.random() > 0.5 ? 'CONVERTED' : 'PENDING';
      const conversionDate = status === 'CONVERTED' ? new Date(new Date().setDate(new Date().getDate() - Math.floor(Math.random() * 30))) : null;
      const commissionAmount = status === 'CONVERTED' ? 500 + Math.floor(Math.random() * 1000) : null;
      
      await prisma.affiliateReferral.create({
        data: {
          affiliateId: affiliate.id,
          referredEmail,
          referredUserId: null, // Would be set if the user registered
          status,
          conversionDate,
          commissionAmount,
          commissionPaid: status === 'CONVERTED' && Math.random() > 0.5,
        },
      });
    }
    
    console.log(`✅ Created affiliate user: ${user.email} with ${referralCount} referrals`);
    affiliateUsers.push({ user, affiliate });
  }
  
  return affiliateUsers;
}

/**
 * Create inquiries and bookings between families and homes
 */
async function createInquiriesAndBookings(familyUsers: any[], operatorUsers: any[]) {
  console.log('📝 Creating inquiries and bookings...');
  
  // Get all homes
  const homes = await prisma.assistedLivingHome.findMany({
    include: {
      operator: true,
    },
  });
  
  // For each family, create inquiries and bookings
  for (const familyUser of familyUsers) {
    // Get residents for this family
    const residents = await prisma.resident.findMany({
      where: {
        familyId: familyUser.family.id,
      },
    });
    
    if (residents.length === 0) continue;
    
    // Create 1-3 inquiries per family
    const inquiryCount = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 1; i <= inquiryCount; i++) {
      // Randomly select a home and resident
      const home = homes[Math.floor(Math.random() * homes.length)];
      const resident = residents[Math.floor(Math.random() * residents.length)];
      
      // Create inquiry
      const inquiryStatus = getRandomInquiryStatus();
      const tourDate = Math.random() > 0.3 ? new Date(new Date().setDate(new Date().getDate() + Math.floor(Math.random() * 14))) : null;
      
      const inquiry = await prisma.inquiry.create({
        data: {
          familyId: familyUser.family.id,
          homeId: home.id,
          status: inquiryStatus,
          message: `We are interested in learning more about ${home.name} for our ${resident.gender === 'MALE' ? 'father' : 'mother'} who needs assistance with daily activities.`,
          tourDate,
          aiMatchScore: 50 + Math.floor(Math.random() * 50),
        },
      });
      
      // If inquiry is advanced enough, create a booking
      if (['PLACEMENT_OFFERED', 'PLACEMENT_ACCEPTED'].includes(inquiryStatus)) {
        const moveInDate = new Date(new Date().setDate(new Date().getDate() + 7 + Math.floor(Math.random() * 30)));
        
        await prisma.booking.create({
          data: {
            familyId: familyUser.family.id,
            homeId: home.id,
            residentId: resident.id,
            inquiryId: inquiry.id,
            status: inquiryStatus === 'PLACEMENT_ACCEPTED' ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
            moveInDate,
            deposit: 1000 + Math.floor(Math.random() * 1000),
            monthlyRate: home.priceMin + Math.floor(Math.random() * (home.priceMax - home.priceMin)),
            notes: `Resident prefers a ${Math.random() > 0.5 ? 'private' : 'shared'} room with a ${Math.random() > 0.5 ? 'garden' : 'city'} view if possible.`,
          },
        });
        
        // Update resident with home assignment if booking is confirmed
        if (inquiryStatus === 'PLACEMENT_ACCEPTED') {
          await prisma.resident.update({
            where: { id: resident.id },
            data: {
              homeId: home.id,
              status: 'ACTIVE',
              admissionDate: moveInDate,
            },
          });
        }
      }
    }
  }
  
  console.log('✅ Created inquiries and bookings');
}

/**
 * Create reviews for homes and caregivers
 */
async function createReviews(familyUsers: any[], operatorUsers: any[], caregiverUsers: any[]) {
  console.log('⭐ Creating reviews...');
  
  // Get all homes
  const homes = await prisma.assistedLivingHome.findMany();
  
  // Create home reviews
  for (const home of homes) {
    // Create 2-5 reviews per home
    const reviewCount = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 1; i <= reviewCount; i++) {
      // Randomly select a family user as reviewer
      const familyUser = familyUsers[Math.floor(Math.random() * familyUsers.length)];
      const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
      
      await prisma.homeReview.create({
        data: {
          homeId: home.id,
          reviewerId: familyUser.user.id,
          rating,
          title: getRandomReviewTitle(rating),
          content: getRandomReviewContent(rating),
          isPublic: Math.random() > 0.1,
          isVerified: Math.random() > 0.3,
        },
      });
    }
  }
  
  // Create caregiver reviews
  for (const caregiverUser of caregiverUsers) {
    // Create 0-3 reviews per caregiver
    const reviewCount = Math.floor(Math.random() * 4);
    
    for (let i = 1; i <= reviewCount; i++) {
      // Randomly select a family user as reviewer
      const familyUser = familyUsers[Math.floor(Math.random() * familyUsers.length)];
      const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
      
      await prisma.caregiverReview.create({
        data: {
          caregiverId: caregiverUser.caregiver.id,
          reviewerId: familyUser.user.id,
          rating,
          title: getRandomCaregiverReviewTitle(rating),
          content: getRandomCaregiverReviewContent(rating),
          isPublic: Math.random() > 0.1,
        },
      });
    }
  }
  
  console.log('✅ Created reviews');
}

/**
 * Create messages between users
 */
async function createMessages(familyUsers: any[], operatorUsers: any[], caregiverUsers: any[]) {
  console.log('💬 Creating messages...');
  
  // Create family-operator messages
  for (const familyUser of familyUsers) {
    // Randomly select an operator
    const operatorUser = operatorUsers[Math.floor(Math.random() * operatorUsers.length)];
    
    // Create a conversation (3-7 messages)
    const messageCount = Math.floor(Math.random() * 5) + 3;
    
    for (let i = 1; i <= messageCount; i++) {
      const isFromFamily = i % 2 === 1;
      const sender = isFromFamily ? familyUser.user : operatorUser.user;
      const receiver = isFromFamily ? operatorUser.user : familyUser.user;
      
      await prisma.message.create({
        data: {
          senderId: sender.id,
          receiverId: receiver.id,
          content: getRandomMessage(isFromFamily),
          status: Math.random() > 0.3 ? 'READ' : 'DELIVERED',
          readAt: Math.random() > 0.3 ? new Date(new Date().setMinutes(new Date().getMinutes() - Math.floor(Math.random() * 60))) : null,
        },
      });
    }
  }
  
  console.log('✅ Created messages');
}

/**
 * Create audit logs
 */
async function createAuditLogs(adminId: string) {
  console.log('📝 Creating audit logs...');
  
  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      role: true,
    },
  });
  
  // Create 50 random audit logs
  for (let i = 1; i <= 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = getRandomAuditAction();
    const resourceType = getRandomResourceType(user.role);
    
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        actionedBy: Math.random() > 0.9 ? adminId : null,
        action,
        resourceType,
        resourceId: `resource-${generateRandomString(8)}`,
        description: getRandomAuditDescription(action, resourceType),
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: getRandomUserAgent(),
        metadata: {
          browser: getRandomBrowser(),
          os: getRandomOS(),
          device: getRandomDevice(),
        },
      },
    });
  }
  
  console.log('✅ Created audit logs');
}

// Helper functions for generating random data

function getRandomMaleName(): string {
  const names = [
    'James', 'Robert', 'John', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles',
    'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald', 'Steven', 'Paul', 'Andrew', 'Joshua',
    'Kenneth', 'Kevin', 'Brian', 'George', 'Edward', 'Ronald', 'Timothy', 'Jason', 'Jeffrey', 'Ryan',
    'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon',
    'Benjamin', 'Samuel', 'Gregory', 'Frank', 'Alexander', 'Raymond', 'Patrick', 'Jack', 'Dennis', 'Jerry'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function getRandomFemaleName(): string {
  const names = [
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen',
    'Nancy', 'Lisa', 'Betty', 'Margaret', 'Sandra', 'Ashley', 'Kimberly', 'Emily', 'Donna', 'Michelle',
    'Dorothy', 'Carol', 'Amanda', 'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia',
    'Kathleen', 'Amy', 'Shirley', 'Angela', 'Helen', 'Anna', 'Brenda', 'Pamela', 'Nicole', 'Emma',
    'Samantha', 'Katherine', 'Christine', 'Debra', 'Rachel', 'Catherine', 'Carolyn', 'Janet', 'Ruth', 'Maria'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function getRandomHomeName(): string {
  const prefixes = [
    'Sunrise', 'Golden', 'Peaceful', 'Serene', 'Harmony', 'Tranquil', 'Pleasant', 'Evergreen', 'Willow', 'Oak',
    'Maple', 'Cedar', 'Pine', 'Birch', 'Magnolia', 'Rosewood', 'Heritage', 'Legacy', 'Traditions', 'Generations'
  ];
  
  const suffixes = [
    'Gardens', 'Meadows', 'Estates', 'Terrace', 'Manor', 'Village', 'Commons', 'Place', 'Residence', 'Living',
    'Retreat', 'Haven', 'Sanctuary', 'Oasis', 'Heights', 'Hills', 'Valley', 'Ridge', 'Pines', 'Acres'
  ];
  
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

function getRandomStreetName(): string {
  const names = [
    'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine St', 'Elm Rd', 'Washington Ave', 'Park Pl',
    'Highland Dr', 'Sunset Blvd', 'Lake View Dr', 'Forest Ave', 'River Rd', 'Meadow Ln', 'Valley View Rd',
    'Mountain View Dr', 'Spring St', 'Willow Way', 'Chestnut St', 'Magnolia Ave'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function getRandomCity(): string {
  const cities = [
    'San Francisco', 'Los Angeles', 'San Diego', 'Sacramento', 'Oakland', 'San Jose', 'Fresno', 'Bakersfield',
    'Anaheim', 'Santa Ana', 'Riverside', 'Stockton', 'Irvine', 'Chula Vista', 'Fremont', 'Santa Clarita',
    'San Bernardino', 'Modesto', 'Fontana', 'Moreno Valley', 'Santa Rosa', 'Glendale', 'Huntington Beach',
    'Oxnard', 'Rancho Cucamonga', 'Oceanside', 'Ontario', 'Santa Barbara', 'Palm Springs', 'Napa'
  ];
  return cities[Math.floor(Math.random() * cities.length)];
}

function getRandomState(): string {
  return 'CA'; // Using only California for simplicity
}

function getRandomCareLevels(): CareLevel[] {
  const allLevels: CareLevel[] = ['INDEPENDENT', 'ASSISTED', 'MEMORY_CARE', 'SKILLED_NURSING'];
  const count = 1 + Math.floor(Math.random() * 3); // 1-3 care levels
  const levels: CareLevel[] = [];
  
  // Always include ASSISTED
  levels.push('ASSISTED');
  
  // Add other random levels
  while (levels.length < count) {
    const level = allLevels[Math.floor(Math.random() * allLevels.length)];
    if (!levels.includes(level)) {
      levels.push(level);
    }
  }
  
  return levels;
}

function getRandomAmenities(): string[] {
  const allAmenities = [
    'Private Rooms', 'Semi-Private Rooms', 'Furnished Rooms', 'Private Bathrooms', 'Kitchenettes',
    'Emergency Call System', 'Housekeeping', 'Laundry Service', 'Linen Service', 'Medication Management',
    'Transportation', 'Beauty Salon', 'Barber Shop', 'Library', 'Game Room', 'Activity Room',
    'Fitness Center', 'Chapel', 'Garden', 'Patio', 'Walking Paths', 'Dining Room', 'Private Dining',
    'Cafe', 'Theater', 'Computer Room', 'Swimming Pool', 'Hot Tub', 'Pet Friendly', 'Guest Accommodations',
    '24-Hour Staff', 'Security System', 'Scheduled Activities', 'WiFi', 'Cable TV'
  ];
  
  const count = 10 + Math.floor(Math.random() * 15); // 10-25 amenities
  const amenities: string[] = [];
  
  while (amenities.length < count) {
    const amenity = allAmenities[Math.floor(Math.random() * allAmenities.length)];
    if (!amenities.includes(amenity)) {
      amenities.push(amenity);
    }
  }
  
  return amenities;
}

function getRandomPhotoCaption(): string {
  const captions = [
    'Exterior View', 'Main Entrance', 'Lobby', 'Reception Area', 'Common Area', 'Dining Room',
    'Private Room', 'Semi-Private Room', 'Bathroom', 'Kitchen', 'Activity Room', 'Garden',
    'Patio', 'Walking Path', 'Library', 'Game Room', 'Fitness Center', 'Beauty Salon',
    'Transportation Service', 'Staff Members', 'Residents Enjoying Activities'
  ];
  return captions[Math.floor(Math.random() * captions.length)];
}

function getRandomInquiryStatus(): InquiryStatus {
  const statuses: InquiryStatus[] = ['NEW', 'CONTACTED', 'TOUR_SCHEDULED', 'TOUR_COMPLETED', 'PLACEMENT_OFFERED', 'PLACEMENT_ACCEPTED', 'CLOSED_LOST'];
  const weights = [10, 20, 15, 20, 15, 15, 5]; // Higher weight = more likely
  
  let totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) {
      return statuses[i];
    }
    random -= weights[i];
  }
  
  return 'NEW';
}

function getRandomReviewTitle(rating: number): string {
  if (rating >= 5) {
    const titles = [
      'Exceptional Care and Attention', 'Couldn\'t Be Happier', 'A True Home Away From Home',
      'Outstanding Staff and Facilities', 'Exceeds All Expectations'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  } else if (rating >= 4) {
    const titles = [
      'Very Good Experience Overall', 'Caring Staff Makes the Difference', 'Comfortable and Well-Maintained',
      'Great Care, Minor Improvements Needed', 'Would Recommend to Others'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  } else {
    const titles = [
      'Good But Room for Improvement', 'Adequate Care, Some Concerns', 'Mixed Experience',
      'Some Good Points, Some Challenges', 'Average Experience'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }
}

function getRandomReviewContent(rating: number): string {
  if (rating >= 5) {
    return 'We are extremely pleased with the care our loved one receives here. The staff is attentive, compassionate, and professional. The facility is clean, well-maintained, and has a warm, inviting atmosphere. Activities are engaging and appropriate. Meals are nutritious and accommodating of dietary needs. Communication with family members is excellent. Highly recommend!';
  } else if (rating >= 4) {
    return 'Overall, we\'ve had a positive experience with this facility. The care staff is attentive and kind, and the facility is generally well-kept. Activities are varied and engaging. There have been a few minor communication issues, but they were quickly addressed. The food quality is good, though could use more variety. Would recommend to others looking for assisted living options.';
  } else {
    return 'Our experience has been adequate but with some concerns. While most staff members are caring, response times can be slow during busy periods. The facility is clean but showing signs of wear in some areas. Activities are limited and could be more engaging. Communication is inconsistent. Meals are basic but nutritionally sound. With some improvements, this could be a much better facility.';
  }
}

function getRandomCaregiverReviewTitle(rating: number): string {
  if (rating >= 5) {
    const titles = [
      'Compassionate and Professional', 'Above and Beyond Care', 'A True Blessing',
      'Exceptional Caregiver', 'Couldn\'t Ask for Better'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  } else if (rating >= 4) {
    const titles = [
      'Reliable and Caring', 'Very Good Caregiver', 'Dependable and Kind',
      'Professional and Attentive', 'Great Experience Overall'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  } else {
    const titles = [
      'Good but Some Concerns', 'Adequate Care', 'Room for Improvement',
      'Mixed Experience', 'Satisfactory Service'
    ];
    return titles[Math.floor(Math.random() * titles.length)];
  }
}

function getRandomCaregiverReviewContent(rating: number): string {
  if (rating >= 5) {
    return 'This caregiver has been exceptional in every way. They are compassionate, attentive to details, and truly care about the wellbeing of my loved one. Always punctual and reliable, they go above and beyond what is expected. Their communication is excellent, and they have become like family to us. I cannot recommend them highly enough!';
  } else if (rating >= 4) {
    return 'We\'ve had a very good experience with this caregiver. They are professional, reliable, and genuinely care about providing quality service. They handle challenging situations well and are good at following care instructions. Communication is generally good, though occasionally needs follow-up. Overall, they provide dependable care that gives us peace of mind.';
  } else {
    return 'This caregiver provides adequate care but there is room for improvement. While they are generally kind and attentive, there have been some inconsistencies in care quality. Sometimes they seem rushed or distracted. Communication could be better and more proactive. They do follow basic care instructions but don\'t always show initiative when unexpected situations arise.';
  }
}

function getRandomMessage(isFromFamily: boolean): string {
  if (isFromFamily) {
    const messages = [
      "Hello, I'm interested in learning more about your facility for my mother who needs assisted living care.",
      'Could you please send me information about your room availability and pricing?',
      'What kind of activities do you offer for residents?',
      'Do you have private rooms available? My father prefers his own space.',
      'How do you handle medication management for residents?',
      'What is your staff-to-resident ratio during daytime and nighttime hours?',
      'Can you accommodate special dietary restrictions?',
      'Is transportation provided for medical appointments?',
      'What security measures do you have in place?',
      "We'd like to schedule a tour. What days and times are available next week?"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  } else {
    const messages = [
      "Thank you for your interest in our community! We'd be happy to provide more information about our services.",
      'Yes, we currently have availability. Our pricing starts at $3,500 per month, depending on the level of care needed.',
      'We offer a wide range of activities including arts and crafts, music therapy, gentle exercise classes, and regular outings.',
      'We do have private rooms available. They include a private bathroom, emergency call system, and space for personal furnishings.',
      'Our trained staff administers medications according to physician orders and maintains detailed records of all medications.',
      'Our daytime ratio is 1:8 and nighttime is 1:12, exceeding the state requirements for assisted living.',
      'Absolutely, we can accommodate most dietary restrictions including diabetic, low-sodium, and texture-modified diets.',
      'Yes, we provide scheduled transportation for medical appointments within a 15-mile radius.',
      'We have 24/7 staffing, secured entrances with keypad access, and emergency response systems in all rooms.',
      "We'd be delighted to give you a tour. We have availability on Tuesday at 10 AM or Thursday at 2 PM. Would either of those work for you?"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

function getRandomAuditAction(): string {
  const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'ACCESS_DENIED', 'OTHER'];
  const weights = [15, 40, 20, 5, 10, 5, 3, 1, 1, 0]; // Higher weight = more likely
  
  let totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) {
      return actions[i];
    }
    random -= weights[i];
  }
  
  return 'READ';
}

function getRandomResourceType(role: string): string {
  if (role === 'FAMILY') {
    const types = ['Resident', 'AssistedLivingHome', 'Inquiry', 'Booking', 'Payment', 'Message', 'Document'];
    return types[Math.floor(Math.random() * types.length)];
  } else if (role === 'OPERATOR') {
    const types = ['AssistedLivingHome', 'Caregiver', 'Resident', 'Booking', 'Inquiry', 'Payment', 'Message', 'Document'];
    return types[Math.floor(Math.random() * types.length)];
  } else if (role === 'CAREGIVER') {
    const types = ['CaregiverShift', 'Resident', 'Message', 'Document'];
    return types[Math.floor(Math.random() * types.length)];
  } else if (role === 'ADMIN') {
    const types = ['User', 'AssistedLivingHome', 'Resident', 'Caregiver', 'Booking', 'Payment', 'Document', 'AuditLog'];
    return types[Math.floor(Math.random() * types.length)];
  } else {
    const types = ['User', 'AssistedLivingHome', 'Resident', 'Message'];
    return types[Math.floor(Math.random() * types.length)];
  }
}

function getRandomAuditDescription(action: string, resourceType: string): string {
  if (action === 'CREATE') {
    return `Created new ${resourceType.toLowerCase()}`;
  } else if (action === 'READ') {
    return `Viewed ${resourceType.toLowerCase()} details`;
  } else if (action === 'UPDATE') {
    return `Updated ${resourceType.toLowerCase()} information`;
  } else if (action === 'DELETE') {
    return `Deleted ${resourceType.toLowerCase()}`;
  } else if (action === 'LOGIN') {
    return `User logged in successfully`;
  } else if (action === 'LOGOUT') {
    return `User logged out`;
  } else if (action === 'EXPORT') {
    return `Exported ${resourceType.toLowerCase()} data`;
  } else if (action === 'IMPORT') {
    return `Imported ${resourceType.toLowerCase()} data`;
  } else if (action === 'ACCESS_DENIED') {
    return `Attempted unauthorized access to ${resourceType.toLowerCase()}`;
  } else {
    return `Performed action on ${resourceType.toLowerCase()}`;
  }
}

function getRandomUserAgent(): string {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function getRandomBrowser(): string {
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
  return browsers[Math.floor(Math.random() * browsers.length)];
}

function getRandomOS(): string {
  const os = ['Windows 10', 'Windows 11', 'macOS', 'iOS', 'Android', 'Linux'];
  return os[Math.floor(Math.random() * os.length)];
}

function getRandomDevice(): string {
  const devices = ['Desktop', 'Laptop', 'iPhone', 'iPad', 'Android Phone', 'Android Tablet'];
  return devices[Math.floor(Math.random() * devices.length)];
}

function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Execute the main function and handle errors
main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Close Prisma client connection
    await prisma.$disconnect();
  });
