/**
 * batch2-send-prep.ts
 *
 * Batch-2 founder-outreach send prep (same flow as batch 1). For each of the 11
 * send-ready DRAFT homes below it:
 *   1. Generates a per-home operator claim link via `signClaimToken`
 *      (founder benefits ON → clevelandFounder:true, 45-day expiry per PR #575),
 *      signed with NEXTAUTH_SECRET, URL shape identical to the admin claim-link
 *      route: `${APP_URL}/auth/register?role=OPERATOR&claimToken=<token>`.
 *   2. (--push) Creates/【finds the Resend audience "Batch 2" and loads the 11 as
 *      contacts with properties { facility_name, claim_link } + first_name/email
 *      (same shape as the batch-1 "General" load).
 *   3. Prints the CSV (facility,email,claim_link) + the count.
 *
 * GUARDRAILS:
 *   - Reads homes only to verify they exist + are DRAFT; NEVER writes to a home
 *     (status stays DRAFT/unpublished).
 *   - NEVER sends a broadcast / email. `--push` only loads audience contacts.
 *   - Default is a DRY RUN: generate links + print CSV, no Resend calls.
 *
 * Usage (Render shell — has NEXTAUTH_SECRET, NEXT_PUBLIC_APP_URL, RESEND_API_KEY):
 *   npx tsx scripts/batch2-send-prep.ts          # DRY RUN — links + CSV, no Resend
 *   npx tsx scripts/batch2-send-prep.ts --push    # also create/load "Batch 2" audience
 */

import { PrismaClient, HomeStatus } from '@prisma/client';
import { signClaimToken, DEFAULT_CLAIM_TOKEN_TTL_HOURS } from '../src/lib/claim-token';

const prisma = new PrismaClient();

const AUDIENCE_NAME = 'Batch 2';
const RESEND_BASE = 'https://api.resend.com';

type Home = { homeId: string; facility: string; firstName: string; email: string; note?: string };

// The 11 send-ready homes. HOLD rows (Meadow Falls, Embassy of Rockport, The
// Ashton) and Villa Serena (out of scope) are intentionally excluded.
const HOMES: Home[] = [
  { homeId: 'cmql0xbon0004r7jcw4vdrrsv', facility: 'Rose Senior Living Beachwood', firstName: 'Schonda', email: 'schonda_grays@roseseniorliving.com' },
  { homeId: 'cmql0xbos0006r7jcitqgqhds', facility: 'Windsor Heights', firstName: 'Brandy', email: 'bdelp@sunshineretirementliving.com' },
  { homeId: 'cmql0xbov0008r7jcgq2lih67', facility: 'Beachwood Commons', firstName: 'Ashley', email: 'asarota@npseniorliving.com', note: 'LOW email — bounce risk' },
  { homeId: 'cmql0xboz000ar7jcfnjgumpm', facility: 'Solon Pointe', firstName: 'Team', email: 'info@solonpointehc.com' },
  { homeId: 'cmql0xbp3000cr7jc64422ikt', facility: 'Vitalia Solon', firstName: 'Jessica', email: 'jpope@vitaliasolon.com' },
  { homeId: 'cmql0xbp6000er7jcserqwkph', facility: 'Fairmont of Westlake', firstName: 'Team', email: 'info@fairmontseniorliving.com' },
  { homeId: 'cmql0xbp9000gr7jcpmm4c9ps', facility: 'Bloom at Rocky River', firstName: 'Christa', email: 'cdecker@bloomseniorliving.com' },
  { homeId: 'cmql0xbpj000mr7jctdsu6m7n', facility: 'Vitalia Strongsville', firstName: 'Danielle', email: 'dkencson@vitaliastrongsville.com' },
  { homeId: 'cmql0xbps000sr7jcpmmboica', facility: 'Symphony at Mentor', firstName: 'Robin', email: 'rirons@elegance-living.com' },
  { homeId: 'cmql0xbpv000ur7jcxxgh999r', facility: 'Vista Springs Ravinia Estate', firstName: 'Team', email: 'info@vistaspringsliving.com' },
  { homeId: 'cmql0xbpy000wr7jc65d1gcf7', facility: 'Jennings at Brecksville', firstName: 'Sarah', email: 'sarah.barger@jenningsohio.org' },
];

