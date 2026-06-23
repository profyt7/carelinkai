/**
 * backfill-batch2-outreach-contacts.ts
 *
 * OL-083 activation: populate `AssistedLivingHome.outreachEmail` for the 11
 * send-ready batch-2 homes from the outreach research, so the inquiry→claim
 * "pull" engine (`notifyUnclaimedHomeInquiry`) can actually nudge the operator
 * when a family inquires on their unclaimed listing. Until these are set, only
 * the public waiting-leads counter is active.
 *
 * SAFETY: hardcoded ids; each target is verified to exist and to still be
 * UNCLAIMED (owned by the directory sentinel operator) before writing — we never
 * stamp an outreach email onto a home a real operator already owns. Only sets
 * `outreachEmail` (no phones were provided). Never changes status. Idempotent:
 * re-running is a no-op when the value already matches. Dry-run by default.
 *
 * Usage (Render shell — has DATABASE_URL):
 *   npx tsx scripts/backfill-batch2-outreach-contacts.ts          # DRY RUN
 *   npx tsx scripts/backfill-batch2-outreach-contacts.ts --force   # apply
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Sentinel operator that owns unclaimed/directory listings (see claim-engine). */
const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

type Target = { homeId: string; facility: string; outreachEmail: string; note?: string };

const TARGETS: Target[] = [
  { homeId: 'cmql0xbon0004r7jcw4vdrrsv', facility: 'Rose Senior Living Beachwood', outreachEmail: 'schonda_grays@roseseniorliving.com' },
  { homeId: 'cmql0xbos0006r7jcitqgqhds', facility: 'Windsor Heights', outreachEmail: 'bdelp@sunshineretirementliving.com' },
  { homeId: 'cmql0xbov0008r7jcgq2lih67', facility: 'Beachwood Commons', outreachEmail: 'asarota@npseniorliving.com', note: 'low-confidence email' },
  { homeId: 'cmql0xboz000ar7jcfnjgumpm', facility: 'Solon Pointe', outreachEmail: 'info@solonpointehc.com' },
  { homeId: 'cmql0xbp3000cr7jc64422ikt', facility: 'Vitalia Solon', outreachEmail: 'jpope@vitaliasolon.com' },
  { homeId: 'cmql0xbp6000er7jcserqwkph', facility: 'Fairmont of Westlake', outreachEmail: 'info@fairmontseniorliving.com' },
  { homeId: 'cmql0xbp9000gr7jcpmm4c9ps', facility: 'Bloom at Rocky River', outreachEmail: 'cdecker@bloomseniorliving.com' },
  { homeId: 'cmql0xbpj000mr7jctdsu6m7n', facility: 'Vitalia Strongsville', outreachEmail: 'dkencson@vitaliastrongsville.com' },
  { homeId: 'cmql0xbps000sr7jcpmmboica', facility: 'Symphony at Mentor', outreachEmail: 'rirons@elegance-living.com' },
  { homeId: 'cmql0xbpv000ur7jcxxgh999r', facility: 'Vista Springs Ravinia Estate', outreachEmail: 'info@vistaspringsliving.com' },
  { homeId: 'cmql0xbpy000wr7jc65d1gcf7', facility: 'Jennings at Brecksville', outreachEmail: 'sarah.barger@jenningsohio.org' },
];

async function main() {
  const force = process.argv.includes('--force');
  console.log(
    force
      ? '=== LIVE RUN (--force) — set outreachEmail on unclaimed batch-2 homes ===\n'
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
        outreachEmail: true,
        operator: { select: { user: { select: { email: true } } } },
      },
    });

    if (!home) {
      console.log(`✗ ${t.homeId} ("${t.facility}") not found — SKIP`);
      skipped++;
      continue;
    }

    const ownerEmail = (home.operator?.user?.email ?? '').toLowerCase();
    if (ownerEmail !== DIRECTORY_UNCLAIMED_EMAIL) {
      console.log(`⚠ "${home.name}" is already CLAIMED (operator=${ownerEmail || 'unknown'}) — SKIP (do not overwrite)`);
      skipped++;
      continue;
    }

    if (home.outreachEmail === t.outreachEmail) {
      console.log(`– "${home.name}" already set to ${t.outreachEmail} — idempotent, nothing to do`);
      continue;
    }

    console.log(
      `🏠 "${home.name}" outreachEmail: ${home.outreachEmail ?? '(none)'} → ${t.outreachEmail}` +
        (t.note ? `  [${t.note}]` : ''),
    );
    if (force) {
      await prisma.assistedLivingHome.update({
        where: { id: t.homeId },
        data: { outreachEmail: t.outreachEmail },
      });
      console.log('   ✓ set');
      applied++;
    } else {
      console.log('   (dry run — would set outreachEmail)');
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(force ? `Applied: ${applied}, Skipped: ${skipped}` : `Would apply: ${applied}, Skipped/flagged: ${skipped}`);
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
