import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

export async function getSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({
    where: { userId }
  });
}

export async function sendPushToUser(
  userId: string, 
  payload: any
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const VAPID_SUBJECT = process.env['VAPID_SUBJECT'] ?? 'mailto:support@carelinkai.com';
  const VAPID_PUBLIC = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'] ?? '';
  const VAPID_PRIVATE = process.env['VAPID_PRIVATE_KEY'] ?? '';

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { sent: 0, failed: 0, errors: ['Missing VAPID keys'] };
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (err) {
    return { 
      sent: 0, 
      failed: 0, 
      errors: [`Invalid VAPID keys: ${(err as Error).message}`] 
    };
  }

  const subscriptions = await getSubscriptions(userId);
  
  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[]
  };

  const stringifiedPayload = JSON.stringify(payload);

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
        stringifiedPayload
      );
      
      results.sent++;
    } catch (error: any) {
      results.failed++;
      
      if (error.statusCode === 410) {
        try {
          await prisma.pushSubscription.delete({
            where: { id: subscription.id }
          });
          
          results.errors.push(`Subscription expired and removed: ${subscription.endpoint.substring(0, 50)}...`);
        } catch (deleteError) {
          results.errors.push(`Failed to remove expired subscription: ${subscription.endpoint.substring(0, 50)}...`);
        }
      } else {
        results.errors.push(`Failed to send to ${subscription.endpoint.substring(0, 50)}...: ${error.message}`);
      }
    }
  }

  return results;
}
