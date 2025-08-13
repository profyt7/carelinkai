import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';
import webpush from 'web-push';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  process.env['VAPID_SUBJECT'] || 'mailto:support@carelinkai.com',
  process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] || '',
  process.env['VAPID_PRIVATE_KEY'] || ''
);

/**
 * POST handler for storing push notification subscriptions
 */
export async function POST(req: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the subscription data from the request
    const data = await req.json();
    const { subscription } = data;
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }
    
    // Check if this subscription already exists
    // TODO: re-enable when PushSubscription model is added to Prisma
    const existingSubscription = null;
    
    // Skip DB persistence in stub mode
    
    // Send a test notification if requested
    if (data.sendTestNotification) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: 'CareLink AI',
            body: 'Push notifications are now enabled!',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-96x96.png',
            data: {
              url: '/dashboard'
            }
          })
        );
      } catch (error) {
        console.error('Error sending test notification:', error);
        // Don't fail the request if test notification fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: existingSubscription
        ? 'Subscription updated successfully (stubbed)'
        : 'Subscription stored successfully (stubbed)'
    });
  } catch (error) {
    console.error('Error storing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to store subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler for removing push notification subscriptions
 */
export async function DELETE(req: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the subscription data from the request
    const data = await req.json();
    const { endpoint } = data;
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Subscription removed successfully (stubbed)' 
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
