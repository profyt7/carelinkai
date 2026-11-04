/**
 * P0-1 (security decision package, Nov 2026): User credential fields never leave the database by default,
 * and GET/POST /api/operator/inquiries/[id]/convert is tenant-scoped.
 *
 * Before: getInquiryForConversion() included `family.user` and `convertedBy` as full User rows (password hash,
 * 2FA secret, backup codes, reset/verification tokens), returned to any role with inquiries.view for any id.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('global omit: credential fields are opt-in only', () => {
  it('the shared Prisma client omits every User secret field', () => {
    const src = read('src/lib/prisma.ts');
    expect(src).toMatch(/omit: \{ user: USER_SECRET_FIELDS \}/);
    expect(src).toMatch(/\.\.\.PRISMA_OPTIONS/);
    for (const f of ['passwordHash', 'twoFactorSecret', 'backupCodes', 'verificationToken', 'resetPasswordToken']) {
      expect(src).toMatch(new RegExp(`${f}: true`));
    }
  });

  it('every secret-looking User column in the schema is in the omit list (a new one must be added there)', () => {
    const schema = read('prisma/schema.prisma');
    const userModel = schema.slice(schema.indexOf('model User {'), schema.indexOf('\n}', schema.indexOf('model User {')));
    const cols = [...userModel.matchAll(/^\s{2}(\w+)\s+\w/gm)].map((m) => m[1]!);
    const secretish = cols.filter((c) => /password|secret|backup|token/i.test(c) && !/Expiry$/.test(c));
    const omitted = read('src/lib/prisma.ts');
    for (const c of secretish) expect({ c, omitted: omitted.includes(`${c}: true`) }).toEqual({ c, omitted: true });
    expect(secretish.length).toBeGreaterThanOrEqual(5);
  });

  it('no other PrismaClient is constructed in src/ (it would bypass the omit)', () => {
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && /new PrismaClient\s*\(/.test(fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))) hits.push(path.relative(ROOT, p));
      }
    };
    walk(path.join(ROOT, 'src'));
    expect(hits).toEqual(['src/lib/prisma.ts']);
  });

  it('the conversion preview selects contact fields only', () => {
    const src = read('src/lib/services/inquiry-conversion.ts');
    const fn = src.slice(src.indexOf('export async function getInquiryForConversion'));
    expect(fn).toMatch(/user: \{ select: \{ id: true, firstName: true, lastName: true, email: true, phone: true \} \}/);
    expect(fn).toMatch(/convertedBy: \{ select: \{ id: true, firstName: true, lastName: true \} \}/);
    expect(fn.slice(0, fn.indexOf('\n}\n'))).not.toMatch(/user: true|convertedBy: true/);
  });
});

// ---- route: tenant scope ----
const inquiryFindUnique = jest.fn();
const operatorFindUnique = jest.fn();
let currentUser: { id: string; role: string } = { id: 'u1', role: 'OPERATOR' };
jest.mock('@/lib/prisma', () => ({
  prisma: {
    inquiry: { findUnique: (a: unknown) => inquiryFindUnique(a) },
    operator: { findUnique: (a: unknown) => operatorFindUnique(a) },
  },
}));
jest.mock('@/lib/auth-utils', () => ({
  requireAuth: async () => currentUser,
  requirePermission: async () => currentUser,
  handleAuthError: () => new Response(JSON.stringify({ error: 'auth' }), { status: 401 }),
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn(), isExpectedAuthError: () => false }));
jest.mock('@/lib/audit', () => ({ createAuditLogFromRequest: jest.fn() }));
const preview = jest.fn();
const convert = jest.fn();
jest.mock('@/lib/services/inquiry-conversion', () => ({
  getInquiryForConversion: (id: string) => preview(id),
  canConvertInquiry: async () => ({ canConvert: true }),
  convertInquiryToResident: (d: unknown) => convert(d),
  ConversionDataSchema: { parse: (d: unknown) => d },
}));

describe('GET/POST /api/operator/inquiries/[id]/convert is tenant-scoped', () => {
  beforeEach(() => {
    inquiryFindUnique.mockReset().mockResolvedValue({ home: { operatorId: 'op-owner' } });
    operatorFindUnique.mockReset();
    preview.mockReset().mockResolvedValue({ id: 'inq1', family: { user: { id: 'f', firstName: 'A', lastName: 'B', email: 'a@x.test', phone: null } } });
    convert.mockReset().mockResolvedValue({ success: true, residentId: 'r1', inquiryId: 'inq1' });
  });
  const call = async (method: 'GET' | 'POST') => {
    const mod = await import('@/app/api/operator/inquiries/[id]/convert/route');
    const req = new Request('http://x/api/operator/inquiries/inq1/convert', { method, body: method === 'POST' ? '{}' : undefined }) as any;
    return (mod as any)[method](req, { params: { id: 'inq1' } });
  };

  it.each(['GET', 'POST'] as const)('%s: a FAMILY (or any non-operator) caller gets 403 and nothing is read or converted', async (m) => {
    currentUser = { id: 'fam1', role: 'FAMILY' };
    operatorFindUnique.mockResolvedValue(null);
    const res = await call(m);
    expect(res.status).toBe(403);
    expect(preview).not.toHaveBeenCalled();
    expect(convert).not.toHaveBeenCalled();
  });

  it.each(['GET', 'POST'] as const)('%s: an operator of a different home gets 403', async (m) => {
    currentUser = { id: 'op-other-user', role: 'OPERATOR' };
    operatorFindUnique.mockResolvedValue({ id: 'op-other' });
    expect((await call(m)).status).toBe(403);
    expect(convert).not.toHaveBeenCalled();
  });

  it('unknown inquiry → 404', async () => {
    currentUser = { id: 'u', role: 'OPERATOR' };
    inquiryFindUnique.mockResolvedValue(null);
    expect((await call('GET')).status).toBe(404);
  });

  it.each(['GET', 'POST'] as const)('%s: the owning operator (and ADMIN) still works', async (m) => {
    currentUser = { id: 'owner-user', role: 'OPERATOR' };
    operatorFindUnique.mockResolvedValue({ id: 'op-owner' });
    expect((await call(m)).status).toBe(200);
    currentUser = { id: 'admin', role: 'ADMIN' };
    expect((await call(m)).status).toBe(200);
  });

  it('the preview response carries no credential fields', async () => {
    currentUser = { id: 'owner-user', role: 'OPERATOR' };
    operatorFindUnique.mockResolvedValue({ id: 'op-owner' });
    const body = JSON.stringify(await (await call('GET')).json());
    expect(body).not.toMatch(/passwordHash|twoFactorSecret|backupCodes|resetPasswordToken|verificationToken/);
  });
});
