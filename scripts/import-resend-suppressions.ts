/**
 * import-resend-suppressions.ts — one-time backfill of the EmailSuppression table
 * from Resend's bounce/complaint history (fix/resend-bounce-suppression).
 *
 * WHY file-first: the agent/CI environment can't reach api.resend.com, and Resend's
 * public API has no "list all historical bounces" endpoint. The reliable source is
 * the Resend dashboard export. Export your bounced + complained emails (Emails →
 * filter by status → export CSV, or the JSON events export) and feed the file here.
 *
 * Accepts CSV or JSON. It auto-detects the recipient-email column/field and the
 * bounce/complaint indicator; anything that looks like a hard bounce or complaint
 * is upserted into EmailSuppression (reason 'bounce'/'complaint', source
 * 'resend-import'). Soft/transient bounces are skipped.
 *
 * Usage:
 *   npx tsx scripts/import-resend-suppressions.ts --input bounces.csv            # DRY RUN (default)
 *   npx tsx scripts/import-resend-suppressions.ts --input bounces.csv --force    # WRITE
 *
 * Dry-run prints: total parsed, how many are new vs already-suppressed, the top
 * bouncing domains, and the count already on the list — so you can see how polluted
 * the source list is and whether one scraped batch dominates.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const FORCE = process.argv.includes('--force');
const INPUT = argValue('--input');

const EMAIL_RE = /[^\s@"'<>,;:]+@[a-z0-9.-]+\.[a-z]{2,}/i;

type Row = { email: string; reason: 'bounce' | 'complaint' };

/** Very small CSV parser (handles quoted fields, commas in quotes). */
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const header = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((l) => {
    const cells = parseLine(l);
    const rec: Record<string, string> = {};
    header.forEach((h, i) => (rec[h] = (cells[i] ?? '').trim()));
    return rec;
  });
}

function classify(blob: string): 'bounce' | 'complaint' | null {
  const s = blob.toLowerCase();
  if (s.includes('complain') || s.includes('spam') || s.includes('abuse')) return 'complaint';
  if (s.includes('transient') || s.includes('soft')) return null; // soft bounce → skip
  if (s.includes('bounce') || s.includes('permanent') || s.includes('undetermined') || s.includes('hard') || s.includes('failed')) return 'bounce';
  return null;
}

function extractRows(records: Record<string, string>[]): Row[] {
  const rows: Row[] = [];
  for (const rec of records) {
    // find the email column
    let email = '';
    for (const [k, v] of Object.entries(rec)) {
      if (/(to|email|recipient|address)/.test(k) && EMAIL_RE.test(v)) { email = (v.match(EMAIL_RE)?.[0] || '').toLowerCase(); break; }
    }
    if (!email) {
      const anyMatch = Object.values(rec).join(' ').match(EMAIL_RE);
      if (anyMatch) email = anyMatch[0].toLowerCase();
    }
    if (!email) continue;
    // classify from status/type/last_event columns (or the whole row)
    const statusBlob = Object.entries(rec)
      .filter(([k]) => /(status|type|event|bounce|reason|last_event)/.test(k))
      .map(([, v]) => v)
      .join(' ') || Object.values(rec).join(' ');
    const reason = classify(statusBlob);
    if (reason) rows.push({ email, reason });
  }
  return rows;
}

function extractFromJson(text: string): Row[] {
  const data = JSON.parse(text);
  const arr: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [data];
  const rows: Row[] = [];
  for (const item of arr) {
    const to = item?.to ?? item?.data?.to ?? item?.email ?? item?.data?.email;
    const emails: string[] = Array.isArray(to) ? to : typeof to === 'string' ? [to] : [];
    const blob = JSON.stringify(item?.type ?? '') + ' ' + JSON.stringify(item?.data?.bounce ?? item?.bounce ?? item?.last_event ?? item?.status ?? '');
    const reason = classify(blob);
    if (reason) for (const e of emails) if (EMAIL_RE.test(e)) rows.push({ email: e.toLowerCase(), reason });
  }
  return rows;
}

async function main() {
  if (!INPUT) {
    console.error('ERROR: --input <file.csv|file.json> is required.');
    process.exit(1);
  }
  if (!fs.existsSync(INPUT)) {
    console.error(`ERROR: file not found: ${INPUT}`);
    process.exit(1);
  }
  const text = fs.readFileSync(INPUT, 'utf-8');
  const isJson = INPUT.toLowerCase().endsWith('.json') || text.trimStart().startsWith('[') || text.trimStart().startsWith('{');
  const rows = isJson ? extractFromJson(text) : extractRows(parseCsv(text));

  // de-dupe (complaint wins over bounce)
  const byEmail = new Map<string, Row>();
  for (const r of rows) {
    const prev = byEmail.get(r.email);
    if (!prev || (r.reason === 'complaint' && prev.reason !== 'complaint')) byEmail.set(r.email, r);
  }
  const unique = [...byEmail.values()];

  const existing = new Set(
    (await prisma.emailSuppression.findMany({ where: { email: { in: unique.map((r) => r.email) } }, select: { email: true } })).map((r) => r.email),
  );
  const fresh = unique.filter((r) => !existing.has(r.email));

  // reporting
  const domainCounts = new Map<string, number>();
  for (const r of unique) {
    const d = r.email.split('@')[1] || '?';
    domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
  }
  const topDomains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const totalOnList = await prisma.emailSuppression.count();

  console.log(`\n=== Resend suppression import ${FORCE ? '(WRITE)' : '(DRY RUN — pass --force to write)'} ===`);
  console.log(`Parsed rows classified as bounce/complaint: ${rows.length}`);
  console.log(`Unique addresses: ${unique.length}  (bounce: ${unique.filter((r) => r.reason === 'bounce').length}, complaint: ${unique.filter((r) => r.reason === 'complaint').length})`);
  console.log(`Already suppressed: ${unique.length - fresh.length}   New to add: ${fresh.length}`);
  console.log(`Suppression list size BEFORE: ${totalOnList}`);
  console.log(`\nTop bouncing/complaining domains (tells you if one scraped batch dominates):`);
  for (const [d, n] of topDomains) console.log(`  ${String(n).padStart(5)}  ${d}`);

  if (!FORCE) {
    console.log('\nDRY RUN — nothing written. Re-run with --force to apply.\n');
    return;
  }

  let added = 0;
  for (const r of fresh) {
    await prisma.emailSuppression.upsert({
      where: { email: r.email },
      create: { email: r.email, reason: r.reason, source: 'resend-import' },
      update: {},
    });
    added++;
  }
  const totalAfter = await prisma.emailSuppression.count();
  console.log(`\n✅ Wrote ${added} new suppressions. Suppression list size AFTER: ${totalAfter}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
