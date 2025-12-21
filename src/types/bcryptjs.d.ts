/**
 * Custom type declarations for bcryptjs
 * This file provides TypeScript type definitions for the bcryptjs module
 */

declare module 'bcryptjs' {
  /**
   * Synchronously generates a hash for the given string.
   * @param s The string to hash.
   * @param salt The salt to use. If numeric, generates a salt with the specified number of rounds.
   */
  export function hashSync(s: string, salt: number | string): string;

  /**
   * Asynchronously generates a hash for the given string.
   * @param s The string to hash.
   * @param salt The salt to use. If numeric, generates a salt with the specified number of rounds.
   */
  export function hash(s: string, salt: number | string): Promise<string>;

  /**
   * Synchronously tests a string against a hash.
   * @param s The string to test.
   * @param hash The hash to test against.
   */
  export function compareSync(s: string, hash: string): boolean;

  /**
   * Asynchronously tests a string against a hash.
   * @param s The string to test.
   * @param hash The hash to test against.
   */
  export function compare(s: string, hash: string): Promise<boolean>;

  /**
   * Synchronously generates a salt.
   * @param rounds The number of rounds to use, defaults to 10.
   */
  export function genSaltSync(rounds?: number): string;

  /**
   * Asynchronously generates a salt.
   * @param rounds The number of rounds to use, defaults to 10.
   */
  export function genSalt(rounds?: number): Promise<string>;

  /**
   * Gets the number of rounds used to encrypt the specified hash.
   * @param hash The hash to extract the rounds from.
   */
  export function getRounds(hash: string): number;
}
