/**
 * Appointment Seed Script for CareLinkAI Calendar
 * Creates demo appointments with realistic data across different types and statuses
 */

import { config } from 'dotenv';
config(); // Load .env file

import { PrismaClient, AppointmentType, AppointmentStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗓️  Starting appointment seed...\n');

  // Find existing users to assign as creators and participants
  const adminUser = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });

  const operatorUser = await prisma.user.findFirst({
    where: { role: UserRole.OPERATOR },
  });

  const caregiverUsers = await prisma.user.findMany({
    where: { role: UserRole.CAREGIVER },
    take: 3,
  });

  const familyUsers = await prisma.user.findMany({
    where: { role: UserRole.FAMILY },
    take: 2,
  });

  // Find existing homes and residents
  const homes = await prisma.assistedLivingHome.findMany({
    take: 3,
  });

  const residents = await prisma.resident.findMany({
    take: 3,
  });

  if (!adminUser && !operatorUser) {
    console.log('⚠️  No users found in database. Please run main seed first.');
    return;
  }

  const creator = adminUser || operatorUser;
  if (!creator) {
    console.log('⚠️  No creator user found.');
    return;
  }

  console.log('📝 Creating appointments...');

  // Get current date for reference
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Helper to create date with time
  const createDateTime = (daysOffset: number, hour: number, minute: number = 0) => {
    const date = new Date(today);
    date.setDate(date.getDate() + daysOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
  };

  // Define appointments to create
  const appointmentsData = [
    // Past appointments
    {
      type: AppointmentType.CARE_EVALUATION,
      status: AppointmentStatus.COMPLETED,
      title: 'Initial Care Assessment - Mary Johnson',
      description: 'Comprehensive assessment of care needs and current health status.',
      startTime: createDateTime(-7, 10, 0),
      endTime: createDateTime(-7, 11, 30),
      homeId: homes[0]?.id,
      residentId: residents[0]?.id,
      notes: 'Assessment completed successfully. Patient requires assistance with daily activities.',
      location: {
        address: homes[0]?.name || 'Sunny Meadows Assisted Living',
        room: 'Evaluation Room A',
      },
    },
    {
      type: AppointmentType.FACILITY_TOUR,
      status: AppointmentStatus.COMPLETED,
      title: 'New Family Facility Tour',
      description: 'Tour of the facility including common areas, dining, and sample rooms.',
      startTime: createDateTime(-5, 14, 0),
      endTime: createDateTime(-5, 15, 0),
      homeId: homes[0]?.id,
      location: {
        address: homes[0]?.name || 'Sunny Meadows Assisted Living',
        room: 'Main Entrance',
      },
    },
    {
      type: AppointmentType.CAREGIVER_SHIFT,
      status: AppointmentStatus.COMPLETED,
      title: 'Morning Care Shift - Alice Williams',
      description: 'Regular care duties including medication administration and mobility support.',
      startTime: createDateTime(-3, 7, 0),
      endTime: createDateTime(-3, 15, 0),
      homeId: homes[0]?.id,
      residentId: residents[0]?.id,
      notes: 'Shift completed without issues. All medications administered on schedule.',
    },

    // Today's appointments
    {
      type: AppointmentType.MEDICAL_APPOINTMENT,
      status: AppointmentStatus.CONFIRMED,
      title: 'Doctor Checkup - Robert Smith',
      description: 'Regular checkup with primary care physician.',
      startTime: createDateTime(0, 9, 0),
      endTime: createDateTime(0, 10, 0),
      residentId: residents[1]?.id,
      location: {
        address: 'Medical Plaza, 456 Health St',
        room: 'Suite 201',
      },
    },
    {
      type: AppointmentType.FAMILY_VISIT,
      status: AppointmentStatus.CONFIRMED,
      title: 'Family Weekend Visit',
      description: 'Scheduled family visit with private time in the common area.',
      startTime: createDateTime(0, 14, 0),
      endTime: createDateTime(0, 16, 0),
      homeId: homes[0]?.id,
      residentId: residents[0]?.id,
      location: {
        address: homes[0]?.name || 'Sunny Meadows Assisted Living',
        room: 'Family Room B',
      },
    },

    // Tomorrow's appointments
    {
      type: AppointmentType.CAREGIVER_SHIFT,
      status: AppointmentStatus.CONFIRMED,
      title: 'Evening Care Shift - Carol Davis',
      description: 'Evening care duties and overnight monitoring.',
      startTime: createDateTime(1, 15, 0),
      endTime: createDateTime(1, 23, 0),
      homeId: homes[1]?.id,
      residentId: residents[2]?.id,
      location: {
        address: homes[1]?.name || 'Golden Years Care',
      },
    },
    {
      type: AppointmentType.SOCIAL_EVENT,
      status: AppointmentStatus.CONFIRMED,
      title: 'Community Game Night',
      description: 'Community social event with games, refreshments, and socialization.',
      startTime: createDateTime(1, 18, 0),
      endTime: createDateTime(1, 20, 0),
      homeId: homes[0]?.id,
      location: {
        address: homes[0]?.name || 'Sunny Meadows Assisted Living',
        room: 'Activity Center',
      },
    },

    // Future appointments
    {
      type: AppointmentType.CONSULTATION,
      status: AppointmentStatus.PENDING,
      title: 'Care Planning Consultation',
      description: 'Discussion of care options and planning for future needs.',
      startTime: createDateTime(3, 10, 0),
      endTime: createDateTime(3, 11, 30),
      homeId: homes[0]?.id,
      residentId: residents[0]?.id,
      location: {
        address: homes[0]?.name || 'Sunny Meadows Assisted Living',
        room: 'Conference Room A',
      },
    },
    {
      type: AppointmentType.FACILITY_TOUR,
      status: AppointmentStatus.CONFIRMED,
      title: 'Prospective Resident Visit',
      description: 'Tour for prospective resident and family members.',
      startTime: createDateTime(5, 14, 0),
      endTime: createDateTime(5, 15, 30),
      homeId: homes[1]?.id,
      location: {
        address: homes[1]?.name || 'Golden Years Care',
        room: 'Main Lobby',
      },
    },
    {
      type: AppointmentType.ADMIN_MEETING,
      status: AppointmentStatus.CONFIRMED,
      title: 'Staff Performance Review',
      description: 'Review of staff performance and discussion of improvement opportunities.',
      startTime: createDateTime(7, 13, 0),
      endTime: createDateTime(7, 14, 30),
      homeId: homes[0]?.id,
      location: {
        address: homes[0]?.name || 'Sunny Meadows Assisted Living',
        room: 'Director Office',
      },
    },
    {
      type: AppointmentType.CARE_EVALUATION,
      status: AppointmentStatus.CONFIRMED,
      title: 'Quarterly Care Review',
      description: 'Review of current care plan and discussion of any necessary adjustments.',
      startTime: createDateTime(10, 10, 0),
      endTime: createDateTime(10, 11, 30),
      homeId: homes[0]?.id,
      residentId: residents[0]?.id,
      location: {
        address: homes[0]?.name || 'Sunny Meadows Assisted Living',
        room: 'Evaluation Room B',
      },
    },
    {
      type: AppointmentType.MEDICAL_APPOINTMENT,
      status: AppointmentStatus.PENDING,
      title: 'Physical Therapy Session',
      description: 'Therapy session to improve mobility and strength.',
      startTime: createDateTime(14, 11, 0),
      endTime: createDateTime(14, 12, 0),
      residentId: residents[1]?.id,
      location: {
        address: 'Therapy Center, 789 Wellness Ave',
        room: 'Therapy Room 3',
      },
    },

    // Recurring appointments (weekly caregiver shifts)
    {
      type: AppointmentType.CAREGIVER_SHIFT,
      status: AppointmentStatus.CONFIRMED,
      title: 'Weekly Morning Shift - Monday',
      description: 'Regular Monday morning care shift.',
      startTime: createDateTime(21, 7, 0), // 3 weeks out
      endTime: createDateTime(21, 15, 0),
      homeId: homes[0]?.id,
      residentId: residents[0]?.id,
      recurrence: {
        frequency: 'WEEKLY',
        daysOfWeek: ['MONDAY'],
        occurrences: 12,
      },
    },
    {
      type: AppointmentType.SOCIAL_EVENT,
      status: AppointmentStatus.CONFIRMED,
      title: 'Weekly Movie Screening',
      description: 'Weekly Friday evening movie night for residents.',
      startTime: createDateTime(26, 19, 0), // Friday, ~4 weeks out
      endTime: createDateTime(26, 21, 0),
      homeId: homes[0]?.id,
      recurrence: {
        frequency: 'WEEKLY',
        daysOfWeek: ['FRIDAY'],
        occurrences: 8,
      },
      location: {
        address: homes[0]?.name || 'Sunny Meadows Assisted Living',
        room: 'Theater Room',
      },
    },

    // Cancelled appointment
    {
      type: AppointmentType.FAMILY_VISIT,
      status: AppointmentStatus.CANCELLED,
      title: 'Family Visit - Cancelled',
      description: 'Family visit that was cancelled due to scheduling conflict.',
      startTime: createDateTime(8, 15, 0),
      endTime: createDateTime(8, 17, 0),
      homeId: homes[0]?.id,
      residentId: residents[0]?.id,
      metadata: {
        cancelledAt: new Date().toISOString(),
        cancelReason: 'Family had scheduling conflict, will reschedule',
      },
    },
  ];

  // Create appointments
  let createdCount = 0;
  for (const appointmentData of appointmentsData) {
    try {
      const appointment = await prisma.appointment.create({
        data: {
          ...appointmentData,
          location: appointmentData.location ? JSON.stringify(appointmentData.location) : null,
          recurrence: appointmentData.recurrence ? JSON.stringify(appointmentData.recurrence) : null,
          metadata: appointmentData.metadata ? JSON.stringify(appointmentData.metadata) : null,
          createdById: creator.id,
        },
      });

      // Add participants for some appointments
      if (
        appointmentData.type === AppointmentType.FAMILY_VISIT &&
        familyUsers.length > 0
      ) {
        await prisma.appointmentParticipant.create({
          data: {
            appointmentId: appointment.id,
            userId: familyUsers[0]!.id,
            name: `${familyUsers[0]!.firstName} ${familyUsers[0]!.lastName}`,
            role: UserRole.FAMILY,
            status: 'ACCEPTED',
          },
        });
      } else if (
        appointmentData.type === AppointmentType.CAREGIVER_SHIFT &&
        caregiverUsers.length > 0
      ) {
        await prisma.appointmentParticipant.create({
          data: {
            appointmentId: appointment.id,
            userId: caregiverUsers[createdCount % caregiverUsers.length]!.id,
            name: `${caregiverUsers[createdCount % caregiverUsers.length]!.firstName} ${caregiverUsers[createdCount % caregiverUsers.length]!.lastName}`,
            role: UserRole.CAREGIVER,
            status: 'ACCEPTED',
          },
        });
      } else if (
        appointmentData.type === AppointmentType.ADMIN_MEETING &&
        operatorUser
      ) {
        await prisma.appointmentParticipant.create({
          data: {
            appointmentId: appointment.id,
            userId: operatorUser.id,
            name: `${operatorUser.firstName} ${operatorUser.lastName}`,
            role: UserRole.OPERATOR,
            status: 'ACCEPTED',
          },
        });
      }

      createdCount++;
      console.log(`  ✓ Created: ${appointmentData.title}`);
    } catch (error: any) {
      console.error(`  ✗ Failed to create appointment: ${appointmentData.title}`);
      console.error(`    Error: ${error?.message || error}`);
    }
  }

  console.log(`\n✅ Appointment seed complete! Created ${createdCount}/${appointmentsData.length} appointments.`);
}

main()
  .catch((e) => {
    console.error('Error during appointment seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
