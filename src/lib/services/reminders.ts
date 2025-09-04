import { prisma } from '@/lib/prisma';
import EmailService from '@/lib/email-service';
import { createInAppNotification } from '@/lib/services/notifications';
import { sendSms } from '@/lib/services/sms';
import { sendPushToUser } from '@/lib/services/push';
import type { ScheduledNotificationStatus, AppointmentStatus, NotificationType } from '@prisma/client';

// Use bracket notation to avoid noPropertyAccessFromIndexSignature TS error
const CALENDAR_USE_MOCKS =
  ((process.env['CALENDAR_USE_MOCKS'] ?? 'true') as string).toLowerCase() === 'true';
const REMINDER_TYPE = 'APPOINTMENT_REMINDER';

type Method = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';

function toISO(d: Date | string): string {
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function formatInTz(iso: string, tz?: string): string {
  try {
    const date = new Date(iso);
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    } as any);
    return fmt.format(date);
  } catch {
    return new Date(iso).toUTCString();
  }
}

type UserWithPrefs = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  timezone: string | null;
  preferences: any | null;
};

async function getUserWithPrefs(userId: string): Promise<UserWithPrefs | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      timezone: true,
      preferences: true
    }
  }) as any;
}

// legacy callers
const getUserBasic = getUserWithPrefs;

/* ------------------------------------------------------------------ */
/* Preference helpers                                                  */
/* ------------------------------------------------------------------ */

type ChannelSet = { email: boolean; push: boolean; sms: boolean };
type Settings = { channels: ChannelSet; offsets: number[] };

const DEFAULT_SETTINGS: Settings = {
  channels: { email: true, push: true, sms: false },
  offsets: [1440, 60]
};

