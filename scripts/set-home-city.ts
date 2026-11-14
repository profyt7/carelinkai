#!/usr/bin/env npx tsx
/**
 * scripts/set-home-city.ts — correct one listing's address city (data fix), e.g. Arden Courts
 * (Parma) stored as "Cleveland". DRY-RUN by default; writes only with APPLY=1 in the environment.
 * Refuses unless the current city equals --from (so a re-run or a wrong id changes nothing).
 * After a real write it purges /homes/<id> and the hub pages via POST /api/admin/revalidate
 * (CRON_SECRET, already on the service) so the title and suburb pages update now, not in ≤1h.
 *
 *   npx tsx scripts/set-home-city.ts --home-id <id> --from Cleveland --to Parma          # dry-run
 *   APPLY=1 npx tsx scripts/set-home-city.ts --home-id <id> --from Cleveland --to Parma  # write
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const arg = (f: string) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : undefined; };
const appUrl = () => (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');

async function revalidate(paths?: string[]): Promise<string> {
  const secret = process.env['CRON_SECRET'];
  if (!secret) return 'skipped (CRON_SECRET not set) — pages refresh within ~1h';
  const res = await fetch(`${appUrl()}/api/admin/revalidate`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify(paths ? { paths } : {}),
  }).catch(() => null);
  const j: any = await res?.json().catch(() => null);
  return res?.ok ? `ok (${(j?.revalidated ?? []).length} path(s))` : `failed (${res?.status ?? 'network error'}) — pages refresh within ~1h`;
}

async function main() {
  const homeId = arg('--home-id');
  const from = arg('--from');
  const to = arg('--to');
  if (!homeId || !from || !to) { console.error('✗ usage: --home-id <id> --from <current city> --to <new city>'); process.exit(1); }
  const apply = process.env['APPLY'] === '1';

  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: homeId },
    select: { id: true, name: true, address: { select: { id: true, street: true, city: true, state: true, zipCode: true } } },
  });
  if (!home) { console.error(`✗ home ${homeId} not found`); process.exit(2); }
  const a = home.address;
  if (!a) { console.error(`✗ "${home.name}" has no address row`); process.exit(2); }
  console.log(`=== set city — ${apply ? 'APPLY' : 'DRY-RUN'} ===`);
  console.log(`${home.id}  "${home.name}"`);
  console.log(`  now:   ${a.street}, ${a.city}, ${a.state} ${a.zipCode}`);
  if (a.city === to) { console.log(`  already "${to}" — nothing to do.`); return; }
  if (a.city !== from) { console.error(`✗ current city is "${a.city}", not "${from}" — refusing.`); process.exit(2); }
  console.log(`  after: ${a.street}, ${to}, ${a.state} ${a.zipCode}`);

  if (!apply) { console.log('\nDry-run only. Re-run with APPLY=1 in front to write.'); return; }
  const r = await prisma.address.updateMany({ where: { id: a.id, city: from }, data: { city: to } });
  console.log(`\n✅ updated ${r.count} address row(s).`);
  console.log(`revalidate /homes/${home.id}: ${await revalidate([`/homes/${home.id}`])}`);
  console.log(`revalidate hub pages: ${await revalidate()}`);
}

main()
  .catch((e) => { console.error('ERROR:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
