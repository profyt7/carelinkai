/**
 * Custom type declarations for uuid
 * This file provides TypeScript type definitions for the uuid module
 */

declare module 'uuid' {
  /**
   * Generate a version 1 (timestamp) UUID
   */
  export function v1(options?: V1Options, buffer?: Buffer, offset?: number): string;

  /**
   * Generate a version 3 (namespace with MD5) UUID
   */
  export function v3(name: string | Buffer, namespace: string | Buffer, buffer?: Buffer, offset?: number): string;

  /**
   * Generate a version 4 (random) UUID
   */
  export function v4(options?: V4Options, buffer?: Buffer, offset?: number): string;

  /**
   * Generate a version 5 (namespace with SHA-1) UUID
   */
  export function v5(name: string | Buffer, namespace: string | Buffer, buffer?: Buffer, offset?: number): string;

  /**
   * Validate a UUID string
   */
  export function validate(uuid: string): boolean;

  /**
   * Get the version of a UUID
   */
  export function version(uuid: string): number;

  /**
   * Parse a UUID string
   */
  export function parse(uuid: string): Buffer;

  /**
   * Stringify a UUID buffer
   */
  export function stringify(buffer: Buffer, offset?: number): string;

  /**
   * Options for v1 UUID generation
   */
  export interface V1Options {
    node?: Buffer;
    clockseq?: number;
    msecs?: number;
    nsecs?: number;
  }

  /**
   * Options for v4 UUID generation
   */
  export interface V4Options {
    random?: Buffer;
    rng?: () => Buffer;
  }

  /**
   * Predefined namespace UUIDs
   */
  export const DNS: string;
  export const URL: string;
}
