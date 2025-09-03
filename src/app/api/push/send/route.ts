import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

/**
 * POST handler for sending push notifications
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
    
    // Check if user has permission to send notifications
    // Only admin and operator roles can send to multiple users
    const canSendBroadcast = ['ADMIN', 'OPERATOR'].includes(session.user.role as string);
    
    // Get notification data from request
    const data = await req.json();
    const { 
      title, 
      body, 
      icon = '/icons/icon-192x192.png',
      badge = '/icons/badge-96x96.png',
      image,
      tag,
      data: notificationData = {},
      actions = [],
      urgent = false,
      userId, // Optional: specific user to send to
      userIds = [], // Optional: array of user IDs to send to
      sendToAll = false, // Send to all users (admin only)
      isTest = false // Test notification flag
    } = data;
    
    //-------------------------------------------------------------------
    // Configure web-push VAPID **at request time** (safe for build phase)
    //-------------------------------------------------------------------
    {
      const VAPID_SUBJECT =
        process.env['VAPID_SUBJECT'] ?? 'mailto:support@carelinkai.com';
      const VAPID_PUBLIC = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] ?? '';
      const VAPID_PRIVATE = process.env['VAPID_PRIVATE_KEY'] ?? '';

      if (VAPID_PUBLIC && VAPID_PRIVATE) {
        try {
          webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
        } catch (err) {
          console.warn(
            '[push] Invalid VAPID keys – push disabled for this request:',
            (err as Error).message
          );
        }
      } else {
        // Silently skip if keys not provided; caller will still get 200 with no sends
        if (process.env['NODE_ENV'] !== 'production') {
          console.warn('[push] VAPID keys missing – notifications not sent.');
        }
      }
    }

    // Validate required fields
    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }
    
    // Handle permission checks for broadcast notifications
    if ((userIds.length > 1 || sendToAll) && !canSendBroadcast) {
      return NextResponse.json(
        { error: 'You do not have permission to send broadcast notifications' },
        { status: 403 }
      );
    }
    
    // Build notification payload
    const payload = JSON.stringify({
      title,
      body,
      icon,
      badge,
      image,
      tag,
      data: {
        ...notificationData,
        timestamp: new Date().toISOString(),
        sender: session.user.id
      },
      actions,
      requireInteraction: urgent,
      silent: isTest // Test notifications can be silent
    });
    
    // Determine which subscriptions to use
    let subscriptionQuery: any = {};
    
    if (isTest) {
      // For test notifications, only send to the current user
      subscriptionQuery = {
        where: { userId: session.user.id }
      };
    } else if (userId) {
      // Send to a specific user
      subscriptionQuery = {
        where: { userId }
      };
    } else if (userIds.length > 0) {
      // Send to specific users
      subscriptionQuery = {
        where: { userId: { in: userIds } }
      };
    } else if (sendToAll && canSendBroadcast) {
      // Send to all users (no filter)
      subscriptionQuery = {};
    } else {
      // Default: send to current user
      subscriptionQuery = {
        where: { userId: session.user.id }
      };
    }
    
  // Fetch subscriptions from database
  const subscriptions = await prisma.pushSubscription.findMany(
    subscriptionQuery as any
  );
    
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No push subscriptions found for the specified users' },
        { status: 404 }
      );
    }
    
    // Track successful and failed notifications
    const results = {
      total: subscriptions.length,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    // Send notifications to all subscriptions
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          payload
        );
        
        results.successful++;
        
        // Log notification in database for non-test notifications
        // Persistence skipped in stub mode – remove when NotificationType enum aligns
      } catch (error: any) {
        results.failed++;
        
        // If subscription is invalid (gone), remove it
        if (error.statusCode === 410) {
          try {
            await prisma.pushSubscription.delete({
              where: { id: subscription.id }
            });
          } catch {
            /* ignore */ 
          }
          results.errors.push(
            `Subscription expired and removed: ${subscription.endpoint.substring(
              0,
              50
            )}...`
          );
        } else {
          results.errors.push(
            `Failed to send to ${subscription.endpoint.substring(0, 50)}...: ${error.message}`
          );
        }
      }
    }
    
    return NextResponse.json({
      success: results.successful > 0,
      message: `Sent ${results.successful} of ${results.total} notifications`,
      results
    });
  } catch (error: any) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json(
      { error: `Failed to send notifications: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET handler for testing push notification support
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if the user has any subscriptions
    const subscriptionCount = await prisma.pushSubscription.count({
      where: { userId: session.user.id }
    });

    return NextResponse.json({
      supported: true,
      vapidPublicKey: process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'],
      hasSubscriptions: subscriptionCount > 0,
      subscriptionCount
    });
  } catch (error) {
    console.error('Error checking push notification support:', error);
    return NextResponse.json(
      { error: 'Failed to check push notification support' },
      { status: 500 }
    );
  }
}
