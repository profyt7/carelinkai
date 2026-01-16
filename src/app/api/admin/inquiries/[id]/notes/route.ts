// Admin Inquiry Notes API
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';
import { z } from 'zod';

const noteSchema = z.object({
  note: z.string().min(1, 'Note is required'),
  append: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { note, append } = noteSchema.parse(body);

    const existingInquiry = await prisma.inquiry.findUnique({
      where: { id },
      select: { internalNotes: true },
    });

    if (!existingInquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    // Format new note with timestamp and author
    const timestamp = new Date().toISOString();
    const formattedNote = `[${timestamp}] ${user.firstName} ${user.lastName}: ${note}`;

    let newNotes: string;
    if (append && existingInquiry.internalNotes) {
      newNotes = `${existingInquiry.internalNotes}\n\n${formattedNote}`;
    } else {
      newNotes = formattedNote;
    }

    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: { internalNotes: newNotes },
    });

    await createAuditLogFromRequest(request, {
      userId: user.id,
      action: AuditAction.UPDATE,
      resourceType: 'INQUIRY',
      resourceId: id,
      details: { action: 'add_note', notePreview: note.substring(0, 100) },
    });

    return NextResponse.json({ inquiry });
  } catch (error) {
    console.error('Admin add note error:', error);
    return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
  }
}
