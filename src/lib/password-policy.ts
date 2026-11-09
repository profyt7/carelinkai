/**
 * One password rule for every place a password is set: register, reset, change
 * (client checklists and server validation all import this file — keep it free
 * of server-only imports).
 *
 * Rule: at least 12 characters, with an uppercase letter, a lowercase letter, a
 * number and a symbol. "Symbol" is any character that is not a letter, a number
 * or whitespace, so - ^ { } _ = > ` £ € and the like all count. Any printable
 * character is allowed, including non-ASCII letters; only control characters
 * are refused. Letters and digits are matched with Unicode classes, so "É"
 * counts as uppercase and "é" as lowercase.
 *
 * Before: several validators ended in a character whitelist (letters, digits and
 * seven symbols only), which rejected strong passwords containing any other
 * symbol while the checklist showed every requirement met.
 */
import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const UPPER = /\p{Lu}/u;
const LOWER = /\p{Ll}/u;
const NUMBER = /\p{Nd}/u;
const SYMBOL = /[^\p{L}\p{N}\s]/u;
const CONTROL = /\p{Cc}/u;

export type PasswordChecks = {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  /** No control characters (tab, newline, NUL, …) and not longer than the maximum. */
  allowedCharacters: boolean;
};

/** Length counts characters (code points), not UTF-16 units, so "£" or an emoji counts once. */
export function passwordLength(password: string): number {
  return Array.from(password ?? '').length;
}

export function checkPassword(password: string): PasswordChecks {
  const pw = password ?? '';
  const len = passwordLength(pw);
  return {
    minLength: len >= PASSWORD_MIN_LENGTH,
    hasUppercase: UPPER.test(pw),
    hasLowercase: LOWER.test(pw),
    hasNumber: NUMBER.test(pw),
    hasSymbol: SYMBOL.test(pw),
    allowedCharacters: !CONTROL.test(pw) && len <= PASSWORD_MAX_LENGTH,
  };
}

/** Checklist rows, in display order. Every form shows the same wording. */
export const PASSWORD_REQUIREMENTS: { key: keyof PasswordChecks; label: string }[] = [
  { key: 'minLength', label: `At least ${PASSWORD_MIN_LENGTH} characters` },
  { key: 'hasUppercase', label: 'An uppercase letter' },
  { key: 'hasLowercase', label: 'A lowercase letter' },
  { key: 'hasNumber', label: 'A number' },
  { key: 'hasSymbol', label: 'A symbol (anything that is not a letter or number, e.g. - _ ! ^ £)' },
];

export const PASSWORD_RULE_SUMMARY =
  `At least ${PASSWORD_MIN_LENGTH} characters, with an uppercase letter, a lowercase letter, a number and a symbol.`;

const MESSAGES: Record<keyof PasswordChecks, string> = {
  minLength: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  hasUppercase: 'Password must contain an uppercase letter',
  hasLowercase: 'Password must contain a lowercase letter',
  hasNumber: 'Password must contain a number',
  hasSymbol: 'Password must contain a symbol (any character that is not a letter or number)',
  allowedCharacters: `Password can't contain control characters or be longer than ${PASSWORD_MAX_LENGTH} characters`,
};

/** Human-readable problems, empty when the password is acceptable. */
export function passwordProblems(password: string): string[] {
  const c = checkPassword(password);
  return (Object.keys(MESSAGES) as (keyof PasswordChecks)[]).filter((k) => !c[k]).map((k) => MESSAGES[k]);
}

export function isPasswordValid(password: string): boolean {
  return passwordProblems(password).length === 0;
}

/** Zod schema for a NEW password (not for sign-in, which must accept any existing password). */
export const newPasswordSchema = z.string().superRefine((pw, ctx) => {
  for (const message of passwordProblems(pw)) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
});
