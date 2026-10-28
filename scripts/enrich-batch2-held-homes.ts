/**
 * enrich-batch2-held-homes.ts
 *
 * OL-081 — manual send-ready enrichment for the 3 "held" batch-2 homes whose
 * official sites are WAF-blocked from datacenter IPs (verified 403), so the
 * scrape-based autopopulate pipeline classifies them BLOCKED and writes no text.
 * This script sets the canonical name + official URL + a manually-authored,
 * fact-checked description / care levels / amenities / highlights so each
 * listing is send-ready. Content is sourced from public listings (the official
 * brand sites, A Place for Mom, Where You Live Matters, Senior Care Authority).
 *
 * Honest provenance: we set `aiPopulationConfidence = 'MANUAL'` and a
 * `preFilledFields` map of 'MANUAL', and deliberately DO NOT set
 * `autoPopulatedAt` (these were not machine-scraped), so the directory report's
 * `enriched` flag stays "no" by design even though the content is complete.
 *
 * SAFETY: hardcoded ids; each target is guarded by an expected current name and
 * must be status=DRAFT. Status is never changed — all 3 stay DRAFT. No emails,
 * no public listing. Idempotent: re-running after a successful apply is a no-op
 * (it re-detects the already-canonical name and MANUAL provenance).
 *
 * Usage:
 *   npx tsx scripts/enrich-batch2-held-homes.ts          # DRY RUN
 *   npx tsx scripts/enrich-batch2-held-homes.ts --force   # apply
 */

import { PrismaClient, HomeStatus, CareLevel } from '@prisma/client';

const prisma = new PrismaClient();

type Target = {
  id: string;
  /** Either the original seeded name or the canonical name (for idempotent re-runs). */
  expectNames: string[];
  name: string;
  websiteUrl: string;
  careLevel: CareLevel[];
  description: string;
  amenities: string[];
  highlights: string[];
};

const TARGETS: Target[] = [
  {
    id: 'cmql0xbos0006r7jcitqgqhds',
    expectNames: ['Windsor Heights'],
    name: 'Windsor Heights',
    // Seeded URL was correct after all: Sunshine Retirement Living operates
    // Windsor Heights at this Beachwood community page (UTM params stripped).
    websiteUrl: 'https://www.sunshineretirementliving.com/beachwood-retirement-living/',
    careLevel: [CareLevel.INDEPENDENT, CareLevel.ASSISTED, CareLevel.MEMORY_CARE],
    description:
      'Windsor Heights is a senior living community in Beachwood, Ohio, part of the ' +
      'Sunshine Retirement Living network, offering independent living, transitional ' +
      'assisted living, and memory care. Located near Ahuja and South Pointe hospitals, ' +
      'it pairs person-centered care with a Montessori-informed life-enrichment program ' +
      "built around Sunshine's six Pillars of Wellness. Private suites with ensuite baths, " +
      '24/7 support, and chef-created MIND-diet dining are complemented by walking paths, a ' +
      'fitness room, a game room, landscaped gardens, and a salon and sensory spa.',
    amenities: [
      'Independent living',
      'Transitional assisted living',
      'Memory care',
      'Respite care',
      '24/7 on-site support',
      'Chef-prepared MIND-diet dining',
      'Private suites with ensuite bath',
      'Salon & beauty spa',
      'Sensory spa',
      'Fitness room',
      'Game room',
      'Landscaped gardens & walking paths',
    ],
    highlights: [
      'Part of Sunshine Retirement Living',
      'Person-centered, Montessori-informed memory care',
      'No upfront buy-in fees',
      'Near Ahuja & South Pointe hospitals',
    ],
  },
  {
    id: 'cmql0xbp9000gr7jcpmm4c9ps',
    expectNames: ['Bickford of Rocky River', 'Bloom at Rocky River'],
    name: 'Bloom at Rocky River',
    websiteUrl: 'https://bloomseniorliving.com/bloom-at-rocky-river/',
    careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE],
    description:
      'Bloom at Rocky River is a family-owned assisted living and memory care community ' +
      'set on a private four-acre campus in the heart of Rocky River, Ohio. Part of Bloom ' +
      'Senior Living, it offers a professionally managed, home-like setting with ' +
      'personalized care and life-enrichment programming. Monthly rent includes ' +
      'chef-prepared Five Star Dining meals, 24-hour support staff, assistance with daily ' +
      'living and medication management, transportation, housekeeping, and laundry — on ' +
      'flexible month-to-month terms with no buy-in fees.',
    amenities: [
      'Assisted living',
      'Memory care',
      'Respite care',
      '24-hour support staff',
      'Chef-prepared Five Star Dining',
      'Medication management',
      'Assistance with activities of daily living',
      'Scheduled transportation',
      'Housekeeping & laundry',
      'Life-enrichment & wellness programs',
      'Private 4-acre campus',
    ],
    highlights: [
      'Family-owned (Bloom Senior Living)',
      'Month-to-month, no buy-in fees',
      'Private 4-acre setting in Rocky River',
      'State-licensed assisted living & memory care',
    ],
  },
  {
    id: 'cmql0xbpc000ir7jc3zf5c77q',
    expectNames: ['Rocky River Village', 'Meadow Falls of Rocky River'],
    name: 'Meadow Falls of Rocky River',
    websiteUrl: 'https://meadowfallsseniorliving.com/rocky-river/',
    careLevel: [CareLevel.ASSISTED, CareLevel.MEMORY_CARE],
    description:
      'Meadow Falls of Rocky River (formerly Rocky River Village) is an assisted living ' +
      'and memory care community at 22900 Center Ridge Road in Rocky River, Ohio. The ' +
      'secured community provides 24-hour nursing and attentive, person-centered support ' +
      'in a comfortable residential setting. Residents enjoy individual climate control, a ' +
      'pet-friendly environment, Wi-Fi, special events and entertainment, and scheduled ' +
      'van service to local shopping, dining, and appointments.',
    amenities: [
      'Assisted living',
      'Memory care',
      '24-hour nursing',
      'Secured community',
      'Individual climate control',
      'Pet-friendly',
      'Wi-Fi / high-speed internet',
      'Scheduled van transportation',
      'Special events & entertainment',
      'Handicap accessible',
    ],
    highlights: [
      'Formerly Rocky River Village (Meadow Falls rebrand)',
      'Secured memory care community',
      '24-hour nursing',
      'Pet-friendly',
    ],
  },
];

