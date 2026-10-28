/**
 * fix/resend-bounce-suppression — suppression list + send-time enforcement.
 *
 * Verifies filterSuppressed/normalize/add behavior, and that the guarded send
 * path in email.ts actually drops suppressed recipients before hitting Resend
 * (tested through sendVerificationEmail, a representative send helper).
 */

import { jest } from '@jest/globals';

const mockSend = jest.fn();
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })) }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    emailSuppression: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn(), count: jest.fn() },
  },
}));
jest.mock('@/lib/sentry', () => ({ captureError: jest.fn() }));

import {
  normalizeEmail,
  filterSuppressed,
  isEmailSuppressed,
  addSuppressions,
} from '@/lib/email/suppression';
import { sendVerificationEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

const findMany = prisma.emailSuppression.findMany as jest.Mock;
const findUnique = prisma.emailSuppression.findUnique as jest.Mock;
const upsert = prisma.emailSuppression.upsert as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESEND_API_KEY = 're_test';
  findMany.mockResolvedValue([] as never);
  upsert.mockResolvedValue({} as never);
  mockSend.mockResolvedValue({ data: { id: 'e1' }, error: null } as never);
});

describe('normalizeEmail', () => {
  it('trims + lowercases; blanks → ""', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com');
    expect(normalizeEmail(null)).toBe('');
  });
});

describe('filterSuppressed', () => {
  it('partitions allowed vs suppressed, de-duped + normalized', async () => {
    findMany.mockResolvedValue([{ email: 'bad@x.com' }] as never);
    const res = await filterSuppressed(['Good@X.com', 'BAD@x.com', 'good@x.com', '', null]);
    expect(res.suppressed).toEqual(['bad@x.com']);
    expect(res.allowed).toEqual(['good@x.com']);
    // one query, queried the normalized unique set
    expect((findMany.mock.calls[0][0] as any).where.email.in.sort()).toEqual(['bad@x.com', 'good@x.com']);
  });

  it('fails OPEN when the lookup throws (nothing treated as suppressed)', async () => {
    findMany.mockRejectedValue(new Error('db down') as never);
    const res = await filterSuppressed(['a@x.com', 'b@x.com']);
    expect(res.suppressed).toEqual([]);
    expect(res.allowed).toEqual(['a@x.com', 'b@x.com']);
  });
});

describe('isEmailSuppressed', () => {
  it('true when a row exists, false otherwise', async () => {
    findUnique.mockResolvedValueOnce({ email: 'x@y.com' } as never);
    expect(await isEmailSuppressed('X@Y.com')).toBe(true);
    findUnique.mockResolvedValueOnce(null as never);
    expect(await isEmailSuppressed('z@y.com')).toBe(false);
  });
});

describe('addSuppressions', () => {
  it('upserts each normalized address with the reason/source', async () => {
    await addSuppressions(['A@B.com', 'a@b.com', 'c@d.com'], 'bounce', 'resend-webhook');
    expect(upsert).toHaveBeenCalledTimes(2); // de-duped
    const call = upsert.mock.calls[0][0] as any;
    expect(call.where.email).toBe('a@b.com');
    expect(call.create).toMatchObject({ reason: 'bounce', source: 'resend-webhook' });
  });
});

describe('guarded send enforcement (via sendVerificationEmail)', () => {
  it('does NOT send to a fully-suppressed recipient', async () => {
    findMany.mockResolvedValue([{ email: 'bounced@x.com' }] as never);
    const ok = await sendVerificationEmail('bounced@x.com', 'Sam', 'tok');
    expect(mockSend).not.toHaveBeenCalled();
    expect(ok).toBe(true); // benign no-op (nothing deliverable to send)
  });

  it('sends to a non-suppressed recipient', async () => {
    findMany.mockResolvedValue([] as never);
    await sendVerificationEmail('fresh@x.com', 'Sam', 'tok');
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect((mockSend.mock.calls[0][0] as any).to).toEqual(['fresh@x.com']);
  });
});