function csvEscape(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

type ResendResult = { ok: boolean; status: number; json: unknown };

async function resendCall(path: string, method: string, apiKey: string, body?: unknown): Promise<ResendResult> {
  const res = await fetch(`${RESEND_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, json };
}

type Row = { facility: string; email: string; firstName: string; claimUrl: string };

async function main() {
  const push = process.argv.includes('--push');
  const secret = process.env['NEXTAUTH_SECRET'] || '';
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  if (!secret) {
    console.error('ERROR: NEXTAUTH_SECRET not set — cannot sign claim tokens (run in the Render shell).');
    process.exit(1);
  }

  console.log(
    push
      ? `=== LIVE (--push): generate 45-day founder claim links + load Resend "${AUDIENCE_NAME}" (no broadcast) ===\n`
      : '=== DRY RUN: generate 45-day founder claim links + print CSV (no Resend calls) ===\n',
  );
  console.log(`app_url=${appUrl}  ttl=${DEFAULT_CLAIM_TOKEN_TTL_HOURS}h (${DEFAULT_CLAIM_TOKEN_TTL_HOURS / 24}d)  founder_benefits=ON\n`);

  const now = Math.floor(Date.now() / 1000);
  const ttlHours = DEFAULT_CLAIM_TOKEN_TTL_HOURS;
  const rows: Row[] = [];

  for (const h of HOMES) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: h.homeId },
      select: { id: true, name: true, status: true },
    });

    if (!home) {
      console.log(`✗ ${h.homeId} ("${h.facility}") NOT FOUND — SKIP (no link, not loaded)`);
      continue;
    }
    if (home.status !== HomeStatus.DRAFT) {
      console.log(`⚠ "${home.name}" status=${home.status} (expected DRAFT) — home NOT modified; review before send`);
    }
    if (home.name !== h.facility) {
      console.log(`   note: DB name "${home.name}" ≠ outreach label "${h.facility}" (using outreach label in CSV/properties)`);
    }

    const token = signClaimToken(
      {
        operatorEmail: h.email.toLowerCase(),
        homeId: h.homeId,
        clevelandFounder: true,
        iat: now,
        exp: now + ttlHours * 3600,
      },
      secret,
    );
    const claimUrl = `${appUrl}/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`;
    rows.push({ facility: h.facility, email: h.email, firstName: h.firstName, claimUrl });
    console.log(`🔗 ${h.facility} <${h.email}> — ${home.status}${h.note ? `  [${h.note}]` : ''}`);
  }

  // ── CSV output (facility,email,claim_link) ──────────────────────────────────
  console.log('\n----- CSV (facility,email,claim_link) -----');
  console.log('facility,email,claim_link');
  for (const r of rows) {
    console.log([csvEscape(r.facility), csvEscape(r.email), csvEscape(r.claimUrl)].join(','));
  }
  console.log(`----- ${rows.length} rows -----\n`);

  if (!push) {
    console.log(`DRY RUN — re-run with --push to create/load the "${AUDIENCE_NAME}" Resend audience. No email is ever sent.`);
    return;
  }

  // ── Resend audience load (--push) ───────────────────────────────────────────
  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) {
    console.error('ERROR: RESEND_API_KEY not set — cannot push to Resend.');
    process.exit(1);
  }

  // Find or create the "Batch 2" audience.
  const list = await resendCall('/audiences', 'GET', apiKey);
  if (!list.ok) {
    console.error('ERROR listing audiences:', list.status, JSON.stringify(list.json));
    process.exit(1);
  }
  const data = (list.json as { data?: Array<{ id: string; name: string }> })?.data ?? [];
  let audienceId = data.find((a) => a.name === AUDIENCE_NAME)?.id;

  if (audienceId) {
    console.log(`audience "${AUDIENCE_NAME}" already exists: ${audienceId}`);
  } else {
    const created = await resendCall('/audiences', 'POST', apiKey, { name: AUDIENCE_NAME });
    if (!created.ok) {
      console.error('ERROR creating audience:', created.status, JSON.stringify(created.json));
      process.exit(1);
    }
    audienceId = (created.json as { id: string }).id;
    console.log(`created audience "${AUDIENCE_NAME}": ${audienceId}`);
  }

  let loaded = 0;
  let failed = 0;
  for (const r of rows) {
    const body = {
      email: r.email,
      first_name: r.firstName,
      unsubscribed: false,
      properties: { facility_name: r.facility, claim_link: r.claimUrl },
    };
    const res = await resendCall(`/audiences/${audienceId}/contacts`, 'POST', apiKey, body);
    if (res.ok) {
      loaded++;
      console.log(`  ✓ ${r.email} (${res.status})`);
    } else {
      failed++;
      console.log(`  ✗ ${r.email} (${res.status}): ${JSON.stringify(res.json)}`);
    }
  }

  console.log(`\nLoaded ${loaded}/${rows.length} contact(s) into "${AUDIENCE_NAME}" (${failed} failed). NO broadcast/email sent — Chris sends from Resend.`);
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
