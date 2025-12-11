/**
 * Utility functions for resident data manipulation and calculations
 */

import { differenceInDays, differenceInYears, format } from 'date-fns';

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth as Date object or string
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Extract floor number from room number
 * Assumes room numbers like 101, 102, 201, 202, etc.
 * @param roomNumber - Room number as string
 * @returns Floor number
 */
export function getRoomFloor(roomNumber: string): number {
  const roomNum = parseInt(roomNumber);
  if (isNaN(roomNum)) return 0;
  return Math.floor(roomNum / 100);
}

/**
 * Calculate days since admission
 * @param admissionDate - Admission date as Date object or string
 * @returns Number of days since admission
 */
export function getDaysSinceAdmission(admissionDate: Date | string): number {
  return differenceInDays(new Date(), new Date(admissionDate));
}

/**
 * Format date in a user-friendly way
 * @param date - Date to format
 * @param formatStr - Format string (default: 'MMM d, yyyy')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  return format(new Date(date), formatStr);
}

/**
 * Check if date is within a certain number of days
 * @param date - Date to check
 * @param days - Number of days to check within
 * @returns True if date is within the specified days
 */
export function isWithinDays(date: Date | string, days: number): boolean {
  const daysDiff = differenceInDays(new Date(), new Date(date));
  return Math.abs(daysDiff) <= days;
}

/**
 * Get age range category for a given age
 * @param age - Age in years
 * @returns Age range category
 */
export function getAgeRange(age: number): string {
  if (age < 60) return 'under-60';
  if (age < 70) return '60-70';
  if (age < 80) return '70-80';
  if (age < 90) return '80-90';
  return '90+';
}

/**
 * Filter age by range
 * @param age - Age in years
 * @param range - Range string (e.g., '60-70', '90+')
 * @returns True if age is within range
 */
export function isAgeInRange(age: number, range: string): boolean {
  if (range === 'all') return true;
  if (range === 'under-60') return age < 60;
  if (range === '90+') return age >= 90;
  
  const [min, max] = range.split('-').map(Number);
  return age >= min && age < max;
}

/**
 * Get admission date range category
 * @param admissionDate - Admission date
 * @returns Admission range category
 */
export function getAdmissionDateRange(admissionDate: Date | string): string {
  const days = getDaysSinceAdmission(admissionDate);
  
  if (days <= 30) return 'last30days';
  if (days <= 90) return 'last90days';
  if (days <= 365) return 'lastYear';
  return 'moreThanYear';
}

/**
 * Filter by admission date range
 * @param admissionDate - Admission date
 * @param range - Range string (e.g., 'last30days', 'last90days')
 * @returns True if admission date is within range
 */
export function isAdmissionInRange(admissionDate: Date | string, range: string): boolean {
  if (range === 'all') return true;
  
  const days = getDaysSinceAdmission(admissionDate);
  
  switch (range) {
    case 'last30days':
      return days <= 30;
    case 'last90days':
      return days <= 90;
    case 'lastYear':
      return days <= 365;
    default:
      return true;
  }
}

/**
 * Get resident initials from first and last name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Initials (e.g., "JD")
 */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Get full name from first and last name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Full name
 */
export function getFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}
