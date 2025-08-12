/**
 * Utility Functions for CareLinkAI
 * 
 * This file contains common utility functions used throughout the application.
 * Functions include formatting helpers, data transformation utilities,
 * validation functions, and other shared helpers.
 */

/**
 * Format a number as currency
 * 
 * @param value - The number to format as currency
 * @param currency - The currency code (default: USD)
 * @param locale - The locale to use (default: en-US)
 * @returns Formatted currency string
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency = 'USD',
  locale = 'en-US'
): string {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return '$0.00';
  }
  
  // Convert string to number if needed
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Handle NaN
  if (isNaN(numValue)) {
    return '$0.00';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue);
}

/**
 * Format a date with flexible options
 * 
 * @param date - The date to format
 * @param format - The format to use ('short', 'medium', 'long', 'full', or custom)
 * @param locale - The locale to use (default: en-US)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number | null | undefined,
  format: 'short' | 'medium' | 'long' | 'full' | 'time' | 'datetime' | 'relative' = 'medium',
  locale = 'en-US'
): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  // Check for invalid date
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '';
  }

  // Handle relative time format
  if (format === 'relative') {
    return formatRelativeTime(dateObj);
  }
  
  // Format based on requested style
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString(locale, { 
        month: 'numeric', 
        day: 'numeric', 
        year: '2-digit' 
      });
    case 'medium':
      return dateObj.toLocaleDateString(locale, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'long':
      return dateObj.toLocaleDateString(locale, { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'full':
      return dateObj.toLocaleDateString(locale, { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    case 'time':
      return dateObj.toLocaleTimeString(locale, { 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    case 'datetime':
      return `${dateObj.toLocaleDateString(locale)} ${dateObj.toLocaleTimeString(locale, { 
        hour: 'numeric', 
        minute: '2-digit' 
      })}`;
    default:
      return dateObj.toLocaleDateString(locale);
  }
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 * 
 * @param date - The date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffSecs < 60) {
    return diffSecs <= 5 ? 'just now' : `${diffSecs} seconds ago`;
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  } else {
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  }
}

/**
 * Truncate text to a specified length with ellipsis
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - String to append when truncated (default: "...")
 * @returns Truncated text
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
  ellipsis = '...'
): string {
  if (!text) return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.slice(0, maxLength) + ellipsis;
}

/**
 * Capitalize the first letter of each word in a string
 * 
 * @param text - The text to capitalize
 * @returns Capitalized text
 */
export function capitalizeWords(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Generate a slug from a string (for URLs)
 * 
 * @param text - The text to convert to a slug
 * @returns URL-friendly slug
 */
export function slugify(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/--+/g, '-')     // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Generate initials from a name
 * 
 * @param name - Full name
 * @param maxInitials - Maximum number of initials to return (default: 2)
 * @returns Initials (e.g., "JD" for "John Doe")
 */
export function getInitials(
  name: string | null | undefined,
  maxInitials = 2
): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .filter(initial => initial.match(/[A-Z]/))
    .slice(0, maxInitials)
    .join('');
}

/**
 * Format a phone number to a standard format
 * 
 * @param phone - The phone number to format
 * @param format - The format to use (default: "(XXX) XXX-XXXX")
 * @returns Formatted phone number
 */
export function formatPhoneNumber(
  phone: string | null | undefined,
  format = '(XXX) XXX-XXXX'
): string {
  if (!phone) return '';
  
  // Strip all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if we have a valid 10-digit number
  if (cleaned.length !== 10) {
    return phone; // Return original if not valid
  }
  
  // Format based on the requested format
  if (format === '(XXX) XXX-XXXX') {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  } else if (format === 'XXX-XXX-XXXX') {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  } else {
    return phone; // Return original for unsupported formats
  }
}

/**
 * Format a number with commas
 * 
 * @param value - The number to format
 * @param decimalPlaces - Number of decimal places (default: 0)
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimalPlaces = 0
): string {
  if (value === null || value === undefined) {
    return '0';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }
  
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  });
}

/**
 * Validate an email address
 * 
 * @param email - The email to validate
 * @returns Whether the email is valid
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate a password meets minimum requirements
 * 
 * @param password - The password to validate
 * @param minLength - Minimum length (default: 8)
 * @param requireSpecialChar - Whether to require a special character (default: true)
 * @returns Whether the password meets requirements
 */
export function isValidPassword(
  password: string | null | undefined,
  minLength = 8,
  requireSpecialChar = true
): boolean {
  if (!password) return false;
  
  // Check length
  if (password.length < minLength) return false;
  
  // Check for uppercase, lowercase, and number
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  // Check for special character if required
  const hasSpecialChar = requireSpecialChar ? /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) : true;
  
  return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

/**
 * Generate a random string (useful for IDs, keys, etc.)
 * 
 * @param length - The length of the string to generate (default: 10)
 * @param includeSpecialChars - Whether to include special characters (default: false)
 * @returns Random string
 */
export function generateRandomString(length = 10, includeSpecialChars = false): string {
  const charset = includeSpecialChars
    ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-='
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  let result = '';
  const charsetLength = charset.length;
  
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charsetLength));
  }
  
  return result;
}

/**
 * Deep clone an object
 * 
 * @param obj - The object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Debounce a function
 * 
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return function(...args: Parameters<T>): void {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Calculate age from date of birth
 * 
 * @param dob - Date of birth
 * @returns Age in years
 */
export function calculateAge(dob: Date | string | null | undefined): number {
  if (!dob) return 0;
  
  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  
  // Check for invalid date
  if (!(birthDate instanceof Date) || isNaN(birthDate.getTime())) {
    return 0;
  }
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  // Adjust age if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * 
 * @param value - The value to check
 * @returns Whether the value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Convert a string to title case
 * 
 * @param text - The text to convert
 * @returns Title case text
 */
export function toTitleCase(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format file size in human-readable format
 * 
 * @param bytes - File size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Get a color based on a string (useful for avatars, tags, etc.)
 * 
 * @param str - The string to generate a color from
 * @returns Hex color code
 */
export function stringToColor(str: string): string {
  let hash = 0;
  
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  let color = '#';
  
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
}

/**
 * Check if a date is in the past
 * 
 * @param date - The date to check
 * @returns Whether the date is in the past
 */
export function isPastDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  
  // Check for invalid date
  if (!(checkDate instanceof Date) || isNaN(checkDate.getTime())) {
    return false;
  }
  
  const now = new Date();
  return checkDate < now;
}

/**
 * Check if a date is in the future
 * 
 * @param date - The date to check
 * @returns Whether the date is in the future
 */
export function isFutureDate(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  
  // Check for invalid date
  if (!(checkDate instanceof Date) || isNaN(checkDate.getTime())) {
    return false;
  }
  
  const now = new Date();
  return checkDate > now;
}

/**
 * Check if a date is today
 * 
 * @param date - The date to check
 * @returns Whether the date is today
 */
export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  
  // Check for invalid date
  if (!(checkDate instanceof Date) || isNaN(checkDate.getTime())) {
    return false;
  }
  
  const now = new Date();
  return checkDate.getDate() === now.getDate() &&
    checkDate.getMonth() === now.getMonth() &&
    checkDate.getFullYear() === now.getFullYear();
}