const MANUAL_FIELDS = ['name', 'websiteUrl', 'description', 'careLevel', 'amenities', 'highlights'] as const;

async function main() {
  const force = process.argv.includes('--force');
  console.log(
    force
      ? '=== LIVE RUN (--force) — manual send-ready enrichment, all stay DRAFT ===\n'
      : '=== DRY RUN — no writes (pass --force to apply) ===\n',
  );

  let applied = 0;
  let skipped = 0;

  for (const t of TARGETS) {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: t.id },
      select: { id: true, name: true, status: true, websiteUrl: true, aiPopulationConfidence: true },
    });

    if (!home) {
      console.log(`✗ ${t.id} ("${t.expectNames[0]}") not found — SKIP`);
      skipped++;
      continue;
    }
    if (!t.expectNames.includes(home.name)) {
      console.log(
        `⚠ ${t.id}: name is "${home.name}", expected one of [${t.expectNames.join(', ')}] — SKIP (verify manually)`,
      );
      skipped++;
      continue;
    }
    if (home.status !== HomeStatus.DRAFT) {
      console.log(`⚠ "${home.name}": status ${home.status} (not DRAFT) — SKIP (we only touch DRAFT listings)`);
      skipped++;
      continue;
    }

    const alreadyDone = home.name === t.name && home.aiPopulationConfidence === 'MANUAL';
    console.log(
      `🏠 "${home.name}"` +
        (home.name === t.name ? '' : ` → "${t.name}"`) +
        `  [status=${home.status}, care=${t.careLevel.join('+')}, amenities=${t.amenities.length}, highlights=${t.highlights.length}]`,
    );
    console.log(`   url: ${t.websiteUrl}`);
    if (alreadyDone) {
      console.log('   – already MANUAL-enriched with canonical name — idempotent, nothing to do');
      continue;
    }

    if (force) {
      await prisma.assistedLivingHome.update({
        where: { id: t.id },
        data: {
          name: t.name,
          websiteUrl: t.websiteUrl,
          description: t.description,
          aiGeneratedDescription: t.description,
          careLevel: { set: t.careLevel },
          amenities: { set: t.amenities },
          highlights: { set: t.highlights },
          aiPopulationConfidence: 'MANUAL',
          preFilledFields: Object.fromEntries(MANUAL_FIELDS.map((f) => [f, 'MANUAL'])),
          // NB: autoPopulatedAt intentionally left null — content is manual, not scraped.
        },
      });
      console.log('   ✓ enriched (name + url + description + care/amenities/highlights), kept DRAFT');
      applied++;
    } else {
      console.log('   (dry run — would set canonical name, url, description, care levels, amenities, highlights)');
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
