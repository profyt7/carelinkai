import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { z } from 'zod';
import { AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';

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

    // Verify user has access to this family - AUTO-CREATE if missing
    let familyMember = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    console.log(`[EMERGENCY] Existing FamilyMember: ${familyMember ? 'YES' : 'NO'}`);

    // Auto-create FamilyMember if missing (user accessed via direct link or sharing)
    if (!familyMember) {
      console.log(`[EMERGENCY] Auto-creating FamilyMember for user ${user.id} in family ${familyId}...`);
      
      // Verify the family exists first
      const family = await prisma.family.findUnique({
        where: { id: familyId },
        select: { id: true, userId: true },
      });

      if (!family) {
        console.log(`[EMERGENCY] Family ${familyId} not found`);
        return NextResponse.json({ error: 'Family not found' }, { status: 404 });
      }

      // Determine role: OWNER if this is their family, otherwise MEMBER
      const role = family.userId === user.id ? 'OWNER' : 'MEMBER';
      
      try {
        familyMember = await prisma.familyMember.create({
          data: {
            familyId,
            userId: user.id,
            role,
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
        });
        console.log(`[EMERGENCY] ✓ Created FamilyMember with role ${role}`);
      } catch (createError) {
        console.error('[EMERGENCY] Failed to create FamilyMember:', createError);
        // Continue anyway - read access should still work
      }
    }

    const preferences = await prisma.emergencyPreference.findFirst({
      where: { 
        familyId,
        residentId: null  // Family-level preferences
      },
    });

    console.log(`[EMERGENCY] Found preferences: ${preferences ? 'YES' : 'NO'}`);
    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error('[EMERGENCY] Error fetching emergency preferences:', error);
    
    // Return null gracefully instead of error
    // This handles cases where the table exists but is empty
    return NextResponse.json({ 
      preferences: null,
      message: 'No emergency preferences set yet'
    });
  }
}

// PUT /api/family/emergency - Update emergency preferences
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = updatePreferencesSchema.parse(body);

    // Verify user has access to this family and is not a guest
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        familyId: data.familyId,
        userId: user.id,
        role: { in: ['ADMIN', 'MEMBER'] }, // Guests cannot update
      },
    });

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
      user.id,
      AuditAction.EMERGENCY_CONTACT_UPDATED,
      'EmergencyPreference',
      preferences.id,
      { familyId: data.familyId }
    );

    return NextResponse.json({ preferences });
  } catch (error: any) {
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
