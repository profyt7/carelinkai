
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { afterInquiryCreated } from '@/lib/hooks/inquiry-hooks';
import { smsService } from '@/lib/sms/sms-service';
import { createInquirySchema } from '@/lib/inquiries/schema';
import { recordLeadConsent } from '@/lib/consent/lead-consent';
import { LEAD_CONSENT_FORMS } from '@/lib/consent/lead-consent-text';
import { isPayerSource } from '@/lib/payer/payer-source';
import { notifyUnclaimedHomeInquiry, isUnclaimedHome } from '@/lib/claim-engine/inquiry-claim-notification';
import { sendNewLeadOperatorEmail } from '@/lib/email';
import { coordinateConciergeInquiry } from '@/lib/concierge/tour-coordination';

/**
 * POST /api/inquiries - Create a new inquiry
 * Supports both authenticated (family) and unauthenticated (public form) submissions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    
    // Validate request body
    const validationResult = createInquirySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Use authenticated user's family ID if available, otherwise use provided familyId
    const familyRecord = session?.user?.id
      ? await prisma.family.findUnique({
          where: { userId: session.user.id },
          select: { id: true, referredByCode: true },
        })
      : null;
    // Anonymous public submissions are allowed: when no family is resolved the
    // inquiry is captured against its on-row contact fields (contactName/
    // contactEmail are required by the schema) with familyId = null. An operator
    // can link it to a real family later.
    const familyId = familyRecord?.id ?? data.familyId ?? null;

    // Fall back to the family's stored referral code if none passed explicitly
    const resolvedAffiliateCode =
      data.affiliateCode || familyRecord?.referredByCode || null;

    // Create the inquiry
    const inquiry = await prisma.inquiry.create({
      data: {
        familyId,
        homeId: data.homeId,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        careRecipientName: data.careRecipientName,
        careRecipientAge: data.careRecipientAge,
        careNeeds: data.careNeeds,
        additionalInfo: data.additionalInfo,
        message: data.message,
        urgency: data.urgency,
        source: data.source,
        preferredContactMethod: data.preferredContactMethod,
        affiliateCode: resolvedAffiliateCode,
        // Payer-source tag (OL-114) — optional; invalid/blank normalizes to null.
        // TAGS ONLY: nothing downstream may gate on this.
        payerSource: isPayerSource(data.payerSource) ? data.payerSource : null,
        status: 'NEW',
      },
      include: {
        family: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        home: {
          select: {
            id: true,
            name: true,
            operator: {
              select: {
                id: true,
                companyName: true,
                user: { select: { firstName: true, phone: true, email: true } },
              },
            },
          },
        },
      },
    });
    
    // Immutable TCPA/marketing consent evidence — recorded for BOTH consent
    // states; never blocks the inquiry (recorder swallows its own errors).
    await recordLeadConsent({
      consent: data.consent,
      sourceForm: LEAD_CONSENT_FORMS.HOME_INQUIRY,
      req: request,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone ?? null,
      inquiryId: inquiry.id,
    });

    // Trigger follow-up scheduling hook (non-blocking)
    afterInquiryCreated(inquiry.id).catch(err => {
      console.error('Failed to schedule follow-ups:', err);
    });

    // SMS alert to operator (non-blocking) — claimed homes only (the directory
    // sentinel operator on unclaimed homes has no phone, so this no-ops there).
    const operatorPhone = inquiry.home?.operator?.user?.phone;
    if (operatorPhone) {
      smsService.sendNewInquiryAlert(
        operatorPhone,
        inquiry.home.operator!.user!.firstName,
        inquiry.contactName ?? '',
        inquiry.careRecipientName || 'your loved one',
        inquiry.home.name
      ).catch(() => {});
    }

    // Email backup of the operator alert — CLAIMED homes only (never the directory
    // sentinel). SMS can be missing/wrong/undeliverable; email is the reliable
    // channel. Generic copy only — no PHI.
    const operatorEmail = inquiry.home?.operator?.user?.email;
    if (operatorEmail && !isUnclaimedHome(operatorEmail)) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://getcarelinkai.com';
      sendNewLeadOperatorEmail({
        facilityName: inquiry.home.name,
        toEmail: operatorEmail,
        operatorFirstName: inquiry.home.operator?.user?.firstName,
        leadType: 'inquiry',
        ctaUrl: `${appUrl.replace(/\/$/, '')}/operator/inquiries`,
      }).catch(() => {});
    }

    // Inquiry→claim "pull" engine (OL-083): if the home is UNCLAIMED, best-effort
    // nudge the operator to claim (generic copy only — no PHI). Self-filters to
    // unclaimed homes with a known outreach email; non-blocking.
    notifyUnclaimedHomeInquiry({ homeId: inquiry.homeId, inquiryId: inquiry.id }).catch(() => {});

    // Concierge-aware (Option 3): if this inquiry came from a DP's concierge
    // shortlist (the "View listing" deep link carries ?concierge=<searchId>),
    // loop in the care team to coordinate + mark the shortlist so the DP sees a
    // status — so a generic-page inquiry never black-holes either. Operator email
    // / claim drip already fired above; this only adds the admin notify + status.
    const conciergeSearchId = typeof body?.conciergeSearchId === 'string' ? body.conciergeSearchId.trim() : '';
    if (conciergeSearchId && session?.user?.id) {
      coordinateConciergeInquiry({
        searchId: conciergeSearchId,
        homeId: inquiry.homeId,
        requesterUserId: session.user.id,
        facilityName: inquiry.home?.name ?? 'a facility',
        claimed: !!(operatorEmail && !isUnclaimedHome(operatorEmail)),
      }).catch(() => {});
    }

    return NextResponse.json(
      { success: true, inquiry },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating inquiry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create inquiry',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/inquiries - List inquiries with filtering
 * Requires authentication
 * Role-based access:
 * - FAMILY: Only their own inquiries
 * - OPERATOR: Inquiries for their homes
 * - ADMIN: All inquiries
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    
    // Extract filter parameters
    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const source = searchParams.get('source');
    const assignedTo = searchParams.get('assignedTo');
    const homeId = searchParams.get('homeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Build where clause based on role
    const where: any = {};
    
    // Role-based filtering
    if (session.user.role === 'FAMILY') {
      // Families can only see their own inquiries
      const family = await prisma.family.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      
      if (!family) {
        return NextResponse.json(
          { success: false, error: 'Family profile not found' },
          { status: 404 }
        );
      }
      
      where.familyId = family.id;
    } else if (session.user.role === 'OPERATOR') {
      // Operators can see inquiries for their homes
      const operator = await prisma.operator.findUnique({
        where: { userId: session.user.id },
        include: { homes: { select: { id: true } } },
      });
      
      if (!operator) {
        return NextResponse.json(
          { success: false, error: 'Operator profile not found' },
          { status: 404 }
        );
      }
      
      where.homeId = { in: operator.homes.map(h => h.id) };
    }
    // ADMIN can see all inquiries (no additional filter)
    
    // Apply query parameter filters
    if (status) where.status = status;
    if (urgency) where.urgency = urgency;
    if (source) where.source = source;
    if (assignedTo) where.assignedToId = assignedTo;
    if (homeId) where.homeId = homeId;
    
    // Fetch inquiries with pagination
    const [inquiries, totalCount] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          family: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          home: {
            select: {
              id: true,
              name: true,
              operator: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          responses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              type: true,
              channel: true,
              status: true,
              sentAt: true,
              createdAt: true,
            },
          },
          followUps: {
            where: { status: 'PENDING' },
            orderBy: { scheduledFor: 'asc' },
            take: 1,
            select: {
              id: true,
              type: true,
              scheduledFor: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inquiry.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      inquiries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch inquiries',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
