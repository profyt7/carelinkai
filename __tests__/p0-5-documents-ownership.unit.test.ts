/**
 * P0-5 (security decision package, Nov 2026): /api/documents/* enforces ownership.
 * Before: list, read, search, classify, extract, process, reclassify, review, validate checked only "signed in"
 * (OCR text included), and upload attached files to any resident/inquiry id.
 */
import fs from 'fs';
import path from 'path';

let scope: any;
const docFindFirst = jest.fn();
const docFindUnique = jest.fn();
const docFindMany = jest.fn(async () => []);
const docCount = jest.fn(async () => 0);
const residentFindUnique = jest.fn();
const inquiryFindUnique = jest.fn();
let session: any = { user: { id: 'fam1', role: 'FAMILY' } };

jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findFirst: (a: any) => docFindFirst(a),
      findUnique: (a: any) => docFindUnique(a),
      findMany: (a: any) => docFindMany(a),
      count: (a: any) => docCount(a),
    },
    resident: { findUnique: (a: any) => residentFindUnique(a) },
    inquiry: { findUnique: (a: any) => inquiryFindUnique(a) },
  },
}));
jest.mock('@/lib/auth-utils', () => ({ getUserScope: async () => scope }));
jest.mock('next-auth', () => ({ getServerSession: async () => session }));
jest.mock('@/lib/auth', () => ({ authOptions: {} }));

import { documentScopeWhere, denyUnlessDocumentAccess, canAttachDocument } from '@/lib/documents/access';

beforeEach(() => {
  [docFindFirst, docFindUnique, docFindMany, docCount, residentFindUnique, inquiryFindUnique].forEach((m) => m.mockReset());
  docFindMany.mockResolvedValue([]);
  docCount.mockResolvedValue(0);
});

describe('documentScopeWhere', () => {
  it('ADMIN/STAFF → unrestricted', async () => {
    scope = { role: 'ADMIN', homeIds: 'ALL' };
    expect(await documentScopeWhere('a')).toBeNull();
  });
  it('OPERATOR → own uploads + residents/inquiries in their homes', async () => {
    scope = { role: 'OPERATOR', homeIds: ['h1'] };
    expect(await documentScopeWhere('op')).toEqual({
      OR: [{ uploadedById: 'op' }, { resident: { homeId: { in: ['h1'] } } }, { inquiry: { homeId: { in: ['h1'] } } }],
    });
  });
  it('FAMILY → own uploads + their residents + their family’s inquiries', async () => {
    scope = { role: 'FAMILY', homeIds: [], residentIds: ['r1'], familyId: 'f1' };
    expect(await documentScopeWhere('fam')).toEqual({ OR: [{ uploadedById: 'fam' }, { residentId: { in: ['r1'] } }, { inquiry: { familyId: 'f1' } }] });
  });
  it('a family with no residents, or another role, sees only its own uploads', async () => {
    scope = { role: 'FAMILY', homeIds: [], residentIds: [] };
    expect(await documentScopeWhere('fam')).toEqual({ OR: [{ uploadedById: 'fam' }] });
    scope = { role: 'PROVIDER', homeIds: [], residentIds: [] };
    expect(await documentScopeWhere('p')).toEqual({ OR: [{ uploadedById: 'p' }] });
  });
});

describe('denyUnlessDocumentAccess', () => {
  it('outside scope → 403; missing → 404; inside → null', async () => {
    scope = { role: 'FAMILY', homeIds: [], residentIds: [] };
    docFindFirst.mockResolvedValue(null);
    docFindUnique.mockResolvedValue({ id: 'd1' });
    expect((await denyUnlessDocumentAccess('fam', 'd1'))!.status).toBe(403);
    docFindUnique.mockResolvedValue(null);
    expect((await denyUnlessDocumentAccess('fam', 'd1'))!.status).toBe(404);
    docFindFirst.mockResolvedValue({ id: 'd1' });
    expect(await denyUnlessDocumentAccess('fam', 'd1')).toBeNull();
  });
});

