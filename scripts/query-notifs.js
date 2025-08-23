/**
 * Query Notifications Script
 * 
 * Usage:
 *   USER_ID=user_id_here node scripts/query-notifs.js
 */

const { PrismaClient } = require('@prisma/client');

async function queryNotifications() {
  const userId = process.env.USER_ID || '';
  
  if (!userId) {
    console.error('Error: USER_ID environment variable is required');
    console.error('Usage: USER_ID=user_id_here node scripts/query-notifs.js');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  
  try {
    console.log(`Querying notifications for user: ${userId}`);
    
    const notifications = await prisma.notification.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });
    
    console.log(JSON.stringify(notifications, null, 2));
    console.log(`Found ${notifications.length} notifications`);
    
    return notifications;
  } catch (error) {
    console.error('Error querying notifications:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
queryNotifications().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
