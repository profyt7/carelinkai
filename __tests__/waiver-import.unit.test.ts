/**
 * WRAAA waiver baseline import — dry-run planner on a fixture (sprint W5-2, G3).
 * Uses the COMMITTED CSV (data/medicaid/wraaa_alw_2026_10_16.csv) against a
 * hand-built home set so the policy is pinned: license first, address second,
 * most permissive wins, protected sources untouched, NOT_ON_LIST sweep only in
 * WRAAA's five counties, demo homes excluded, ambiguous never written.
 */

import fs from 'fs';
import path from 'path';
import { parseWraaaCsv, planWaiverImport, formatPlan, normalizeStreet, addressKey, type ImportHome } from '@/lib/medicaid/waiver-import';

const CSV = fs.readFileSync(path.join(process.cwd(), 'data', 'medicaid', 'wraaa_alw_2026_10_16.csv'), 'utf8');

const home = (p: Partial<ImportHome> & { id: string; name: string }): ImportHome => ({
  medicaidWaiverStatus: 'UNKNOWN',
  medicaidWaiverSource: null,
  odhLicenseNumber: null,
  street: null,
  city: null,
  description: 'A licensed home',
  operatorEmail: 'directory-unclaimed@carelinkai.system',
  ...p,
});

const HOMES: ImportHome[] = [
  home({ id: 'algart', name: 'Algart Health Care', odhLicenseNumber: '588R', city: 'Cleveland', street: '8902 Detroit Avenue' }), // license, leading zero stripped
  home({ id: 'eastpark', name: 'East Park Retirement Community', odhLicenseNumber: '2372R', city: 'Brook Park' }), // same license on 2 rows (both accepting)
  home({ id: 'jennings', name: 'Jennings', odhLicenseNumber: '0512R', city: 'Garfield Heights' }), // accepting + current_residents_only → ACCEPTING_NEW
  home({ id: 'legacy-mh', name: 'Legacy Place Middleburg Heights', street: '740 Hepburn Rd.', city: 'Middleburg Heights' }), // no license on row → address
  home({ id: 'echelon', name: 'Echelon', street: '635 North Huntington', city: 'Medina' }), // no license on row → address
  home({ id: 'parma-x', name: 'Parma Gardens', city: 'Parma' }), // Cuyahoga, not on list → NOT_ON_LIST
  home({ id: 'akron-x', name: 'Akron Manor', city: 'Akron' }), // Summit → stays UNKNOWN
  home({ id: 'nowhere', name: 'Mystery Home', city: 'Atlantis' }), // unplaceable → stays UNKNOWN
  home({ id: 'bickford', name: 'Bickford of Rocky River', odhLicenseNumber: '2190R', city: 'Rocky River', medicaidWaiverStatus: 'ACCEPTING_NEW', medicaidWaiverSource: 'VA_CALL' }), // protected
  home({ id: 'already', name: 'Beachwood Ops', odhLicenseNumber: '2709R', city: 'Beachwood', medicaidWaiverStatus: 'ACCEPTING_NEW', medicaidWaiverSource: 'WRAAA Medicaid Waiver Facilities list (accessed 2026-10-16)' }), // unchanged
  home({ id: 'demo', name: 'E2E Test Alpine House', odhLicenseNumber: '2903R', city: 'Maple Heights' }), // demo → excluded, row unmatched
  home({ id: 'dup1', name: 'Brooklyn Pointe A', odhLicenseNumber: '2833R', city: 'Brooklyn' }),
  home({ id: 'dup2', name: 'Brooklyn Pointe B', odhLicenseNumber: '2833R', city: 'Brooklyn' }), // duplicate license → ambiguous
  home({ id: 'protected-sweep', name: 'Lakewood Villa', city: 'Lakewood', medicaidWaiverStatus: 'ACCEPTING_NEW', medicaidWaiverSource: 'OPERATOR' }), // protected from sweep
];

describe('parseWraaaCsv — the committed list', () => {
  const rows = parseWraaaCsv(CSV);
  it('reads every row; exactly two have no ODH license', () => {
    expect(rows.length).toBe(84);
    const noLic = rows.filter((r) => !r.odhLicense);
    expect(noLic.map((r) => r.name)).toEqual(['Middleburg-Legacy Place LLC', 'Echelon Assisted Living']);
    expect(rows.every((r) => r.status !== null)).toBe(true);
  });
  it('keeps the vocabulary mapping', () => {
    expect(rows.find((r) => r.name === 'Hamlet Assisted Living')?.status).toBe('NOT_ACCEPTING_REFERRALS');
    expect(rows.find((r) => r.name === 'Bickford of Rocky River')?.status).toBe('CURRENT_RESIDENTS_ONLY');
  });
});

