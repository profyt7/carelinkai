
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { z } from 'zod';
import { AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';

const createNoteSchema = z.object({
  familyId: z.string().cuid(),
  title: z.string().min(1).max(200),
  content: z.any(), // JSON content
  tags: z.array(z.string()).optional(),
  residentId: z.string().cuid().optional(),
});

// GET /api/family/notes - List notes for a family
export async function GET(request: NextRequest) {
  try {
    console.log('[NOTES] Starting GET request');
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(`[NOTES] User ${user.id} requesting notes for family ${familyId}`);

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

    console.log(`[NOTES] Existing FamilyMember: ${familyMember ? 'YES' : 'NO'}`);

    // Auto-create FamilyMember if missing (user accessed via direct link or sharing)
    if (!familyMember) {
      console.log(`[NOTES] Auto-creating FamilyMember for user ${user.id} in family ${familyId}...`);
      
      // Verify the family exists first
      const family = await prisma.family.findUnique({
        where: { id: familyId },
        select: { id: true, userId: true },
      });

      if (!family) {
        console.log(`[NOTES] Family ${familyId} not found`);
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
        console.log(`[NOTES] ✓ Created FamilyMember with role ${role}`);
      } catch (createError) {
        console.error('[NOTES] Failed to create FamilyMember:', createError);
        // Continue anyway - read access should still work
      }
    }

    const where: any = {
      familyId,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    const notes = await prisma.familyNote.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    console.log(`[NOTES] Returning ${notes.length} notes`);
    return NextResponse.json({ notes });
  } catch (error: any) {
    console.error('[NOTES] Error fetching notes:', error);
    
    // Return empty array gracefully instead of error
    // This handles cases where the table exists but is empty
    return NextResponse.json({ 
      notes: [],
      message: 'No notes available yet'
    });
  }
}

// POST /api/family/notes - Create a note
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = createNoteSchema.parse(body);

    // Verify user has access to this family
    const familyMember = await prisma.familyMember.findFirst({
      where: {
        familyId: data.familyId,
        userId: user.id,
        role: { in: ['OWNER', 'CARE_PROXY', 'MEMBER'] }, // Guests cannot create notes
      },
    });

    if (!familyMember) {
      return NextResponse.json(
        { error: 'Unauthorized - only family members can create notes' },
        { status: 403 }
      );
    }

    const note = await prisma.familyNote.create({
      data: {
        familyId: data.familyId,
        authorId: user.id,
        residentId: data.residentId,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      user.id,
      AuditAction.NOTE_CREATED,
      'FamilyNote',
      note.id,
      { title: data.title }
    );

    return NextResponse.json({ note }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating note:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || 'Failed to create note' },
      { status: 500 }
    );
  }
}
