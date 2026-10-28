/**
 * OL-194 — credentials never reach logs.
 *
 * 1. The ESLint guard (.eslintrc.json `no-restricted-syntax`) flags console.*
 *    calls that pass a token / secret / password / auth header / reset or
 *    verification or claim link, and logger.* template-literal messages that
 *    interpolate one. `next lint` runs it over src/ in CI; this test also runs
 *    it over scripts/ (which next lint does not cover) and proves it fires.
 * 2. The structured logger and the Sentry scrubber redact secrets deeply.
 */

import path from 'path';
import { ESLint } from 'eslint';
import { isSecretKey, maskSecret, redactSecrets, redactString, REDACTED } from '@/lib/redact';
import { scrubPhi } from '@/lib/phi-scrubber';
import { logger } from '@/lib/logger';

const root = path.join(__dirname, '..');
const RULE = 'no-restricted-syntax';

async function guard(): Promise<ESLint> {
  const cfg = await new ESLint({ cwd: root }).calculateConfigForFile(path.join(root, 'src/lib/logger.ts'));
  const rule = cfg.rules?.[RULE];
  expect(rule).toBeDefined();
  return new ESLint({
    cwd: root,
    useEslintrc: false,
    overrideConfig: {
      parser: '@typescript-eslint/parser',
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      rules: { [RULE]: rule },
    },
  });
}

async function hits(code: string): Promise<number> {
  const [res] = await (await guard()).lintText(code, { filePath: path.join(root, 'src/__fixture__.ts') });
  return res!.messages.filter((m) => m.ruleId === RULE).length;
}

describe('ESLint guard: no credentials in logs', () => {
  it.each([
    ['console.log(`token=${token}`)'],
    ['console.log("verify:", verificationUrl)'],
    ['console.error("hash", user.passwordHash)'],
    ['console.log({ password })'],
    ['console.log("headers", req.headers.authorization)'],
    ['console.info("reset link", resetUrl)'],
    ['console.log(`claim: ${claimLink}`)'],
    ['logger.info(`sent with token ${token}`)'],
  ])('flags %s', async (code) => {
    expect(await hits(code)).toBeGreaterThan(0);
  });

  it.each([
    ['console.log("[auth] session", token.id)'],
    ['console.log("userId", user.id, "hasToken", hasToken)'],
    ['console.warn("RESEND_API_KEY not set — email skipped")'],
    ['logger.info("verification sent", { userId, token })'], // structured context is redacted by the logger
    ['console.log("passwordValid=", passwordValid)'],
    ['console.log("link", redactString(c.claimUrl), maskSecret(token))'],
  ])('allows %s', async (code) => {
    expect(await hits(code)).toBe(0);
  });

  it('scripts/ is clean (src/ is covered by `next lint` in CI)', async () => {
    const results = await (await guard()).lintFiles([path.join(root, 'scripts/**/*.{ts,js,mjs,cjs}')]);
    const offenders = results.flatMap((r) =>
      r.messages.filter((m) => m.ruleId === RULE).map((m) => `${path.relative(root, r.filePath)}:${m.line}`),
    );
    expect(offenders).toEqual([]);
  }, 180_000);
});

describe('redaction helpers', () => {
  it('isSecretKey matches credential keys by ending, not unrelated names', () => {
    for (const k of ['password', 'userPassword', 'verificationToken', 'claimToken', 'x-api-key', 'apiKey', 'Authorization', 'cookie', 'set-cookie', 'resetUrl', 'webhookSecret', 'backupCodes']) {
      expect({ k, secret: isSecretKey(k) }).toEqual({ k, secret: true });
    }
    for (const k of ['userId', 'passwordValid', 'tokenCount', 'email', 'status', 'homeId']) {
      expect({ k, secret: isSecretKey(k) }).toEqual({ k, secret: false });
    }
  });

  it('redactString scrubs token query params, bearer headers and provider keys', () => {
    expect(redactString('https://x.com/auth/verify?token=abc123def456&next=/')).toBe(`https://x.com/auth/verify?token=${REDACTED}&next=/`);
    expect(redactString('Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig')).toBe(`Authorization: Bearer ${REDACTED}`);
    // Provider-shaped fixtures are assembled at runtime so the secret scan never sees a literal key (OL-162 precedent).
    const fakeStripe = ['sk', 'live', '51Habcdefghijk'].join('_');
    expect(redactString(`key ${fakeStripe} and whsec_abcdefghij`)).toBe(`key sk_live_${REDACTED} and whsec_${REDACTED}`);
    expect(redactString('plain message, nothing secret')).toBe('plain message, nothing secret');
  });

  it('redactSecrets is deep and leaves other fields alone', () => {
    const out = redactSecrets({ userId: 'u1', claimToken: 'jwt', nested: { headers: { authorization: 'Bearer x', host: 'a' } }, link: '/claim?token=zzz123456' });
    expect(out).toEqual({ userId: 'u1', claimToken: REDACTED, nested: { headers: { authorization: REDACTED, host: 'a' } }, link: `/claim?token=${REDACTED}` });
  });

  it('maskSecret shows a prefix and length only', () => {
    expect(maskSecret('abcdef0123456789')).toBe('abcd…(16 chars)');
    expect(maskSecret(undefined)).toBe('(none)');
  });

  it('the Sentry scrubber now drops credential keys too', () => {
    expect(scrubPhi({ token: 't', resetUrl: 'u', userId: 'u1' })).toEqual({ token: REDACTED, resetUrl: REDACTED, userId: 'u1' });
  });

  it('the structured logger redacts nested secrets and token-shaped strings in the message', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    logger.info('verify link https://x.com/v?token=xyz', { userId: 'u1', meta: { verificationToken: 'abc' } });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    spy.mockRestore();
    expect(line.message).toBe(`verify link https://x.com/v?token=${REDACTED}`);
    expect(line.meta).toEqual({ verificationToken: REDACTED });
    expect(line.userId).toBe('u1');
  });
});
