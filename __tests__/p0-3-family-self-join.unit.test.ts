/**
 * P0-3 (security decision package, Nov 2026): no self-join into another family.
 * Before: GET /api/family/notes and GET /api/family/emergency created an ACTIVE FamilyMember for any signed-in
 * caller and any familyId, unlocking that family's documents, downloads and resident summaries.
 */
import fs from 'fs';
import path from 'path';

const memberFindFirst = jest.fn();
const memberCreate = jest.fn();
const familyFindUnique = jest.fn();
const noteFindMany = jest.fn(async () => []);
const noteCount = jest.fn(async () => 0);
const prefFindFirst = jest.fn(async () => null);
let currentUser = { id: 'attacker', role: 'FAMILY' };

jest.mock('@/lib/prisma', () => ({
  prisma: {
    familyMember: { findFirst: (a: unknown) => memberFindFirst(a), create: (a: unknown) => memberCreate(a) },
    family: { findUnique: (a: unknown) => familyFindUnique(a) },
    familyNote: { findMany: () => noteFindMany(), count: () => noteCount() },
    emergencyPreference: { findFirst: () => prefFindFirst() },
  },
}));
jest.mock('@/lib/auth-utils', () => ({ requireAuth: async () => currentUser }));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn() }));
jest.mock('@/lib/server/sse', () => ({ publish: jest.fn() }));

import { ensureFamilyAccess } from '@/lib/family/access';

beforeEach(() => {
  memberFindFirst.mockReset().mockResolvedValue(null);
  memberCreate.mockReset().mockResolvedValue({});
  familyFindUnique.mockReset().mockResolvedValue({ userId: 'victim-owner' });
  currentUser = { id: 'attacker', role: 'FAMILY' };
});

describe('ensureFamilyAccess', () => {
  it('a stranger is refused and NO membership is created', async () => {
    expect(await ensureFamilyAccess('attacker', 'fam-victim')).toEqual({ ok: false, status: 403, error: 'Forbidden' });
    expect(memberCreate).not.toHaveBeenCalled();
  });
  it('unknown family → 404, nothing created', async () => {
    familyFindUnique.mockResolvedValue(null);
    expect(await ensureFamilyAccess('attacker', 'nope')).toMatchObject({ ok: false, status: 404 });
    expect(memberCreate).not.toHaveBeenCalled();
  });
  it('an ACTIVE member is allowed (only ACTIVE rows count)', async () => {
    memberFindFirst.mockResolvedValue({ role: 'MEMBER' });
    expect(await ensureFamilyAccess('m', 'f')).toEqual({ ok: true, role: 'MEMBER' });
    expect(memberFindFirst.mock.calls[0]![0]).toMatchObject({ where: { familyId: 'f', userId: 'm', status: 'ACTIVE' } });
  });
  it('a GUEST can read but not write', async () => {
    memberFindFirst.mockResolvedValue({ role: 'GUEST' });
    expect(await ensureFamilyAccess('g', 'f')).toMatchObject({ ok: true });
    expect(await ensureFamilyAccess('g', 'f', { write: true })).toMatchObject({ ok: false, status: 403 });
  });
  it('the family’s own owner account gets its missing OWNER row restored (and only that)', async () => {
    familyFindUnique.mockResolvedValue({ userId: 'owner' });
    expect(await ensureFamilyAccess('owner', 'f')).toEqual({ ok: true, role: 'OWNER' });
    expect(memberCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ familyId: 'f', userId: 'owner', role: 'OWNER', status: 'ACTIVE' }) });
  });
});

describe('routes no longer auto-join', () => {
  it('GET /api/family/notes?familyId=<other> → 403, no membership created, no notes read', async () => {
    const { GET } = await import('@/app/api/family/notes/route');
    const res = await GET(new Request('http://x/api/family/notes?familyId=fam-victim') as any);
    expect(res.status).toBe(403);
    expect(memberCreate).not.toHaveBeenCalled();
    expect(noteFindMany).not.toHaveBeenCalled();
  });
  it('GET /api/family/emergency?familyId=<other> → 403, no membership created', async () => {
    const { GET } = await import('@/app/api/family/emergency/route');
    const res = await GET(new Request('http://x/api/family/emergency?familyId=fam-victim') as any);
    expect(res.status).toBe(403);
    expect(memberCreate).not.toHaveBeenCalled();
    expect(prefFindFirst).not.toHaveBeenCalled();
  });
  it('a genuine member still reads notes', async () => {
    memberFindFirst.mockResolvedValue({ role: 'MEMBER' });
    const { GET } = await import('@/app/api/family/notes/route');
    const res = await GET(new Request('http://x/api/family/notes?familyId=fam-mine') as any);
    expect(res.status).toBe(200);
    expect(memberCreate).not.toHaveBeenCalled();
  });

  it('source guard: no family route creates a FamilyMember outside invite / membership / dev / the owner self-heal', () => {
    const ROOT = path.join(__dirname, '..');
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.ts$/.test(e.name) && /familyMember\.create\(/.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(ROOT, p));
      }
    };
    walk(path.join(ROOT, 'src'));
    expect(hits.sort()).toEqual(
      [
        'src/app/api/dev/upsert-family/route.ts',
        'src/app/api/family/members/invite/route.ts',
        'src/app/api/family/membership/route.ts',
        'src/lib/family/access.ts',
      ].sort(),
    );
  });
});