describe('canAttachDocument (upload targets)', () => {
  it('operator: only residents/inquiries in their homes', async () => {
    scope = { role: 'OPERATOR', homeIds: ['h1'] };
    residentFindUnique.mockResolvedValue({ homeId: 'h-other' });
    expect(await canAttachDocument('op', { residentId: 'r' })).toBe(false);
    residentFindUnique.mockResolvedValue({ homeId: 'h1' });
    expect(await canAttachDocument('op', { residentId: 'r' })).toBe(true);
    inquiryFindUnique.mockResolvedValue({ homeId: 'h-other', familyId: null });
    expect(await canAttachDocument('op', { inquiryId: 'i' })).toBe(false);
  });
  it('family: only its own residents / inquiries', async () => {
    scope = { role: 'FAMILY', homeIds: [], residentIds: ['r1'], familyId: 'f1' };
    residentFindUnique.mockResolvedValue({ homeId: 'h' });
    expect(await canAttachDocument('fam', { residentId: 'r-other' })).toBe(false);
    expect(await canAttachDocument('fam', { residentId: 'r1' })).toBe(true);
    inquiryFindUnique.mockResolvedValue({ homeId: 'h', familyId: 'f-other' });
    expect(await canAttachDocument('fam', { inquiryId: 'i' })).toBe(false);
  });
});

describe('routes', () => {
  it('GET /api/documents ANDs the caller scope into count and findMany', async () => {
    scope = { role: 'FAMILY', homeIds: [], residentIds: [] };
    session = { user: { id: 'fam1', role: 'FAMILY' } };
    const { GET } = await import('@/app/api/documents/route');
    await GET(new Request('http://x/api/documents?residentId=r-victim') as any);
    const where = docFindMany.mock.calls[0]![0].where;
    expect(where.AND[0]).toEqual({ residentId: 'r-victim' });
    expect(where.AND[1]).toEqual({ OR: [{ uploadedById: 'fam1' }] });
    expect(docCount.mock.calls[0]![0].where).toEqual(where);
  });

  it('source guard: every [id] route and the list/search/needs-review/stats/upload routes call the access helpers', () => {
    const ROOT = path.join(__dirname, '..', 'src/app/api/documents');
    const need: Record<string, RegExp> = {
      'route.ts': /scopedDocumentWhere\(session\.user\.id, where\)/,
      'search/route.ts': /scopedDocumentWhere\(session\.user\.id, where\)/,
      'needs-review/route.ts': /documentScopeWhere\(session\.user\.id\)/,
      'stats/route.ts': /isDocumentAdmin\(session\.user\.id\)/,
      'upload/route.ts': /canAttachDocument\(session\.user\.id/,
      '[id]/route.ts': /denyUnlessDocumentAccess\(session\.user\.id, params\.id\)/,
      '[id]/classify/route.ts': /denyUnlessDocumentAccess\(session\.user\.id, documentId\)/,
      '[id]/extract/route.ts': /denyUnlessDocumentAccess\(session\.user\.id, documentId\)/,
      '[id]/process/route.ts': /denyUnlessDocumentAccess\(session\.user\.id, documentId\)/,
      '[id]/reclassify/route.ts': /denyUnlessDocumentAccess\(session\.user\.id, documentId\)/,
      '[id]/review/route.ts': /denyUnlessDocumentAccess\(session\.user\.id, documentId\)/,
      '[id]/validate/route.ts': /denyUnlessDocumentAccess\(session\.user\.id, documentId\)/,
    };
    for (const [f, re] of Object.entries(need)) expect({ f, ok: re.test(fs.readFileSync(path.join(ROOT, f), 'utf8')) }).toEqual({ f, ok: true });
    // [id]/route.ts guards all three methods.
    expect(fs.readFileSync(path.join(ROOT, '[id]/route.ts'), 'utf8').match(/denyUnlessDocumentAccess\(session\.user\.id, params\.id\)/g)).toHaveLength(3);
    // No route file under /api/documents is missed.
    const all: string[] = [];
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'route.ts') all.push(path.relative(ROOT, p)); } };
    walk(ROOT);
    expect(all.sort()).toEqual(Object.keys(need).sort());
  });
});