describe('address normalization', () => {
  it('treats suffix abbreviations / punctuation / direction words as equal', () => {
    expect(normalizeStreet('2116 Dover Center Dr.')).toBe(normalizeStreet('2116 Dover Center Drive'));
    expect(normalizeStreet('280 N Commons Blvd')).toBe(normalizeStreet('280 North Commons Boulevard'));
    expect(normalizeStreet('501 Chardon-Windsor Rd')).toBe('501 chardon windsor rd');
    expect(addressKey('740 Hepburn Road', 'Middleburg Hts')).toBe(addressKey('740 Hepburn Rd.', 'Middleburg Heights'));
    expect(addressKey('Hepburn Road', 'Middleburg Hts')).toBeNull(); // no house number → never match
    expect(addressKey('740 Hepburn Road', '')).toBeNull();
  });
});

describe('planWaiverImport — dry run on the fixture', () => {
  const plan = planWaiverImport(parseWraaaCsv(CSV), HOMES);
  const write = (id: string) => plan.writes.find((w) => w.homeId === id);

  it('matches by license first (normalized), then by address', () => {
    expect(plan.rowsMatched.find((m) => m.homeId === 'algart')?.via).toBe('LICENSE');
    expect(plan.rowsMatched.find((m) => m.homeId === 'legacy-mh')?.via).toBe('ADDRESS');
    expect(plan.rowsMatched.find((m) => m.homeId === 'echelon')?.via).toBe('ADDRESS');
    expect(write('algart')).toMatchObject({ from: 'UNKNOWN', to: 'ACCEPTING_NEW', via: 'LICENSE' });
    expect(write('legacy-mh')).toMatchObject({ to: 'ACCEPTING_NEW', via: 'ADDRESS' });
    expect(write('echelon')).toMatchObject({ to: 'CURRENT_RESIDENTS_ONLY', via: 'ADDRESS' });
  });

  it('one license on several rows → one write, most permissive wins', () => {
    expect(write('eastpark')).toMatchObject({ to: 'ACCEPTING_NEW', rows: expect.arrayContaining([expect.any(Number), expect.any(Number)]) });
    expect(write('eastpark')!.rows.length).toBe(2);
    expect(write('jennings')).toMatchObject({ to: 'ACCEPTING_NEW' });
    expect(plan.writes.filter((w) => w.homeId === 'jennings').length).toBe(1);
  });

  it('never overwrites a VA_CALL / OPERATOR / ADMIN source — rows or sweep', () => {
    expect(write('bickford')).toBeUndefined();
    expect(plan.skippedProtected).toEqual(expect.arrayContaining([expect.objectContaining({ homeId: 'bickford', source: 'VA_CALL', wanted: 'CURRENT_RESIDENTS_ONLY' })]));
    expect(write('protected-sweep')).toBeUndefined();
    expect(plan.skippedProtected).toEqual(expect.arrayContaining([expect.objectContaining({ homeId: 'protected-sweep', source: 'OPERATOR', wanted: 'NOT_ON_LIST' })]));
  });

  it('NOT_ON_LIST sweep only inside the five WRAAA counties; Summit / unplaced stay UNKNOWN', () => {
    expect(write('parma-x')).toMatchObject({ from: 'UNKNOWN', to: 'NOT_ON_LIST', via: 'NOT_ON_LIST_SWEEP' });
    expect(write('akron-x')).toBeUndefined();
    expect(write('nowhere')).toBeUndefined();
    expect(plan.leftUnknownOutsideRegion).toBe(2);
  });

  it('already-correct homes are unchanged; demo homes excluded; duplicate license is ambiguous (not written)', () => {
    expect(write('already')).toBeUndefined();
    expect(plan.unchanged).toBe(1);
    expect(plan.homesExcludedDemo).toBe(1);
    expect(plan.rowsUnmatched.some((u) => u.row.name === 'Alpine House of Maple Hts')).toBe(true);
    expect(plan.rowsAmbiguous.some((a) => a.row.name === 'Brooklyn Pointe' && a.candidateIds?.length === 2)).toBe(true);
    expect(write('dup1')).toBeUndefined();
    expect(write('dup2')).toBeUndefined();
    expect(write('demo')).toBeUndefined();
  });

  it('counts add up and the report names the address matches and unmatched rows', () => {
    const accounted = plan.rowsMatched.length + plan.rowsUnmatched.length + plan.rowsAmbiguous.length + plan.rowsBadStatus.length;
    expect(accounted).toBe(plan.rowsTotal);
    expect(plan.rowsMatched.length).toBe(9); // algart, eastpark×2, jennings×2, legacy-mh, echelon, bickford, already
    const text = formatPlan(plan);
    expect(text).toContain('matched:');
    expect(text).toMatch(/address match\s+line \d+\s+"Middleburg-Legacy Place LLC"/);
    expect(text).toMatch(/address match\s+line \d+\s+"Echelon Assisted Living"/);
    expect(text).toContain('✗ unmatched');
    expect(text).toContain('⛔ protected');
  });
});
