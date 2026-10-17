/**
 * import-waiver-baseline.ts — Medicaid Assisted Living Waiver baseline from the
 * WRAAA facilities list (sprint W5-2, G3).
 *
 * Reads data/medicaid/wraaa_alw_2026_10_16.csv, matches each row to a directory
 * home (ODH license first, then normalized street + city), and sets
 * medicaidWaiverStatus with source "WRAAA Medicaid Waiver Facilities list
 * (accessed 2026-10-16)" and verifiedAt 2026-10-16. Homes in Cuyahoga / Lake /
 * Geauga / Lorain / Medina that are NOT on the list become NOT_ON_LIST; Summit /
 * Portage stay UNKNOWN. A status whose source is VA_CALL / OPERATOR / ADMIN is
 * never overwritten. Every write records an EntityEvent (source IMPORT) in the
 * same transaction. See src/lib/medicaid/waiver-import.ts for the policy.
 *
 * DRY RUN by default — prints matched / unmatched / would-change counts.
 *
 * Usage (Render shell — DATABASE_URL):
 *   npx tsx scripts/import-waiver-baseline.ts                      # dry run
 *   npx tsx scripts/import-waiver-baseline.ts --apply              # write
 *   npx tsx scripts/import-waiver-baseline.ts --csv path/to.csv    # other file
 *   npx tsx scripts/import-waiver-baseline.ts --verbose            # list every write
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { parseWraaaCsv, planWaiverImport, formatPlan, type ImportHome } from '../src/lib/medicaid/waiver-import';
import { WRAAA_ACCESSED_AT, WRAAA_IMPORT_SOURCE } from '../src/lib/medicaid/waiver';
import { recordEvent } from '../src/lib/events/record-event';

const DEFAULT_CSV = path.join(__dirname, '..', 'data', 'medicaid', 'wraaa_alw_2026_10_16.csv');

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] ?? null : null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const verbose = process.argv.includes('--verbose');
  const csvPath = arg('--csv') ?? DEFAULT_CSV;

  const rows = parseWraaaCsv(fs.readFileSync(csvPath, 'utf8'));
  const prisma = new PrismaClient();
  try {
    const dbHomes = await prisma.assistedLivingHome.findMany({
      where: { isDemo: false },
      select: {
        id: true,
        name: true,
        description: true,
        odhLicenseNumber: true,
        medicaidWaiverStatus: true,
        medicaidWaiverSource: true,
        address: { select: { street: true, city: true } },
        operator: { select: { user: { select: { email: true } } } },
      },
    });
    const homes: ImportHome[] = dbHomes.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      operatorEmail: h.operator?.user?.email ?? null,
      odhLicenseNumber: h.odhLicenseNumber,
      street: h.address?.street ?? null,
      city: h.address?.city ?? null,
      medicaidWaiverStatus: h.medicaidWaiverStatus,
      medicaidWaiverSource: h.medicaidWaiverSource,
    }));

    const plan = planWaiverImport(rows, homes);
    console.log(`\n${apply ? 'APPLY' : 'DRY RUN'} — ${path.relative(process.cwd(), csvPath)}\n`);
    console.log(formatPlan(plan));
    if (verbose) {
      console.log('\nPlanned writes:');
      for (const w of plan.writes) console.log(`  ${w.from.padEnd(23)} → ${w.to.padEnd(23)} ${w.via.padEnd(18)} ${w.homeName} (${w.homeId}) rows [${w.rows.join(', ')}]`);
    }

    if (!apply) {
      console.log('\nDry run only. Re-run with --apply to write.');
      return;
    }

    let written = 0;
    for (const w of plan.writes) {
      await prisma.$transaction(async (tx) => {
        await tx.assistedLivingHome.update({
          where: { id: w.homeId },
          data: {
            medicaidWaiverStatus: w.to,
            medicaidWaiverSource: WRAAA_IMPORT_SOURCE,
            medicaidWaiverVerifiedAt: WRAAA_ACCESSED_AT,
          },
        });
        await recordEvent(tx, {
          entityType: 'HOME',
          entityId: w.homeId,
          eventType: 'acceptance.updated',
          field: 'medicaidWaiverStatus',
          oldValue: { medicaidWaiverStatus: w.from },
          newValue: { medicaidWaiverStatus: w.to, source: WRAAA_IMPORT_SOURCE, verifiedAt: WRAAA_ACCESSED_AT },
          source: 'IMPORT',
        });
      });
      written += 1;
    }
    console.log(`\nWrote ${written} home(s). ${plan.skippedProtected.length} protected home(s) left untouched.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
