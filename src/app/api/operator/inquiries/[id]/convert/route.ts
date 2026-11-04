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
import { captureError, isExpectedAuthError } from '@/lib/sentry';
import { prisma } from '@/lib/prisma';

/**
 * P0-1: the caller must own the inquiry's home (ADMIN excepted). Before this, any role holding
 * inquiries.view / inquiries.convert (operators, families, staff, providers, discharge planners) could read
 * — and convert, creating a resident and a placement fee — any tenant's inquiry by id.
 */
async function denyUnlessInquiryTenant(user: { id: string; role: string }, inquiryId: string): Promise<NextResponse | null> {
  // Non-operators (FAMILY, STAFF, PROVIDER, DISCHARGE_PLANNER, …) are refused before any lookup.
  const operator = user.role === 'ADMIN' ? null : await prisma.operator.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (user.role !== 'ADMIN' && !operator) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId }, select: { home: { select: { operatorId: true } } } });
  if (!inquiry) return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
  if (user.role !== 'ADMIN' && inquiry.home?.operatorId !== operator!.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Check permission to convert inquiries
    await requirePermission(PERMISSIONS.INQUIRIES_CONVERT);
    const denied = await denyUnlessInquiryTenant(user, params.id);
    if (denied) return denied;

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
    if (isExpectedAuthError(error)) {
      return handleAuthError(error); // 401/403: a response, not a Sentry error
    }
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'operator:inquiries:{id}:convert' },
    });
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
    await requirePermission(PERMISSIONS.INQUIRIES_VIEW);
    const denied = await denyUnlessInquiryTenant(user, params.id);
    if (denied) return denied;

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
    if (isExpectedAuthError(error)) {
      return handleAuthError(error); // 401/403: a response, not a Sentry error
    }
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'operator:inquiries:{id}:convert' },
    });
    console.error('Get conversion preview error:', error);
    return handleAuthError(error);
  }
}
