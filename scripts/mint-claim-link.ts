#!/usr/bin/env npx tsx
/**
 * scripts/mint-claim-link.ts
 *
 * Mint 45-day operator CLAIM LINKS for warm leads — one lead, or a whole batch via
 * --file. MINT-ONLY and READ-ONLY: it finds existing listings and signs tokens; it
 * never seeds, never writes the DB, and never sends email (links go out as personal
 * 1:1 / prepared-CSV sends, not a Resend broadcast).
 *
 * Resolution is by homeId, or name (+ optional city). It DEDUPES (reuses the
 * existing homeId, never creates a duplicate). If a lead doesn't resolve cleanly it
 * is flagged (NOT FOUND with city near-matches, or AMBIGUOUS with candidate ids) so
 * you can confirm the right home instead of minting for the wrong one. Already-
 * CLAIMED homes are flagged and get no link. Each row also reports drip de-dupe
 * intel (claimDripStep / started / last-sent / stopped) so you don't double-email.
 *
 * Token matches the rest of the codebase (src/lib/claim-token.ts + claim-drip.ts):
 * { operatorEmail, homeId, clevelandFounder, iat, exp } signed with NEXTAUTH_SECRET,
 * exp = iat + 45 days.
 *
 * Run on Render (needs DATABASE_URL + NEXTAUTH_SECRET):
 *   # single lead
 *   npx tsx scripts/mint-claim-link.ts --email teresa@x.com --name "Pleasant Pointe" --city Barberton
 *   npx tsx scripts/mint-claim-link.ts --email lfluhart@x.org --home-id <homeId>
 *   # batch — one lead per line, "Facility | City | operator@email" (| or , or tab):
 *   npx tsx scripts/mint-claim-link.ts --file batch2.tsv        # prints a paste-ready TSV table + flags
 */

import { PrismaClient } from '@prisma/client';
import { signClaimToken, DEFAULT_CLAIM_TOKEN_TTL_HOURS } from '../src/lib/claim-token';
import { readFileSync } from 'node:fs';

const prisma = new PrismaClient();
const SENTINEL = 'directory-unclaimed@carelinkai.system';

const SEL = {
  id: true, name: true, status: true,
  claimDripStep: true, claimDripStartedAt: true, claimNudgeLastSentAt: true, claimDripStoppedReason: true,
  address: { select: { city: true } },
  operator: { select: { user: { select: { email: true } } } },
} as const;

type Home = {
  id: string; name: string; status: string;
  claimDripStep: number; claimDripStartedAt: Date | null; claimNudgeLastSentAt: Date | null; claimDripStoppedReason: string | null;
  address: { city: string | null } | null;
  operator: { user: { email: string | null } | null } | null;
};
type Lead = { label: string; email: string; name?: string; city?: string; homeId?: string };
type Resolved = { lead: Lead; state: 'FOUND' | 'CLAIMED' | 'NOT_FOUND' | 'AMBIGUOUS'; home?: Home; link?: string; candidates?: Home[] };

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}
function iso(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}
function claimed(h: Home): boolean {
  return (h.operator?.user?.email || '').toLowerCase() !== SENTINEL;
}
function mintLink(homeId: string, email: string, secret: string, now: number, exp: number): string {
  const token = signClaimToken({ operatorEmail: email.toLowerCase(), homeId, clevelandFounder: true, iat: now, exp }, secret);
  return `${appUrl()}/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`;
}

async function resolve(lead: Lead, secret: string, now: number, exp: number): Promise<Resolved> {
  const homes = (lead.homeId
    ? await prisma.assistedLivingHome.findMany({ where: { id: lead.homeId }, select: SEL })
    : await prisma.assistedLivingHome.findMany({
        where: {
          name: { contains: lead.name as string, mode: 'insensitive' },
          ...(lead.city ? { address: { is: { city: { contains: lead.city, mode: 'insensitive' } } } } : {}),
        },
        select: SEL,
        orderBy: { createdAt: 'asc' },
      })) as Home[];

  if (homes.length === 1) {
    const h = homes[0] as Home;
    if (claimed(h)) return { lead, state: 'CLAIMED', home: h };
    return { lead, state: 'FOUND', home: h, link: mintLink(h.id, lead.email, secret, now, exp) };
  }
  if (homes.length > 1) return { lead, state: 'AMBIGUOUS', candidates: homes };

  // Not found by name+city → surface same-city candidates so a rename (e.g. Bloom↔Bickford) is easy to confirm.
  const near = lead.city
    ? ((await prisma.assistedLivingHome.findMany({ where: { address: { is: { city: { contains: lead.city, mode: 'insensitive' } } } }, select: SEL, take: 12 })) as Home[])
    : [];
  return { lead, state: 'NOT_FOUND', candidates: near };
}

function parseLeadsFile(path: string): Lead[] {
  const out: Lead[] = [];
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s*[|,\t]\s*/);
    // Expected: Facility | City | email   (email is the field containing '@')
    const email = parts.find((p) => p.includes('@'));
    if (!email) continue;
    const rest = parts.filter((p) => p !== email);
    const [name, city] = rest;
    out.push({ label: name || '(no name)', email, name, city });
  }
  return out;
}

