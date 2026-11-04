
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { z } from 'zod';
import { AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';
import { publish } from '@/lib/server/sse';
import { captureError } from '@/lib/sentry';
import { ensureFamilyAccess } from '@/lib/family/access';

const updatePreferencesSchema = z.object({
  familyId: z.string().cuid(),
  escalationChain: z.array(z.any()),
  notifyMethods: z.array(z.string()),
  careInstructions: z.string().optional(),
});

// GET /api/family/emergency - Get emergency preferences for a family
export async function GET(request: NextRequest) {
  try {
    console.log('[EMERGENCY] Starting GET request');
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');

    console.log(`[EMERGENCY] User ${user.id} requesting emergency prefs for family ${familyId}`);

    if (!familyId) {
      return NextResponse.json({ error: 'familyId required' }, { status: 400 });
    }

    // P0-3: only an ACTIVE member (or the family's own owner account) may read; nobody is auto-added.
    const access = await ensureFamilyAccess(user.id, familyId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

    const preferences = await prisma.emergencyPreference.findFirst({
      where: { 
        familyId,
        residentId: null  // Family-level preferences
      },
    });

    console.log(`[EMERGENCY] Found preferences: ${preferences ? 'YES' : 'NO'}`);
    return NextResponse.json({ preferences });
  } catch (error: any) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'family:emergency' },
    });
    if (error?.name === 'UnauthenticatedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[EMERGENCY] Error fetching emergency preferences:', error);
    return NextResponse.json({ preferences: null, message: 'No emergency preferences set yet' });
  }
}

// PUT /api/family/emergency - Update emergency preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = updatePreferencesSchema.parse(body);

    // P0-3: ACTIVE non-guest member (or the family's owner account) only.
    const access = await ensureFamilyAccess(user.id, data.familyId, { write: true });
    const familyMember = access.ok ? { role: access.role } : null;

    if (!familyMember) {
      return NextResponse.json(
        { error: 'Unauthorized - only family members can update emergency preferences' },
        { status: 403 }
      );
    }

    // Check if preferences already exist
    const existing = await prisma.emergencyPreference.findFirst({
      where: {
        familyId: data.familyId,
        residentId: null,
      },
    });

    let preferences;
    if (existing) {
      // Update existing preferences
      preferences = await prisma.emergencyPreference.update({
        where: { id: existing.id },
        data: {
          escalationChain: data.escalationChain,
          notifyMethods: data.notifyMethods,
          careInstructions: data.careInstructions,
          lastConfirmedAt: new Date(),
        },
      });
    } else {
      // Create new preferences
      preferences = await prisma.emergencyPreference.create({
        data: {
          familyId: data.familyId,
          residentId: null,
          escalationChain: data.escalationChain,
          notifyMethods: data.notifyMethods,
          careInstructions: data.careInstructions,
          lastConfirmedAt: new Date(),
        },
      });
    }

    // Create audit log
    await createAuditLogFromRequest(
      request,
      AuditAction.UPDATE,
      'EmergencyPreference',
      preferences.id,
      `Updated emergency preferences for family ${data.familyId} by user ${user.id}`,
      { familyId: data.familyId, userId: user.id }
    );

    // Log to activity feed + notify live listeners
    await prisma.activityFeedItem.create({
      data: {
        familyId: data.familyId,
        actorId: user.id,
        type: 'OTHER' as any,
        resourceType: 'EmergencyPreference',
        resourceId: preferences.id,
        description: 'Updated emergency contacts and preferences',
      },
    }).catch(() => {});
    publish(`family:${data.familyId}`, 'activity:created', { type: 'OTHER' });

    return NextResponse.json({ preferences });
  } catch (error: any) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'family:emergency' },
    });
    if (error?.name === 'UnauthenticatedError') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating emergency preferences:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update emergency preferences' },
      { status: 500 }
    );
  }
}
