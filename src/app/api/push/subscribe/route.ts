import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

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
    
    // Persist the subscription using Prisma (create or update by endpoint)
    const record = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: session.user.id,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth
      },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth
      }
    });
    
    // Send a test notification if requested
    if (data.sendTestNotification) {
      // ---------------------------------------------------------------
      // Configure web-push VAPID **at request time** (safe for build)
      // ---------------------------------------------------------------
      const VAPID_SUBJECT =
        process.env['VAPID_SUBJECT'] ?? 'mailto:support@carelinkai.com';
      const VAPID_PUBLIC = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] ?? '';
      const VAPID_PRIVATE = process.env['VAPID_PRIVATE_KEY'] ?? '';

      if (VAPID_PUBLIC && VAPID_PRIVATE) {
        try {
          webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
        } catch (err) {
          console.warn(
            '[push] Invalid VAPID keys – test notification skipped:',
            (err as Error).message
          );
          // Skip sending notification if keys invalid
          return NextResponse.json({
            success: false,
            message: 'Push enabled but VAPID keys invalid; notification not sent'
          });
        }
      } else if (process.env['NODE_ENV'] !== 'production') {
        console.warn('[push] VAPID keys missing – test notification skipped.');
      }

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
      id: record.id,
      message: 'Subscription stored successfully'
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

    const result = await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      removed: result.count,
      message:
        result.count > 0
          ? 'Subscription removed successfully'
          : 'No matching subscription found',
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
