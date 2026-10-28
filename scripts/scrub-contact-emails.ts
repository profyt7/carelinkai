/**
 * scrub-contact-emails.ts — validate the scraped outreach contact lists and
 * quarantine undeliverable addresses (fix/resend-bounce-suppression).
 *
 * Scans the cold-outreach email channels — AssistedLivingHome.outreachEmail +
 * .contactEmail (scraped operator list) and DPLead.email (scraped DP list) —
 * runs each address through the free syntax + MX gate, and adds anything invalid
 * to EmailSuppression (reason 'invalid_syntax' / 'no_mx'). Because the send path
 * checks EmailSuppression, quarantined addresses are automatically excluded from
 * every future broadcast — no per-table emailStatus column needed.
 *
 * NO paid verification API is used (syntax + DNS MX only — free). Wiring a
 * per-address verifier (NeverBounce/ZeroBounce) would add recurring cost and is
 * left as a flagged option, not done here.
 *
 * Usage:
 *   npx tsx scripts/scrub-contact-emails.ts            # DRY RUN (default)
 *   npx tsx scripts/scrub-contact-emails.ts --force    # write suppressions
 *
 * Reports per-source counts + how many were ALREADY suppressed (bounce/complaint),
 * so you can see which scraped source is the most polluted.
 */

import { PrismaClient } from '@prisma/client';
import { isValidEmailSyntax, hasDeliverableDomain, domainOf } from '../src/lib/email/validate';

const prisma = new PrismaClient();
const FORCE = process.argv.includes('--force');

type Candidate = { email: string; source: string };

async function collect(): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const homes = await prisma.assistedLivingHome.findMany({
    where: { OR: [{ outreachEmail: { not: null } }, { contactEmail: { not: null } }] },
    select: { outreachEmail: true, contactEmail: true },
  });
  for (const h of homes) {
    if (h.outreachEmail) out.push({ email: h.outreachEmail.trim().toLowerCase(), source: 'home.outreachEmail' });
    if (h.contactEmail) out.push({ email: h.contactEmail.trim().toLowerCase(), source: 'home.contactEmail' });
  }
  const leads = await prisma.dPLead.findMany({ select: { email: true } });
  for (const l of leads) if (l.email) out.push({ email: l.email.trim().toLowerCase(), source: 'dpLead.email' });
  return out.filter((c) => c.email);
}

/** Run an async fn over items with a bounded concurrency pool. */
async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const candidates = await collect();
  // de-dupe by email, keep the set of sources it appears in
  const byEmail = new Map<string, Set<string>>();
  for (const c of candidates) {
    if (!byEmail.has(c.email)) byEmail.set(c.email, new Set());
    byEmail.get(c.email)!.add(c.source);
  }
  const emails = [...byEmail.keys()];

  const alreadySuppressed = new Set(
    (await prisma.emailSuppression.findMany({ where: { email: { in: emails } }, select: { email: true } })).map((r) => r.email),
  );

  const toCheck = emails.filter((e) => !alreadySuppressed.has(e));
  console.log(`\n=== Contact-email scrub ${FORCE ? '(WRITE)' : '(DRY RUN — pass --force to write)'} ===`);
  console.log(`Distinct outreach addresses: ${emails.length}   already suppressed: ${alreadySuppressed.size}   to validate: ${toCheck.length}`);
  console.log('Validating syntax + MX (DNS)…');

  const verdicts = await pool(toCheck, 25, async (email) => {
    if (!isValidEmailSyntax(email)) return { email, reason: 'invalid_syntax' as const };
    const ok = await hasDeliverableDomain(domainOf(email));
    return ok ? { email, reason: null } : { email, reason: 'no_mx' as const };
  });

  const invalidSyntax = verdicts.filter((v) => v.reason === 'invalid_syntax').map((v) => v.email);
  const noMx = verdicts.filter((v) => v.reason === 'no_mx').map((v) => v.email);

  // per-source pollution report
  const perSource = new Map<string, { total: number; suppressedOrInvalid: number }>();
  const badSet = new Set([...invalidSyntax, ...noMx, ...alreadySuppressed]);
  for (const [email, sources] of byEmail) {
    for (const s of sources) {
      const rec = perSource.get(s) || { total: 0, suppressedOrInvalid: 0 };
      rec.total++;
      if (badSet.has(email)) rec.suppressedOrInvalid++;
      perSource.set(s, rec);
    }
  }

  console.log(`\nInvalid syntax: ${invalidSyntax.length}   No MX / undeliverable domain: ${noMx.length}`);
  console.log('Per source (total / bad):');
  for (const [s, r] of perSource) {
    const pct = r.total ? Math.round((r.suppressedOrInvalid / r.total) * 100) : 0;
    console.log(`  ${s.padEnd(20)} ${String(r.suppressedOrInvalid).padStart(5)} / ${String(r.total).padStart(5)}  (${pct}% bad)`);
  }
  if (invalidSyntax.length) console.log(`\n  sample invalid syntax: ${invalidSyntax.slice(0, 8).join(', ')}`);
  if (noMx.length) console.log(`  sample no-MX domains: ${[...new Set(noMx.map(domainOf))].slice(0, 8).join(', ')}`);

  if (!FORCE) {
    console.log('\nDRY RUN — nothing written. Re-run with --force to quarantine these.\n');
    return;
  }

  let added = 0;
  for (const email of invalidSyntax) {
    await prisma.emailSuppression.upsert({ where: { email }, create: { email, reason: 'invalid_syntax', source: 'scrub' }, update: {} });
    added++;
  }
  for (const email of noMx) {
    await prisma.emailSuppression.upsert({ where: { email }, create: { email, reason: 'no_mx', source: 'scrub' }, update: {} });
    added++;
  }
  const total = await prisma.emailSuppression.count();
  console.log(`\n✅ Quarantined ${added} undeliverable addresses. Suppression list size now: ${total}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
