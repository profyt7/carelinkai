/**
 * Inquiry Status Update API Endpoint
 * PATCH /api/operator/inquiries/[id]/status
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, requireAuth, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction, InquiryStatus } from '@prisma/client';
import { z } from 'zod';

const StatusUpdateSchema = z.object({
  status: z.nativeEnum(InquiryStatus),
  notes: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Check permission to update inquiries
    await requirePermission(PERMISSIONS.INQUIRIES_UPDATE);

    // Parse request body
    const body = await request.json();
    const { status, notes } = StatusUpdateSchema.parse(body);

    // Get existing inquiry to check if it exists
    const existingInquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        convertedToResidentId: true,
      },
    });

    if (!existingInquiry) {
      return NextResponse.json(
        { error: 'Inquiry not found' },
        { status: 404 }
      );
    }

    // Prevent status change if already converted
    if (existingInquiry.convertedToResidentId && status !== 'CONVERTED') {
      return NextResponse.json(
        { error: 'Cannot change status of a converted inquiry' },
        { status: 400 }
      );
    }

    // Update inquiry status
    const updatedInquiry = await prisma.inquiry.update({
      where: { id: params.id },
      data: {
        status,
        internalNotes: notes
          ? `${existingInquiry.status} → ${status}\n${notes}`
          : undefined,
      },
      include: {
        family: {
          include: {
            user: true,
          },
        },
        home: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.UPDATE,
      'Inquiry',
      params.id,
      `Updated inquiry status from ${existingInquiry.status} to ${status}`,
      {
        oldStatus: existingInquiry.status,
        newStatus: status,
        notes,
      }
    );

    return NextResponse.json({
      success: true,
      inquiry: updatedInquiry,
      message: `Status updated to ${status}`,
    });
  } catch (error) {
    console.error('Status update error:', error);

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
