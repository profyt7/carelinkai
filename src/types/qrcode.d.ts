/**
 * Custom type declarations for qrcode
 * This file provides TypeScript type definitions for the qrcode module
 */

declare module 'qrcode' {
  /**
   * QR Code generation options
   */
  export interface QRCodeToDataURLOptions {
    type?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  export interface QRCodeToStringOptions {
    type?: 'svg' | 'terminal' | 'utf8';
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  export interface QRCodeToFileOptions {
    type?: 'png' | 'svg';
    quality?: number;
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  /**
   * Generate QR code as data URL
   */
  export function toDataURL(
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options?: QRCodeToDataURLOptions
  ): Promise<string>;

  export function toDataURL(
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    callback: (error: Error | null, url: string) => void
  ): void;

  export function toDataURL(
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options: QRCodeToDataURLOptions,
    callback: (error: Error | null, url: string) => void
  ): void;

  /**
   * Generate QR code as string
   */
  export function toString(
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options?: QRCodeToStringOptions
  ): Promise<string>;

  export function toString(
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    callback: (error: Error | null, string: string) => void
  ): void;

  export function toString(
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options: QRCodeToStringOptions,
    callback: (error: Error | null, string: string) => void
  ): void;

  /**
   * Generate QR code to file
   */
  export function toFile(
    path: string,
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options?: QRCodeToFileOptions
  ): Promise<void>;

  export function toFile(
    path: string,
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    callback: (error: Error | null) => void
  ): void;

  export function toFile(
    path: string,
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options: QRCodeToFileOptions,
    callback: (error: Error | null) => void
  ): void;

  /**
   * Generate QR code to canvas
   */
  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options?: QRCodeToDataURLOptions
  ): Promise<void>;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    callback: (error: Error | null) => void
  ): void;

  export function toCanvas(
    canvas: HTMLCanvasElement,
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options: QRCodeToDataURLOptions,
    callback: (error: Error | null) => void
  ): void;

  /**
   * Create QR code and return as buffer
   */
  export function toBuffer(
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options?: QRCodeToFileOptions
  ): Promise<Buffer>;

  export function toBuffer(
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    callback: (error: Error | null, buffer: Buffer) => void
  ): void;

  export function toBuffer(
    text: string | Array<{ data: string | Buffer; mode?: string }>,
    options: QRCodeToFileOptions,
    callback: (error: Error | null, buffer: Buffer) => void
  ): void;
}
