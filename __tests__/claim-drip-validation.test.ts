/**
 * Pre-send address guard for the claim drip (OL-109): reject placeholder/invalid
 * outreach addresses so a paused-then-re-enabled drip never burns sender reputation
 * on obviously-dead directory emails. (Hard bounces are handled by the Resend
 * webhook → EmailSuppression.)
 */
import { emailLooksSendable } from '@/lib/claim-engine/claim-drip';

describe('emailLooksSendable — pre-send address guard', () => {
  it('accepts normal operator addresses', () => {
    for (const e of ['teresa@pleasantviewhealthcare.com', 'lfluhart@elizajen.org', 'info@maplewood.com']) {
      expect(emailLooksSendable(e)).toBe(true);
    }
  });

  it('rejects empty / malformed', () => {
    for (const e of [null, undefined, '', 'not-an-email', 'a@b', 'a@b.', '@x.com', 'x@.com', 'x y@z.com']) {
      expect(emailLooksSendable(e as any)).toBe(false);
    }
  });

  it('rejects placeholder / non-deliverable patterns', () => {
    for (const e of [
      'directory-unclaimed@carelinkai.system',
      'noreply@foo.com',
      'no-reply@foo.com',
      'postmaster@foo.com',
      'test@foo.com',
      'foo@example.com',
      'foo@test.com',
      'foo@localhost',
    ]) {
      expect(emailLooksSendable(e)).toBe(false);
    }
  });
});
