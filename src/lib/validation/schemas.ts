/**
 * Comprehensive Zod Validation Schemas
 * Centralized validation rules for all forms and API inputs
 */

import { z } from 'zod';
import { UserRole, LeadTargetType, LeadStatus } from '@prisma/client';

// ============================================================================
// Common Validators
// ============================================================================

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long')
  .trim();

export const urlSchema = z
  .string()
  .url('Invalid URL')
  .optional()
  .or(z.literal(''));

export const zipCodeSchema = z
  .string()
  .regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code')
  .optional();

// ============================================================================
// Authentication Schemas
// ============================================================================

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.nativeEnum(UserRole),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const newPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
  token: z.string().min(1, 'Token is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// Profile Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema,
  bio: z.string().max(2000, 'Bio is too long').optional(),
  address: z.string().max(200, 'Address is too long').optional(),
  city: z.string().max(100, 'City name is too long').optional(),
  state: z.string().max(2, 'State must be 2 characters').optional(),
  zipCode: zipCodeSchema,
  photoUrl: urlSchema,
});

// ============================================================================
// Family Schemas
// ============================================================================

export const familyProfileSchema = z.object({
  primaryContactName: nameSchema,
  phone: phoneSchema,
  relationshipToRecipient: z.string().max(50, 'Relationship is too long').optional(),
  recipientAge: z.coerce
    .number()
    .int('Age must be a whole number')
    .min(0, 'Age cannot be negative')
    .max(150, 'Age is too high')
    .optional(),
  primaryDiagnosis: z.string().max(200, 'Diagnosis is too long').optional(),
  mobilityLevel: z.string().max(50, 'Mobility level is too long').optional(),
  careNotes: z.string().max(2000, 'Care notes are too long').optional(),
});

// ============================================================================
// Caregiver Schemas
// ============================================================================

export const caregiverProfileSchema = z.object({
  bio: z.string().max(2000, 'Bio is too long').optional(),
  yearsExperience: z.coerce
    .number()
    .int('Years must be a whole number')
    .min(0, 'Years cannot be negative')
    .max(70, 'Years of experience is too high')
    .optional(),
  hourlyRate: z.coerce
    .number()
    .min(0, 'Rate cannot be negative')
    .max(500, 'Rate is too high')
    .optional(),
  specialties: z.array(z.string()).optional(),
  settings: z.array(z.string()).optional(),
  careTypes: z.array(z.string()).optional(),
  isVisibleInMarketplace: z.boolean().optional(),
});

export const credentialSchema = z.object({
  type: z.string().min(1, 'Type is required').max(100, 'Type is too long'),
  name: z.string().min(1, 'Name is required').max(200, 'Name is too long'),
  number: z.string().max(100, 'Number is too long').optional(),
  issuingOrganization: z.string().max(200, 'Organization name is too long').optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  fileUrl: urlSchema,
});

export const updateCredentialSchema = credentialSchema.partial();

// ============================================================================
// Provider Schemas
// ============================================================================

export const providerProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(200, 'Business name is too long'),
  bio: z.string().max(2000, 'Bio is too long').optional(),
  serviceTypes: z.array(z.string()).optional(),
  coverageArea: z.array(z.string()).optional(),
  phone: phoneSchema,
  website: urlSchema,
  isVisibleInMarketplace: z.boolean().optional(),
});

// ============================================================================
// Lead Schemas
// ============================================================================

export const createLeadSchema = z.object({
  targetType: z.nativeEnum(LeadTargetType),
  targetId: z.string().min(1, 'Target ID is required'),
  careRecipientAge: z.coerce
    .number()
    .int('Age must be a whole number')
    .min(0, 'Age cannot be negative')
    .max(150, 'Age is too high')
    .optional(),
  primaryDiagnosis: z.string().max(200, 'Diagnosis is too long').optional(),
  mobilityLevel: z.string().max(50, 'Mobility level is too long').optional(),
  startDate: z.string().optional(),
  hoursPerWeek: z.coerce
    .number()
    .int('Hours must be a whole number')
    .min(1, 'Hours must be at least 1')
    .max(168, 'Hours cannot exceed 168 per week')
    .optional(),
  budget: z.coerce
    .number()
    .min(0, 'Budget cannot be negative')
    .max(100000, 'Budget is too high')
    .optional(),
  additionalNotes: z.string().max(2000, 'Notes are too long').optional(),
});

export const updateLeadSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  operatorNotes: z.string().max(5000, 'Notes are too long').optional(),
  assignedOperatorId: z.string().optional(),
});

// ============================================================================
// Message Schemas
// ============================================================================

export const sendMessageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  content: z.string().min(1, 'Message cannot be empty').max(5000, 'Message is too long'),
  attachments: z.array(z.object({
    url: z.string().url('Invalid attachment URL'),
    name: z.string().max(200, 'Filename is too long'),
    type: z.string().max(100, 'File type is too long'),
    size: z.number().max(10 * 1024 * 1024, 'File is too large (max 10MB)'),
  })).optional(),
});

// ============================================================================
// Search & Filter Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const marketplaceSearchSchema = paginationSchema.extend({
  q: z.string().max(200, 'Search query is too long').optional(),
  city: z.string().max(100, 'City name is too long').optional(),
  state: z.string().max(2, 'State must be 2 characters').optional(),
  radius: z.coerce.number().min(1).max(500).optional(),
  minRate: z.coerce.number().min(0).optional(),
  maxRate: z.coerce.number().min(0).optional(),
  minExperience: z.coerce.number().min(0).optional(),
  specialties: z.array(z.string()).optional(),
});

// ============================================================================
// File Upload Schemas
// ============================================================================

export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename is too long'),
  contentType: z.string().refine(
    (type) => {
      const allowed = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/pdf',
      ];
      return allowed.includes(type);
    },
    'Invalid file type. Allowed: JPG, PNG, WEBP, PDF'
  ),
  size: z.number().max(10 * 1024 * 1024, 'File is too large (max 10MB)'),
});

// ============================================================================
// Admin Schemas
// ============================================================================

export const verifyCredentialSchema = z.object({
  isVerified: z.boolean(),
  notes: z.string().max(1000, 'Notes are too long').optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});
