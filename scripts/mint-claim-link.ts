#!/usr/bin/env npx tsx
/**
 * scripts/mint-claim-link.ts
 *
 * Mint a 45-day operator CLAIM LINK for a single warm lead — by homeId, or by
 * name (+ optional city). MINT-ONLY and READ-ONLY: it finds an existing listing
 * and signs a token; it never seeds, never writes the DB, and never sends email
 * (these links go out as personal 1:1 emails, not a Resend broadcast).
 *
 * If the home isn't found it prints near-matches and EXITS NON-ZERO — it will not
 * guess or create a duplicate. Seed a genuinely-missing home with the existing
 * directory pipeline first (scripts/seed-cleveland-*.ts — they wire the required
 * operatorId/description + the directory-unclaimed sentinel), then re-run this.
 *
 * Token payload matches the rest of the codebase (src/lib/claim-token.ts +
 * claim-engine/claim-drip.ts): { operatorEmail, homeId, clevelandFounder, iat, exp }
 * signed with NEXTAUTH_SECRET, exp = iat + 45 days.
 *
 * Run on Render (needs DATABASE_URL + NEXTAUTH_SECRET):
 *   npx tsx scripts/mint-claim-link.ts --email teresa@pleasantviewhealthcare.com --name "Pleasant Pointe" --city Barberton
 *   npx tsx scripts/mint-claim-link.ts --email lfluhart@elizajen.org --home-id <homeId>
 */

import { PrismaClient } from '@prisma/client';
import { signClaimToken, DEFAULT_CLAIM_TOKEN_TTL_HOURS } from '../src/lib/claim-token';

const prisma = new PrismaClient();

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}

async function main() {
  const email = arg('--email');
  const homeId = arg('--home-id');
  const name = arg('--name');
  const city = arg('--city');

  const secret = process.env['NEXTAUTH_SECRET'];
  if (!secret) {
    console.error('✗ NEXTAUTH_SECRET is not set. Run this in the Render shell (production env), not locally.');
    process.exit(1);
  }
  if (!email) {
    console.error('✗ --email <operator email> is required.');
    process.exit(1);
  }
  if (!homeId && !name) {
    console.error('✗ Provide --home-id <id>, or --name "<home name>" (optionally + --city <city>).');
    process.exit(1);
  }

  // 1. Find the listing (dedup — never create a duplicate).
  const home = homeId
    ? await prisma.assistedLivingHome.findUnique({ where: { id: homeId }, include: { address: true } })
    : await prisma.assistedLivingHome.findFirst({
        where: {
          name: { contains: name as string, mode: 'insensitive' },
          ...(city ? { address: { is: { city: { contains: city, mode: 'insensitive' } } } } : {}),
        },
        include: { address: true },
        orderBy: { createdAt: 'asc' },
      });

  if (!home) {
    // Surface near-matches by the leading name token so the operator can decide
    // whether this is a rename of an existing row before seeding a new one.
    if (name) {
      const token0 = name.split(/\s+/)[0] as string;
      const near = await prisma.assistedLivingHome.findMany({
        where: { name: { contains: token0, mode: 'insensitive' } },
        include: { address: true },
        take: 10,
      });
      if (near.length) {
        console.log(`\n⚠ No "${name}"${city ? ` in ${city}` : ''} found, but ${near.length} similarly-named listing(s) exist — check for a rename/dup before seeding:`);
        for (const h of near) {
          console.log(`   • ${h.id}  ${h.name}  [${h.status}]  ${h.address?.city ?? '(no city)'}, ${h.address?.state ?? ''}`);
        }
      }
    }
    console.error(`\n✗ NOT FOUND: "${name ?? homeId}"${city ? ` in ${city}` : ''}. Not minting a link.`);
    console.error('  → If it truly does not exist, seed it via the directory pipeline (scripts/seed-cleveland-*.ts),');
    console.error('    then re-run this. If it exists under a different name, pass --home-id <id>.');
    process.exit(2);
  }

  console.log(`\n✓ FOUND: ${home.id}  "${home.name}"  [${home.status}]  ${home.address?.city ?? '(no city)'}, ${home.address?.state ?? ''}`);

  // 2. Mint the 45-day token (same payload + signing as claim-drip.ts).
  const now = Math.floor(Date.now() / 1000);
  const exp = now + DEFAULT_CLAIM_TOKEN_TTL_HOURS * 3600;
  const token = signClaimToken(
    { operatorEmail: email.toLowerCase(), homeId: home.id, clevelandFounder: true, iat: now, exp },
    secret,
  );

  const registerLink = `${appUrl()}/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`;
  const claimLink = `${appUrl()}/claim?token=${encodeURIComponent(token)}`;

  console.log(`\n=== CLAIM LINK — ${email} ===`);
  console.log(`homeId:   ${home.id}`);
  console.log(`expires:  ${new Date(exp * 1000).toISOString()}  (~45 days)`);
  console.log(`\nRegister format (pre-populates signup for a first-time operator):`);
  console.log(registerLink);
  console.log(`\n/claim format (also works for an already-signed-in operator):`);
  console.log(claimLink);
  console.log('');
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
