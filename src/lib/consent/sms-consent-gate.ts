/**
 * OL-193 — the consent check every outbound SMS passes through
 * (SMSService.send). A number is textable only when consent is stored for it:
 *
 * - 'transactional' (default): the latest SMS LeadConsent row (sms-* version)
 *   for this number is an opt-in, and its user has no later revocation row.
 * - 'availability': the availability poll's own opt-in — a listing whose
 *   contactMobile is this number with availabilityOptIn=true and not
 *   do-not-call. Inbound STOP on that line clears availabilityOptIn.
 *
 * Staff (ADMIN_NOTIFY_MOBILE) is exempt. A failed lookup fails closed.
 */

import { prisma } from '@/lib/prisma';

export type SmsPurpose = 'transactional' | 'availability';

export type SmsConsentCheck =
  | { ok: true; basis: 'staff' | 'sms_opt_in' | 'availability_opt_in' }
  | { ok: false; reason: 'no_consent' | 'revoked' | 'invalid_number' | 'consent_check_failed' };

/** E.164 for US numbers (+1XXXXXXXXXX); other +-prefixed numbers kept as digits. */
export function normalizeSmsNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (phone.trim().startsWith('+') && digits.length >= 8) return `+${digits}`;
  return null;
}

/** For logs: never the full number. */
export function maskSmsNumber(phone: string | null | undefined): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 4 ? `***${digits.slice(-4)}` : '***';
}

export function isStaffSmsNumber(phone: string | null | undefined): boolean {
  const staff = normalizeSmsNumber(process.env['ADMIN_NOTIFY_MOBILE']);
  return !!staff && staff === normalizeSmsNumber(phone);
}

async function transactionalConsent(e164: string): Promise<SmsConsentCheck> {
  // contactPhone is stored as typed, so narrow by the last 4 digits and
  // compare normalized numbers here.
  const rows = await prisma.leadConsent.findMany({
    where: { consentTextVersion: { startsWith: 'sms-' }, contactPhone: { endsWith: e164.slice(-4) } },
    orderBy: { consentAt: 'desc' },
    take: 50,
    select: { consentGiven: true, consentAt: true, contactPhone: true, userId: true },
  });
  const latest = rows.find((r) => normalizeSmsNumber(r.contactPhone) === e164);
  if (!latest) return { ok: false, reason: 'no_consent' };
  if (!latest.consentGiven) return { ok: false, reason: 'revoked' };
  if (latest.userId) {
    // An account revocation may carry a changed or empty phone.
    const revoked = await prisma.leadConsent.findFirst({
      where: {
        userId: latest.userId,
        consentTextVersion: { startsWith: 'sms-' },
        consentGiven: false,
        consentAt: { gt: latest.consentAt },
      },
      select: { id: true },
    });
    if (revoked) return { ok: false, reason: 'revoked' };
  }
  return { ok: true, basis: 'sms_opt_in' };
}

async function availabilityConsent(e164: string, raw: string): Promise<SmsConsentCheck> {
  const variants = Array.from(new Set([e164, e164.slice(2), raw.trim()]));
  const home = await prisma.assistedLivingHome.findFirst({
    where: { contactMobile: { in: variants }, availabilityOptIn: true, doNotCall: false },
    select: { id: true },
  });
  return home ? { ok: true, basis: 'availability_opt_in' } : { ok: false, reason: 'no_consent' };
}

export async function checkSmsConsent(phone: string, purpose: SmsPurpose = 'transactional'): Promise<SmsConsentCheck> {
  const e164 = normalizeSmsNumber(phone);
  if (!e164) return { ok: false, reason: 'invalid_number' };
  if (isStaffSmsNumber(e164)) return { ok: true, basis: 'staff' };
  try {
    return purpose === 'availability' ? await availabilityConsent(e164, phone) : await transactionalConsent(e164);
  } catch {
    return { ok: false, reason: 'consent_check_failed' };
  }
}

export async function hasSmsConsent(phone: string, purpose: SmsPurpose = 'transactional'): Promise<boolean> {
  return (await checkSmsConsent(phone, purpose)).ok;
}
