
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';
import { PrismaClient } from '@prisma/client';
import webpush from 'web-push';

const prisma = new PrismaClient();

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
    const existingSubscription = await (prisma as any).pushSubscription.findFirst({
      where: {
        endpoint: subscription.endpoint,
        userId: session.user.id
      }
    });
    
    if (existingSubscription) {
      // Update the existing subscription
      await (prisma as any).pushSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updatedAt: new Date()
        }
      });
      
      return NextResponse.json({ 
        success: true, 
        message: 'Subscription updated successfully' 
      });
    }
    
    // Create a new subscription
    await (prisma as any).pushSubscription.create({
      data: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: session.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    // Send a test notification if requested
    if (data.sendTestNotification) {
      // Lazily configure web-push VAPID details at runtime to avoid build-time failures
      const subject =
        process.env['VAPID_SUBJECT'] || 'mailto:support@carelinkai.com';
      const pub = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
      const priv = process.env['VAPID_PRIVATE_KEY'];
      if (pub && priv) {
        try {
          webpush.setVapidDetails(subject, pub, priv);
        } catch {
          // Invalid keys – skip configuration but continue the request
          console.warn(
            'Skipping web-push VAPID setup due to invalid keys at runtime'
          );
        }
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
    
    // Delete the subscription
    await (prisma as any).pushSubscription.deleteMany({
      where: {
        endpoint: endpoint,
        userId: session.user.id
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Subscription removed successfully' 
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}
