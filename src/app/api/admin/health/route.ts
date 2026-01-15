import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@prisma/client';

// Mark as dynamic route since we use getServerSession (reads headers)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[Health API] Starting system health check');
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      console.log('[Health API] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const startTime = Date.now();
    console.log('[Health API] Authenticated, checking system health');

    // Database Health Check
    const dbHealthStart = Date.now();
    let dbStatus = 'healthy';
    let dbResponseTime = 0;
    let dbError = null;

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbHealthStart;
    } catch (error) {
      dbStatus = 'unhealthy';
      dbError = (error as Error).message;
      dbResponseTime = Date.now() - dbHealthStart;
    }

    // Database Statistics
    console.log('[Health API] Fetching database statistics');
    let userCount = 0, homeCount = 0, inquiryCount = 0, activeSessionCount = 0;
    
    try {
      [userCount, homeCount, inquiryCount, activeSessionCount] = await Promise.all([
        prisma.user.count(),
        prisma.assistedLivingHome.count(),
        prisma.inquiry.count(),
        prisma.user.count({
          where: {
            lastLoginAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);
      console.log('[Health API] Statistics fetched:', { userCount, homeCount, inquiryCount, activeSessionCount });
    } catch (error) {
      console.error('[Health API] Error fetching statistics:', error);
      // Continue with zeros if stats fail
    }

    // Recent Errors (last 24 hours)
    console.log('[Health API] Fetching error metrics');
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    let recentErrors = 0;
    
    try {
      recentErrors = await prisma.auditLog.count({
        where: {
          action: AuditAction.ACCESS_DENIED,
          createdAt: {
            gte: last24Hours,
          },
        },
      });
      console.log('[Health API] Recent errors:', recentErrors);
    } catch (error) {
      console.error('[Health API] Error fetching audit logs:', error);
    }

    // Error Rate (errors per hour in last 24 hours)
    const errorRate = recentErrors / 24;

    // API Response Time Average (based on audit logs)
    console.log('[Health API] Fetching API response time');
    let avgApiResponseTime = 0;
    
    try {
      const apiResponseTimeData = await prisma.$queryRaw<Array<{ avg_response_time: number }>>`
        SELECT AVG(
          EXTRACT(EPOCH FROM (updated_at - created_at))
        )::float as avg_response_time
        FROM "AuditLog"
        WHERE created_at >= ${last24Hours}
        AND action != 'ACCESS_DENIED'
        LIMIT 1000
      `;
      avgApiResponseTime = apiResponseTimeData[0]?.avg_response_time || 0;
      console.log('[Health API] Average API response time:', avgApiResponseTime);
    } catch (error) {
      console.error('[Health API] Error fetching API response time:', error);
    }

    // System Metrics
    const metrics = {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        error: dbError,
      },
      statistics: {
        totalUsers: userCount,
        totalHomes: homeCount,
        totalInquiries: inquiryCount,
        activeSessions: activeSessionCount,
      },
      errors: {
        last24Hours: recentErrors,
        errorRate: Math.round(errorRate * 100) / 100,
      },
      performance: {
        dbResponseTime: dbResponseTime,
        avgApiResponseTime: Math.round(avgApiResponseTime * 1000) / 1000,
      },
      uptime: {
        // In a real system, this would track actual uptime
        status: 'operational',
        lastDeployment: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      },
    };

    const totalResponseTime = Date.now() - startTime;
    console.log('[Health API] System health check completed in', totalResponseTime, 'ms');

    return NextResponse.json({
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
      metrics,
    });
  } catch (error) {
    console.error('[Health API] Error fetching system health:', error);
    console.error('[Health API] Error stack:', (error as Error).stack);
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Failed to fetch system health',
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
      },
      { status: 500 }
    );
  }
}
