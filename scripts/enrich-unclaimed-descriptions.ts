/**
 * enrich-unclaimed-descriptions.ts
 *
 * Generate HONEST, facts-only descriptions for UNCLAIMED directory listings using
 * src/lib/profile-generator/unclaimed-description-generator.ts (known facts +
 * general care-level/area context only — never invents amenities/pricing/etc).
 *
 * Provenance: writes the description and tags `preFilledFields.description =
 * 'AI_PUBLIC_DATA'` so it's identifiable and cleanly overwritten when an operator
 * claims the listing.
 *
 * SAFETY:
 *   - Only ACTIVE listings owned by the directory sentinel (truly unclaimed).
 *   - DEFAULT targets SPARSE homes only (description < 50 words OR already tagged
 *     AI_PUBLIC_DATA) so a good website-extracted description is never clobbered.
 *     Pass --all to (re)generate for every unclaimed home.
 *   - --sample N: generate + PRINT N, NO writes (founder voice-check gate).
 *   - --force: actually write. Without --sample or --force it's a dry count.
 *
 * Usage (Render shell — DATABASE_URL + ANTHROPIC_API_KEY):
 *   npx tsx scripts/enrich-unclaimed-descriptions.ts --sample 3        # preview 3, no writes
 *   npx tsx scripts/enrich-unclaimed-descriptions.ts --force           # write all sparse
 *   npx tsx scripts/enrich-unclaimed-descriptions.ts --all --force     # write every unclaimed
 *   npx tsx scripts/enrich-unclaimed-descriptions.ts --limit 20 --force
 */

import { PrismaClient } from '@prisma/client';
import {
  generateUnclaimedDescription,
  countyForCity,
  type UnclaimedFacts,
} from '../src/lib/profile-generator/unclaimed-description-generator';

const prisma = new PrismaClient();

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';
const SPARSE_WORD_THRESHOLD = 50;

// Sonnet 4.6 pricing (approx, USD per token) for a cost estimate.
const COST_IN = 3 / 1_000_000;
const COST_OUT = 15 / 1_000_000;

function wordCount(s: string | null | undefined): number {
  return s ? s.trim().split(/\s+/).filter(Boolean).length : 0;
}

async function main() {
  const argv = process.argv;
  const force = argv.includes('--force');
  const all = argv.includes('--all');
  const sampleArg = argv.indexOf('--sample');
  const sampleN = sampleArg !== -1 ? parseInt(argv[sampleArg + 1] || '3', 10) : 0;
  const limArg = argv.indexOf('--limit');
  const limit = limArg !== -1 ? parseInt(argv[limArg + 1] || '0', 10) : 0;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('⛔ ANTHROPIC_API_KEY is not set. Run on Render where the key exists.');
    process.exit(1);
  }

  const seedUser = await prisma.user.findUnique({ where: { email: DIRECTORY_UNCLAIMED_EMAIL } });
  const seedOperator = seedUser ? await prisma.operator.findUnique({ where: { userId: seedUser.id } }) : null;
  if (!seedOperator) {
    console.error('⛔ directory sentinel operator not found.');
    process.exit(1);
  }

  const homes = await prisma.assistedLivingHome.findMany({
    where: { operatorId: seedOperator.id, status: 'ACTIVE' },
    select: {
      id: true, name: true, description: true, careLevel: true, capacity: true,
      preFilledFields: true,
      address: { select: { city: true, state: true } },
    },
    orderBy: { name: 'asc' },
  });

  // Target filter: sparse-by-default (short OR previously AI_PUBLIC_DATA), unless --all.
  const isTarget = (h: (typeof homes)[number]) => {
    if (all) return true;
    const prov = (h.preFilledFields as Record<string, unknown> | null)?.description;
    return wordCount(h.description) < SPARSE_WORD_THRESHOLD || prov === 'AI_PUBLIC_DATA';
  };
  let targets = homes.filter(isTarget);
  if (limit > 0) targets = targets.slice(0, limit);

  const mode = sampleN > 0 ? `SAMPLE ${sampleN} (no writes)` : force ? 'LIVE (--force)' : 'DRY COUNT';
  console.log(`\n=== Unclaimed description enrichment — ${mode} ===`);
  console.log(`Unclaimed ACTIVE homes: ${homes.length} | targets (${all ? 'all' : 'sparse'}): ${targets.length}\n`);

  if (sampleN === 0 && !force) {
    console.log('DRY COUNT only. Re-run with --sample 3 to preview, or --force to write.');
    return;
  }

  const toProcess = sampleN > 0 ? targets.slice(0, sampleN) : targets;
  let written = 0, tokIn = 0, tokOut = 0;

  for (const h of toProcess) {
    const county = countyForCity(h.address?.city, h.address?.state);
    const facts: UnclaimedFacts = {
      name: h.name,
      city: h.address?.city ?? null,
      state: h.address?.state ?? null,
      county,
      careLevel: Array.isArray(h.careLevel) ? (h.careLevel as string[]) : [],
      capacity: h.capacity ?? null,
    };

    let gen;
    try {
      gen = await generateUnclaimedDescription(facts);
    } catch (e: any) {
      console.log(`  ✗ ${h.name}: generation failed — ${String(e?.message ?? e)}`);
      continue;
    }
    tokIn += gen.tokensIn;
    tokOut += gen.tokensOut;

    if (sampleN > 0) {
      console.log(`──────── ${h.name} ────────`);
      console.log(`facts: ${facts.city ?? '?'}${county ? `, ${county} County` : ''} | ${facts.careLevel.join('+') || '—'} | cap ${facts.capacity ?? '?'}`);
      console.log(`[${gen.wordCount} words]\n${gen.description}\n`);
      continue;
    }

    // LIVE write: description + provenance tag (merge, preserve other keys).
    const prevPff = (h.preFilledFields && typeof h.preFilledFields === 'object'
      ? h.preFilledFields : {}) as Record<string, unknown>;
    await prisma.assistedLivingHome.update({
      where: { id: h.id },
      data: {
        description: gen.description,
        preFilledFields: { ...prevPff, description: 'AI_PUBLIC_DATA' },
      },
    });
    written++;
    if (written % 10 === 0) console.log(`  …${written} written`);
  }

  const cost = tokIn * COST_IN + tokOut * COST_OUT;
  console.log('\n─────────────────────────────────────────────');
  if (sampleN > 0) {
    console.log(`Sample of ${toProcess.length} generated (NO writes). Approve the voice, then run --force.`);
  } else {
    console.log(`Written: ${written}/${toProcess.length}`);
  }
  console.log(`Tokens: in ${tokIn}, out ${tokOut} | est. cost $${cost.toFixed(3)}`);
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
