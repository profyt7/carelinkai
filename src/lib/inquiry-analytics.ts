import { differenceInDays, differenceInHours, format } from 'date-fns';
import { InquiryStatus } from '@prisma/client';

export type InquiryAnalytics = {
  totalInquiries: number;
  activeInquiries: number;
  convertedInquiries: number;
  lostInquiries: number;
  conversionRate: number;
  averageTimeToConversion: number; // in days
  averageResponseTime: number; // in hours
  
  byStatusData: {
    status: string;
    count: number;
    percentage: number;
    fill: string;
  }[];
  
  bySourceData: {
    source: string;
    count: number;
    percentage: number;
    fill: string;
  }[];
  
  byPriorityData: {
    priority: string;
    count: number;
    fill: string;
  }[];
  
  conversionFunnelData: {
    stage: string;
    count: number;
    conversionRate: number;
  }[];
  
  monthlyTrendsData: {
    month: string;
    inquiries: number;
    conversions: number;
  }[];
  
  tourMetrics: {
    toursScheduled: number;
    toursCompleted: number;
    tourCompletionRate: number;
    averageDaysToTour: number;
  };
};

export type InquiryForAnalytics = {
  id: string;
  status: InquiryStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  tourDate?: Date | string | null;
  conversionDate?: Date | string | null;
  convertedResident?: any;
  home?: {
    name?: string;
  };
  family?: {
    source?: string;
    priority?: string;
  };
};

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6',
  CONTACTED: '#8b5cf6',
  TOUR_SCHEDULED: '#f59e0b',
  TOUR_COMPLETED: '#10b981',
  QUALIFIED: '#06b6d4',
  CONVERTING: '#eab308',
  CONVERTED: '#22c55e',
  PLACEMENT_OFFERED: '#14b8a6',
  PLACEMENT_ACCEPTED: '#059669',
  CLOSED_LOST: '#ef4444',
};

const SOURCE_COLORS: Record<string, string> = {
  WEBSITE: '#3b82f6',
  PHONE: '#10b981',
  REFERRAL: '#8b5cf6',
  WALK_IN: '#f59e0b',
  SOCIAL_MEDIA: '#ec4899',
  ADVERTISEMENT: '#06b6d4',
  OTHER: '#6b7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  NONE: '#6b7280',
};

