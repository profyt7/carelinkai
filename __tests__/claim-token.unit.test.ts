import {
  signClaimToken,
  verifyClaimToken,
  DEFAULT_CLAIM_TOKEN_TTL_HOURS,
  type ClaimTokenPayload,
} from '@/lib/claim-token';

const SECRET = 'test-secret';
const DAY = 24 * 60 * 60;

function sign(overrides: Partial<ClaimTokenPayload> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  return signClaimToken(
    {
      operatorEmail: 'founder@example.com',
      homeId: 'home_1',
      clevelandFounder: true,
      iat: now,
      exp: now + DEFAULT_CLAIM_TOKEN_TTL_HOURS * 3600,
      ...overrides,
    },
    SECRET
  );
}

describe('claim token expiry', () => {
  it('defaults to a 45-day lifetime', () => {
    expect(DEFAULT_CLAIM_TOKEN_TTL_HOURS).toBe(45 * 24);
    expect(DEFAULT_CLAIM_TOKEN_TTL_HOURS / 24).toBe(45);
  });

  it('signs a token whose exp is 45 days after iat', () => {
    const token = sign();
    const payload = verifyClaimToken(token, SECRET)!;
    expect(payload).not.toBeNull();
    expect((payload.exp - payload.iat) / DAY).toBe(45);
  });

  it('accepts a token that has not yet expired (e.g. 44 days out)', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = sign({ exp: now + 44 * DAY });
    expect(verifyClaimToken(token, SECRET)).not.toBeNull();
  });

  it('accepts a token right up to the 45-day boundary', () => {
    const now = Math.floor(Date.now() / 1000);
    // exp 60s in the future — still valid
    const token = sign({ exp: now + 60 });
    expect(verifyClaimToken(token, SECRET)).not.toBeNull();
  });

  it('rejects an expired token (no separate hard-coded 7-day window)', () => {
    const now = Math.floor(Date.now() / 1000);
    // Would have been valid under a 45-day window only if signed recently; this
    // one is already past its exp, so it must be rejected.
    const token = sign({ exp: now - 1 });
    expect(verifyClaimToken(token, SECRET)).toBeNull();
  });

  it('still accepts a longer-than-7-day token — verifier honors the token exp', () => {
    const now = Math.floor(Date.now() / 1000);
    // 30 days out: under the old 7-day hard cap this would be wrongly rejected.
    const token = sign({ iat: now, exp: now + 30 * DAY });
    const payload = verifyClaimToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect((payload!.exp - payload!.iat) / DAY).toBe(30);
  });

  it('rejects a tampered token', () => {
    const token = sign();
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
    expect(verifyClaimToken(tampered, SECRET)).toBeNull();
  });
});
