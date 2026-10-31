/**
 * OL-181 — the callers of the old src/lib/email-service.ts (whose
 * EMAIL_PROVIDER=sendgrid fell through to a mock provider that sent nothing)
 * now go through the Resend path (src/lib/email/transactional.ts →
 * guardedResendSend). Resend is mocked; nothing sends.
 */

import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

const guardedResendSend = jest.fn<(...a: any[]) => Promise<any>>();
jest.mock('@/lib/email', () => ({ guardedResendSend: (...a: unknown[]) => guardedResendSend(...a) }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() } }));

import { escapeHtml, sendEmail } from '@/lib/email/transactional';

const root = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const CALLERS = [
  'src/app/api/marketplace/applications/route.ts',
  'src/app/api/marketplace/applications/[id]/route.ts',
  'src/lib/services/reminders.ts',
  'src/lib/services/family.ts',
];

const ENV = { ...process.env };
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ENV, RESEND_API_KEY: 're_test', EMAIL_FROM: 'noreply@getcarelinkai.com', ADMIN_NOTIFY_EMAIL: 'alerts@example.com' };
  guardedResendSend.mockResolvedValue({ data: { id: 'email_1' }, error: null });
});
afterAll(() => {
  process.env = ENV;
});

describe('the old email-service is gone', () => {
  it('src/lib/email-service.ts and test-email-service.js are deleted; nothing imports them', () => {
    expect(fs.existsSync(path.join(root, 'src/lib/email-service.ts'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'test-email-service.js'))).toBe(false);
    for (const f of CALLERS) {
      const src = read(f);
      expect({ f, oldImport: src.includes('@/lib/email-service') }).toEqual({ f, oldImport: false });
      expect({ f, resend: /import \{[^}]*\bsendEmail\b[^}]*\} from '@\/lib\/email\/transactional'/.test(src) }).toEqual({ f, resend: true });
    }
  });

  it('.env.example carries no EMAIL_PROVIDER / EMAIL_SERVER_* / SENDGRID_* / SMTP_*', () => {
    expect(read('.env.example')).not.toMatch(/^#?\s*(EMAIL_PROVIDER|EMAIL_SERVER_\w+|SENDGRID_\w+|SMTP_\w+)=/m);
  });
});

describe('the Resend path the callers now use', () => {
  it('sends through guardedResendSend with the house from-address', async () => {
    const r = await sendEmail({ to: 'a@example.com', subject: 'Hi', html: '<p>x</p>', text: 'x', categories: ['family-mention'] });
    expect(r).toEqual({ success: true, messageId: 'email_1' });
    expect(guardedResendSend).toHaveBeenCalledWith(expect.objectContaining({ from: 'CareLinkAI <noreply@getcarelinkai.com>', to: ['a@example.com'], subject: 'Hi', tags: [{ name: 'category', value: 'family-mention' }] }));
  });

  it('no RESEND_API_KEY → no send, a failed result (never a silent mock success)', async () => {
    delete process.env['RESEND_API_KEY'];
    const r = await sendEmail({ to: 'a@example.com', subject: 'Hi', html: '<p>x</p>' });
    expect(r.success).toBe(false);
    expect(guardedResendSend).not.toHaveBeenCalled();
  });

  it('escapeHtml neutralises markup a user typed', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;');
    expect(escapeHtml(null)).toBe('');
  });
});
