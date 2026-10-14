/**
 * Targeted claim RE-SEND list (sprint W4 0b, #727 follow-up). LIST ONLY — this
 * module never sends anything.
 *
 * Why: until #727, /claim?token=… sat behind the login wall, so every
 * claim-nudge recipient WITHOUT an account was bounced to /auth/login. This
 * lists the operators who were nudged and never registered, with a freshly
 * minted link, so Chris can decide whom to re-send (by hand; claim-drip.yml
 * stays disabled).
 *
 * Row = one nudged, still-unclaimed, ACTIVE directory home whose outreach
 * address has NO user account. Suppressed addresses (unsubscribe / bounce)
 * are excluded and counted. Warm leads (Pleasant Pointe, Eliza Jennings) sort
 * first. Contact emails are admin-view only.
 */

import { prisma } from '@/lib/prisma';
import { DEFAULT_CLAIM_TOKEN_TTL_HOURS, signClaimToken } from '@/lib/claim-token';
import { isClaimCohort } from '@/lib/claim-engine/cohorts';

export const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

/** Name fragments of the warm VA leads (OL-108) — always listed first. */
export const WARM_LEAD_PATTERNS: readonly RegExp[] = [/pleasant\s*pointe/i, /eliza\s*jennings/i];

export function isWarmLead(name: string): boolean {
  return WARM_LEAD_PATTERNS.some((re) => re.test(name));
}

export type ResendRow = {
  homeId: string;
  facility: string;
  city: string | null;
  contactEmail: string;
  sentAt: string; // ISO — last claim-nudge send
  clicked: boolean;
  clickedAt: string | null;
  warm: boolean;
  cohort: string | null;
  claimLink: string;
  expiresAt: string; // ISO — the freshly minted token's expiry
};

export type ResendList = {
  rows: ResendRow[];
  counts: { nudged: number; registered: number; suppressed: number; listed: number; warm: number; clicked: number };
  generatedAt: string;
};

export type ResendInput = {
  homeId: string;
  name: string;
  city: string | null;
  outreachEmail: string;
  claimNudgeLastSentAt: Date;
  cohort: string | null;
  registered: boolean;
  suppressed: boolean;
  clickedAt: Date | null;
};

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}

/** Pure: classify + sort + mint. Exported for unit tests. */
export function buildResendRows(inputs: readonly ResendInput[], secret: string, now: number = Date.now()): ResendList {
  const iat = Math.floor(now / 1000);
  const exp = iat + DEFAULT_CLAIM_TOKEN_TTL_HOURS * 3600;
  let registered = 0;
  let suppressed = 0;
  const rows: ResendRow[] = [];
  for (const h of inputs) {
    if (h.registered) {
      registered++;
      continue;
    }
    if (h.suppressed) {
      suppressed++;
      continue;
    }
    const email = h.outreachEmail.trim().toLowerCase();
    const cohort = isClaimCohort(h.cohort) ? h.cohort : null;
    const token = signClaimToken(
      { operatorEmail: email, homeId: h.homeId, clevelandFounder: true, ...(cohort ? { cohort } : {}), iat, exp },
      secret
    );
    rows.push({
      homeId: h.homeId,
      facility: h.name,
      city: h.city,
      contactEmail: email,
      sentAt: h.claimNudgeLastSentAt.toISOString(),
      clicked: !!h.clickedAt,
      clickedAt: h.clickedAt ? h.clickedAt.toISOString() : null,
      warm: isWarmLead(h.name),
      cohort,
      claimLink: `${appUrl()}/claim?token=${encodeURIComponent(token)}`,
      expiresAt: new Date(exp * 1000).toISOString(),
    });
  }
  rows.sort((a, b) => {
    if (a.warm !== b.warm) return a.warm ? -1 : 1;
    if (a.clicked !== b.clicked) return a.clicked ? -1 : 1; // clicked-but-never-registered = hottest after warm
    return b.sentAt.localeCompare(a.sentAt);
  });
  return {
    rows,
    counts: {
      nudged: inputs.length,
      registered,
      suppressed,
      listed: rows.length,
      warm: rows.filter((r) => r.warm).length,
      clicked: rows.filter((r) => r.clicked).length,
    },
    generatedAt: new Date(now).toISOString(),
  };
}

/** Load the candidates from the DB and build the list. Read-only. */
export async function buildClaimResendList(secret: string): Promise<ResendList> {
  const seedUser = await prisma.user.findUnique({ where: { email: DIRECTORY_UNCLAIMED_EMAIL }, select: { id: true } });
  const seedOperator = seedUser ? await prisma.operator.findUnique({ where: { userId: seedUser.id }, select: { id: true } }) : null;
  if (!seedOperator) return buildResendRows([], secret);

  const homes = await prisma.assistedLivingHome.findMany({
    where: { operatorId: seedOperator.id, status: 'ACTIVE', isDemo: false, claimNudgeLastSentAt: { not: null }, outreachEmail: { not: null } },
    select: {
      id: true,
      name: true,
      outreachEmail: true,
      claimNudgeLastSentAt: true,
      preFilledFields: true,
      address: { select: { city: true } },
    },
    orderBy: { claimNudgeLastSentAt: 'desc' },
  });
  if (homes.length === 0) return buildResendRows([], secret);

  const emails = [...new Set(homes.map((h) => (h.outreachEmail as string).trim().toLowerCase()))];
  const [users, suppressions, visits] = await Promise.all([
    prisma.user.findMany({ where: { email: { in: emails } }, select: { email: true } }),
    prisma.emailSuppression.findMany({ where: { email: { in: emails } }, select: { email: true } }),
    prisma.claimLinkVisit.findMany({
      where: { homeId: { in: homes.map((h) => h.id) } },
      select: { homeId: true, operatorEmail: true, visitedAt: true },
      orderBy: { visitedAt: 'desc' },
    }),
  ]);
  const registered = new Set(users.map((u) => u.email.toLowerCase()));
  const suppressed = new Set(suppressions.map((s) => s.email.toLowerCase()));
  const firstVisit = new Map<string, Date>();
  for (const v of visits) {
    const k = `${v.homeId}|${v.operatorEmail.toLowerCase()}`;
    const prev = firstVisit.get(k);
    if (!prev || v.visitedAt < prev) firstVisit.set(k, v.visitedAt);
  }

  const inputs: ResendInput[] = homes.map((h) => {
    const email = (h.outreachEmail as string).trim().toLowerCase();
    const pre = (h.preFilledFields ?? {}) as Record<string, unknown>;
    return {
      homeId: h.id,
      name: h.name,
      city: h.address?.city ?? null,
      outreachEmail: email,
      claimNudgeLastSentAt: h.claimNudgeLastSentAt as Date,
      cohort: typeof pre['cohort'] === 'string' ? (pre['cohort'] as string) : null,
      registered: registered.has(email),
      suppressed: suppressed.has(email),
      clickedAt: firstVisit.get(`${h.id}|${email}`) ?? null,
    };
  });
  return buildResendRows(inputs, secret);
}

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function resendListToCsv(list: ResendList): string {
  const header = ['facility', 'city', 'contact_email', 'nudge_sent_at', 'clicked', 'clicked_at', 'warm_lead', 'cohort', 'claim_link', 'link_expires_at'];
  const lines = list.rows.map((r) =>
    [r.facility, r.city ?? '', r.contactEmail, r.sentAt, r.clicked ? 'yes' : 'no', r.clickedAt ?? '', r.warm ? 'yes' : 'no', r.cohort ?? '', r.claimLink, r.expiresAt]
      .map(csvCell)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n') + '\n';
}
