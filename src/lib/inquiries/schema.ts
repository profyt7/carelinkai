import { z } from 'zod';

/**
 * Canonical validation schema for POST /api/inquiries. Lives in a shared
 * module so the route handler and tests use a single source of truth.
 */
export const createInquirySchema = z.object({
  familyId: z.string().optional(),
  homeId: z.string(),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().optional(),
  // Optional: the inquiry form does not require a resident name, and the
  // underlying Inquiry.careRecipientName column is nullable. Keeping this
  // required caused 400s when families submitted without it.
  careRecipientName: z.string().min(1).optional(),
  careRecipientAge: z.number().int().positive().optional(),
  careNeeds: z.array(z.string()).optional().default([]),
  additionalInfo: z.string().optional(),
  message: z.string().optional(),
  urgency: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  source: z
    .enum(['WEBSITE', 'PHONE', 'EMAIL', 'REFERRAL', 'SOCIAL_MEDIA', 'WALK_IN', 'OTHER'])
    .optional()
    .default('WEBSITE'),
  preferredContactMethod: z.enum(['EMAIL', 'PHONE', 'SMS', 'ANY']).optional().default('EMAIL'),
  affiliateCode: z.string().optional(), // referral code from ?ref= URL param
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;
