/**
 * Appointment Reminder Scheduling and Processing Service
 * 
 * This module handles the scheduling and processing of appointment reminders:
 * - scheduleUpcomingAppointmentReminders: Creates scheduled notifications for upcoming appointments
 * - processDueScheduledNotifications: Processes due notifications and sends them via appropriate channels
 */

import { prisma } from '@/lib/prisma';
import EmailService from '@/lib/email-service';
import { createInAppNotification } from '@/lib/services/notifications';
import { sendSms } from '@/lib/services/sms';
import { sendPushToUser } from '@/lib/services/push';

/**
 * Schedules notifications for upcoming appointments within a time window
 * 
 * @param windowMinutes - Number of minutes to look ahead for appointments
 * @returns Statistics about the scheduling operation
 */
export async function scheduleUpcomingAppointmentReminders(windowMinutes: number): Promise<{ 
  scheduled: number; 
  scanned: number; 
  skippedExisting: number; 
  durationMs: number 
}> {
  const startTime = Date.now();
  
  // Check if using mocks and return early if so
  if (process.env['CALENDAR_USE_MOCKS'] === 'true') {
    return {
      scheduled: 0,
      scanned: 0,
      skippedExisting: 0,
      durationMs: Date.now() - startTime
    };
  }
  
  // Initialize counters
  let scheduled = 0;
  let scanned = 0;
  let skippedExisting = 0;
  
  // Calculate time window
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000);
  
  // Query upcoming appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      startTime: {
        gte: now,
        lte: windowEnd
      }
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      createdById: true,
      participants: {
        select: {
          userId: true
        }
      },
      createdBy: {
        select: {
          operator: {
            select: {
              id: true,
              preferences: true
            }
          }
        }
      }
    }
  });
  
  scanned = appointments.length;
  
  // Process each appointment
  for (const appointment of appointments) {
    // Determine recipients (creator + participants)
    const recipientIds = new Set<string>([
      appointment.createdById,
      ...appointment.participants.map(p => p.userId)
    ]);
    
    // Determine reminder preferences
    let defaultChannels = { email: true, push: true, sms: false };
    let defaultOffsets = [60]; // 60 minutes before by default
    
    // Check for operator preferences
    if (appointment.createdBy?.operator?.preferences) {
      const operatorPrefs = appointment.createdBy.operator.preferences;
      
      // Handle both string and object formats
      const prefs = typeof operatorPrefs === 'string' 
        ? JSON.parse(operatorPrefs) 
        : operatorPrefs;
      
      // Merge preferences if available
      if (prefs?.notifications?.reminders?.channels) {
        defaultChannels = {
          ...defaultChannels,
          ...prefs.notifications.reminders.channels
        };
      }
      
      if (prefs?.notifications?.reminders?.offsets) {
        defaultOffsets = prefs.notifications.reminders.offsets;
      }
    }
    
    // Map channels to notification methods
    const enabledMethods = [];
    if (defaultChannels.email) enabledMethods.push('EMAIL');
    if (defaultChannels.push) enabledMethods.push('PUSH');
    if (defaultChannels.sms) enabledMethods.push('SMS');
    enabledMethods.push('IN_APP'); // Always enable in-app notifications
    
    // Process each recipient
    for (const userId of recipientIds) {
      // Process each offset
      for (const offset of defaultOffsets) {
        // Calculate scheduled time
        const scheduledFor = new Date(appointment.startTime.getTime() - offset * 60 * 1000);
        
        // Skip if already in the past
        if (scheduledFor <= now) continue;
        
        // Process each notification method
        for (const method of enabledMethods) {
          // Check for existing notification
          const existingNotification = await prisma.scheduledNotification.findFirst({
            where: {
              userId,
              type: 'APPOINTMENT_REMINDER',
              method,
              status: {
                not: 'CANCELLED'
              },
              payload: {
                path: ['appointmentId'],
                equals: appointment.id
              },
              AND: [
                {
                  payload: {
                    path: ['minutesBefore'],
                    equals: offset
                  }
                }
              ]
            }
          });
          
          if (existingNotification) {
            skippedExisting++;
            continue;
          }
          
          // Create notification
          await prisma.scheduledNotification.create({
            data: {
              userId,
              type: 'APPOINTMENT_REMINDER',
              method,
              status: 'PENDING',
              scheduledFor,
              payload: {
                appointmentId: appointment.id,
                title: appointment.title,
                startTime: appointment.startTime.toISOString(),
                minutesBefore: offset,
                method,
                timezone: 'UTC'
              }
            }
          });
          
          scheduled++;
        }
      }
    }
  }
  
  return {
    scheduled,
    scanned,
    skippedExisting,
    durationMs: Date.now() - startTime
  };
}

/**
 * Processes due notifications and sends them via appropriate channels
 * 
 * @param maxPerRun - Maximum number of notifications to process in one run
 * @returns Statistics about the processing operation
 */
export async function processDueScheduledNotifications(maxPerRun: number): Promise<{
  processed: number;
  sent: number;
  failed: number;
  durationMs: number
}> {
  const startTime = Date.now();
  
  // Initialize counters
  let processed = 0;
  let sent = 0;
  let failed = 0;
  
  // Query due notifications
  const dueNotifications = await prisma.scheduledNotification.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: {
        lte: new Date()
      }
    },
    orderBy: {
      scheduledFor: 'asc'
    },
    take: maxPerRun
  });
  
  // Process each notification
  for (const notification of dueNotifications) {
    processed++;
    
    try {
      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: notification.userId }
      });
      
      if (!user) {
        failed++;
        continue;
      }
      
      // Extract notification details
      const { method } = notification;
      const payload = notification.payload as any;
      
      // Prepare notification content
      const title = `Reminder: ${payload.title}`;
      const minutesText = payload.minutesBefore === 60 
        ? '1 hour' 
        : `${payload.minutesBefore} minutes`;
      const message = `Your appointment "${payload.title}" starts in ${minutesText}.`;
      
      // Send notification based on method
      let success = false;
      
      switch (method) {
        case 'EMAIL':
          if (user.email) {
            const result = await EmailService.sendEmail({
              to: user.email,
              subject: title,
              text: message,
              html: `<p>${message}</p>`
            });
            success = result.success;
          }
          break;
          
        case 'IN_APP':
          const inAppResult = await createInAppNotification({
            userId: user.id,
            title,
            message,
            data: { appointmentId: payload.appointmentId }
          });
          success = !!inAppResult.id;
          break;
          
        case 'SMS':
          if (user.phone) {
            const smsResult = await sendSms({
              to: user.phone,
              body: message
            });
            success = smsResult.success;
          }
          break;
          
        case 'PUSH':
          const pushResult = await sendPushToUser({
            userId: user.id,
            title,
            body: message,
            data: { appointmentId: payload.appointmentId }
          });
          success = pushResult.sent > 0;
          break;
      }
      
      // Update notification status
      if (success) {
        await prisma.scheduledNotification.update({
          where: { id: notification.id },
          data: { status: 'SENT' }
        });
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to process notification ${notification.id}:`, error);
      failed++;
    }
  }
  
  return {
    processed,
    sent,
    failed,
    durationMs: Date.now() - startTime
  };
}
