#!/usr/bin/env npx tsx
/**
 * scripts/pre-publish-test-demo-sweep.ts
 *
 * Final pre-publish hygiene sweep (OL-083 PART C). Before flipping the Cleveland
 * directory DRAFT → ACTIVE (see scripts/publish-directory-homes.ts), make sure no
 * obvious test/demo rows are about to be published. The earlier targeted scripts
 * already ran:
 *   - cleanup-e2e-test-homes.ts       (@test.carelinkai.com operators)
 *   - cleanup-test-operators.ts       (profyt7+*@gmail.com operators)
 *   - cleanup-non-cleveland-demo-homes.ts (DRAFT homes with state != OH)
 * so this is expected to find little — it is a broad, owner-agnostic NAME/DESCRIPTION
 * signature sweep that catches anything those missed, plus a read-only report of
 * test-looking inquiries.
 *
 * Signature (a home is a "test/demo" candidate if):
 *   - name matches /\b(test|demo|sample|example|dummy|fixture|founder co|chris senior care)\b/i
 *   - OR description matches /e2e|lorem ipsum|dev home for|test home/i
 *
 * Eligible to PURGE (only with --force, and only if ALL hold):
 *   - matches the signature above
 *   - status === 'DRAFT'                 (never touch ACTIVE/live listings)
 *   - autoPopulatedAt IS NULL            (never touch enriched/real directory homes)
 *   - zero related activity              (bookings/residents/inquiries/tourRequests/
 *                                          tourSlots/waitlistEntries all 0)
 * Anything matching the signature but failing a guard is reported as REVIEW and
 * never deleted.
 *
 * Safety:
 *   - Dry-run by default; only writes with --force.
 *   - Aborts if the eligible set is implausibly large (> SAFETY_LIMIT).
 *   - Deletes the home's Address explicitly (Address.homeId is SetNull, not cascade)
 *     then deletes the home (HomePhoto etc. cascade via onDelete: Cascade).
 *   - Operators/users are NOT touched here — that is the other cleanup scripts' job.
 *
 * Usage:
 *   npx tsx scripts/pre-publish-test-demo-sweep.ts            # dry-run (default)
 *   npx tsx scripts/pre-publish-test-demo-sweep.ts --force    # execute purge
 *
 * Idempotent: safe to run multiple times.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAFETY_LIMIT = 25; // a "final sweep" should never delete more than a handful

const NAME_SIGNATURE = /\b(test|demo|sample|example|dummy|fixture|founder co|chris senior care)\b/i;
const DESC_SIGNATURE = /e2e|lorem ipsum|dev home for|test home/i;

function matchesTestSignature(home: { name: string; description: string | null }): boolean {
  return NAME_SIGNATURE.test(home.name) || DESC_SIGNATURE.test(home.description ?? '');
}

// Test-looking inquiry contacts — reported only, never deleted.
const INQUIRY_EMAIL_SIGNATURE = /@(example\.com|test\.|mailinator\.|carelinkai\.system)|^test@|\+test@/i;
const INQUIRY_NAME_SIGNATURE = /\b(test|demo|sample)\b/i;

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;

  console.log(dryRun ? '=== DRY RUN — no writes ===' : '=== LIVE PURGE ===');
  console.log('');

  // 1. All homes matching the test/demo signature, regardless of owner.
  const candidates = await prisma.assistedLivingHome.findMany({
    where: {
      OR: [
        { name: { contains: 'test', mode: 'insensitive' } },
        { name: { contains: 'demo', mode: 'insensitive' } },
        { name: { contains: 'sample', mode: 'insensitive' } },
        { name: { contains: 'example', mode: 'insensitive' } },
        { name: { contains: 'dummy', mode: 'insensitive' } },
        { name: { contains: 'fixture', mode: 'insensitive' } },
        { name: { contains: 'founder co', mode: 'insensitive' } },
        { name: { contains: 'chris senior care', mode: 'insensitive' } },
        { description: { contains: 'e2e', mode: 'insensitive' } },
        { description: { contains: 'lorem ipsum', mode: 'insensitive' } },
        { description: { contains: 'dev home for', mode: 'insensitive' } },
        { description: { contains: 'test home', mode: 'insensitive' } },
      ],
    },
    include: {
      address: true,
      operator: { select: { companyName: true, user: { select: { email: true } } } },
      _count: {
        select: {
          bookings: true,
          residents: true,
          inquiries: true,
          tourRequests: true,
          tourSlots: true,
          waitlistEntries: true,
          photos: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Re-apply the precise regex (the DB `contains` is a superset, e.g. "Greatest Living"
  // contains "test"); keep only true word-boundary matches.
  const matched = candidates.filter(matchesTestSignature);

  type Candidate = (typeof matched)[number];
  const eligible: Candidate[] = [];
  const review: { home: Candidate; reasons: string[] }[] = [];

  for (const h of matched) {
    const activity =
      h._count.bookings + h._count.residents + h._count.inquiries +
      h._count.tourRequests + h._count.tourSlots + h._count.waitlistEntries;
    const reasons: string[] = [];
    if (h.status !== 'DRAFT') reasons.push(`status=${h.status} (not DRAFT — possibly live)`);
    if (h.autoPopulatedAt) reasons.push('autoPopulatedAt set (enriched/real home)');
    if (activity > 0) reasons.push(`${activity} related record(s)`);
    if (reasons.length > 0) review.push({ home: h, reasons });
    else eligible.push(h);
  }

  // 2. Report.
  console.log(`Homes matching test/demo signature: ${matched.length}`);
  console.log(`  → eligible to purge: ${eligible.length}`);
  console.log(`  → held for review:   ${review.length}\n`);

  for (const h of eligible) {
    const loc = h.address ? `${h.address.city ?? '?'}, ${h.address.state ?? '?'}` : 'no address';
    console.log(`  PURGE  "${h.name}" (${h.id})  status=${h.status}  photos=${h._count.photos}  ${loc}  operator="${h.operator?.companyName ?? '—'}"`);
  }

  if (review.length > 0) {
    console.log(`\n⚠ ${review.length} signature match(es) HELD (not deleted — review manually):`);
    for (const r of review) {
      console.log(`  - "${r.home.name}" (${r.home.id})  operator="${r.home.operator?.companyName ?? '—'}" email=${r.home.operator?.user?.email ?? '—'}`);
      for (const reason of r.reasons) console.log(`      • ${reason}`);
    }
  }

  // 3. Read-only: test-looking inquiries (anonymous capture can create these).
  const inquiryCandidates = await prisma.inquiry.findMany({
    where: {
      OR: [
        { contactEmail: { contains: 'example.com', mode: 'insensitive' } },
        { contactEmail: { contains: 'test.', mode: 'insensitive' } },
        { contactEmail: { contains: 'mailinator', mode: 'insensitive' } },
        { contactEmail: { startsWith: 'test@', mode: 'insensitive' } },
        { contactName: { contains: 'test', mode: 'insensitive' } },
        { contactName: { contains: 'demo', mode: 'insensitive' } },
      ],
    },
    select: { id: true, contactName: true, contactEmail: true, status: true, createdAt: true, homeId: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const inquiriesFlagged = inquiryCandidates.filter(
    (i) =>
      INQUIRY_EMAIL_SIGNATURE.test(i.contactEmail ?? '') ||
      INQUIRY_NAME_SIGNATURE.test(i.contactName ?? ''),
  );
  if (inquiriesFlagged.length > 0) {
    console.log(`\nℹ ${inquiriesFlagged.length} test-looking inquiry(ies) — REPORT ONLY, not deleted by this script:`);
    for (const i of inquiriesFlagged.slice(0, 25)) {
      console.log(`  - ${i.id}  name="${i.contactName ?? '—'}"  email="${i.contactEmail ?? '—'}"  status=${i.status}  home=${i.homeId}`);
    }
    if (inquiriesFlagged.length > 25) console.log(`    … and ${inquiriesFlagged.length - 25} more`);
  }

  // 4. Safety guard + execute.
  console.log('\n─────────────────────────────────────────────');
  console.log(`Homes to purge: ${eligible.length}`);
  console.log(`Held / review:  ${review.length}`);
  console.log(`Test inquiries (report only): ${inquiriesFlagged.length}`);
  console.log('─────────────────────────────────────────────');

  if (eligible.length > SAFETY_LIMIT) {
    console.error(`\nABORT: ${eligible.length} eligible homes exceeds safety limit ${SAFETY_LIMIT}. Investigate the matches before purging.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log('\nDRY RUN complete. No changes written. Re-run with --force to purge the eligible homes.');
    return;
  }
  if (eligible.length === 0) {
    console.log('\nNothing eligible to purge. ✅');
    return;
  }

  let deletedHomes = 0;
  let deletedAddresses = 0;
  for (const h of eligible) {
    if (h.address) {
      await prisma.address.deleteMany({ where: { homeId: h.id } });
      deletedAddresses += 1;
    }
    await prisma.assistedLivingHome.delete({ where: { id: h.id } });
    deletedHomes += 1;
    console.log(`DELETED: "${h.name}" (${h.id})`);
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`Homes deleted:     ${deletedHomes} (photos cascade)`);
  console.log(`Addresses deleted: ${deletedAddresses}`);
  console.log('─────────────────────────────────────────────');
  console.log('Sweep complete.');
}

main()
  .catch((e) => {
    console.error('FATAL:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
