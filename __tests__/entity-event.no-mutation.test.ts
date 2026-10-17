/**
 * EntityEvent is append-only (sprint W5-1, Δ14 / G2). This guard greps the
 * application source for ANY update / delete / upsert against the model and
 * fails if one appears. Reads (`findMany`) and `create` are the only allowed
 * operations.
 */

import fs from 'fs';
import path from 'path';

const ROOTS = ['src', 'scripts', 'prisma/seed.ts', 'prisma/seed-appointments.ts'];
const FORBIDDEN = /entityEvent\s*\.\s*(update|updateMany|delete|deleteMany|upsert)\s*\(/;
const RAW_SQL_FORBIDDEN = /(UPDATE|DELETE\s+FROM|TRUNCATE)\s+"?EntityEvent"?/i;

function walk(p: string, out: string[]): void {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isFile()) {
    if (/\.(ts|tsx|js|mjs|sql)$/.test(p)) out.push(p);
    return;
  }
  for (const name of fs.readdirSync(p)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    walk(path.join(p, name), out);
  }
}

describe('EntityEvent has no mutation path', () => {
  const files: string[] = [];
  for (const r of ROOTS) walk(path.join(process.cwd(), r), files);

  it('scans a meaningful number of source files', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('no prisma.entityEvent.update/delete/upsert anywhere in the app', () => {
    const offenders = files.filter((f) => FORBIDDEN.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('no raw SQL that rewrites or truncates EntityEvent', () => {
    const offenders = files.filter((f) => !/migrations/.test(f) && RAW_SQL_FORBIDDEN.test(fs.readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
