import { NextRequest, NextResponse } from 'next/server';
import { followUpProcessor } from '@/lib/followup/followup-processor';

export async function POST(request: NextRequest) {
  try {
    // Verify this is called from a cron job or authorized source
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // Process due follow-ups
    await followUpProcessor.processDueFollowUps();
    
    // Also update overdue follow-ups
    await followUpProcessor.updateOverdueFollowUps();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Follow-ups processed successfully' 
    });
  } catch (error) {
    console.error('Error processing follow-ups:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process follow-ups',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
