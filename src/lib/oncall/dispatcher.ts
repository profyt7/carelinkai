import { prisma } from '@/lib/prisma';
import { loadRules } from './rules';
import { rankCandidates } from './ranker';
import { templates } from './messages';
import { SMSService } from '@/lib/sms/sms-service';
import { isUnaffiliatedDispatchEnabled } from '@/lib/feature-flags';

const sms = new SMSService();

export async function dispatchWave(shiftNeedId: string): Promise<{
  sent: number;
  filled: boolean;
  reason: string;
}> {
  const rules = loadRules();

  const need = await prisma.shiftNeed.findUnique({
    where: { id: shiftNeedId },
    include: {
      home: { include: { address: true } },
      shift: true,
    },
  });

  if (!need) return { sent: 0, filled: false, reason: 'ShiftNeed not found' };
  if (need.status === 'FILLED') return { sent: 0, filled: true, reason: 'Already filled' };
  if (need.status === 'CANCELED') return { sent: 0, filled: false, reason: 'Canceled' };
  if (need.currentWave >= rules.contact_strategy.max_waves) {
    await prisma.shiftNeed.update({ where: { id: shiftNeedId }, data: { status: 'UNFILLED' } });
    return { sent: 0, filled: false, reason: 'Max waves reached — marked UNFILLED' };
  }

  // Caregivers already contacted for this need
  const alreadyContacted = await prisma.coverageAttempt.findMany({
    where: { shiftNeedId },
    select: { caregiverId: true },
  });
  const excludeIds = new Set(alreadyContacted.map((a) => a.caregiverId));

  // Pull eligible caregivers
  const raw = await prisma.caregiver.findMany({
    where: {
      isVisibleInMarketplace: true,
      employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
      id: { notIn: [...excludeIds] },
      OR: [
        { employments: { some: { operatorId: need.home.operatorId, endDate: null } } },
        // CNOS: the unaffiliated-caregiver pool (no employer) is frozen — only
        // reach into it when explicitly enabled (default off).
        ...(isUnaffiliatedDispatchEnabled() ? [{ employments: { none: {} } as const }] : []),
      ],
    },
    include: {
      user: { select: { firstName: true, lastName: true, phone: true } },
    },
    take: 100,
  });

  const homeLat = need.home.address?.latitude ?? null;
  const homeLng = need.home.address?.longitude ?? null;

  const candidates = raw.map((cg) => ({
    id: cg.id,
    userId: cg.userId,
    firstName: cg.user.firstName,
    lastName: cg.user.lastName,
    phone: cg.user.phone ?? null,
    specialties: cg.specialties,
    careTypes: cg.careTypes,
    backgroundCheckStatus: cg.backgroundCheckStatus,
    reliabilityScore: cg.reliabilityScore,
    yearsExperience: cg.yearsExperience,
    hourlyRate: cg.hourlyRate ? Number(cg.hourlyRate) : null,
    homeLat: cg.homeLat,
    homeLng: cg.homeLng,
  }));

  const ranked = rankCandidates(
    candidates,
    need.requiredCerts,
    need.requiredSkills,
    homeLat,
    homeLng,
    rules,
  );

  const wave = ranked.slice(0, rules.contact_strategy.parallel_batch);
  if (wave.length === 0) {
    await prisma.shiftNeed.update({ where: { id: shiftNeedId }, data: { status: 'UNFILLED' } });
    return { sent: 0, filled: false, reason: 'No eligible caregivers remaining' };
  }

  const nextWave = need.currentWave + 1;
  await prisma.shiftNeed.update({
    where: { id: shiftNeedId },
    data: { status: 'FILLING', currentWave: nextWave },
  });

  const startAt = need.shift?.startTime
    ? need.shift.startTime.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
    : 'TBD';
  const endAt = need.shift?.endTime
    ? need.shift.endTime.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })
    : 'TBD';

  let sent = 0;

  for (const cg of wave) {
    const attempt = await prisma.coverageAttempt.create({
      data: {
        shiftNeedId,
        caregiverId: cg.id,
        channel: 'SMS',
        outcome: 'SENT',
        wave: nextWave,
      },
    });

    if (cg.phone) {
      const message = templates.smsOutreach({
        caregiverFirstName: cg.firstName,
        homeName: need.home.name,
        startAt,
        endAt,
        notes: need.notes ?? undefined,
      });

      try {
        const twilioClient = getTwilioClient();
        if (twilioClient) {
          const msg = await twilioClient.messages.create({
            to: formatPhone(cg.phone),
            from: process.env.TWILIO_PHONE_NUMBER!,
            body: message,
            statusCallback: `${process.env.NEXTAUTH_URL}/api/webhooks/twilio/status`,
          });
          await prisma.coverageAttempt.update({
            where: { id: attempt.id },
            data: { messageSid: msg.sid },
          });
        } else {
          // Dev/demo mode — log only
          console.log(`[ONCALL SMS → ${cg.firstName} ${cg.lastName} (${cg.phone})]: ${message}`);
        }
        sent++;
      } catch (err) {
        await prisma.coverageAttempt.update({
          where: { id: attempt.id },
          data: { outcome: 'ERROR', notes: String(err) },
        });
      }
    }
  }

  return { sent, filled: false, reason: `Wave ${nextWave} dispatched to ${sent} caregivers` };
}