function extractSettings(raw: any): Partial<Settings> {
  if (!raw) return {};
  const channels: Partial<ChannelSet> = {};
  try {
    if (typeof raw === 'string') raw = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  if (!raw) return {};

  // notifications.reminders shape from prefs JSON
  if (raw.notifications?.reminders) raw = raw.notifications.reminders;

  if (raw.channels) {
    channels.email = raw.channels.email;
    channels.push = raw.channels.push;
    channels.sms = raw.channels.sms;
  }
  const offsets = Array.isArray(raw.offsets) ? raw.offsets.filter((n: any) => typeof n === 'number' && n > 0) : undefined;
  return {
    channels: channels as ChannelSet,
    offsets
  };
}

function mergeSettings(...layers: Array<Partial<Settings> | undefined>): Settings {
  const out: Settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  for (const layer of layers.filter(Boolean)) {
    if (layer?.channels) {
      out.channels = { ...out.channels, ...layer.channels };
    }
    if (layer?.offsets && layer.offsets.length) {
      out.offsets = [...new Set(layer.offsets)].sort((a, b) => a - b);
    }
  }
  return out;
}

export async function scheduleUpcomingAppointmentReminders(windowMinutes: number = 1440) {
  if (CALENDAR_USE_MOCKS) {
    console.log('[reminders] CALENDAR_USE_MOCKS=true → schedule no-op');
    return { scheduled: 0, scanned: 0, skippedExisting: 0 };
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMinutes * 60000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED' as AppointmentStatus,
      startTime: { gte: now, lte: windowEnd },
    },
    include: { participants: true, createdBy: true },
    orderBy: { startTime: 'asc' }
  });

  // cache org prefs by operatorId
  const orgCache = new Map<string, Partial<Settings>>();
  let scheduled = 0;
  let skippedExisting = 0;

  for (const appt of appointments) {
    const startISO = toISO(appt.startTime as any);
    const startMs = new Date(startISO).getTime();

    // derive reminder pairs (minutesBefore, method)
    let pairs: Array<{ minutesBefore: number; method: Method }> = [];
    const raw = (appt as any).reminders;
    try {
      const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        for (const r of parsed) {
          const mb = typeof r.minutesBefore === 'number' ? r.minutesBefore : undefined;
          const m: Method = (r.method as Method) || 'EMAIL';
          if (mb && mb > 0) pairs.push({ minutesBefore: mb, method: m });
        }
      }
    } catch {}
    if (pairs.length === 0) {
      pairs = [
        { minutesBefore: 1440, method: 'EMAIL' },
        { minutesBefore: 60, method: 'EMAIL' },
        { minutesBefore: 1440, method: 'IN_APP' },
        { minutesBefore: 60, method: 'IN_APP' },
      ];
    }

    // -------------------- org-level prefs --------------------
    let orgPrefs: Partial<Settings> | undefined;
    const op =
      (appt as any).home?.operator ?? (appt as any).createdBy?.operator;
    if (op) {
      if (orgCache.has(op.id)) {
        orgPrefs = orgCache.get(op.id);
      } else {
        orgPrefs = extractSettings(op.preferences);
        orgCache.set(op.id, orgPrefs);
      }
    }

    const recipientIds = new Set<string>([appt.createdById as string, ...appt.participants.map(p => p.userId)]);

    // cache user record lookups
    const prefCache = new Map<string, UserWithPrefs>();

    for (const userId of recipientIds) {
      // --------------------------------------------
      // Build per-user preference-aware reminder list
      // --------------------------------------------
      let user = prefCache.get(userId);
      if (!user) {
        const fetched = await getUserWithPrefs(userId);
        if (fetched) {
          user = fetched;
          prefCache.set(userId, fetched);
        }
      }

      // fallback prefs structure
      const userPrefs = extractSettings(user?.preferences);
      const apptPrefs = extractSettings((appt as any).reminders);
      const effective = mergeSettings(DEFAULT_SETTINGS, orgPrefs, userPrefs, apptPrefs);

      const userPairs: Array<{ minutesBefore: number; method: Method }> = [];
      for (const mb of effective.offsets) {
        userPairs.push({ minutesBefore: mb, method: 'IN_APP' });
        if (effective.channels.email) userPairs.push({ minutesBefore: mb, method: 'EMAIL' });
        if (effective.channels.push) userPairs.push({ minutesBefore: mb, method: 'PUSH' });
        if (effective.channels.sms) userPairs.push({ minutesBefore: mb, method: 'SMS' });
      }

      for (const { minutesBefore, method } of userPairs) {
        const scheduledFor = new Date(startMs - minutesBefore * 60000);
        if (scheduledFor.getTime() <= now.getTime() - 60000) {
          // too far in the past; skip
          continue;
        }

        // idempotency: check if one already exists for same user, method, appt, time
        const existing = await prisma.scheduledNotification.findFirst({
          where: {
            userId,
            type: REMINDER_TYPE,
            method,
            status: 'PENDING' as ScheduledNotificationStatus,
            scheduledFor,
            // JSON path filter when supported by Prisma
            OR: [
              { payload: { path: ['appointmentId'], equals: appt.id } as any },
              // fallback: match by title+startTime
              { AND: [
                { payload: { path: ['title'], equals: appt.title } as any },
                { payload: { path: ['startTime'], equals: startISO } as any }
              ]}
            ]
          }
        }).catch(() => null);

        if (existing) {
          skippedExisting++;
          continue;
        }

        await prisma.scheduledNotification.create({
          data: {
            userId,
            type: REMINDER_TYPE,
            method,
            status: 'PENDING',
            scheduledFor,
            payload: {
              appointmentId: appt.id,
              title: appt.title,
              startTime: startISO,
              minutesBefore,
              method,
              timezone: user?.timezone || 'UTC'
            } as any
          }
        });
        scheduled++;
      }
    }
  }

  return { scheduled, scanned: appointments.length, skippedExisting };
}

