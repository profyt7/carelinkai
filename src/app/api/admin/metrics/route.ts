/**
 * Admin Metrics API
 * Provides aggregated metrics for the admin dashboard
 * 
 * GET /api/admin/metrics - Retrieve all platform metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { UserRole, LeadStatus, LeadTargetType, BackgroundCheckStatus } from '@prisma/client';

/**
 * GET /api/admin/metrics
 * Retrieve comprehensive platform metrics
 * 
 * Access: ADMIN only
 */
export async function GET(req: NextRequest) {
  try {
    // Enforce ADMIN role
    await requireAnyRole([UserRole.ADMIN]);

    logger.info('Admin metrics requested');

    // Calculate date ranges for time-based metrics
    const now = new Date();
    const last7Days = new Date(now);
    last7Days.setDate(now.getDate() - 7);
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);

    // ========== USER METRICS ==========
    
    // Total users by role
    const totalByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: true,
    });

    const usersByRole = totalByRole.reduce((acc, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // New users in last 7 days by role
    const newLast7Days = await prisma.user.groupBy({
      by: ['role'],
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
      _count: true,
    });

    const newLast7DaysByRole = newLast7Days.reduce((acc, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // New users in last 30 days by role
    const newLast30Days = await prisma.user.groupBy({
      by: ['role'],
      where: {
        createdAt: {
          gte: last30Days,
        },
      },
      _count: true,
    });

    const newLast30DaysByRole = newLast30Days.reduce((acc, item) => {
      acc[item.role] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // ========== LEAD/INQUIRY METRICS ==========
    
    // Total leads
    const totalLeads = await prisma.lead.count({
      where: {
        deletedAt: null, // Exclude soft-deleted leads
      },
    });

    // Leads by status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
      },
      _count: true,
    });

    const leadsByStatusMap = leadsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Leads by target type
    const leadsByTargetType = await prisma.lead.groupBy({
      by: ['targetType'],
      where: {
        deletedAt: null,
      },
      _count: true,
    });

    const leadsByTargetTypeMap = leadsByTargetType.reduce((acc, item) => {
      acc[item.targetType] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // Leads created in last 7 days
    const leadsLast7Days = await prisma.lead.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: last7Days,
        },
      },
    });

    // Leads created in last 30 days
    const leadsLast30Days = await prisma.lead.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: last30Days,
        },
      },
    });

    // ========== MARKETPLACE METRICS ==========
    
    // Active Aides (Caregivers who are visible in marketplace)
    const activeAides = await prisma.caregiver.count({
      where: {
        isVisibleInMarketplace: true,
      },
    });

    // Active Providers
    const activeProviders = await prisma.provider.count({
      where: {
        isActive: true,
      },
    });

    // Verified Providers
    const verifiedProviders = await prisma.provider.count({
      where: {
        isVerified: true,
      },
    });

    // Unverified Providers
    const unverifiedProviders = await prisma.provider.count({
      where: {
        isVerified: false,
      },
    });

    // Background check status breakdown for Aides
    const aidesByBackgroundCheck = await prisma.caregiver.groupBy({
      by: ['backgroundCheckStatus'],
      _count: true,
    });

    const aidesByBackgroundCheckMap = aidesByBackgroundCheck.reduce((acc, item) => {
      acc[item.backgroundCheckStatus] = item._count;
      return acc;
    }, {} as Record<string, number>);

    // ========== ENGAGEMENT METRICS ==========
    
    // Total messages (using the Message model)
    const totalMessages = await prisma.message.count();

    // Messages sent in last 7 days
    const messagesLast7Days = await prisma.message.count({
      where: {
        createdAt: {
          gte: last7Days,
        },
      },
    });

    // ========== BUILD RESPONSE ==========
    
    const metrics = {
      users: {
        totalByRole: usersByRole,
        newLast7DaysByRole: newLast7DaysByRole,
        newLast30DaysByRole: newLast30DaysByRole,
      },
      leads: {
        total: totalLeads,
        byStatus: leadsByStatusMap,
        byTargetType: leadsByTargetTypeMap,
        createdLast7Days: leadsLast7Days,
        createdLast30Days: leadsLast30Days,
      },
      marketplace: {
        activeAides: activeAides,
        activeProviders: activeProviders,
        verifiedProviders: verifiedProviders,
        unverifiedProviders: unverifiedProviders,
        aidesByBackgroundCheck: aidesByBackgroundCheckMap,
      },
      engagement: {
        totalMessages: totalMessages,
        messagesLast7Days: messagesLast7Days,
      },
      generatedAt: new Date().toISOString(),
    };

    logger.info('Admin metrics generated successfully');

    return NextResponse.json(metrics, { status: 200 });

  } catch (error) {
    // Handle RBAC errors
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        logger.warn('Unauthorized access to admin metrics');
        return NextResponse.json(
          { error: 'Unauthorized. Please log in.' },
          { status: 401 }
        );
      }
      if (error.message === 'FORBIDDEN') {
        logger.warn('Forbidden access to admin metrics');
        return NextResponse.json(
          { error: 'Forbidden. Admin access required.' },
          { status: 403 }
        );
      }
    }

    // General error handling
    logger.error('Error generating admin metrics', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'An error occurred while generating metrics' },
      { status: 500 }
    );
  }
}
