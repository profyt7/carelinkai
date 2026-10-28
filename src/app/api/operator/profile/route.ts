export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/events/record-event';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { createAuditLogFromRequest } from '@/lib/audit';
import { getSmsConsentState, recordAccountSmsConsent } from '@/lib/consent/sms-consent-server';
import { SMS_CONSENT_FORMS } from '@/lib/consent/sms-consent';

// GET /api/operator/profile
// Retrieves the operator profile for the current logged-in operator
export async function GET(req: NextRequest) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const userId = (session as any)?.user?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const operator = await prisma.operator.findUnique({
      where: { userId },
      select: {
        id: true,
        companyName: true,
        taxId: true,
        businessLicense: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!operator) {
      return NextResponse.json({ error: 'Operator profile not found' }, { status: 404 });
    }

    // OL-184: the settings checkbox mirrors the saved SMS opt-in.
    const sms = await getSmsConsentState(userId).catch(() => ({ given: false, at: null }));

    return NextResponse.json({
      user,
      operator,
      smsConsent: { given: sms.given, at: sms.at },
    });
  } catch (e) {
    console.error('Operator profile GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/operator/profile
// Updates the operator profile
export async function PATCH(req: NextRequest) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const userId = (session as any)?.user?.id as string | undefined;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      firstName,
      lastName,
      phone,
      companyName,
      taxId,
      businessLicense,
      preferences,
      smsConsent,
      smsConsentSource,
    } = body || {};

    // Update user fields if provided
    const userUpdateData: any = {};
    if (firstName !== undefined) userUpdateData.firstName = firstName;
    if (lastName !== undefined) userUpdateData.lastName = lastName;
    if (phone !== undefined) userUpdateData.phone = phone;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // OL-184: SMS opt-in from the settings / onboarding checkbox.
    await recordAccountSmsConsent({
      consent: smsConsent,
      sourceForm:
        smsConsentSource === 'onboarding' ? SMS_CONSENT_FORMS.OPERATOR_ONBOARDING : SMS_CONSENT_FORMS.OPERATOR_SETTINGS,
      userId,
      phone,
      req,
    });

    // Update operator fields if provided
    const operatorUpdateData: any = {};
    if (companyName !== undefined) operatorUpdateData.companyName = companyName;
    if (taxId !== undefined) operatorUpdateData.taxId = taxId;
    if (businessLicense !== undefined) operatorUpdateData.businessLicense = businessLicense;
    if (preferences !== undefined) operatorUpdateData.preferences = preferences;

    let operator;
    if (Object.keys(operatorUpdateData).length > 0) {
      // Check if operator profile exists
      const existingOperator = await prisma.operator.findUnique({
        where: { userId },
      });

      if (!existingOperator) {
        return NextResponse.json({ error: 'Operator profile not found' }, { status: 404 });
      }

      operator = await prisma.$transaction(async (tx) => {
        const u = await tx.operator.update({
          where: { userId },
          data: operatorUpdateData,
        });
        // History (sprint W5-1): which fields changed; company name is a business
        // fact, tax id / license / preferences are recorded as change markers only.
        for (const field of Object.keys(operatorUpdateData)) {
          const plain = field === 'companyName';
          await recordEvent(tx, {
            entityType: 'OPERATOR_PROFILE', entityId: existingOperator.id, eventType: 'field.changed', field,
            oldValue: plain ? (existingOperator as Record<string, unknown>)[field] : { changed: true },
            newValue: plain ? operatorUpdateData[field] : { changed: true },
            source: 'OPERATOR', actor: { userId, role: 'OPERATOR' },
          });
        }
        return u;
      });
    } else {
      operator = await prisma.operator.findUnique({
        where: { userId },
      });
    }

    await createAuditLogFromRequest(
      req,
      'UPDATE' as any,
      'Operator',
      operator?.id || userId,
      'Updated operator profile',
      { updates: { ...userUpdateData, ...operatorUpdateData } }
    );

    return NextResponse.json({ success: true, operator });
  } catch (e) {
    console.error('Operator profile PATCH error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