export async function processDueScheduledNotifications(maxPerRun: number = 100) {
  if (CALENDAR_USE_MOCKS) {
    console.log('[reminders] CALENDAR_USE_MOCKS=true → process no-op');
    return { processed: 0, sent: 0, failed: 0 };
  }

  const now = new Date();
  const due = await prisma.scheduledNotification.findMany({
    where: { status: 'PENDING', scheduledFor: { lte: now } },
    orderBy: { scheduledFor: 'asc' },
    take: maxPerRun
  });

  let sent = 0;
  let failed = 0;

  for (const sn of due) {
    try {
      const payload: any = sn.payload || {};
      const user = await getUserBasic(sn.userId);
      const title = payload.title || 'Upcoming appointment';
      const startISO = payload.startTime || new Date().toISOString();
      const tz = (user?.timezone as string) || 'UTC';
      const whenStr = formatInTz(startISO, tz);

      if (sn.method === 'EMAIL') {
        if (!user?.email) throw new Error('Missing user email');
        const subject = `Reminder: ${title}`;
        const text = `This is a reminder for "${title}" starting at ${whenStr} (${tz}).\n\nAppointment ID: ${payload.appointmentId}`;
        const html = `<p>This is a reminder for <strong>${title}</strong>.</p><p>Starts at <strong>${whenStr}</strong> (${tz}).</p>`;
        const res = await EmailService.sendEmail({ to: user.email, subject, text, html, fromName: 'CareLinkAI' } as any);
        if (!res.success) throw res.error || new Error('Email failed');
      } else if (sn.method === 'IN_APP') {
        await createInAppNotification({
          userId: sn.userId,
          type: 'BOOKING' as unknown as NotificationType,
          title: `Upcoming: ${title}`,
          message: `Starts at ${whenStr} (${tz})`,
          data: { appointmentId: payload.appointmentId }
        });
      } else if (sn.method === 'SMS') {
        if (!user?.phone) throw new Error('Missing user phone');
        const res = await sendSms({
          to: user.phone,
          body: `Reminder: ${title}\nStarts at ${whenStr} (${tz})\nAppt ID: ${payload.appointmentId}`
        });
        if (!res.success) throw res.error || new Error('SMS failed');
      } else if (sn.method === 'PUSH') {
        const pushRes = await sendPushToUser(sn.userId, {
          title: 'Appointment reminder',
          body: `${title}\nStarts at ${whenStr} (${tz})`,
          data: { appointmentId: payload.appointmentId, kind: 'appointment_reminder' }
        });
        if (pushRes.sent === 0) {
          throw new Error(pushRes.errors.join('; ') || 'Push failed');
        }
      } else {
        // SMS/PUSH: stub as sent
      }

      await prisma.scheduledNotification.update({ where: { id: sn.id }, data: { status: 'SENT' } });
      sent++;
    } catch (err) {
      console.error('[reminders] Failed to send scheduled notification', { id: sn.id, err });
      await prisma.scheduledNotification.update({ where: { id: sn.id }, data: { status: 'FAILED' } }).catch(() => {});
      failed++;
    }
  }

  return { processed: due.length, sent, failed };
}

export async function detectAndMarkNoShows(graceMinutes: number = 30) {
  if (CALENDAR_USE_MOCKS) {
    console.log('[reminders] CALENDAR_USE_MOCKS=true → no-show detection no-op');
    return { marked: 0 };
  }

  const cutoff = new Date(Date.now() - graceMinutes * 60000);
  const candidates = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED' as AppointmentStatus,
      endTime: { lte: cutoff }
    },
    include: { participants: true, createdBy: true },
    orderBy: { endTime: 'asc' }
  });

  let marked = 0;
  for (const appt of candidates) {
    try {
      const meta = (appt as any).metadata ? (typeof (appt as any).metadata === 'string' ? JSON.parse((appt as any).metadata) : (appt as any).metadata) : {};
      meta.noShowAt = new Date().toISOString();
      meta.noShowDetectedBy = 'system';

      await prisma.appointment.update({
        where: { id: appt.id },
        data: { status: 'NO_SHOW' as AppointmentStatus, metadata: JSON.stringify(meta) }
      });

      const recipients = new Set<string>([appt.createdById as string, ...appt.participants.map(p => p.userId)]);
      const endISO = toISO(appt.endTime as any);
      const tz = ((appt.createdBy as any)?.timezone as string) || 'UTC';
      const endStr = formatInTz(endISO, tz);

      for (const userId of recipients) {
        await createInAppNotification({
          userId,
          type: 'BOOKING' as unknown as NotificationType,
          title: 'Appointment marked as no-show',
          message: `"${appt.title}" ended at ${endStr} (${tz})`,
          data: { appointmentId: appt.id }
        }).catch(() => {});
      }
      marked++;
    } catch (err) {
      console.error('[reminders] Failed to mark no-show', { id: appt.id, err });
    }
  }

  return { marked };
}
