#!/usr/bin/env npx tsx
/**
 * scripts/stop-drip.ts
 *
 * PERMANENTLY EXCLUDE facilities from the claim drip (so human outreach — VA calls,
 * personal 1:1 emails — never collides with an automated touch). Sets
 * `claimDripStoppedReason = 'manual'` (+ clears `claimDripNextAt`) on each matched
 * home. The drip engine already skips any home with a stop reason AND refuses to
 * (re)start one, so this works pre-emptively even for homes whose drip never started.
 *
 * DRY-RUN by default (prints what it WOULD stop); pass --force to apply. Read-only
 * otherwise. NEVER sends email. Run on Render (needs DATABASE_URL).
 *
 * Select homes by any combination of:
 *   --home-id <id>          (repeatable)
 *   --email <outreachEmail> (repeatable; matches the address the drip would email)
 *   --name "<name>" --city <city>   (single lookup)
 *   --file <path>           (one entry per line; see formats below)
 *
 * --file line formats (blank lines and #comments ignored):
 *   an email                     e.g.  teresa@pleasantviewhealthcare.com
 *   a homeId                      e.g.  cmr1ag...
 *   "Name | City"  or  "Name, City"   e.g.  Eliza at Chagrin Falls | Chagrin Falls
 * Name+City lines are resolved by name-token contains + city contains (the sheet's
 * email often doesn't equal the stored outreachEmail). Ambiguous/blank matches are
 * reported, never silently applied.
 *
 * Examples:
 *   npx tsx scripts/stop-drip.ts --email teresa@pleasantviewhealthcare.com --email lfluhart@elizajen.org
 *   npx tsx scripts/stop-drip.ts --file exclusions.txt            # dry run
 *   npx tsx scripts/stop-drip.ts --file exclusions.txt --force    # apply
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';

const prisma = new PrismaClient();

function argAll(flag: string): string[] {
  const out: string[] = [];
  const a = process.argv;
  for (let i = 0; i < a.length; i++) if (a[i] === flag && a[i + 1]) out.push(a[i + 1] as string);
  return out;
}
function argOne(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

type NameCity = { name: string; city: string };

async function main() {
  const force = process.argv.includes('--force');
  const homeIds = new Set(argAll('--home-id'));
  const emails = new Set(argAll('--email').map((e) => e.toLowerCase()));
  const nameCity: NameCity[] = [];
  const cliName = argOne('--name');
  const cliCity = argOne('--city');
  if (cliName) nameCity.push({ name: cliName, city: cliCity || '' });

  const file = argOne('--file');
  if (file) {
    for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const parts = line.split(/\s*[|,]\s*/);
      if (parts.length >= 2 && !line.includes('@')) nameCity.push({ name: parts[0] as string, city: parts[1] as string });
      else if (line.includes('@')) emails.add(line.toLowerCase());
      else homeIds.add(line);
    }
  }

  if (!homeIds.size && !emails.size && !nameCity.length) {
    console.error('✗ Nothing selected. Provide --home-id / --email / --name (+--city) / --file.');
    process.exit(1);
  }

  const sel = { id: true, name: true, outreachEmail: true, claimDripStep: true, claimDripStoppedReason: true, address: { select: { city: true } } };
  const matched = new Map<string, { id: string; name: string; email: string | null; step: number; stopped: string | null; city: string | null }>();
  const add = (h: any) =>
    matched.set(h.id, { id: h.id, name: h.name, email: h.outreachEmail ?? null, step: h.claimDripStep, stopped: h.claimDripStoppedReason ?? null, city: h.address?.city ?? null });

  if (homeIds.size) (await prisma.assistedLivingHome.findMany({ where: { id: { in: [...homeIds] } }, select: sel })).forEach(add);
  if (emails.size) (await prisma.assistedLivingHome.findMany({ where: { outreachEmail: { in: [...emails], mode: 'insensitive' } }, select: sel })).forEach(add);

  const missNameCity: string[] = [];
  const ambiguous: string[] = [];
  for (const nc of nameCity) {
    const label = `${nc.name}${nc.city ? ` · ${nc.city}` : ''}`;
    const homes = await prisma.assistedLivingHome.findMany({
      where: { name: { contains: nc.name, mode: 'insensitive' }, ...(nc.city ? { address: { is: { city: { contains: nc.city, mode: 'insensitive' } } } } : {}) },
      select: sel,
    });
    if (homes.length === 0) missNameCity.push(label);
    else if (homes.length > 1) { ambiguous.push(`${label} → ${homes.map((h) => h.id).join(', ')}`); }
    else add(homes[0]);
  }

  const foundEmails = new Set([...matched.values()].map((m) => (m.email ?? '').toLowerCase()));
  const foundIds = new Set([...matched.values()].map((m) => m.id));
  const missEmails = [...emails].filter((e) => !foundEmails.has(e));
  const missIds = [...homeIds].filter((id) => !foundIds.has(id));

  console.log(`\n=== stop-drip ${force ? '(LIVE --force)' : '(DRY RUN)'} ===`);
  console.log(`Matched ${matched.size} home(s):`);
  for (const m of matched.values()) {
    const note = m.stopped ? `already stopped: ${m.stopped}` : `step ${m.step} → will set 'manual'`;
    console.log(`  • ${m.id}  ${m.name}${m.city ? ` (${m.city})` : ''}  [${m.email ?? 'no outreach email'}]  — ${note}`);
  }
  if (ambiguous.length) { console.log(`\n⚠ AMBIGUOUS (pass a --home-id):`); ambiguous.forEach((a) => console.log(`   ${a}`)); }
  if (missNameCity.length) console.log(`\n⚠ No home matched name+city: ${missNameCity.join('  |  ')}`);
  if (missEmails.length) console.log(`⚠ No home matched email(s): ${missEmails.join(', ')}`);
  if (missIds.length) console.log(`⚠ No home matched id(s): ${missIds.join(', ')}`);

  const toStop = [...matched.values()].filter((m) => m.stopped !== 'manual');
  if (!toStop.length) {
    console.log('\nNothing to change (all matches already excluded).');
    return;
  }
  if (!force) {
    console.log(`\nDRY RUN — would set claimDripStoppedReason='manual' on ${toStop.length} home(s). Re-run with --force to apply.`);
    return;
  }
  const res = await prisma.assistedLivingHome.updateMany({
    where: { id: { in: toStop.map((m) => m.id) } },
    data: { claimDripStoppedReason: 'manual', claimDripNextAt: null },
  });
  console.log(`\n✅ Excluded ${res.count} home(s) from the drip (claimDripStoppedReason='manual').`);
}

main()
  .catch((e) => {
    console.error('ERROR:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
