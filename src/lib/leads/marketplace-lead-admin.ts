/**
 * Admin copy of every marketplace lead (POST /api/leads: family → caregiver or provider). ADMIN_NOTIFY_EMAIL
 * sees each one; the subject says caregiver or provider, and "[TEST]" when the family is a test account
 * (TEST_EMAIL_PATTERN) or the profile is a demo account — in those cases nobody else was emailed.
 * Fields: family contact + target + start date + hours/week. Never the free-text message, location or
 * transport details. Never throws.
 */
import { captureError } from '@/lib/sentry';
import { sendAdminLeadEmail } from '@/lib/leads/inbound-alerts';

export type MarketplaceLeadAdminInput = {
  leadId: string;
  targetType: 'AIDE' | 'PROVIDER';
  targetId: string;
  targetName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  preferredStartDate: Date | null;
  expectedHoursPerWeek: number | null;
  /** Family account email matches TEST_EMAIL_PATTERN. */
  isTest?: boolean;
  /** The caregiver's / provider's account is a demo account (User.isDemo). */
  demoTarget?: boolean;
  /** A boosted provider was emailed directly (real leads only). */
  targetEmailed?: boolean;
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}

export function marketplaceLeadAdminContent(input: MarketplaceLeadAdminInput): { subject: string; text: string; html: string } {
  const kind = input.targetType === 'AIDE' ? 'caregiver' : 'provider';
  const testOnly = input.isTest === true || input.demoTarget === true;
  const pre = testOnly ? '[TEST] ' : '';
  const label = input.demoTarget ? `${kind}, demo profile` : kind;
  const name = input.contactName?.trim() || 'name not given';
  const link = `${appUrl()}/admin/${input.targetType === 'AIDE' ? 'aides' : 'providers'}/${encodeURIComponent(input.targetId)}`;
  const note = input.demoTarget
    ? `This is a demo ${kind} profile: no ${kind} was emailed.`
    : input.isTest
      ? `This is a test request (family email matches the test pattern): no ${kind} was emailed and it is hidden from their inbox.`
      : input.targetEmailed
        ? `The ${kind} was emailed directly (Boost) and has it in their CareLinkAI inbox; this is your admin copy.`
        : `The ${kind} has it in their CareLinkAI inbox; this is your admin copy.`;
  const rows: Array<[string, string]> = [
    ['Family', name],
    ['Email', input.contactEmail?.trim() || '—'],
    ['Phone', input.contactPhone?.trim() || '—'],
    [kind === 'caregiver' ? 'Caregiver' : 'Provider', `${input.targetName} (${label})`],
    ['Preferred start', input.preferredStartDate ? input.preferredStartDate.toISOString().slice(0, 10) : 'not given'],
    ['Hours / week', input.expectedHoursPerWeek ? String(input.expectedHoursPerWeek) : 'not given'],
  ];
  return {
    subject: `${pre}📝 Marketplace request (${label}): ${name} → ${input.targetName}`,
    text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${note}\nProfile: ${link}\n`,
    html:
      `<p><strong>${esc(pre)}Marketplace request to a ${esc(label)}</strong> — ${esc(note)}</p>` +
      `<table style="font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#6b7280;padding-right:12px">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>` +
      `<p><a href="${esc(link)}">Open the profile →</a></p>`,
  };
}

export async function sendMarketplaceLeadAdminCopy(input: MarketplaceLeadAdminInput): Promise<'sent' | 'failed' | 'skipped'> {
  try {
    return await sendAdminLeadEmail({ leadId: input.leadId, feature: 'marketplace-lead-admin-copy', ...marketplaceLeadAdminContent(input) });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'marketplace-lead-admin-copy' }, extra: { leadId: input.leadId } });
    return 'failed';
  }
}
