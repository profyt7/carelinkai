/**
 * Unit tests for reminder scheduling and processing functions
 * 
 * Tests the core functionality of appointment reminder scheduling and delivery
 */

import { jest } from '@jest/globals';
import { scheduleUpcomingAppointmentReminders, processDueScheduledNotifications } from '@/lib/services/reminders';

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  process.env.CALENDAR_USE_MOCKS = 'false';
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

// Mock Prisma
jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      appointment: {
        findMany: jest.fn()
      },
      scheduledNotification: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      },
      user: {
        findUnique: jest.fn()
      }
    }
  };
});

// Mock EmailService
jest.mock('@/lib/email-service', () => {
  return {
    __esModule: true,
    default: {
      sendEmail: jest.fn().mockResolvedValue({ success: true })
    }
  };
});

// Mock notifications service
jest.mock('@/lib/services/notifications', () => {
  return {
    createInAppNotification: jest.fn().mockResolvedValue({ success: true, id: 'mock-notification-id' })
  };
});

// Mock SMS service
jest.mock('@/lib/services/sms', () => {
  return {
    sendSms: jest.fn().mockResolvedValue({ success: true })
  };
});

// Mock push service
jest.mock('@/lib/services/push', () => {
  return {
    sendPushToUser: jest.fn().mockResolvedValue({ sent: 1, errors: [] })
  };
});

// Import mocks after they're defined
import { prisma } from '@/lib/prisma';
import EmailService from '@/lib/email-service';
import { createInAppNotification } from '@/lib/services/notifications';
import { sendSms } from '@/lib/services/sms';
import { sendPushToUser } from '@/lib/services/push';

describe('Reminder Scheduling', () => {
  test('scheduleUpcomingAppointmentReminders schedules notifications for upcoming appointments', async () => {
    // Mock appointment data
    const mockAppointment = {
      id: 'appt-123',
      title: 'Test Appointment',
      status: 'CONFIRMED',
      startTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in the future
      createdById: 'user-123',
      participants: [
        { userId: 'user-456' }
      ],
      createdBy: {
        operator: {
          id: 'op-123',
          preferences: JSON.stringify({
            notifications: {
              reminders: {
                channels: { email: true, push: true, sms: false },
                offsets: [60, 1440]
              }
            }
          })
        }
      }
    };

    // Mock user data
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      phone: '+1234567890',
      firstName: 'Test',
      lastName: 'User',
      timezone: 'UTC',
      preferences: {
        notifications: {
          reminders: {
            channels: { email: true, push: true, sms: true },
            offsets: [30, 60]
          }
        }
      }
    };

    // Configure mocks
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointment]);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.scheduledNotification.findFirst as jest.Mock).mockResolvedValue(null); // No existing notification
    (prisma.scheduledNotification.create as jest.Mock).mockResolvedValue({
      id: 'sched-notif-123',
      userId: 'user-123',
      type: 'APPOINTMENT_REMINDER',
      method: 'EMAIL',
      status: 'PENDING',
      scheduledFor: expect.any(Date),
      payload: expect.any(Object)
    });

    // Execute function
    const result = await scheduleUpcomingAppointmentReminders(1440);

    // Assertions
    expect(result.scheduled).toBeGreaterThan(0);
    expect(result.scanned).toBe(1);
    expect(prisma.appointment.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.scheduledNotification.create).toHaveBeenCalled();
    
    // Verify that we're checking for existing notifications before creating
    expect(prisma.scheduledNotification.findFirst).toHaveBeenCalled();
  });
});

describe('Reminder Processing', () => {
  test('processDueScheduledNotifications sends notifications and updates statuses', async () => {
    // Mock scheduled notifications
    const mockScheduledNotifications = [
      {
        id: 'sched-notif-123',
        userId: 'user-123',
        type: 'APPOINTMENT_REMINDER',
        method: 'EMAIL',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000), // In the past
        payload: {
          appointmentId: 'appt-123',
          title: 'Test Appointment',
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          minutesBefore: 60,
          method: 'EMAIL',
          timezone: 'UTC'
        }
      },
      {
        id: 'sched-notif-456',
        userId: 'user-456',
        type: 'APPOINTMENT_REMINDER',
        method: 'IN_APP',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000), // In the past
        payload: {
          appointmentId: 'appt-123',
          title: 'Test Appointment',
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          minutesBefore: 60,
          method: 'IN_APP',
          timezone: 'UTC'
        }
      },
      {
        id: 'sched-notif-789',
        userId: 'user-789',
        type: 'APPOINTMENT_REMINDER',
        method: 'SMS',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000), // In the past
        payload: {
          appointmentId: 'appt-123',
          title: 'Test Appointment',
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          minutesBefore: 60,
          method: 'SMS',
          timezone: 'UTC'
        }
      },
      {
        id: 'sched-notif-101',
        userId: 'user-101',
        type: 'APPOINTMENT_REMINDER',
        method: 'PUSH',
        status: 'PENDING',
        scheduledFor: new Date(Date.now() - 1000), // In the past
        payload: {
          appointmentId: 'appt-123',
          title: 'Test Appointment',
          startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          minutesBefore: 60,
          method: 'PUSH',
          timezone: 'UTC'
        }
      }
    ];

    // Mock user data for each notification type
    const mockUsers = {
      'user-123': {
        id: 'user-123',
        email: 'email@example.com',
        phone: null,
        firstName: 'Email',
        lastName: 'User',
        timezone: 'UTC',
        preferences: {}
      },
      'user-456': {
        id: 'user-456',
        email: null,
        phone: null,
        firstName: 'InApp',
        lastName: 'User',
        timezone: 'UTC',
        preferences: {}
      },
      'user-789': {
        id: 'user-789',
        email: null,
        phone: '+1234567890',
        firstName: 'SMS',
        lastName: 'User',
        timezone: 'UTC',
        preferences: {}
      },
      'user-101': {
        id: 'user-101',
        email: null,
        phone: null,
        firstName: 'Push',
        lastName: 'User',
        timezone: 'UTC',
        preferences: {}
      }
    };

    // Configure mocks
    (prisma.scheduledNotification.findMany as jest.Mock).mockResolvedValue(mockScheduledNotifications);
    (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
      const userId = args.where.id;
      return Promise.resolve(mockUsers[userId]);
    });
    (prisma.scheduledNotification.update as jest.Mock).mockResolvedValue({
      id: expect.any(String),
      status: 'SENT'
    });

    // Execute function
    const result = await processDueScheduledNotifications(10);

    // Assertions
    expect(result.processed).toBe(4);
    expect(result.sent).toBe(4);
    expect(result.failed).toBe(0);

    // Verify email was sent
    expect(EmailService.sendEmail).toHaveBeenCalledTimes(1);
    
    // Verify in-app notification was created
    expect(createInAppNotification).toHaveBeenCalledTimes(1);
    
    // Verify SMS was sent
    expect(sendSms).toHaveBeenCalledTimes(1);
    
    // Verify push notification was sent
    expect(sendPushToUser).toHaveBeenCalledTimes(1);
    
    // Verify status updates
    expect(prisma.scheduledNotification.update).toHaveBeenCalledTimes(4);
    expect(prisma.scheduledNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.any(Object),
        data: { status: 'SENT' }
      })
    );
  });
});
