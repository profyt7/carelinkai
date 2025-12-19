import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { followUpScheduler } from '@/lib/followup/followup-scheduler';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateFollowUpSchema = z.object({
  action: z.enum(['cancel', 'reschedule', 'complete']),
  scheduledFor: z.string().datetime().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'OPERATOR'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validated = updateFollowUpSchema.parse(body);
    
    switch (validated.action) {
      case 'cancel':
        await followUpScheduler.cancelFollowUp(params.id);
        break;
      case 'reschedule':
        if (!validated.scheduledFor) {
          throw new Error('scheduledFor required for reschedule');
        }
        await followUpScheduler.rescheduleFollowUp(
          params.id,
          new Date(validated.scheduledFor)
        );
        break;
      case 'complete':
        // Mark as completed manually
        await prisma.followUp.update({
          where: { id: params.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            completedBy: session.user.id,
          },
        });
        break;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update follow-up',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['ADMIN', 'OPERATOR'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    await prisma.followUp.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting follow-up:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete follow-up',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
