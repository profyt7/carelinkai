
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import EmailService from '@/lib/email-service';

/**
 * PATCH /api/marketplace/applications/[id]
 * 
 * Updates an application status based on owner action
 * Requires authentication and user must be the listing owner
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const applicationId = params.id;
    
    // Fetch application with listing and caregiver info
    const application = await (prisma as any).marketplaceApplication.findUnique({
      where: { id: applicationId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            postedByUserId: true
          }
        },
        caregiver: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    });
    
    // Check if application exists
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }
    
    // Verify user is the listing owner
    if (application.listing.postedByUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to update this application' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { action, message, interviewAt } = body;
    
    // Map action to status
    let newStatus;
    let notificationTitle;
    let defaultMessage;
    
    switch (action) {
      case 'INVITE':
        newStatus = 'INVITED';
        notificationTitle = 'Application update: Invited';
        defaultMessage = `You've been invited to connect about "${application.listing.title}"`;
        break;
      case 'INTERVIEW':
        newStatus = 'INTERVIEWING';
        notificationTitle = 'Application update: Interview';
        defaultMessage = `You've been selected for an interview for "${application.listing.title}"`;
        break;
      case 'OFFER':
        newStatus = 'OFFERED';
        notificationTitle = 'Application update: Offer';
        defaultMessage = `You've received an offer for "${application.listing.title}"`;
        break;
      case 'HIRE':
        newStatus = 'HIRED';
        notificationTitle = 'Application update: Hired';
        defaultMessage = `Congratulations! You've been hired for "${application.listing.title}"`;
        break;
      case 'REJECT':
        newStatus = 'REJECTED';
        notificationTitle = 'Application update: Not selected';
        defaultMessage = `Your application for "${application.listing.title}" was not selected`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: INVITE, INTERVIEW, OFFER, HIRE, REJECT' },
          { status: 400 }
        );
    }
    
    // Validate interviewAt if provided
    let parsedInterviewAt = null;
    if (interviewAt) {
      try {
        parsedInterviewAt = new Date(interviewAt).toISOString();
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid interview date format. Please provide a valid ISO date string.' },
          { status: 400 }
        );
      }
    }
    
    // Update application status
    const updatedApplication = await (prisma as any).marketplaceApplication.update({
      where: { id: applicationId },
      data: {
        status: newStatus
      },
      include: {
        caregiver: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Create MarketplaceHire record when action is HIRE (enables review permission + hire fee)
    if (action === 'HIRE') {
      try {
        await prisma.marketplaceHire.create({
          data: {
            applicationId,
            listingId: application.listing.id,
            caregiverId: application.caregiver.id,
          },
        });
      } catch (err) {
        // Swallow duplicate key errors (idempotent)
        console.warn('[HIRE] Could not create MarketplaceHire record:', err);
      }
    }
    
    // Create notification for caregiver
    const notificationData: any = {
      applicationId,
      listingId: application.listing.id,
      action
    };
    
    // Only include interviewAt if it's a valid date
    if (parsedInterviewAt) {
      notificationData.interviewAt = parsedInterviewAt;
    }
    
    await (prisma as any).notification.create({
      data: {
        userId: application.caregiver.userId,
        type: 'SYSTEM',
        title: notificationTitle,
        message: message || defaultMessage,
        link: '/caregiver/applications',
        data: notificationData
      }
    });
    
    // Send status-change email to caregiver (non-blocking)
    sendApplicationStatusEmail(
      updatedApplication.caregiver.user,
      application.listing.title,
      notificationTitle,
      message || defaultMessage
    ).catch((err) => console.error('[APP_EMAIL] Non-blocking error:', err));

    // Trigger hire fee if action is HIRE (non-blocking)
    if (action === 'HIRE') {
      triggerApplicationHireFee(applicationId, updatedApplication).catch((err) =>
        console.error('[HIRE_FEE] Non-blocking error:', err)
      );
    }

    return NextResponse.json(
      { data: updatedApplication },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}

// ─── Hire fee helper ──────────────────────────────────────────────────────────
// Professional and Growth plans include unlimited marketplace hires.
// Starter plan (or no plan) is charged a $99 access fee per hire.

const STARTER_HIRE_FEE_CENTS = parseInt(
  process.env.MARKETPLACE_HIRE_FEE_CENTS ?? '9900',
  10
);

async function triggerApplicationHireFee(
  applicationId: string,
  application: { caregiver: { user: { firstName: string; lastName: string } }; listing: { postedByUserId: string } }
) {
  const caregiverName = `${application.caregiver.user.firstName} ${application.caregiver.user.lastName}`;

  // Find operator + plan
  const operator = await prisma.operator.findFirst({
    where: { userId: application.listing.postedByUserId },
    select: { id: true, userId: true, stripeCustomerId: true, subscriptionPlan: true },
  });

  // Professional and Growth plans include unlimited marketplace hires — no fee
  if (
    operator?.subscriptionPlan === 'PROFESSIONAL' ||
    operator?.subscriptionPlan === 'GROWTH'
  ) {
    console.log(`[HIRE_FEE] Plan ${operator.subscriptionPlan} — marketplace hire included, no fee`);
    return;
  }

  // Starter plan (or no plan): charge $99 access fee
  const feeCents = STARTER_HIRE_FEE_CENTS;

  // Record payment regardless of Stripe availability
  let payment: { id: string } | null = null;
  try {
    payment = await prisma.payment.create({
      data: {
        userId: application.listing.postedByUserId,
        amount: feeCents / 100,
        status: 'PENDING',
        type: 'MARKETPLACE_HIRE_FEE',
        description: `Marketplace hire access fee — ${caregiverName}`,
      },
    });
  } catch (err) {
    console.error('[HIRE_FEE] Could not create payment record:', err);
    return;
  }

  if (!operator?.stripeCustomerId) {
    console.warn('[HIRE_FEE] No Stripe customer — fee recorded as PENDING', { paymentId: payment.id, applicationId });
    return;
  }

  try {
    const invoiceItem = await stripe.invoiceItems.create({
      customer: operator.stripeCustomerId,
      amount: feeCents,
      currency: 'usd',
      description: `Marketplace hire access fee — ${caregiverName}`,
      metadata: { applicationId, type: 'MARKETPLACE_HIRE_FEE' },
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PROCESSING',
        stripePaymentId: invoiceItem.id,
        description: `Marketplace hire access fee — ${caregiverName} (queued for next invoice)`,
      },
    });
  } catch (err: any) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } }).catch(() => {});
    console.error('[HIRE_FEE] Failed to queue invoice item:', err?.message ?? err);
  }
}

// ─── Application status email helper ─────────────────────────────────────────

async function sendApplicationStatusEmail(
  caregiverUser: { firstName: string; lastName: string; email: string },
  listingTitle: string,
  subject: string,
  bodyMessage: string
) {
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://getcarelinkai.com';
  await EmailService.sendEmail({
    to: caregiverUser.email,
    subject,
    text: `Hi ${caregiverUser.firstName},\n\n${bodyMessage}\n\nView all your applications: ${appUrl}/caregiver/applications\n\n— The CareLinkAI Team`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#1a1a2e;margin-bottom:8px">${subject}</h2>
        <p style="color:#444;font-size:15px">Hi ${caregiverUser.firstName},</p>
        <p style="color:#444;font-size:15px">${bodyMessage}</p>
        <p style="color:#666;font-size:14px">Listing: <strong>${listingTitle}</strong></p>
        <a href="${appUrl}/caregiver/applications"
           style="display:inline-block;margin-top:20px;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          View My Applications
        </a>
        <p style="color:#999;font-size:12px;margin-top:32px">— The CareLinkAI Team</p>
      </div>
    `,
  });
}

// ─── Method not allowed handlers ─────────────────────────────────────────────

/**
 * GET /api/marketplace/applications/[id]
 *
 * Method not allowed - return 405
 */
export function GET() {
  return methodNotAllowed();
}

/**
 * POST /api/marketplace/applications/[id]
 * 
 * Method not allowed - return 405
 */
export function POST() {
  return methodNotAllowed();
}

/**
 * PUT /api/marketplace/applications/[id]
 * 
 * Method not allowed - return 405
 */
export function PUT() {
  return methodNotAllowed();
}

/**
 * DELETE /api/marketplace/applications/[id]
 * 
 * Method not allowed - return 405
 */
export function DELETE() {
  return methodNotAllowed();
}

/**
 * Helper function to return 405 Method Not Allowed
 */
function methodNotAllowed() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    {
      status: 405,
      headers: {
        Allow: 'PATCH',
      },
    }
  );
}
