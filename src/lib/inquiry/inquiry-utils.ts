/**
 * Inquiry Management Utility Functions
 * Feature #4: AI-Powered Inquiry Response & Follow-up System
 */

import { prisma } from '@/lib/prisma';
import { InquiryStatus, InquiryUrgency, FollowUpStatus } from '@prisma/client';

/**
 * Get inquiry statistics for a given filter
 */
export async function getInquiryStats(filter?: {
  operatorId?: string;
  homeId?: string;
  familyId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};
  
  if (filter?.homeId) {
    where.homeId = filter.homeId;
  } else if (filter?.operatorId) {
    // Get all homes for this operator
    const homes = await prisma.assistedLivingHome.findMany({
      where: { operatorId: filter.operatorId },
      select: { id: true },
    });
    where.homeId = { in: homes.map(h => h.id) };
  }
  
  if (filter?.familyId) {
    where.familyId = filter.familyId;
  }
  
  if (filter?.startDate || filter?.endDate) {
    where.createdAt = {};
    if (filter.startDate) where.createdAt.gte = filter.startDate;
    if (filter.endDate) where.createdAt.lte = filter.endDate;
  }
  
  const [
    total,
    byStatus,
    byUrgency,
    bySource,
    avgResponseTime,
  ] = await Promise.all([
    // Total inquiries
    prisma.inquiry.count({ where }),
    
    // Group by status
    prisma.inquiry.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    
    // Group by urgency
    prisma.inquiry.groupBy({
      by: ['urgency'],
      where,
      _count: true,
    }),
    
    // Group by source
    prisma.inquiry.groupBy({
      by: ['source'],
      where,
      _count: true,
    }),
    
    // Calculate average response time
    calculateAverageResponseTime(where),
  ]);
  
  return {
    total,
    byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
    byUrgency: Object.fromEntries(byUrgency.map(u => [u.urgency, u._count])),
    bySource: Object.fromEntries(bySource.map(s => [s.source, s._count])),
    avgResponseTimeHours: avgResponseTime,
  };
}

/**
 * Calculate average response time in hours
 */
async function calculateAverageResponseTime(where: any): Promise<number | null> {
  const inquiries = await prisma.inquiry.findMany({
    where: {
      ...where,
      responses: {
        some: {},
      },
    },
    select: {
      createdAt: true,
      responses: {
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });
  
  if (inquiries.length === 0) return null;
  
  const totalHours = inquiries.reduce((sum, inquiry) => {
    const firstResponse = inquiry.responses[0];
    if (!firstResponse) return sum;
    
    const responseTime = firstResponse.createdAt.getTime() - inquiry.createdAt.getTime();
    return sum + (responseTime / (1000 * 60 * 60)); // Convert to hours
  }, 0);
  
  return totalHours / inquiries.length;
}

/**
 * Get pending follow-ups that need to be sent
 */
export async function getPendingFollowUps(options?: {
  limit?: number;
  overdueOnly?: boolean;
}) {
  const now = new Date();
  const where: any = {
    status: FollowUpStatus.PENDING,
  };
  
  if (options?.overdueOnly) {
    where.scheduledFor = { lte: now };
  }
  
  const followUps = await prisma.followUp.findMany({
    where,
    include: {
      inquiry: {
        include: {
          family: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          home: {
            select: {
              id: true,
              name: true,
              operator: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { scheduledFor: 'asc' },
    take: options?.limit || 100,
  });
  
  return followUps;
}

/**
 * Mark overdue follow-ups
 */
export async function markOverdueFollowUps(): Promise<number> {
  const now = new Date();
  
  const result = await prisma.followUp.updateMany({
    where: {
      status: FollowUpStatus.PENDING,
      scheduledFor: { lt: now },
    },
    data: {
      status: FollowUpStatus.OVERDUE,
    },
  });
  
  return result.count;
}

/**
 * Update inquiry status
 */
export async function updateInquiryStatus(
  inquiryId: string,
  status: InquiryStatus,
  notes?: string
): Promise<void> {
  const updateData: any = { status };
  
  if (notes) {
    // Append to internal notes
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      select: { internalNotes: true },
    });
    
    const existingNotes = inquiry?.internalNotes || '';
    const timestamp = new Date().toISOString();
    updateData.internalNotes = `${existingNotes}\n[${timestamp}] Status changed to ${status}: ${notes}`;
  }
  
  await prisma.inquiry.update({
    where: { id: inquiryId },
    data: updateData,
  });
}

/**
 * Get inquiries requiring attention
 * - Urgent inquiries with no response
 * - Inquiries with overdue follow-ups
 * - Inquiries in NEW status for more than 24 hours
 */
export async function getInquiriesRequiringAttention(filter?: {
  operatorId?: string;
  homeId?: string;
}) {
  const where: any = {};
  
  if (filter?.homeId) {
    where.homeId = filter.homeId;
  } else if (filter?.operatorId) {
    const homes = await prisma.assistedLivingHome.findMany({
      where: { operatorId: filter.operatorId },
      select: { id: true },
    });
    where.homeId = { in: homes.map(h => h.id) };
  }
  
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const [urgentNoResponse, overdueFollowUps, oldNew] = await Promise.all([
    // Urgent inquiries with no response
    prisma.inquiry.findMany({
      where: {
        ...where,
        urgency: InquiryUrgency.URGENT,
        responses: { none: {} },
      },
      include: {
        family: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        home: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    
    // Inquiries with overdue follow-ups
    prisma.inquiry.findMany({
      where: {
        ...where,
        followUps: {
          some: {
            status: FollowUpStatus.OVERDUE,
          },
        },
      },
      include: {
        family: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        home: {
          select: {
            name: true,
          },
        },
        followUps: {
          where: { status: FollowUpStatus.OVERDUE },
          orderBy: { scheduledFor: 'asc' },
        },
      },
    }),
    
    // NEW status for more than 24 hours
    prisma.inquiry.findMany({
      where: {
        ...where,
        status: InquiryStatus.NEW,
        createdAt: { lte: oneDayAgo },
      },
      include: {
        family: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        home: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  
  return {
    urgentNoResponse,
    overdueFollowUps,
    oldNew,
    totalCount: urgentNoResponse.length + overdueFollowUps.length + oldNew.length,
  };
}

/**
 * Get conversion rate for inquiries
 */
export async function getConversionRate(filter?: {
  operatorId?: string;
  homeId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<{
  totalInquiries: number;
  convertedInquiries: number;
  conversionRate: number;
}> {
  const where: any = {};
  
  if (filter?.homeId) {
    where.homeId = filter.homeId;
  } else if (filter?.operatorId) {
    const homes = await prisma.assistedLivingHome.findMany({
      where: { operatorId: filter.operatorId },
      select: { id: true },
    });
    where.homeId = { in: homes.map(h => h.id) };
  }
  
  if (filter?.startDate || filter?.endDate) {
    where.createdAt = {};
    if (filter.startDate) where.createdAt.gte = filter.startDate;
    if (filter.endDate) where.createdAt.lte = filter.endDate;
  }
  
  const [totalInquiries, convertedInquiries] = await Promise.all([
    prisma.inquiry.count({ where }),
    prisma.inquiry.count({
      where: {
        ...where,
        status: { in: [InquiryStatus.CONVERTED, InquiryStatus.PLACEMENT_ACCEPTED] },
      },
    }),
  ]);
  
  const conversionRate = totalInquiries > 0 
    ? (convertedInquiries / totalInquiries) * 100 
    : 0;
  
  return {
    totalInquiries,
    convertedInquiries,
    conversionRate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
  };
}
