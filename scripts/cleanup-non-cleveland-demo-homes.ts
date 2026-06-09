#!/usr/bin/env npx tsx
/**
 * scripts/cleanup-non-cleveland-demo-homes.ts
 *
 * Removes DRAFT homes whose address.state is not 'OH' — leftover demo seed
 * data that is not part of the Cleveland directory.
 *
 * Usage:
 *   node_modules/.bin/tsx scripts/cleanup-non-cleveland-demo-homes.ts --dry-run   (default)
 *   node_modules/.bin/tsx scripts/cleanup-non-cleveland-demo-homes.ts --force
 *
 * Safety: aborts if more than 3 non-OH DRAFT homes are found — investigate first.
 * Idempotent: safe to run multiple times.
 *
 * Cascade behaviour:
 *   - Address record deleted explicitly (no onDelete: Cascade from home)
 *   - HomePhoto, Booking, CaregiverShift, etc. — cascaded by Prisma if onDelete: Cascade
 *     is defined; for demo homes these collections should be empty
 */

import { PrismaClient, HomeStatus } from '@prisma/client';

const prisma = new PrismaClient();
const SAFETY_LIMIT = 3;

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE CLEANUP ===');
  console.log('');

  // Find DRAFT homes with a non-OH address
  const homes = await prisma.assistedLivingHome.findMany({
    where: {
      status: HomeStatus.DRAFT,
      address: {
        state: { not: 'OH' },
      },
    },
    include: {
      address: true,
      operator: { select: { companyName: true } },
      _count: {
        select: {
          bookings: true,
          residents: true,
          inquiries: true,
          tourRequests: true,
          photos: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (homes.length === 0) {
    console.log('No non-OH DRAFT homes found — nothing to do.');
    return;
  }

  if (homes.length > SAFETY_LIMIT) {
    console.error(
      `ERROR: Found ${homes.length} homes — exceeds safety limit of ${SAFETY_LIMIT}.`
    );
    console.error('Investigate before deleting. Aborting.');
    for (const h of homes) {
      const loc = h.address ? `${h.address.city}, ${h.address.state}` : 'no address';
      console.error(`  - "${h.name}" (${h.id})  loc=${loc}`);
    }
    process.exit(1);
  }

  console.log(`Found ${homes.length} non-OH DRAFT home(s):\n`);

  for (const home of homes) {
    const loc = home.address
      ? `${home.address.city}, ${home.address.state} ${home.address.zipCode}`
      : 'no address';
    console.log(`  Home:     "${home.name}" (${home.id})`);
    console.log(`  Operator: ${home.operator?.companyName ?? 'unknown'}`);
    console.log(`  Location: ${loc}  Capacity: ${home.capacity}`);
    console.log(`  Address record: ${home.address ? home.address.id : 'none'}  → will DELETE`);
    console.log(`  Bookings: ${home._count.bookings}  Residents: ${home._count.residents}  Inquiries: ${home._count.inquiries}  Tours: ${home._count.tourRequests}  Photos: ${home._count.photos}`);

    const hasData =
      home._count.bookings > 0 ||
      home._count.residents > 0 ||
      home._count.inquiries > 0 ||
      home._count.tourRequests > 0;

    if (hasData) {
      console.error(`\nWARNING: "${home.name}" has non-empty related records. Investigate before deleting.`);
      process.exit(1);
    }

    console.log('');
  }

  console.log('─────────────────────────────────────────────');
  console.log(`Homes to delete:  ${homes.length}`);
  console.log('─────────────────────────────────────────────');
  console.log('');

  if (dryRun) {
    console.log('DRY RUN complete. No changes written.');
    console.log('Re-run with --force to execute.');
    return;
  }

  // Execute cleanup
  let deleted = 0;

  for (const home of homes) {
    // Delete address first (no cascade from home → address)
    if (home.address) {
      await prisma.address.delete({ where: { id: home.address.id } });
    }

    // Delete home — cascades HomePhoto and other onDelete: Cascade children
    await prisma.assistedLivingHome.delete({ where: { id: home.id } });
    console.log(`DELETED: "${home.name}" (${home.id})  loc=${home.address ? `${home.address.city}, ${home.address.state}` : 'no address'}`);
    deleted++;
  }

  console.log('');
  console.log('─────────────────────────────────────────────');
  console.log(`Homes deleted: ${deleted}`);
  console.log('─────────────────────────────────────────────');
  console.log('Cleanup complete.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
