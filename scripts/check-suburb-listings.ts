/**
 * check-suburb-listings.ts — suburb empty-state guard (sprint W4 0c).
 *
 * Prints the LIVE non-demo listing count every suburb SEO page would render
 * (/cleveland/assisted-living/<slug>), using the page's own query, and warns
 * for any suburb that would show the empty state. Read-only.
 *
 * Usage (against whichever DATABASE_URL is in the env):
 *   npx tsx scripts/check-suburb-listings.ts            # table + warnings, exit 0
 *   npx tsx scripts/check-suburb-listings.ts --strict   # exit 1 if any suburb is empty
 *   npx tsx scripts/check-suburb-listings.ts --json     # machine-readable
 *
 * Run it on Render (shell) before adding a suburb and after any directory
 * sweep (archive / dedupe / status fix) — the page logs the same warning at
 * request time, but this tells you before a crawler does.
 */

import { reportSuburbListings } from '@/lib/directory/suburb-guard';
import { prisma } from '@/lib/prisma';

async function main() {
  const strict = process.argv.includes('--strict');
  const json = process.argv.includes('--json');
  const reports = await reportSuburbListings();
  const empty = reports.filter((r) => r.empty);

  if (json) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), reports, emptyCount: empty.length }, null, 2));
  } else {
    console.log('Suburb page listing counts (live, non-demo, ACTIVE, careLevel has ASSISTED):\n');
    for (const r of reports) {
      const count = r.count === null ? 'ERR' : String(r.count);
      console.log(`  ${r.empty ? '!!' : 'ok'}  ${r.slug.padEnd(14)} ${count.padStart(4)}   /cleveland/assisted-living/${r.slug}`);
    }
    console.log('');
    for (const r of empty) {
      console.warn(`WARNING: /cleveland/assisted-living/${r.slug} would render the EMPTY STATE — count=${r.count ?? 'ERR'} filter: ${r.filter}${r.error ? ` error: ${r.error}` : ''}`);
    }
    if (empty.length === 0) console.log('All suburb pages have at least one live listing.');
  }

  await prisma.$disconnect();
  if (strict && empty.length > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
