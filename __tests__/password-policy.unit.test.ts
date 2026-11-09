/**
 * One password rule everywhere: ≥ 12 characters, upper, lower, number, symbol
 * (symbol = any non-letter, non-number, non-space). Any printable character,
 * including non-ASCII, is allowed.
 *
 * The bug: register (client + server) and change-password ended in
 * /^...[A-Za-z\d@$!%*?&]{8,}$/, so "Correct-Horse_Battery9" failed with
 * "doesn't meet all requirements" while the checklist was all green.
 */
import fs from 'fs';
import path from 'path';
import {
  checkPassword, isPasswordValid, newPasswordSchema, passwordProblems, PASSWORD_MIN_LENGTH,
} from '@/lib/password-policy';

// The shape that failed: strong, but its symbols are outside @$!%*?&.
const REPORTED_SHAPE = ['Correct-Horse_Battery9', 'Tr0ub4dor^{2025}', 'Plaid=Kettle>9`x', 'Pounds£Sterling7', 'Brace{Yourself}8a'];

describe('checkPassword / isPasswordValid', () => {
  it.each(REPORTED_SHAPE)('accepts %s (symbols outside the old whitelist)', (pw) => {
    expect(passwordProblems(pw)).toEqual([]);
    expect(isPasswordValid(pw)).toBe(true);
    expect(newPasswordSchema.safeParse(pw).success).toBe(true);
  });

  it('accepts unicode letters and symbols', () => {
    for (const pw of ['Élodie-Ünïcode9x', 'Пароль-Надёжный7a', 'Café€Crème2024x', 'Spaces are fine 9A!', 'Emoji🔒Secure9ab']) {
      expect({ pw, ok: isPasswordValid(pw) }).toEqual({ pw, ok: true });
    }
  });

  it('still accepts the old whitelist symbols', () => {
    expect(isPasswordValid('Correct@Horse$9!')).toBe(true);
  });

  it('enforces each rule on its own', () => {
    expect(checkPassword('Short-Pw9a')).toMatchObject({ minLength: false });
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(checkPassword('Aa1-aaaaaaa').minLength).toBe(false); // 11 chars
    expect(checkPassword('Aa1-aaaaaaaa').minLength).toBe(true); // 12 chars
    expect(checkPassword('correct-horse-9').hasUppercase).toBe(false);
    expect(checkPassword('CORRECT-HORSE-9').hasLowercase).toBe(false);
    expect(checkPassword('Correct-Horse-x').hasNumber).toBe(false);
    expect(checkPassword('CorrectHorse99x').hasSymbol).toBe(false);
    expect(checkPassword('Correct Horse 9x').hasSymbol).toBe(false); // whitespace alone is not a symbol
  });

  it('counts characters, not UTF-16 units, toward the length', () => {
    expect(checkPassword('Aa1-🔒🔒🔒🔒🔒🔒🔒').minLength).toBe(false); // 11 characters, 18 UTF-16 units
  });

  it('refuses control characters and over-long passwords', () => {
    expect(isPasswordValid('Correct-Horse\t9x')).toBe(false);
    expect(isPasswordValid('Correct-Horse\n9x')).toBe(false);
    expect(isPasswordValid('Aa1-' + 'x'.repeat(125))).toBe(false); // 129 > 128
  });

  it('reports every failing rule with a readable message', () => {
    expect(passwordProblems('abc')).toEqual([
      'Password must be at least 12 characters',
      'Password must contain an uppercase letter',
      'Password must contain a number',
      'Password must contain a symbol (any character that is not a letter or number)',
    ]);
  });
});

describe('every password form uses the shared rule', () => {
  const ROOT = path.join(__dirname, '..');
  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? files(p) : /\.tsx?$/.test(e.name) ? [p] : [];
    });

  it('no symbol whitelist like [A-Za-z\\d@$!%*?&] remains anywhere in src/', () => {
    for (const f of files(path.join(ROOT, 'src'))) {
      const src = fs.readFileSync(f, 'utf8');
      expect({ f: path.relative(ROOT, f), whitelist: /@\$!%\*\?&/.test(src) }).toEqual({ f: path.relative(ROOT, f), whitelist: false });
    }
  });

  it.each([
    'src/app/auth/register/page.tsx',
    'src/app/api/auth/register/route.ts',
    'src/app/auth/reset-password/page.tsx',
    'src/app/api/auth/reset-password/route.ts',
    'src/app/settings/account/page.tsx',
    'src/app/api/profile/password/route.ts',
    'src/app/api/profile/change-password/route.ts',
    'src/lib/validation/schemas.ts',
  ])('%s imports @/lib/password-policy', (f) => {
    expect(fs.readFileSync(path.join(ROOT, f), 'utf8')).toMatch(/from ['"]@\/lib\/password-policy['"]/);
  });
});
