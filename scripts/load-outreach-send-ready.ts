#!/usr/bin/env npx tsx
/**
 * scripts/load-outreach-send-ready.ts
 *
 * Applies the curated SEND_READY outreach backfill (Cowork research, 2026-06-25)
 * to the directory listings, keyed by homeId. Source of record:
 * scripts/data/outreach-send-ready.json (generated from
 * CareLinkAI_directory_outreach_SEND_READY.csv).
 *
 * Per-row operation ("op"):
 *   - send  → overwrite outreachEmail + outreachPhone with the research-verified
 *             values (replaces any old/guessed value). preFilledFields.outreachEmail
 *             stamped with the confidence (HIGH/MEDIUM) so the tiered sender can use it.
 *   - clear → outreachEmail = null (these 5 HARD-BOUNCED in Resend: dead promedica.org
 *             inboxes / guessed patterns). Keep phone → CALL-ONLY. Stamp 'BOUNCED-CLEARED'.
 *             These take precedence over anything else.
 *   - dup   → duplicate listing already archived INACTIVE (#617). Verify INACTIVE and
 *             null outreachEmail so the claim engine can never invite the twin. 'DUP-SUPPRESSED'.
 *   - hold  → null outreachEmail so a `--tier medium` sweep cannot invite it before the
 *             founder confirms scope (SNF-vs-AL / possible-dup). Phone untouched. 'HOLD-REVIEW'.
 *
 * CALL-ONLY rows (no email) are NOT in the JSON — their phones were already loaded
 * (#616) and are left untouched.
 *
 * The 46 "scale wave" SEND rows (SEND minus the 13-home pilot) get their CONTACTS
 * loaded here, but NOTHING is sent — sending is a separate step (send-claim-nudges.ts),
 * held until the founder gives the go.
 *
 * SAFETY: scoped to the directory-seed operator's homes only; dry-run by default;
 * idempotent; --force to write.
 *
 * Usage:
 *   npx tsx scripts/load-outreach-send-ready.ts            # DRY RUN
 *   npx tsx scripts/load-outreach-send-ready.ts --force    # apply
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const SEED_USER_EMAIL = 'directory-unclaimed@carelinkai.system';
const DATA_FILE = join(__dirname, 'data', 'outreach-send-ready.json');

type Rec = {
  homeId: string;
  name: string;
  op: 'send' | 'clear' | 'dup' | 'hold';
  email?: string;
  phone?: string | null;
  confidence?: string;
  inPilot?: boolean;
};

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;
  const recs: Rec[] = JSON.parse(readFileSync(DATA_FILE, 'utf8'));

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — applying SEND_READY backfill ===');
  console.log(`Source: ${DATA_FILE}\nRows: ${recs.length}\n`);

  const seedUser = await prisma.user.findUnique({ where: { email: SEED_USER_EMAIL } });
  const seedOperator = seedUser ? await prisma.operator.findUnique({ where: { userId: seedUser.id } }) : null;
  if (!seedOperator) {
    console.error('Directory seed operator not found — aborting.');
    process.exit(1);
  }

  const counts = { send: 0, clear: 0, dup: 0, hold: 0, skipped: 0 };
  let scaleWaveLoaded = 0;
  let pilotRefreshed = 0;

  for (const op of ['send', 'clear', 'dup', 'hold'] as const) {
    const group = recs.filter((r) => r.op === op);
    if (!group.length) continue;
    console.log(`── ${op.toUpperCase()} (${group.length}) ──`);

    for (const r of group) {
      const home = await prisma.assistedLivingHome.findUnique({
        where: { id: r.homeId },
        select: { id: true, name: true, status: true, operatorId: true, outreachEmail: true, outreachPhone: true, preFilledFields: true },
      });
      if (!home) { console.log(`  ⚠ SKIP ${r.name} (${r.homeId}) — not found`); counts.skipped++; continue; }
      if (home.operatorId !== seedOperator.id) {
        console.log(`  ⚠ SKIP ${home.name} — not a directory-seed home (claimed/owner drift)`); counts.skipped++; continue;
      }

      const prov = (home.preFilledFields as Record<string, string> | null) ?? {};
      let nextEmail = home.outreachEmail;
      let nextPhone = home.outreachPhone;

      if (op === 'send') {
        nextEmail = r.email!;
        if (r.phone) nextPhone = r.phone;
        prov.outreachEmail = r.confidence ?? 'MEDIUM';
        if (r.phone) prov.outreachPhone = 'RESEARCHED';
        console.log(`  ✉ ${home.name} ← ${r.email} [${r.confidence}]${r.inPilot ? '  (pilot)' : '  (scale-wave)'}`);
        if (r.inPilot) pilotRefreshed++; else scaleWaveLoaded++;
      } else if (op === 'clear') {
        nextEmail = null;
        if (r.phone) nextPhone = r.phone;
        prov.outreachEmail = 'BOUNCED-CLEARED';
        console.log(`  🚫 ${home.name} — email cleared (hard-bounced); CALL-ONLY ${nextPhone ?? ''}`);
      } else if (op === 'dup') {
        nextEmail = null;
        prov.outreachEmail = 'DUP-SUPPRESSED';
        const flag = home.status === 'INACTIVE' ? 'INACTIVE ✓' : `⚠ status=${home.status} (expected INACTIVE)`;
        console.log(`  ♊ ${home.name} — email cleared; ${flag}`);
      } else { // hold
        nextEmail = null;
        prov.outreachEmail = 'HOLD-REVIEW';
        console.log(`  ⏸ ${home.name} — email cleared (held for review)`);
      }
      counts[op]++;

      if (!dryRun) {
        await prisma.assistedLivingHome.update({
          where: { id: home.id },
          data: { outreachEmail: nextEmail, outreachPhone: nextPhone, preFilledFields: prov },
        });
      }
    }
    console.log('');
  }

  console.log('─────────────────────────────────────────────');
  console.log(`SEND (email+phone set):   ${counts.send}   → ${pilotRefreshed} pilot, ${scaleWaveLoaded} scale-wave`);
  console.log(`CLEAR (bounced→CALL-ONLY):${counts.clear}`);
  console.log(`DUP (suppressed):         ${counts.dup}`);
  console.log(`HOLD (suppressed):        ${counts.hold}`);
  if (counts.skipped) console.log(`Skipped:                  ${counts.skipped}`);
  console.log('─────────────────────────────────────────────');
  console.log(`\nScale wave = ${scaleWaveLoaded} contacts LOADED but NOT sent. Sending is held for your go`);
  console.log(`(run send-claim-nudges.ts --tier medium --force only when you say so).`);
  if (dryRun) console.log('\nDRY RUN complete. Re-run with --force to write.');
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
