/**
 * backfill-va-operator-emails.ts
 *
 * VA-sourced (Anita), phone-verified 2026-06-25 operator emails. For each target:
 *   1. set `outreachEmail` to the verified admin address (OVERWRITES dead/bounced
 *      addresses where noted),
 *   2. mark it send-eligible for the MEDIUM-tier claim-nudge wave by setting
 *      `preFilledFields.outreachEmail = 'MEDIUM'` (merged, other keys preserved),
 *   3. reactivate the listing: `status → ACTIVE`.
 *
 * Why MEDIUM and not HIGH: the founder is routing these into the parked
 * `--tier medium` scale wave (held until the pilot go/no-go). `send-claim-nudges.ts`
 * medium tier = HIGH|MEDIUM, while the default `--tier high` run = HIGH only — so
 * tagging these MEDIUM keeps them OUT of an accidental high-tier send until the
 * medium wave is deliberately fired.
 *
 * SAFETY: hardcoded ids; each target must exist AND still be owned by the directory
 * sentinel operator (truly unclaimed) before any write — we never stamp an outreach
 * email onto a home a real operator already claimed. Dry-run by default; the dry-run
 * prints the full before→after diff (status, email, tier-confidence) per home.
 * Idempotent: re-running is a no-op once a home already matches all three targets.
 *
 * Usage (Render shell — has DATABASE_URL):
 *   npx tsx scripts/backfill-va-operator-emails.ts           # DRY RUN
 *   npx tsx scripts/backfill-va-operator-emails.ts --force    # apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Sentinel operator that owns unclaimed/directory listings (see claim-engine). */
const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

/** Confidence tag written to preFilledFields.outreachEmail so the sender's tier filter picks them up. */
const TIER_CONFIDENCE = 'MEDIUM';

type Target = {
  homeId: string;
  /** Expected facility name fragment — sanity check only (warns, never blocks). */
  expect: string;
  outreachEmail: string;
  note: string;
};

const TARGETS: Target[] = [
  { homeId: 'cmp71kmse001clpiofgsupc5e', expect: 'Arden Courts', outreachEmail: 'ncosta@arden-courts.com', note: 'Admin Nilza Costa — REPLACES dead promedica.org addr' },
  { homeId: 'cmp71kms70016lpioahtq3nc0', expect: 'Village of the Falls', outreachEmail: 'hcorwin@sprengerhealthcare.com', note: 'Admin Hannah Corwin — replaces bounced hjohnson@' },
  { homeId: 'cmp71kmsr001olpiojeaysaqf', expect: 'Residence of Chardon', outreachEmail: 'cagardner@sonidaliving.com', note: 'Admin Carolyn Gardener' },
  { homeId: 'cmqqrktp9002urlmbcy445jw3', expect: 'Danbury Woods', outreachEmail: 'mcollage@danburyseniorliving.com', note: 'Exec Admin Morgan Collage — upgrade from marketing@csig.com (kept dup)' },
  { homeId: 'cmp71kmsa0018lpiojjzghsq0', expect: "O'Neill", outreachEmail: 'administrator.lw@oneillhc.com', note: 'Admin Grace Jenny — facility-specific' },
];

async function main() {
  const force = process.argv.includes('--force');
  console.log(
    force
      ? '=== LIVE RUN (--force) — set outreachEmail + MEDIUM tier + status=ACTIVE on 5 VA-sourced homes ===\n'
      : '=== DRY RUN — no writes (pass --force to apply) ===\n',
  );

  let applied = 0;
  let skipped = 0;

  for (const t of TARGETS) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: t.homeId },
      select: {
        id: true,
        name: true,
        status: true,
        outreachEmail: true,
        preFilledFields: true,
        operator: { select: { user: { select: { email: true } } } },
      },
    });

    if (!home) {
      console.log(`✗ ${t.homeId} ("${t.expect}") not found — SKIP`);
      skipped++;
      continue;
    }

    const ownerEmail = (home.operator?.user?.email ?? '').toLowerCase();
    if (ownerEmail !== DIRECTORY_UNCLAIMED_EMAIL) {
      console.log(`⚠ "${home.name}" is already CLAIMED (operator=${ownerEmail || 'unknown'}) — SKIP (do not overwrite)`);
      skipped++;
      continue;
    }

    if (!home.name.toLowerCase().includes(t.expect.toLowerCase())) {
      console.log(`⚠ id ${t.homeId}: DB name "${home.name}" does not contain expected "${t.expect}" — proceeding but VERIFY this is the right home.`);
    }

    const prevPff = (home.preFilledFields && typeof home.preFilledFields === 'object'
      ? home.preFilledFields
      : {}) as Record<string, unknown>;
    const prevConf = prevPff.outreachEmail;

    const emailChanged = home.outreachEmail !== t.outreachEmail;
    const statusChanged = home.status !== 'ACTIVE';
    const confChanged = prevConf !== TIER_CONFIDENCE;

    if (!emailChanged && !statusChanged && !confChanged) {
      console.log(`– "${home.name}" already email=${t.outreachEmail}, status=ACTIVE, tier=${TIER_CONFIDENCE} — idempotent, nothing to do`);
      continue;
    }

    console.log(`🏠 "${home.name}"  [${t.note}]`);
    if (emailChanged) console.log(`     email:  ${home.outreachEmail ?? '(none)'} → ${t.outreachEmail}`);
    if (statusChanged) console.log(`     status: ${home.status} → ACTIVE`);
    if (confChanged) console.log(`     tier:   ${prevConf ?? '(none)'} → ${TIER_CONFIDENCE} (preFilledFields.outreachEmail)`);

    if (force) {
      await prisma.assistedLivingHome.update({
        where: { id: t.homeId },
        data: {
          outreachEmail: t.outreachEmail,
          status: 'ACTIVE',
          preFilledFields: { ...prevPff, outreachEmail: TIER_CONFIDENCE },
        },
      });
      console.log('   ✓ applied');
      applied++;
    } else {
      console.log('   (dry run — would apply the above)');
      applied++;
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(force ? `Applied: ${applied}, Skipped: ${skipped}` : `Would apply: ${applied}, Skipped/flagged: ${skipped}`);
  console.log('NOT loaded (per founder, CALL-ONLY): Arden Courts Bath (HR inbox), Concordia at Sumner (no email).');
  if (!force) console.log('DRY RUN — re-run with --force to apply.');
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