export async function handleCaregiverReply(
  messageSid: string,
  reply: string,
): Promise<{ action: 'confirmed' | 'declined' | 'ignored'; needId?: string }> {
  const rules = loadRules();
  const upper = reply.trim().toUpperCase();

  const attempt = await prisma.coverageAttempt.findFirst({
    where: { messageSid },
    include: { shiftNeed: true, caregiver: { include: { user: true } } },
  });

  if (!attempt) return { action: 'ignored' };
  if (attempt.shiftNeed.status === 'FILLED') {
    // Too late — slot gone, notify them
    if (attempt.caregiver.user.phone) {
      sendSlotFilledSMS(attempt.caregiver.user.phone, attempt.caregiver.user.firstName);
    }
    return { action: 'ignored', needId: attempt.shiftNeedId };
  }

  const isYes = rules.contact_strategy.confirm_keywords.includes(upper);
  const isNo = rules.contact_strategy.decline_keywords.includes(upper);

  if (isYes) {
    // Fill the shift
    await prisma.$transaction([
      prisma.shiftNeed.update({
        where: { id: attempt.shiftNeedId },
        data: {
          status: 'FILLED',
          filledByCaregiverId: attempt.caregiverId,
          filledAt: new Date(),
        },
      }),
      prisma.coverageAttempt.update({
        where: { id: attempt.id },
        data: { outcome: 'CONFIRMED' },
      }),
      // Assign the underlying CaregiverShift if linked
      ...(attempt.shiftNeed.shiftId
        ? [prisma.caregiverShift.update({
            where: { id: attempt.shiftNeed.shiftId },
            data: { caregiverId: attempt.caregiverId, status: 'ASSIGNED' },
          })]
        : []),
    ]);

    // Notify confirmed caregiver
    const need = attempt.shiftNeed;
    const needWithShift = await prisma.shiftNeed.findUnique({
      where: { id: need.id },
      include: { shift: true, home: true },
    });
    if (attempt.caregiver.user.phone && needWithShift) {
      sendConfirmedSMS(attempt.caregiver.user.phone, attempt.caregiver.user.firstName, {
        homeName: needWithShift.home.name,
        startAt: needWithShift.shift?.startTime.toLocaleString() ?? 'TBD',
        endAt: needWithShift.shift?.endTime.toLocaleString() ?? 'TBD',
      });
    }

    // Notify all other pending attempts for this need
    notifyOthersSlotFilled(attempt.shiftNeedId, attempt.caregiverId).catch(() => {});

    return { action: 'confirmed', needId: attempt.shiftNeedId };
  }

  if (isNo) {
    await prisma.coverageAttempt.update({
      where: { id: attempt.id },
      data: { outcome: 'DECLINED' },
    });
    return { action: 'declined', needId: attempt.shiftNeedId };
  }

  return { action: 'ignored', needId: attempt.shiftNeedId };
}

async function notifyOthersSlotFilled(shiftNeedId: string, filledByCaregiverId: string) {
  const others = await prisma.coverageAttempt.findMany({
    where: {
      shiftNeedId,
      caregiverId: { not: filledByCaregiverId },
      outcome: 'SENT',
    },
    include: { caregiver: { include: { user: true } } },
  });

  for (const a of others) {
    if (a.caregiver.user.phone) {
      sendSlotFilledSMS(a.caregiver.user.phone, a.caregiver.user.firstName);
    }
    await prisma.coverageAttempt.update({
      where: { id: a.id },
      data: { outcome: 'NO_RESPONSE' },
    });
  }
}

function sendSlotFilledSMS(phone: string, firstName: string) {
  const client = getTwilioClient();
  if (!client) return;
  client.messages
    .create({
      to: formatPhone(phone),
      from: process.env.TWILIO_PHONE_NUMBER!,
      body: templates.smsSlotFilled({ caregiverFirstName: firstName }),
    })
    .catch(() => {});
}

function sendConfirmedSMS(
  phone: string,
  firstName: string,
  ctx: { homeName: string; startAt: string; endAt: string },
) {
  const client = getTwilioClient();
  if (!client) return;
  client.messages
    .create({
      to: formatPhone(phone),
      from: process.env.TWILIO_PHONE_NUMBER!,
      body: templates.smsConfirmed({ caregiverFirstName: firstName, ...ctx }),
    })
    .catch(() => {});
}

function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) return null;
  // Dynamic import avoids build-time Twilio errors when keys aren't set
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require('twilio');
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`;
}
