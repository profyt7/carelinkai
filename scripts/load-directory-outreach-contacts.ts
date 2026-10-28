#!/usr/bin/env npx tsx
/**
 * scripts/load-directory-outreach-contacts.ts
 *
 * Loads researched operator OUTREACH CONTACTS into the directory listings so the
 * claim-nudge engine can email/call the facilities that can claim their listing.
 *
 * Source: scripts/data/directory-outreach-contacts.json — generated from the Cowork
 * contact-research pass (2026-06-25) over the 156 ACTIVE unclaimed directory homes.
 * Only emails Cowork rated HIGH or MEDIUM confidence (and syntactically valid) were
 * carried into the JSON; LOW/blank emails were dropped at generation time so we never
 * nudge an unverified address. Phones are carried broadly (they feed the VA call list).
 *
 * Writes:
 *   - outreachEmail  ← contact.email  (only when present in the JSON, i.e. HIGH/MEDIUM)
 *   - outreachPhone  ← contact.phone  (when present)
 *   - preFilledFields.outreachEmail = '<CONFIDENCE>' provenance (e.g. 'HIGH')
 *   - preFilledFields.outreachPhone = 'RESEARCHED'
 *
 * These are the unclaimed-listing nudge channel — DISTINCT from the public
 * phone/contactEmail (OL-080) shown on the listing.
 *
 * SAFETY:
 *   - Scoped to the directory seed operator's homes ONLY (a row whose homeId belongs to
 *     a different operator is skipped, never written).
 *   - Dry-run by default; only writes with --force.
 *   - Idempotent: re-running writes the same values; "no change" rows are reported as such.
 *   - Never blanks an existing value — only sets when the JSON has a value.
 *
 * Usage:
 *   npx tsx scripts/load-directory-outreach-contacts.ts            # DRY RUN
 *   npx tsx scripts/load-directory-outreach-contacts.ts --force    # apply
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const SEED_USER_EMAIL = 'directory-unclaimed@carelinkai.system';
const DATA_FILE = join(__dirname, 'data', 'directory-outreach-contacts.json');

type Contact = {
  homeId: string;
  name: string;
  email: string | null;
  emailConfidence: string | null;
  phone: string | null;
};

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  const contacts: Contact[] = JSON.parse(readFileSync(DATA_FILE, 'utf8'));

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE — loading outreach contacts ===');
  console.log(`Source: ${DATA_FILE}\nRows: ${contacts.length}\n`);

  const seedUser = await prisma.user.findUnique({ where: { email: SEED_USER_EMAIL } });
  const seedOperator = seedUser
    ? await prisma.operator.findUnique({ where: { userId: seedUser.id } })
    : null;
  if (!seedOperator) {
    console.error('Directory seed operator not found — aborting.');
    process.exit(1);
  }

  let emailWrites = 0;
  let phoneWrites = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const c of contacts) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: c.homeId },
      select: { id: true, name: true, operatorId: true, outreachEmail: true, outreachPhone: true, preFilledFields: true },
    });

    if (!home) {
      console.log(`  ⚠ SKIP ${c.name} (${c.homeId}) — not found`);
      skipped++;
      continue;
    }
    if (home.operatorId !== seedOperator.id) {
      console.log(`  ⚠ SKIP ${home.name} (${c.homeId}) — not a directory-seed home (operator drift)`);
      skipped++;
      continue;
    }

    const nextEmail = c.email ?? home.outreachEmail ?? null;
    const nextPhone = c.phone ?? home.outreachPhone ?? null;
    const emailChanged = c.email != null && c.email !== home.outreachEmail;
    const phoneChanged = c.phone != null && c.phone !== home.outreachPhone;

    if (!emailChanged && !phoneChanged) {
      unchanged++;
      continue;
    }

    const bits: string[] = [];
    if (emailChanged) { bits.push(`email=${c.email} [${c.emailConfidence}]`); emailWrites++; }
    if (phoneChanged) { bits.push(`phone=${c.phone}`); phoneWrites++; }
    console.log(`  ✉ ${home.name} — ${bits.join('  ')}`);

    if (!dryRun) {
      const prov = (home.preFilledFields as Record<string, string> | null) ?? {};
      if (emailChanged) prov.outreachEmail = c.emailConfidence ?? 'RESEARCHED';
      if (phoneChanged) prov.outreachPhone = 'RESEARCHED';
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: { outreachEmail: nextEmail, outreachPhone: nextPhone, preFilledFields: prov },
      });
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`${dryRun ? 'Would set' : 'Set'} email on: ${emailWrites}`);
  console.log(`${dryRun ? 'Would set' : 'Set'} phone on: ${phoneWrites}`);
  console.log(`Unchanged:        ${unchanged}`);
  console.log(`Skipped:          ${skipped}`);
  console.log('─────────────────────────────────────────────');
  if (dryRun) console.log('\nDRY RUN complete. Re-run with --force to write.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
