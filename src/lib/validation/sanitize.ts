/**
 * Input Sanitization Utilities
 * Protects against XSS and other injection attacks
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target'],
  });
}

/**
 * Sanitize plain text by removing all HTML
 */
export function sanitizePlainText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize user input for database storage
 * Strips HTML and trims whitespace
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return input;
  
  // Remove HTML tags
  const cleaned = sanitizePlainText(input);
  
  // Trim and normalize whitespace
  return cleaned.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize rich text content (for bio, notes, etc.)
 * Allows limited HTML formatting
 */
export function sanitizeRichText(input: string): string {
  if (!input) return input;
  
  return sanitizeHtml(input).trim();
}

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string): string {
  if (!url) return url;
  
  const trimmed = url.trim();
  
  // Block dangerous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return '';
  }
  
  return trimmed;
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return filename;
  
  // Remove path separators and special characters
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 255);
}

/**
 * Sanitize object by applying sanitization to all string fields
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    richTextFields?: string[];
    urlFields?: string[];
  } = {}
): T {
  const sanitized: Record<string, any> = { ...obj };
  
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      if (options.richTextFields?.includes(key)) {
        sanitized[key] = sanitizeRichText(value);
      } else if (options.urlFields?.includes(key)) {
        sanitized[key] = sanitizeUrl(value);
      } else {
        sanitized[key] = sanitizeUserInput(value);
      }
    }
  }
  
  return sanitized as T;
}
