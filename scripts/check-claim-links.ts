#!/usr/bin/env npx tsx
/**
 * scripts/check-claim-links.ts — read-only check of minted claim links. NEVER opens /claim
 * (that page records a claim-link visit, which outreach follow-ups treat as the operator's own
 * click), never submits or completes a claim, never writes the DB, never sends anything.
 *
 * For each link it checks:
 *   - the token's signature against NEXTAUTH_SECRET and that it is not expired (verifyClaimToken)
 *   - --expect: the token is bound to that homeId AND that recipient email
 *   - the home exists, its name, and that it is still UNCLAIMED (owned by the directory sentinel)
 *   - a logged-out GET of the register hand-off (/auth/register?role=OPERATOR&claimToken=…) → 200
 *
 * Run on Render (needs DATABASE_URL + NEXTAUTH_SECRET):
 *   npx tsx scripts/check-claim-links.ts --expect <homeId>=<email>,<homeId>=<email> <url> [<url> …]
 *   npx tsx scripts/check-claim-links.ts --expect … --file mint.log    # URLs grepped from a file
 * Exit code 1 if any link fails or an --expect home has no link.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { verifyClaimToken } from '../src/lib/claim-token';
import { claimLinkUrl, claimTokenFromUrl } from '../src/lib/claim-engine/claim-link-url';

const SENTINEL = 'directory-unclaimed@carelinkai.system';
const prisma = new PrismaClient();

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}
function decodeUnverified(token: string): { homeId?: string; operatorEmail?: string; exp?: number } | null {
  try { return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')); } catch { return null; }
}

async function main() {
  const secret = process.env['NEXTAUTH_SECRET'] || '';
  if (!secret) { console.error('✗ NEXTAUTH_SECRET is not set — run this in the Render shell.'); process.exit(1); }

  const expect = new Map<string, string>();
  for (const pair of (arg('--expect') || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const [homeId, email] = pair.split('=');
    if (!homeId || !email) { console.error(`✗ --expect: want homeId=email, got "${pair}"`); process.exit(1); }
    expect.set(homeId, email.toLowerCase());
  }
  const file = arg('--file');
  const fromFile = file ? readFileSync(file, 'utf8').match(/https?:\/\/\S+\/(?:claim\?token=|auth\/register\?\S*claimToken=)\S+/g) ?? [] : [];
  const flagValues = new Set([arg('--expect'), file].filter(Boolean));
  const fromArgs = process.argv.slice(2).filter((a) => /^https?:\/\//.test(a) && !flagValues.has(a));
  const urls = [...new Set([...fromArgs, ...fromFile])];
  if (!urls.length) { console.error('✗ No claim URLs given (pass them as arguments or --file <log>).'); process.exit(1); }

  const now = Math.floor(Date.now() / 1000);
  const seen = new Set<string>();
  let failures = 0;
  console.log(`=== check ${urls.length} claim link(s) — read-only, /claim is never opened ===\n`);

  for (const url of urls) {
    const token = claimTokenFromUrl(url);
    const problems: string[] = [];
    if (!token) { console.log(`FAIL  not a claim link: ${url.slice(0, 80)}`); failures++; continue; }

    const payload = verifyClaimToken(token, secret);
    const raw = decodeUnverified(token);
    if (!payload) problems.push(raw?.exp && raw.exp <= now ? 'EXPIRED' : 'BAD SIGNATURE');
    const homeId = payload?.homeId ?? raw?.homeId ?? '';
    const email = (payload?.operatorEmail ?? raw?.operatorEmail ?? '').toLowerCase();
    if (homeId) seen.add(homeId);
    if (expect.size) {
      if (!expect.has(homeId)) problems.push(`homeId ${homeId} not in --expect`);
      else if (expect.get(homeId) !== email) problems.push(`email ${email} ≠ expected ${expect.get(homeId)}`);
    }

    const home = homeId
      ? await prisma.assistedLivingHome.findUnique({
          where: { id: homeId },
          select: { name: true, status: true, address: { select: { city: true } }, operator: { select: { user: { select: { email: true } } } } },
        })
      : null;
    if (!home) problems.push('home not found');
    else if ((home.operator?.user?.email || '').toLowerCase() !== SENTINEL) problems.push('home already CLAIMED');

    // The logged-out hand-off page (the register form) — fetched directly so no visit is recorded.
    const register = claimLinkUrl(appUrl(), token, true);
    const res = await fetch(register, { redirect: 'manual' }).catch(() => null);
    if (res?.status !== 200) problems.push(`GET /auth/register → ${res?.status ?? 'network error'}`);

    const exp = raw?.exp ? new Date(raw.exp * 1000).toISOString().slice(0, 10) : '?';
    const days = raw?.exp ? Math.round((raw.exp - now) / 86400) : NaN;
    const line = `${homeId}  "${home?.name ?? '?'}" [${home?.address?.city ?? '?'}] → ${email} · expires ${exp} (${days} days) · GET /auth/register ${res?.status ?? '—'}`;
    if (problems.length) { failures++; console.log(`FAIL  ${line}\n      ${problems.join('; ')}`); }
    else console.log(`OK    ${line}`);
  }

  for (const [homeId, email] of expect) {
    if (!seen.has(homeId)) { failures++; console.log(`FAIL  no link for expected ${homeId} → ${email}`); }
  }
  console.log(`\n${urls.length} link(s) checked, ${failures} failure(s).`);
  if (failures) process.exitCode = 1;
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
