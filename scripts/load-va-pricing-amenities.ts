/**
 * load-va-pricing-amenities.ts
 *
 * Loads VA-collected (Anita, phone) STARTING price ranges + amenities onto
 * UNCLAIMED directory listings, flagged as APPROXIMATE / unverified so families
 * see it's distinct from operator-verified data and so it's cleanly overridden
 * when the operator claims and enters real values.
 *
 * Provenance: sets `preFilledFields.priceRange = 'VA_UNVERIFIED'` and/or
 * `preFilledFields.amenities = 'VA_UNVERIFIED'`. The listing detail page shows a
 * "Pending operator confirmation" note while the flag is set; the operator home
 * edit route clears the flag the moment the operator saves price/amenities.
 *
 * SAFETY: only writes UNCLAIMED (directory-sentinel-owned) homes — never an
 * operator's real data. Dry-run by default; prints the before→after per home.
 *
 * CSV (header row required): homeId,priceMin,priceMax,amenities
 *   - priceMin   : starting monthly price (number). Blank = skip price for this row.
 *   - priceMax   : optional upper bound (number) or blank.
 *   - amenities  : pipe-separated list, NO commas (e.g. "Private rooms|Memory care|On-site nursing"). Blank = skip amenities.
 *
 * Usage (Render shell — has DATABASE_URL):
 *   npx tsx scripts/load-va-pricing-amenities.ts --csv path/to/va_pricing.csv          # DRY RUN
 *   npx tsx scripts/load-va-pricing-amenities.ts --csv path/to/va_pricing.csv --force   # apply
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';
const VA_FLAG = 'VA_UNVERIFIED';

type Row = { homeId: string; priceMin: number | null; priceMax: number | null; amenities: string[] | null };

function parseCsv(path: string): Row[] {
  const text = readFileSync(path, 'utf8').replace(/\r/g, '');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);
  const iHome = idx('homeid'), iMin = idx('pricemin'), iMax = idx('pricemax'), iAmen = idx('amenities');
  if (iHome === -1) throw new Error('CSV must have a homeId column');
  const rows: Row[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(',');
    const homeId = (cells[iHome] ?? '').trim();
    if (!homeId) continue;
    const minRaw = iMin !== -1 ? (cells[iMin] ?? '').trim() : '';
    const maxRaw = iMax !== -1 ? (cells[iMax] ?? '').trim() : '';
    const amenRaw = iAmen !== -1 ? (cells[iAmen] ?? '').trim() : '';
    rows.push({
      homeId,
      priceMin: minRaw ? Number(minRaw) : null,
      priceMax: maxRaw ? Number(maxRaw) : null,
      amenities: amenRaw ? amenRaw.split('|').map((a) => a.trim()).filter(Boolean) : null,
    });
  }
  return rows;
}

async function main() {
  const force = process.argv.includes('--force');
  const csvArg = process.argv.indexOf('--csv');
  const csvPath = csvArg !== -1 ? process.argv[csvArg + 1] : null;
  if (!csvPath) {
    console.error('⛔ Pass --csv <path>. CSV header: homeId,priceMin,priceMax,amenities (amenities pipe-separated).');
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  console.log(`\n=== VA pricing/amenities load — ${force ? 'LIVE (--force)' : 'DRY RUN'} ===`);
  console.log(`Rows: ${rows.length}\n`);

  let applied = 0, skipped = 0;
  for (const r of rows) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: r.homeId },
      select: {
        id: true, name: true, priceMin: true, priceMax: true, amenities: true, preFilledFields: true,
        operator: { select: { user: { select: { email: true } } } },
      },
    });
    if (!home) { console.log(`✗ ${r.homeId} not found — SKIP`); skipped++; continue; }

    const ownerEmail = (home.operator?.user?.email ?? '').toLowerCase();
    if (ownerEmail !== DIRECTORY_UNCLAIMED_EMAIL) {
      console.log(`⚠ "${home.name}" is CLAIMED (operator=${ownerEmail || 'unknown'}) — SKIP (never overwrite operator data)`);
      skipped++; continue;
    }
    if (Number.isNaN(r.priceMin as number) || Number.isNaN(r.priceMax as number)) {
      console.log(`⚠ "${home.name}" — non-numeric price in CSV — SKIP`); skipped++; continue;
    }

    const prevPff = (home.preFilledFields && typeof home.preFilledFields === 'object' ? home.preFilledFields : {}) as Record<string, unknown>;
    const data: any = {};
    const pff: Record<string, unknown> = { ...prevPff };

    if (r.priceMin != null) {
      data.priceMin = r.priceMin;
      if (r.priceMax != null) data.priceMax = r.priceMax;
      pff.priceRange = VA_FLAG;
    }
    if (r.amenities && r.amenities.length > 0) {
      data.amenities = r.amenities;
      pff.amenities = VA_FLAG;
    }

    if (Object.keys(data).length === 0) { console.log(`– "${home.name}" — nothing to set — SKIP`); skipped++; continue; }
    data.preFilledFields = pff;

    console.log(`🏠 "${home.name}"`);
    if (data.priceMin != null) console.log(`     price: ${home.priceMin ?? '(none)'} → starting $${r.priceMin}${r.priceMax != null ? `–$${r.priceMax}` : ''}/mo  [VA approx]`);
    if (data.amenities) console.log(`     amenities: ${(home.amenities ?? []).length} → ${r.amenities!.length} [${r.amenities!.join(', ')}]  [VA approx]`);

    if (force) {
      await prisma.assistedLivingHome.update({ where: { id: home.id }, data });
      console.log('   ✓ applied'); applied++;
    } else {
      console.log('   (dry run — would apply)'); applied++;
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(force ? `Applied: ${applied}, Skipped: ${skipped}` : `Would apply: ${applied}, Skipped: ${skipped}`);
  console.log('Loaded values are flagged VA_UNVERIFIED → shown as "pending operator confirmation" and cleared on operator edit.');
  if (!force) console.log('DRY RUN — re-run with --force to apply.');
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
