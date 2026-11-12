import { inspectClaimToken, signClaimToken } from '@/lib/claim-token';
import { claimTokenRecipientUnverified } from '@/lib/claim-token-recipient';

const S = 'secret-x';
const now = () => Math.floor(Date.now() / 1000);
const tok = (exp: number) => signClaimToken({ operatorEmail: 'kfuller@arden-courts.com', homeId: 'h1', clevelandFounder: true, iat: now(), exp }, S);

describe('inspectClaimToken', () => {
  it('valid / expired (correctly signed) / invalid are told apart', () => {
    expect(inspectClaimToken(tok(now() + 60), S).state).toBe('valid');
    expect(inspectClaimToken(tok(now() - 60), S)).toMatchObject({ state: 'expired', payload: { homeId: 'h1' } });
    expect(inspectClaimToken(tok(now() + 60), 'other-secret').state).toBe('invalid');
    expect(inspectClaimToken(tok(now() + 60).slice(0, -3), S).state).toBe('invalid');
    for (const t of [null, undefined, '', 'a.b.c', 'nodot']) expect(inspectClaimToken(t, S).state).toBe('invalid');
    expect(inspectClaimToken(tok(now() + 60), '').state).toBe('invalid');
  });
  it('a forged payload with an expired-looking exp is still "invalid", never "expired"', () => {
    const [, sig] = tok(now() + 60).split('.');
    const forged = Buffer.from(JSON.stringify({ operatorEmail: 'x@y.z', homeId: 'h2', exp: 1 })).toString('base64url');
    expect(inspectClaimToken(`${forged}.${sig}`, S).state).toBe('invalid');
  });
});

describe('claimTokenRecipientUnverified (register form prefill only)', () => {
  it('reads the recipient, lowercased; null for junk', () => {
    expect(claimTokenRecipientUnverified(tok(now() + 60))).toBe('kfuller@arden-courts.com');
    for (const t of [null, '', 'garbage', 'e30.sig']) expect(claimTokenRecipientUnverified(t)).toBeNull();
  });
});