export function calculateInquiryAnalytics(
  inquiries: InquiryForAnalytics[]
): InquiryAnalytics {
  const totalInquiries = inquiries.length;
  
  // Active inquiries (not converted, lost, or fully closed)
  const activeStatuses = [
    InquiryStatus.NEW,
    InquiryStatus.CONTACTED,
    InquiryStatus.TOUR_SCHEDULED,
    InquiryStatus.TOUR_COMPLETED,
    InquiryStatus.QUALIFIED,
    InquiryStatus.CONVERTING,
    InquiryStatus.PLACEMENT_OFFERED,
    InquiryStatus.PLACEMENT_ACCEPTED,
  ];
  const activeInquiries = inquiries.filter(i => activeStatuses.includes(i.status)).length;
  
  // Converted inquiries
  const convertedInquiries = inquiries.filter(
    i => i.status === InquiryStatus.CONVERTED || i.convertedResident
  ).length;
  
  // Lost inquiries
  const lostInquiries = inquiries.filter(i => i.status === InquiryStatus.CLOSED_LOST).length;
  
  // Conversion rate
  const conversionRate = totalInquiries > 0 
    ? Math.round((convertedInquiries / totalInquiries) * 100)
    : 0;
  
  // Average time to conversion (in days)
  const convertedWithDates = inquiries.filter(
    i => i.conversionDate && i.createdAt
  );
  const conversionTimes = convertedWithDates.map(i => 
    differenceInDays(new Date(i.conversionDate!), new Date(i.createdAt))
  );
  const averageTimeToConversion = conversionTimes.length > 0
    ? Math.round(conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length)
    : 0;
  
  // Average response time (assuming NEW -> CONTACTED is first response, in hours)
  const contactedInquiries = inquiries.filter(
    i => i.status !== InquiryStatus.NEW && i.updatedAt !== i.createdAt
  );
  const responseTimes = contactedInquiries.map(i =>
    differenceInHours(new Date(i.updatedAt), new Date(i.createdAt))
  );
  const averageResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
    : 0;
  
  // Tour metrics
  const toursScheduled = inquiries.filter(
    i => i.status === InquiryStatus.TOUR_SCHEDULED || 
         i.status === InquiryStatus.TOUR_COMPLETED ||
         i.tourDate
  ).length;
  
  const toursCompleted = inquiries.filter(
    i => i.status === InquiryStatus.TOUR_COMPLETED
  ).length;
  
  const tourCompletionRate = toursScheduled > 0
    ? Math.round((toursCompleted / toursScheduled) * 100)
    : 0;
  
  const toursWithDates = inquiries.filter(i => i.tourDate && i.createdAt);
  const daysToTour = toursWithDates.map(i =>
    differenceInDays(new Date(i.tourDate!), new Date(i.createdAt))
  );
  const averageDaysToTour = daysToTour.length > 0
    ? Math.round(daysToTour.reduce((sum, days) => sum + days, 0) / daysToTour.length)
    : 0;
  
  // By status distribution
  const statusCounts: Record<string, number> = {};
  inquiries.forEach(i => {
    const status = i.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  const byStatusData = Object.entries(statusCounts).map(([status, count]) => ({
    status: status.replace(/_/g, ' '),
    count,
    percentage: totalInquiries > 0 ? Math.round((count / totalInquiries) * 100) : 0,
    fill: STATUS_COLORS[status] || '#6b7280',
  })).sort((a, b) => b.count - a.count);
  
  // By source distribution (from family data)
  const sourceCounts: Record<string, number> = {};
  inquiries.forEach(i => {
    const source = i.family?.source || 'OTHER';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });
  
  const bySourceData = Object.entries(sourceCounts).map(([source, count]) => ({
    source: source.replace(/_/g, ' '),
    count,
    percentage: totalInquiries > 0 ? Math.round((count / totalInquiries) * 100) : 0,
    fill: SOURCE_COLORS[source] || '#6b7280',
  })).sort((a, b) => b.count - a.count);
  
  // By priority distribution
  const priorityCounts: Record<string, number> = {};
  inquiries.forEach(i => {
    const priority = i.family?.priority || 'NONE';
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
  });
  
  const byPriorityData = Object.entries(priorityCounts).map(([priority, count]) => ({
    priority: priority.replace(/_/g, ' '),
    count,
    fill: PRIORITY_COLORS[priority] || '#6b7280',
  })).sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2, NONE: 3 };
    return (order[a.priority as keyof typeof order] || 3) - (order[b.priority as keyof typeof order] || 3);
  });
  
  // Conversion funnel
  const funnelStages = [
    { stage: 'NEW', status: InquiryStatus.NEW },
    { stage: 'CONTACTED', status: InquiryStatus.CONTACTED },
    { stage: 'TOUR', statuses: [InquiryStatus.TOUR_SCHEDULED, InquiryStatus.TOUR_COMPLETED] },
    { stage: 'QUALIFIED', status: InquiryStatus.QUALIFIED },
    { stage: 'CONVERTING', statuses: [InquiryStatus.CONVERTING, InquiryStatus.PLACEMENT_OFFERED, InquiryStatus.PLACEMENT_ACCEPTED] },
    { stage: 'CONVERTED', status: InquiryStatus.CONVERTED },
  ];
  
  const conversionFunnelData = funnelStages.map((stage, index) => {
    let count = 0;
    if ('status' in stage) {
      count = inquiries.filter(i => i.status === stage.status).length;
    } else if ('statuses' in stage && stage.statuses) {
      count = inquiries.filter(i => stage.statuses?.includes(i.status)).length;
    }
    
    const conversionRate = index === 0 
      ? 100 
      : totalInquiries > 0 
        ? Math.round((count / totalInquiries) * 100)
        : 0;
    
    return {
      stage: stage.stage,
      count,
      conversionRate,
    };
  });
  
  // Monthly trends (last 6 months)
  const monthlyTrendsData = calculateMonthlyTrends(inquiries);
  
  return {
    totalInquiries,
    activeInquiries,
    convertedInquiries,
    lostInquiries,
    conversionRate,
    averageTimeToConversion,
    averageResponseTime,
    byStatusData,
    bySourceData,
    byPriorityData,
    conversionFunnelData,
    monthlyTrendsData,
    tourMetrics: {
      toursScheduled,
      toursCompleted,
      tourCompletionRate,
      averageDaysToTour,
    },
  };
}

function calculateMonthlyTrends(inquiries: InquiryForAnalytics[]) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const trends: { month: string; inquiries: number; conversions: number }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${monthNames[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
    
    const monthInquiries = inquiries.filter(inq => {
      const createdDate = new Date(inq.createdAt);
      return createdDate.getMonth() === date.getMonth() &&
             createdDate.getFullYear() === date.getFullYear();
    }).length;
    
    const monthConversions = inquiries.filter(inq => {
      if (!inq.conversionDate) return false;
      const conversionDate = new Date(inq.conversionDate);
      return conversionDate.getMonth() === date.getMonth() &&
             conversionDate.getFullYear() === date.getFullYear();
    }).length;
    
    trends.push({ 
      month: monthKey, 
      inquiries: monthInquiries,
      conversions: monthConversions,
    });
  }
  
  return trends;
}

export function getDaysSinceInquiry(createdAt: Date | string): number {
  const today = new Date();
  const created = new Date(createdAt);
  return differenceInDays(today, created);
}

export function getHoursSinceContact(updatedAt: Date | string): number {
  const now = new Date();
  const updated = new Date(updatedAt);
  return differenceInHours(now, updated);
}
