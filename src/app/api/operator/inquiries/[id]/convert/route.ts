/**
 * Inquiry to Resident Conversion API Endpoint
 * POST /api/operator/inquiries/[id]/convert
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireAuth, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import {
  convertInquiryToResident,
  getInquiryForConversion,
  canConvertInquiry,
  ConversionDataSchema,
} from '@/lib/services/inquiry-conversion';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { z } from 'zod';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Check permission to convert inquiries
    await requirePermission(PERMISSIONS.INQUIRIES_CONVERT, user.id);

    // Parse request body
    const body = await request.json();

    // Validate conversion data
    const conversionData = ConversionDataSchema.parse({
      inquiryId: params.id,
      convertedByUserId: user.id,
      ...body,
    });

    // Check if inquiry can be converted
    const { canConvert, reason } = await canConvertInquiry(params.id);
    if (!canConvert) {
      return NextResponse.json(
        { error: reason || 'Cannot convert this inquiry' },
        { status: 400 }
      );
    }

    // Perform conversion
    const result = await convertInquiryToResident(conversionData);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          validationErrors: result.validationErrors,
        },
        { status: 400 }
      );
    }

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.CREATE,
      'Resident',
      result.residentId!,
      `Converted inquiry ${params.id} to resident ${result.residentId}`,
      {
        inquiryId: params.id,
        residentId: result.residentId,
        conversionNotes: conversionData.conversionNotes,
      }
    );

    // Return success response
    return NextResponse.json({
      success: true,
      residentId: result.residentId,
      inquiryId: result.inquiryId,
      message: 'Inquiry successfully converted to resident',
    });
  } catch (error) {
    console.error('Conversion API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          validationErrors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    return handleAuthError(error);
  }
}

/**
 * GET /api/operator/inquiries/[id]/convert
 * Get inquiry details for conversion preview
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Check permission to view inquiries
    await requirePermission(PERMISSIONS.INQUIRIES_VIEW, user.id);

    // Get inquiry details
    const inquiry = await getInquiryForConversion(params.id);

    if (!inquiry) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404 }
      );
    }

    // Check if inquiry can be converted
    const { canConvert, reason } = await canConvertInquiry(params.id);

    return NextResponse.json({
      inquiry,
      canConvert,
      reason,
    });
  } catch (error) {
    console.error('Get conversion preview error:', error);
    return handleAuthError(error);
  }
}
