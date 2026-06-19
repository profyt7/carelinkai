/**
 * report-directory-homes.ts
 *
 * Read-only reporter for the "CareLinkAI Directory - Unclaimed Listings"
 * operator. Prints every seeded DRAFT/unclaimed listing with the fields the
 * outreach pipeline needs:
 *
 *   homeId, name, city, status, enriched(yes/no), website
 *
 * Use it to:
 *   - Step 1: see which seeded Tier-A DRAFT homes are NOT yet enriched
 *             (enriched=no) — i.e. not part of an already-sent batch.
 *   - Step 4: export the batch-2 set ({homeId, name, city, status}) for the
 *             Cowork ED/email contact-research pass once enrich has run.
 *
 * NOTE: there is no phone column on AssistedLivingHome, and the PR #545 enrich
 * pipeline does not persist a phone, so "phone" for the step-4 handoff comes
 * from the Cowork research pass — it is intentionally omitted here.
 *
 * City is read from the home's Address; freshly-seeded batch-2 homes show
 * "(pending)" until the enrich/Places step creates the address row.
 *
 * Writes nothing. Safe to run anytime.
 *
 * Usage:
 *   npx tsx scripts/report-directory-homes.ts                 # all directory homes
 *   npx tsx scripts/report-directory-homes.ts --unenriched    # only enriched=no
 *   npx tsx scripts/report-directory-homes.ts --tsv           # tab-separated (paste to a sheet)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_USER_EMAIL = 'directory-unclaimed@carelinkai.system';

async function main() {
  const unenrichedOnly = process.argv.includes('--unenriched');
  const tsv = process.argv.includes('--tsv');

  const seedUser = await prisma.user.findUnique({ where: { email: SEED_USER_EMAIL } });
  const seedOperator = seedUser
    ? await prisma.operator.findUnique({ where: { userId: seedUser.id } })
    : null;

  if (!seedOperator) {
    console.error('Directory operator not found — has the seed script been run?');
    process.exit(1);
  }

  const homes = await prisma.assistedLivingHome.findMany({
    where: {
      operatorId: seedOperator.id,
      ...(unenrichedOnly ? { autoPopulatedAt: null } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      websiteUrl: true,
      autoPopulatedAt: true,
      address: { select: { city: true } },
    },
    orderBy: [{ autoPopulatedAt: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }],
  });

  const rows = homes.map((h) => ({
    homeId: h.id,
    name: h.name,
    city: h.address?.city ?? '(pending)',
    status: h.status,
    enriched: h.autoPopulatedAt ? 'yes' : 'no',
    website: h.websiteUrl ?? '',
  }));

  if (tsv) {
    console.log(['homeId', 'name', 'city', 'status', 'enriched', 'website'].join('\t'));
    for (const r of rows) {
      console.log([r.homeId, r.name, r.city, r.status, r.enriched, r.website].join('\t'));
    }
  } else {
    console.table(rows);
  }

  const enrichedCount = homes.filter((h) => h.autoPopulatedAt).length;
  console.log(
    `\n${homes.length} directory home(s)${unenrichedOnly ? ' (unenriched only)' : ''}: ` +
    `${enrichedCount} enriched, ${homes.length - enrichedCount} not enriched.`,
  );
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