async function main() {
  const secret = process.env['NEXTAUTH_SECRET'];
  if (!secret) {
    console.error('✗ NEXTAUTH_SECRET is not set. Run this in the Render shell (production env), not locally.');
    process.exit(1);
  }
  const now = Math.floor(Date.now() / 1000);
  const exp = now + DEFAULT_CLAIM_TOKEN_TTL_HOURS * 3600;
  const expDate = new Date(exp * 1000).toISOString().slice(0, 10);
  const file = arg('--file');

  // ---- BATCH MODE ----
  if (file) {
    const leads = parseLeadsFile(file);
    if (!leads.length) { console.error(`✗ No "Facility | City | email" leads parsed from ${file}.`); process.exit(1); }
    const rows: string[] = [['Facility', 'City', 'OperatorEmail', 'homeId', 'Status', 'Claimed', 'DripStep', 'DripStarted', 'LastSent', 'Stopped', 'Expiry', 'State', 'ClaimLink'].join('\t')];
    const flags: string[] = [];
    for (const lead of leads) {
      const r = await resolve(lead, secret, now, exp);
      if (r.state === 'FOUND' || r.state === 'CLAIMED') {
        const h = r.home as Home;
        const link = r.state === 'CLAIMED' ? '(CLAIMED — skip)' : (r.link as string);
        rows.push([lead.label, h.address?.city || lead.city || '', lead.email, h.id, h.status, r.state === 'CLAIMED' ? 'YES' : 'no',
          String(h.claimDripStep), iso(h.claimDripStartedAt), iso(h.claimNudgeLastSentAt), h.claimDripStoppedReason || '', expDate, r.state, link].join('\t'));
        if (r.state === 'CLAIMED') flags.push(`CLAIMED (skip send): ${lead.label} → ${h.id} "${h.name}" owned by ${h.operator?.user?.email}`);
        if (h.name.toLowerCase() !== lead.label.toLowerCase()) flags.push(`NAME MISMATCH: sheet "${lead.label}" ↔ DB "${h.name}" (${h.id}, ${h.address?.city}) — confirm it's the right home.`);
      } else {
        rows.push([lead.label, lead.city || '', lead.email, '—', '', '', '', '', '', '', '', r.state, ''].join('\t'));
        const cand = (r.candidates || []).map((c) => `${c.id} "${c.name}" (${c.address?.city}${claimed(c) ? ', CLAIMED' : ''})`).join('  |  ') || '(none in that city)';
        flags.push(`${r.state}: ${lead.label} · ${lead.city || '?'} → ${cand}${r.state === 'AMBIGUOUS' || (r.candidates || []).length ? '  — re-run with --home-id <id>' : ''}`);
      }
    }
    console.log('\n===== CLAIM LINKS (TSV — paste into the send CSV) =====\n');
    console.log(rows.join('\n'));
    console.log('\n===== FLAGS (resolve before sending) =====');
    console.log(flags.length ? flags.map((f) => '  • ' + f).join('\n') : '  none');
    console.log('\nDe-dupe: DripStep>0 or a DripStarted/LastSent date = this home ALREADY got a claim-drip touch (do not double-email).');
    return;
  }

  // ---- SINGLE-LEAD MODE ----
  const email = arg('--email');
  const homeId = arg('--home-id');
  const name = arg('--name');
  const city = arg('--city');
  if (!email) { console.error('✗ --email <operator email> is required (or use --file for a batch).'); process.exit(1); }
  if (!homeId && !name) { console.error('✗ Provide --home-id <id>, or --name "<home name>" (optionally + --city <city>).'); process.exit(1); }

  const r = await resolve({ label: name || homeId || email, email, name, city, homeId }, secret, now, exp);
  if (r.state === 'NOT_FOUND' || r.state === 'AMBIGUOUS') {
    if (r.candidates && r.candidates.length) {
      console.log(`\n⚠ ${r.state} — candidates${city ? ` in ${city}` : ''} (pass --home-id to pick one):`);
      for (const c of r.candidates) console.log(`   • ${c.id}  ${c.name}  [${c.status}]  ${c.address?.city ?? '(no city)'}${claimed(c) ? '  (CLAIMED)' : ''}`);
    }
    console.error(`\n✗ ${r.state}: "${name ?? homeId}"${city ? ` in ${city}` : ''}. Not minting a link.`);
    process.exit(2);
  }
  const h = r.home as Home;
  console.log(`\n${r.state === 'CLAIMED' ? '⚠ CLAIMED' : '✓ FOUND'}: ${h.id}  "${h.name}"  [${h.status}]  ${h.address?.city ?? '(no city)'}`);
  console.log(`  drip: step ${h.claimDripStep}${h.claimDripStartedAt ? `, started ${iso(h.claimDripStartedAt)}` : ''}${h.claimNudgeLastSentAt ? `, last-sent ${iso(h.claimNudgeLastSentAt)}` : ''}${h.claimDripStoppedReason ? `, stopped=${h.claimDripStoppedReason}` : ''}`);
  if (r.state === 'CLAIMED') { console.error(`\n✗ Home is already CLAIMED (${h.operator?.user?.email}) — not minting.`); process.exit(2); }
  console.log(`\n=== CLAIM LINK — ${email} ===`);
  console.log(`homeId:   ${h.id}`);
  console.log(`expires:  ${expDate}  (~45 days)`);
  console.log(`\n${r.link}`);
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
