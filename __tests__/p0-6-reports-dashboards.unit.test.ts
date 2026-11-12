/**
 * P0-6 (security decision package, Nov 2026): reports and dashboards are never platform-wide for non-admins.
 * Before: /api/dashboard/* scoped only OPERATOR (everyone else got `{}`), /api/operator/dashboard gave non-operators
 * the empty filter, and report generation treated an empty / unvalidated homeIds list as "all homes".
 */
import fs from 'fs';
import path from 'path';

let scope: any;
const operatorFindUnique = jest.fn();
const userFindUnique = jest.fn<any>(async () => ({ twoFactorEnabled: true, twoFactorSecret: 'enc' })); // enrolled by default
jest.mock('@/lib/prisma', () => ({ prisma: { operator: { findUnique: (a: any) => operatorFindUnique(a) }, user: { findUnique: (a: any) => userFindUnique(a) } } }));
jest.mock('@/lib/auth-utils', () => ({ getUserScope: async () => scope }));

import { dashboardScope, NONE } from '@/lib/dashboard/scope';
import { resolveReportHomeIds } from '@/lib/reports/scope';

const ROOT = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

beforeEach(() => operatorFindUnique.mockReset());

describe('dashboardScope', () => {
  it('ADMIN/STAFF → unrestricted', async () => {
    expect(await dashboardScope({ id: 'a', role: 'ADMIN' })).toMatchObject({ resident: {}, inquiry: {} });
  });
  it('OPERATOR → own homes; missing operator record → 404', async () => {
    operatorFindUnique.mockResolvedValue({ id: 'op1' });
    expect(await dashboardScope({ id: 'u', role: 'OPERATOR' })).toMatchObject({ resident: { home: { operatorId: 'op1' } }, home: { operatorId: 'op1' } });
    operatorFindUnique.mockResolvedValue(null);
    expect(((await dashboardScope({ id: 'u', role: 'OPERATOR' })) as Response).status).toBe(404);
  });
  it('OPERATOR without 2FA (PHI step-up) → dashboard still loads, but no resident/incident/assessment rows', async () => {
    operatorFindUnique.mockResolvedValue({ id: 'op1' });
    userFindUnique.mockResolvedValueOnce({ twoFactorEnabled: false, twoFactorSecret: null });
    const s: any = await dashboardScope({ id: 'u', role: 'OPERATOR' });
    expect(s).toMatchObject({ resident: NONE, incident: NONE, assess: NONE, home: { operatorId: 'op1' } });
    expect(s.inquiry).toEqual({ home: { operatorId: 'op1' }, isTest: false });
  });
  it('FAMILY → only its own residents and inquiries (was: platform-wide)', async () => {
    scope = { role: 'FAMILY', residentIds: ['r1'], familyId: 'f1', homeIds: [] };
    const s: any = await dashboardScope({ id: 'fam', role: 'FAMILY' });
    expect(s.resident).toEqual({ id: { in: ['r1'] } });
    expect(s.inquiry).toEqual({ familyId: 'f1', isTest: false }); // test inquiries never on dashboards
    expect(s.incident).toEqual({ residentId: { in: ['r1'] } });
    expect(s.caregiver).toEqual(NONE);
  });
  it('CAREGIVER → homes where employed, own certs', async () => {
    scope = { role: 'CAREGIVER', caregiverId: 'cg1', homeIds: ['h1'] };
    const s: any = await dashboardScope({ id: 'cg', role: 'CAREGIVER' });
    expect(s.resident).toEqual({ homeId: { in: ['h1'] } });
    expect(s.cert).toEqual({ caregiverId: 'cg1' });
  });
  it('PROVIDER / DISCHARGE_PLANNER / AFFILIATE → nothing', async () => {
    scope = { role: 'PROVIDER', homeIds: [], residentIds: [] };
    for (const role of ['PROVIDER', 'DISCHARGE_PLANNER', 'AFFILIATE']) {
      const s: any = await dashboardScope({ id: 'x', role });
      for (const k of ['resident', 'incident', 'assess', 'home', 'cert', 'caregiver']) expect(s[k]).toEqual(NONE);
      expect(s.inquiry).toEqual({ ...NONE, isTest: false });
    }
  });
});

describe('resolveReportHomeIds', () => {
  it('ADMIN/STAFF: as requested (empty = all homes)', async () => {
    scope = { role: 'ADMIN', homeIds: 'ALL' };
    expect(await resolveReportHomeIds('a', [])).toEqual({ homeIds: [] });
    expect(await resolveReportHomeIds('a', ['h9'])).toEqual({ homeIds: ['h9'] });
  });
  it('OPERATOR: empty → own homes (never all); a foreign home → 403', async () => {
    scope = { role: 'OPERATOR', homeIds: ['h1', 'h2'] };
    expect(await resolveReportHomeIds('op', [])).toEqual({ homeIds: ['h1', 'h2'] });
    expect(await resolveReportHomeIds('op', undefined)).toEqual({ homeIds: ['h1', 'h2'] });
    expect(await resolveReportHomeIds('op', ['h1'])).toEqual({ homeIds: ['h1'] });
    expect(((await resolveReportHomeIds('op', ['h1', 'h-victim'])) as Response).status).toBe(403);
  });
  it('operator with no homes, AFFILIATE, PROVIDER, DP → 403', async () => {
    scope = { role: 'OPERATOR', homeIds: [] };
    expect(((await resolveReportHomeIds('op', [])) as Response).status).toBe(403);
    for (const role of ['AFFILIATE', 'PROVIDER', 'DISCHARGE_PLANNER', 'FAMILY']) {
      scope = { role, homeIds: [], residentIds: [] };
      expect(((await resolveReportHomeIds('x', [])) as Response).status).toBe(403);
    }
  });
});

describe('source guards', () => {
  it.each(['activity', 'alerts', 'charts', 'metrics'])('/api/dashboard/%s uses dashboardScope and no operatorId fallback to {}', (f) => {
    const src = read(`src/app/api/dashboard/${f}/route.ts`);
    expect(src).toContain('const s = await dashboardScope(user);');
    expect(src).not.toMatch(/operatorId \? .* : \{\}/);
  });
  it('/api/operator/dashboard refuses non-operator, non-admin roles', () => {
    expect(read('src/app/api/operator/dashboard/route.ts')).toMatch(/user\.role !== UserRole\.OPERATOR && user\.role !== UserRole\.ADMIN && user\.role !== UserRole\.STAFF[\s\S]{0,80}status: 403/);
  });
  it('report generate + download resolve homeIds through the scope; download checks the creator', () => {
    const gen = read('src/app/api/reports/generate/route.ts');
    expect(gen).toContain('resolveReportHomeIds(user.id, homeIds)');
    expect(gen).toContain('homeIds: allowed.homeIds');
    expect(gen).not.toContain('homeIds: homeIds || []');
    const dl = read('src/app/api/reports/[id]/download/route.ts');
    expect(dl).toMatch(/report\.generatedBy !== user\.id/);
    expect(dl).toContain('homeIds: allowed.homeIds');
  });
  it('the report service is no longer a "use server" module', () => {
    expect(read('src/lib/services/reports.ts')).not.toMatch(/^\s*['"]use server['"]/m);
  });
});
