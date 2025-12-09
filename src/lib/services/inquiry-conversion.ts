/**
 * Inquiry to Resident Conversion Service
 * 
 * Handles the conversion of inquiries to residents with proper data mapping
 * and validation.
 */

import { PrismaClient, ResidentStatus } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

/**
 * Validation schema for conversion data
 */
export const ConversionDataSchema = z.object({
  inquiryId: z.string().cuid(),
  convertedByUserId: z.string().cuid(),
  conversionNotes: z.string().optional(),
  
  // Resident-specific data (some may come from inquiry, others from form)
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().datetime().or(z.date()),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']),
  
  // Optional fields
  careNeeds: z.any().optional(), // JSON field
  medicalConditions: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  notes: z.string().optional(),
  
  // Move-in details
  moveInDate: z.string().datetime().or(z.date()).optional(),
});

export type ConversionData = z.infer<typeof ConversionDataSchema>;

export interface ConversionResult {
  success: boolean;
  residentId?: string;
  inquiryId: string;
  error?: string;
  validationErrors?: Record<string, string[]>;
}

/**
 * Convert an inquiry to a resident
 */
export async function convertInquiryToResident(
  data: ConversionData
): Promise<ConversionResult> {
  try {
    // Validate input data
    const validated = ConversionDataSchema.parse(data);

    // Fetch the inquiry
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: validated.inquiryId },
      include: {
        family: {
          include: {
            user: true,
          },
        },
        home: true,
      },
    });

    if (!inquiry) {
      return {
        success: false,
        inquiryId: validated.inquiryId,
        error: 'Inquiry not found',
      };
    }

    // Check if already converted
    if (inquiry.convertedToResidentId) {
      return {
        success: false,
        inquiryId: validated.inquiryId,
        error: 'Inquiry has already been converted to a resident',
      };
    }

    // Check if inquiry status allows conversion
    const allowedStatuses = ['QUALIFIED', 'CONVERTING', 'TOUR_COMPLETED', 'PLACEMENT_OFFERED'];
    if (!allowedStatuses.includes(inquiry.status)) {
      return {
        success: false,
        inquiryId: validated.inquiryId,
        error: `Inquiry must be in QUALIFIED, CONVERTING, TOUR_COMPLETED, or PLACEMENT_OFFERED status to convert. Current status: ${inquiry.status}`,
      };
    }

    // Perform conversion in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create resident record
      const resident = await tx.resident.create({
        data: {
          familyId: inquiry.familyId,
          homeId: inquiry.homeId,
          firstName: validated.firstName,
          lastName: validated.lastName,
          dateOfBirth: new Date(validated.dateOfBirth),
          gender: validated.gender,
          status: ResidentStatus.PENDING, // Start as PENDING, admin will activate
          careNeeds: validated.careNeeds || null,
          medicalConditions: validated.medicalConditions || null,
          medications: validated.medications || null,
          allergies: validated.allergies || null,
          dietaryRestrictions: validated.dietaryRestrictions || null,
          notes: validated.notes || null,
          admissionDate: validated.moveInDate ? new Date(validated.moveInDate) : null,
        },
      });

      // Create primary family contact from inquiry family
      if (inquiry.family.user) {
        await tx.familyContact.create({
          data: {
            residentId: resident.id,
            name: `${inquiry.family.user.firstName} ${inquiry.family.user.lastName}`,
            relationship: 'Primary Contact',
            phone: inquiry.family.user.phone || inquiry.family.phone || null,
            email: inquiry.family.user.email,
            isPrimaryContact: true,
            permissionLevel: 'FULL_ACCESS',
            contactPreference: 'EMAIL',
          },
        });
      }

      // Update inquiry with conversion data
      await tx.inquiry.update({
        where: { id: validated.inquiryId },
        data: {
          status: 'CONVERTED',
          convertedToResidentId: resident.id,
          convertedByUserId: validated.convertedByUserId,
          conversionDate: new Date(),
          conversionNotes: validated.conversionNotes || null,
        },
      });

      // Update resident status to INQUIRY initially
      await tx.resident.update({
        where: { id: resident.id },
        data: {
          status: ResidentStatus.INQUIRY,
        },
      });

      return resident;
    });

    return {
      success: true,
      residentId: result.id,
      inquiryId: validated.inquiryId,
    };
  } catch (error) {
    console.error('Conversion error:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        inquiryId: data.inquiryId,
        error: 'Validation failed',
        validationErrors: error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    return {
      success: false,
      inquiryId: data.inquiryId,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get inquiry details for conversion preview
 */
export async function getInquiryForConversion(inquiryId: string) {
  return await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    include: {
      family: {
        include: {
          user: true,
        },
      },
      home: {
        include: {
          address: true,
        },
      },
      convertedBy: true,
      convertedResident: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Check if an inquiry can be converted
 */
export async function canConvertInquiry(inquiryId: string): Promise<{
  canConvert: boolean;
  reason?: string;
}> {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
  });

  if (!inquiry) {
    return { canConvert: false, reason: 'Inquiry not found' };
  }

  if (inquiry.convertedToResidentId) {
    return { canConvert: false, reason: 'Already converted to resident' };
  }

  const allowedStatuses = ['QUALIFIED', 'CONVERTING', 'TOUR_COMPLETED', 'PLACEMENT_OFFERED'];
  if (!allowedStatuses.includes(inquiry.status)) {
    return {
      canConvert: false,
      reason: `Status must be QUALIFIED, CONVERTING, TOUR_COMPLETED, or PLACEMENT_OFFERED. Current: ${inquiry.status}`,
    };
  }

  return { canConvert: true };
}

/**
 * Get conversion statistics for pipeline dashboard
 */
export async function getConversionStats(operatorId?: string) {
  const whereClause = operatorId
    ? {
        home: {
          operatorId: operatorId,
        },
      }
    : {};

  const [
    totalInquiries,
    statusCounts,
    conversionRate,
    avgConversionTime,
  ] = await Promise.all([
    // Total inquiries
    prisma.inquiry.count({ where: whereClause }),

    // Count by status
    prisma.inquiry.groupBy({
      by: ['status'],
      where: whereClause,
      _count: true,
    }),

    // Conversion rate
    prisma.inquiry.aggregate({
      where: {
        ...whereClause,
        convertedToResidentId: { not: null },
      },
      _count: true,
    }),

    // Average conversion time (days from creation to conversion)
    prisma.inquiry.aggregate({
      where: {
        ...whereClause,
        conversionDate: { not: null },
      },
      _avg: {
        conversionDate: true,
      },
    }),
  ]);

  const statusMap: Record<string, number> = {};
  statusCounts.forEach((item: any) => {
    statusMap[item.status] = item._count;
  });

  const conversionRatePercent =
    totalInquiries > 0
      ? (conversionRate._count / totalInquiries) * 100
      : 0;

  return {
    total: totalInquiries,
    byStatus: statusMap,
    converted: conversionRate._count,
    conversionRate: Math.round(conversionRatePercent * 10) / 10,
    avgConversionTime: avgConversionTime._avg,
  };
}
