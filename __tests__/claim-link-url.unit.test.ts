import { claimLinkUrl, claimTokenFromUrl } from '@/lib/claim-engine/claim-link-url';

describe('claim link URLs', () => {
  const T = 'eyJob21lSWQiOiJoMSJ9.c2ln-_';
  it('emailed links land on /claim by default; --register-url keeps the old hand-off form', () => {
    expect(claimLinkUrl('https://getcarelinkai.com/', T)).toBe(`https://getcarelinkai.com/claim?token=${encodeURIComponent(T)}`);
    expect(claimLinkUrl('https://getcarelinkai.com', T, true)).toBe(`https://getcarelinkai.com/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(T)}`);
  });
  it('reads the token back from either form, nothing else', () => {
    expect(claimTokenFromUrl(claimLinkUrl('https://x.test', T))).toBe(T);
    expect(claimTokenFromUrl(claimLinkUrl('https://x.test', T, true))).toBe(T);
    expect(claimTokenFromUrl('https://x.test/homes/h1?token=abc')).toBeNull();
    expect(claimTokenFromUrl('not a url')).toBeNull();
  });
  it('the mint script uses it (no hard-coded /auth/register link)', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '../scripts/mint-claim-link.ts'), 'utf8');
    expect(src).toContain('return claimLinkUrl(appUrl(), token, REGISTER_URL);');
    expect(src).not.toMatch(/`\$\{appUrl\(\)\}\/auth\/register\?role=OPERATOR&claimToken=/);
  });
  it('the checker never fetches /claim (only the register hand-off)', () => {
    const src: string = require('fs').readFileSync(require('path').join(__dirname, '../scripts/check-claim-links.ts'), 'utf8');
    const fetches = src.match(/fetch\([^)]*\)/g) ?? [];
    expect(fetches).toEqual(["fetch(register, { redirect: 'manual' })"]);
    expect(src).toContain('claimLinkUrl(appUrl(), token, true)');
  });
});
