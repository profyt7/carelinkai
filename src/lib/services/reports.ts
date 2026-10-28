'use server';

import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface ReportConfig {
  startDate: Date;
  endDate: Date;
  homeIds?: string[];
  groupBy?: string;
  includeCharts?: boolean;
  includeSummary?: boolean;
  includeDetails?: boolean;
}

export interface ReportData {
  title: string;
  type: string;
  dateRange: { start: Date; end: Date };
  summary?: any;
  charts?: any[];
  tables?: any[];
  metadata: {
    generatedAt: Date;
    generatedBy: string;
  };
}

// ==================== OCCUPANCY REPORT ====================
export async function generateOccupancyReport(
  config: ReportConfig
): Promise<ReportData> {
  const { startDate, endDate, homeIds } = config;

  // Get all facilities with current occupancy
  const homes = await prisma.assistedLivingHome.findMany({
    where: {
      ...(homeIds?.length ? { id: { in: homeIds } } : {}),
      status: 'ACTIVE',
    },
    include: {
      residents: {
        where: { status: 'ACTIVE' },
      },
    },
  });

  // Calculate occupancy metrics
  const occupancyData = homes?.map((home) => ({
    homeId: home?.id ?? '',
    homeName: home?.name ?? 'Unknown Home',
    capacity: home?.capacity ?? 0,
    currentOccupancy: home?.currentOccupancy ?? 0,
    occupancyRate: home?.capacity
      ? ((home?.currentOccupancy ?? 0) / (home?.capacity ?? 1)) * 100
      : 0,
    availableBeds: (home?.capacity ?? 0) - (home?.currentOccupancy ?? 0),
  })) ?? [];

  // Calculate occupancy by care level
  const careLevelData = await prisma.resident.groupBy({
    by: ['homeId'],
    where: {
      status: 'ACTIVE',
      ...(homeIds?.length ? { homeId: { in: homeIds } } : {}),
    },
    _count: true,
  });

  // Calculate average length of stay
  const avgLengthOfStay = await prisma.resident.findMany({
    where: {
      status: 'ACTIVE',
      admissionDate: { not: null },
      ...(homeIds?.length ? { homeId: { in: homeIds } } : {}),
    },
    select: {
      admissionDate: true,
    },
  });

  const avgDays =
    avgLengthOfStay?.reduce((acc, resident) => {
      const days = resident?.admissionDate
        ? Math.floor(
            (new Date().getTime() - new Date(resident?.admissionDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;
      return acc + days;
    }, 0) ?? 0;

  const averageLOS = avgLengthOfStay?.length
    ? Math.floor(avgDays / avgLengthOfStay?.length)
    : 0;

  // Overall metrics
  const totalCapacity = occupancyData?.reduce((sum, h) => sum + (h?.capacity ?? 0), 0) ?? 0;
  const totalOccupied =
    occupancyData?.reduce((sum, h) => sum + (h?.currentOccupancy ?? 0), 0) ?? 0;
  const overallOccupancyRate = totalCapacity
    ? (totalOccupied / totalCapacity) * 100
    : 0;

  return {
    title: 'Occupancy Report',
    type: 'OCCUPANCY',
    dateRange: { start: startDate, end: endDate },
    summary: {
      totalFacilities: homes?.length ?? 0,
      totalCapacity,
      totalOccupied,
      overallOccupancyRate: overallOccupancyRate?.toFixed?.(2) ?? 0,
      averageLengthOfStay: averageLOS,
    },
    tables: [
      {
        title: 'Facility Occupancy',
        headers: [
          'Facility',
          'Capacity',
          'Occupied',
          'Occupancy Rate',
          'Available Beds',
        ],
        rows: occupancyData?.map?.((d) => [
          d?.homeName ?? '',
          d?.capacity?.toString?.() ?? '0',
          d?.currentOccupancy?.toString?.() ?? '0',
          `${d?.occupancyRate?.toFixed?.(1) ?? 0}%`,
          d?.availableBeds?.toString?.() ?? '0',
        ]) ?? [],
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Occupancy by Facility',
        data: occupancyData?.map?.((d) => ({
          name: d?.homeName ?? '',
          occupancy: d?.currentOccupancy ?? 0,
          capacity: d?.capacity ?? 0,
        })) ?? [],
      },
    ],
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'System',
    },
  };
}

// ==================== FINANCIAL REPORT ====================
export async function generateFinancialReport(
  config: ReportConfig
): Promise<ReportData> {
  const { startDate, endDate, homeIds } = config;

  // Get all active residents with their home info
  const residents = await prisma.resident.findMany({
    where: {
      status: 'ACTIVE',
      ...(homeIds?.length ? { homeId: { in: homeIds } } : {}),
    },
    include: {
      home: true,
    },
  });

  // Estimate revenue based on care level (placeholder pricing)
  const careLevelPricing: Record<string, number> = {
    INDEPENDENT: 3000,
    ASSISTED: 5000,
    MEMORY_CARE: 7000,
    SKILLED_NURSING: 9000,
  };

  const revenueByHome = residents?.reduce?.((acc: any, resident) => {
    const homeId = resident?.homeId ?? '';
    const homeName = resident?.home?.name ?? 'Unknown';
    // Use first care level if available
    const careLevel = resident?.home?.careLevel?.[0] ?? 'ASSISTED';
    const monthlyRevenue = careLevelPricing?.[careLevel] ?? 5000;

    if (!acc?.[homeId]) {
      acc[homeId] = {
        homeId,
        homeName,
        residentCount: 0,
        monthlyRevenue: 0,
      };
    }

    acc[homeId].residentCount += 1;
    acc[homeId].monthlyRevenue += monthlyRevenue;

    return acc;
  }, {}) ?? {};

  const revenueData = Object.values(revenueByHome ?? {}) as any[];
  const totalMonthlyRevenue =
    revenueData?.reduce?.((sum, h: any) => sum + (h?.monthlyRevenue ?? 0), 0) ?? 0;
  const totalAnnualRevenue = totalMonthlyRevenue * 12;

  return {
    title: 'Financial Report',
    type: 'FINANCIAL',
    dateRange: { start: startDate, end: endDate },
    summary: {
      totalMonthlyRevenue: totalMonthlyRevenue?.toFixed?.(2) ?? 0,
      projectedAnnualRevenue: totalAnnualRevenue?.toFixed?.(2) ?? 0,
      averageRevenuePerResident: residents?.length
        ? (totalMonthlyRevenue / residents?.length)?.toFixed?.(2) ?? 0
        : 0,
      totalResidents: residents?.length ?? 0,
    },
    tables: [
      {
        title: 'Revenue by Facility',
        headers: ['Facility', 'Residents', 'Monthly Revenue', 'Annual Revenue'],
        rows: revenueData?.map?.((d: any) => [
          d?.homeName ?? '',
          d?.residentCount?.toString?.() ?? '0',
          `$${d?.monthlyRevenue?.toFixed?.(2) ?? 0}`,
          `$${((d?.monthlyRevenue ?? 0) * 12)?.toFixed?.(2) ?? 0}`,
        ]) ?? [],
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Monthly Revenue by Facility',
        data: revenueData?.map?.((d: any) => ({
          name: d?.homeName ?? '',
          revenue: d?.monthlyRevenue ?? 0,
        })) ?? [],
      },
    ],
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'System',
    },
  };
}

// ==================== INCIDENT REPORT ====================
export async function generateIncidentReport(
  config: ReportConfig
): Promise<ReportData> {
  const { startDate, endDate, homeIds } = config;

  const incidents = await prisma.residentIncident.findMany({
    where: {
      occurredAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(homeIds?.length
        ? {
            resident: {
              homeId: { in: homeIds },
            },
          }
        : {}),
    },
    include: {
      resident: {
        include: {
          home: true,
        },
      },
    },
  });

  // Group by severity
  const bySeverity = incidents?.reduce?.((acc: any, incident) => {
    const severity = incident?.severity ?? 'Unknown';
    acc[severity] = (acc?.[severity] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  // Group by type
  const byType = incidents?.reduce?.((acc: any, incident) => {
    const type = incident?.type ?? 'Unknown';
    acc[type] = (acc?.[type] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  // Group by facility
  const byHome = incidents?.reduce?.((acc: any, incident) => {
    const homeName = incident?.resident?.home?.name ?? 'Unknown';
    acc[homeName] = (acc?.[homeName] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  return {
    title: 'Incident Report',
    type: 'INCIDENT',
    dateRange: { start: startDate, end: endDate },
    summary: {
      totalIncidents: incidents?.length ?? 0,
      bySeverity,
      byType,
      criticalIncidents:
        incidents?.filter?.((i) => i?.severity === 'CRITICAL')?.length ?? 0,
    },
    tables: [
      {
        title: 'Recent Incidents',
        headers: [
          'Date',
          'Resident',
          'Type',
          'Severity',
          'Status',
          'Facility',
        ],
        rows: incidents
          ?.slice?.(0, 20)
          ?.map?.((i) => [
            format(new Date(i?.occurredAt ?? new Date()), 'MM/dd/yyyy'),
            `${i?.resident?.firstName ?? ''} ${i?.resident?.lastName ?? ''}`,
            i?.type ?? 'Unknown',
            i?.severity ?? 'Unknown',
            i?.status ?? 'Unknown',
            i?.resident?.home?.name ?? 'Unknown',
          ]) ?? [],
      },
    ],
    charts: [
      {
        type: 'pie',
        title: 'Incidents by Severity',
        data: Object.entries(bySeverity ?? {})?.map?.(([name, value]) => ({
          name,
          value,
        })) ?? [],
      },
      {
        type: 'bar',
        title: 'Incidents by Type',
        data: Object.entries(byType ?? {})?.map?.(([name, value]) => ({
          name,
          value,
        })) ?? [],
      },
    ],
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'System',
    },
  };
}

// ==================== CAREGIVER REPORT ====================
export async function generateCaregiverReport(
  config: ReportConfig
): Promise<ReportData> {
  const { startDate, endDate, homeIds } = config;

  const caregivers = await prisma.caregiver.findMany({
    where: {
      employmentStatus: 'ACTIVE',
    },
    include: {
      shifts: {
        where: {
          startTime: {
            gte: startDate,
            lte: endDate,
          },
          ...(homeIds?.length ? { homeId: { in: homeIds } } : {}),
        },
      },
      certifications: true,
      user: true,
    },
  });

  const caregiverData = caregivers?.map?.((cg) => {
    const totalHours =
      cg?.shifts?.reduce?.((sum, shift) => {
        const hours =
          (new Date(shift?.endTime ?? new Date()).getTime() -
            new Date(shift?.startTime ?? new Date()).getTime()) /
          (1000 * 60 * 60);
        return sum + hours;
      }, 0) ?? 0;

    const expiringCerts =
      cg?.certifications?.filter?.((cert) => {
        const expiryDate = new Date(cert?.expiryDate ?? new Date());
        const daysUntilExpiry = Math.floor(
          (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry > 0 && daysUntilExpiry <= 60;
      })?.length ?? 0;

    return {
      caregiverId: cg?.id ?? '',
      name: `${cg?.user?.firstName ?? ''} ${cg?.user?.lastName ?? ''}`,
      totalHours,
      shiftsWorked: cg?.shifts?.length ?? 0,
      certifications: cg?.certifications?.length ?? 0,
      expiringCerts,
    };
  }) ?? [];

  const totalHours = caregiverData?.reduce?.((sum, cg) => sum + (cg?.totalHours ?? 0), 0) ?? 0;
  const totalShifts = caregiverData?.reduce?.((sum, cg) => sum + (cg?.shiftsWorked ?? 0), 0) ?? 0;

  return {
    title: 'Caregiver Report',
    type: 'CAREGIVER',
    dateRange: { start: startDate, end: endDate },
    summary: {
      totalCaregivers: caregivers?.length ?? 0,
      totalHours: totalHours?.toFixed?.(2) ?? 0,
      totalShifts,
      averageHoursPerCaregiver: caregivers?.length
        ? (totalHours / caregivers?.length)?.toFixed?.(2) ?? 0
        : 0,
    },
    tables: [
      {
        title: 'Caregiver Performance',
        headers: [
          'Name',
          'Hours Worked',
          'Shifts',
          'Certifications',
          'Expiring Soon',
        ],
        rows: caregiverData?.map?.((cg) => [
          cg?.name ?? '',
          cg?.totalHours?.toFixed?.(2) ?? '0',
          cg?.shiftsWorked?.toString?.() ?? '0',
          cg?.certifications?.toString?.() ?? '0',
          cg?.expiringCerts?.toString?.() ?? '0',
        ]) ?? [],
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Hours Worked by Caregiver',
        data: caregiverData
          ?.slice?.(0, 10)
          ?.map?.((cg) => ({
            name: cg?.name ?? '',
            hours: cg?.totalHours ?? 0,
          })) ?? [],
      },
    ],
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'System',
    },
  };
}

// ==================== COMPLIANCE REPORT ====================
export async function generateComplianceReport(
  config: ReportConfig
): Promise<ReportData> {
  const { homeIds } = config;

  // Get compliance items
  const complianceItems = await prisma.residentComplianceItem.findMany({
    where: {
      ...(homeIds?.length
        ? {
            resident: {
              homeId: { in: homeIds },
            },
          }
        : {}),
    },
    include: {
      resident: {
        include: {
          home: true,
        },
      },
    },
  });

  // Group by status
  const byStatus = complianceItems?.reduce?.((acc: any, item) => {
    const status = item?.status ?? 'Unknown';
    acc[status] = (acc?.[status] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  // Find items expiring soon
  const expiringSoon = complianceItems?.filter?.((item) => {
    if (!item?.expiryDate) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(item?.expiryDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }) ?? [];

  return {
    title: 'Compliance Report',
    type: 'COMPLIANCE',
    dateRange: { start: new Date(), end: new Date() },
    summary: {
      totalItems: complianceItems?.length ?? 0,
      byStatus,
      expiringSoon: expiringSoon?.length ?? 0,
      expired: byStatus?.['EXPIRED'] ?? 0,
    },
    tables: [
      {
        title: 'Items Expiring Soon',
        headers: ['Resident', 'Type', 'Expiry Date', 'Days Remaining', 'Facility'],
        rows: expiringSoon
          ?.slice?.(0, 20)
          ?.map?.((item) => {
            const daysRemaining = item?.expiryDate
              ? Math.floor(
                  (new Date(item?.expiryDate).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0;
            return [
              `${item?.resident?.firstName ?? ''} ${item?.resident?.lastName ?? ''}`,
              item?.type ?? 'Unknown',
              item?.expiryDate
                ? format(new Date(item?.expiryDate), 'MM/dd/yyyy')
                : 'N/A',
              daysRemaining?.toString?.() ?? '0',
              item?.resident?.home?.name ?? 'Unknown',
            ];
          }) ?? [],
      },
    ],
    charts: [
      {
        type: 'pie',
        title: 'Compliance Status',
        data: Object.entries(byStatus ?? {})?.map?.(([name, value]) => ({
          name,
          value,
        })) ?? [],
      },
    ],
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'System',
    },
  };
}

// ==================== INQUIRY REPORT ====================
export async function generateInquiryReport(
  config: ReportConfig
): Promise<ReportData> {
  const { startDate, endDate, homeIds } = config;

  const inquiries = await prisma.inquiry.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(homeIds?.length ? { homeId: { in: homeIds } } : {}),
    },
    include: {
      home: true,
      convertedResident: true,
    },
  });

  // Group by status
  const byStatus = inquiries?.reduce?.((acc: any, inquiry) => {
    const status = inquiry?.status ?? 'Unknown';
    acc[status] = (acc?.[status] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  // Calculate conversion rate
  const convertedCount =
    inquiries?.filter?.((i) => i?.convertedToResidentId)?.length ?? 0;
  const conversionRate = inquiries?.length
    ? (convertedCount / inquiries?.length) * 100
    : 0;

  // Group by home
  const byHome = inquiries?.reduce?.((acc: any, inquiry) => {
    const homeName = inquiry?.home?.name ?? 'Unknown';
    if (!acc?.[homeName]) {
      acc[homeName] = { total: 0, converted: 0 };
    }
    acc[homeName].total += 1;
    if (inquiry?.convertedToResidentId) {
      acc[homeName].converted += 1;
    }
    return acc;
  }, {}) ?? {};

  return {
    title: 'Inquiry Report',
    type: 'INQUIRY',
    dateRange: { start: startDate, end: endDate },
    summary: {
      totalInquiries: inquiries?.length ?? 0,
      byStatus,
      conversionRate: conversionRate?.toFixed?.(2) ?? 0,
      converted: convertedCount,
    },
    tables: [
      {
        title: 'Inquiries by Facility',
        headers: ['Facility', 'Total Inquiries', 'Converted', 'Conversion Rate'],
        rows: Object.entries(byHome ?? {})?.map?.(([name, data]: [string, any]) => {
          const rate = data?.total ? (data?.converted / data?.total) * 100 : 0;
          return [
            name,
            data?.total?.toString?.() ?? '0',
            data?.converted?.toString?.() ?? '0',
            `${rate?.toFixed?.(1) ?? 0}%`,
          ];
        }) ?? [],
      },
    ],
    charts: [
      {
        type: 'funnel',
        title: 'Inquiry Pipeline',
        data: Object.entries(byStatus ?? {})?.map?.(([name, value]) => ({
          name,
          value,
        })) ?? [],
      },
    ],
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'System',
    },
  };
}

// ==================== RESIDENT REPORT ====================
export async function generateResidentReport(
  config: ReportConfig
): Promise<ReportData> {
  const { homeIds } = config;

  const residents = await prisma.resident.findMany({
    where: {
      status: 'ACTIVE',
      ...(homeIds?.length ? { homeId: { in: homeIds } } : {}),
    },
    include: {
      home: true,
    },
  });

  // Calculate age distribution
  const ageGroups = residents?.reduce?.((acc: any, resident) => {
    const age = Math.floor(
      (new Date().getTime() - new Date(resident?.dateOfBirth ?? new Date()).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
    );
    let group = '95+';
    if (age < 75) group = '65-74';
    else if (age < 85) group = '75-84';
    else if (age < 95) group = '85-94';

    acc[group] = (acc?.[group] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  // Gender distribution
  const genderDistribution = residents?.reduce?.((acc: any, resident) => {
    const gender = resident?.gender ?? 'Unknown';
    acc[gender] = (acc?.[gender] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  // Care level distribution
  const careLevelDistribution = residents?.reduce?.((acc: any, resident) => {
    const careLevel = resident?.home?.careLevel?.[0] ?? 'Unknown';
    acc[careLevel] = (acc?.[careLevel] ?? 0) + 1;
    return acc;
  }, {}) ?? {};

  return {
    title: 'Resident Report',
    type: 'RESIDENT',
    dateRange: { start: new Date(), end: new Date() },
    summary: {
      totalResidents: residents?.length ?? 0,
      ageGroups,
      genderDistribution,
      careLevelDistribution,
    },
    tables: [
      {
        title: 'Resident Demographics',
        headers: ['Category', 'Count', 'Percentage'],
        rows: [
          ...Object.entries(ageGroups ?? {})?.map?.(([age, count]: [string, any]) => [
            `Age ${age}`,
            count?.toString?.() ?? '0',
            `${residents?.length ? ((count / residents?.length) * 100)?.toFixed?.(1) ?? 0 : 0}%`,
          ]) ?? [],
          ...Object.entries(genderDistribution ?? {})?.map?.(
            ([gender, count]: [string, any]) => [
              gender,
              count?.toString?.() ?? '0',
              `${residents?.length ? ((count / residents?.length) * 100)?.toFixed?.(1) ?? 0 : 0}%`,
            ]
          ) ?? [],
        ],
      },
    ],
    charts: [
      {
        type: 'pie',
        title: 'Age Distribution',
        data: Object.entries(ageGroups ?? {})?.map?.(([name, value]) => ({
          name,
          value,
        })) ?? [],
      },
      {
        type: 'pie',
        title: 'Gender Distribution',
        data: Object.entries(genderDistribution ?? {})?.map?.(([name, value]) => ({
          name,
          value,
        })) ?? [],
      },
    ],
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'System',
    },
  };
}

// ==================== FACILITY COMPARISON REPORT ====================
export async function generateFacilityComparisonReport(
  config: ReportConfig
): Promise<ReportData> {
  const { startDate, endDate, homeIds } = config;

  const homes = await prisma.assistedLivingHome.findMany({
    where: {
      ...(homeIds?.length ? { id: { in: homeIds } } : {}),
      status: 'ACTIVE',
    },
    include: {
      residents: {
        where: { status: 'ACTIVE' },
      },
      inquiries: {
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      reviews: true,
      caregiverShifts: {
        where: {
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          caregiver: true,
        },
      },
    },
  });

  const comparisonData = homes?.map?.((home) => {
    const occupancyRate = home?.capacity
      ? ((home?.currentOccupancy ?? 0) / (home?.capacity ?? 1)) * 100
      : 0;

    const avgRating =
      home?.reviews?.length
        ? home?.reviews?.reduce?.((sum, r) => sum + (r?.rating ?? 0), 0) /
          home?.reviews?.length
        : 0;

    const conversionRate = home?.inquiries?.length
      ? (home?.inquiries?.filter?.((i) => i?.convertedToResidentId)?.length /
          home?.inquiries?.length) *
        100
      : 0;

    const staffCount = new Set(
      home?.caregiverShifts?.map?.((s) => s?.caregiverId)
    )?.size ?? 0;
    const staffRatio = home?.residents?.length
      ? staffCount / home?.residents?.length
      : 0;

    return {
      name: home?.name ?? '',
      occupancyRate,
      avgRating,
      totalReviews: home?.reviews?.length ?? 0,
      inquiryCount: home?.inquiries?.length ?? 0,
      conversionRate,
      residentCount: home?.residents?.length ?? 0,
      staffRatio,
      capacity: home?.capacity ?? 0,
    };
  }) ?? [];

  // Calculate performance scores (weighted average)
  const scoredData = comparisonData?.map?.((d) => ({
    ...d,
    performanceScore:
      (d?.occupancyRate ?? 0) * 0.3 +
      (d?.avgRating ?? 0) * 20 * 0.2 +
      (d?.conversionRate ?? 0) * 0.2 +
      (d?.staffRatio ?? 0) * 100 * 0.3,
  })) ?? [];

  // Sort by performance score
  scoredData?.sort?.((a, b) => (b?.performanceScore ?? 0) - (a?.performanceScore ?? 0));

  return {
    title: 'Facility Comparison Report',
    type: 'FACILITY_COMPARISON',
    dateRange: { start: startDate, end: endDate },
    summary: {
      totalFacilities: homes?.length ?? 0,
      avgOccupancyRate:
        comparisonData && comparisonData.length > 0
          ? comparisonData.reduce((sum, d) => sum + (d?.occupancyRate ?? 0), 0) / comparisonData.length
          : 0,
      avgRating:
        comparisonData && comparisonData.length > 0
          ? comparisonData.reduce((sum, d) => sum + (d?.avgRating ?? 0), 0) / comparisonData.length
          : 0,
    },
    tables: [
      {
        title: 'Facility Performance Comparison',
        headers: [
          'Rank',
          'Facility',
          'Occupancy',
          'Rating',
          'Inquiries',
          'Conversion',
          'Staff Ratio',
          'Score',
        ],
        rows: scoredData?.map?.((d, idx) => [
          (idx + 1)?.toString?.() ?? '0',
          d?.name ?? '',
          `${d?.occupancyRate?.toFixed?.(1) ?? 0}%`,
          d?.avgRating?.toFixed?.(1) ?? '0',
          d?.inquiryCount?.toString?.() ?? '0',
          `${d?.conversionRate?.toFixed?.(1) ?? 0}%`,
          d?.staffRatio?.toFixed?.(2) ?? '0',
          d?.performanceScore?.toFixed?.(1) ?? '0',
        ]) ?? [],
      },
    ],
    charts: [
      {
        type: 'bar',
        title: 'Performance Score by Facility',
        data: scoredData?.map?.((d) => ({
          name: d?.name ?? '',
          score: d?.performanceScore ?? 0,
        })) ?? [],
      },
    ],
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'System',
    },
  };
}

// ==================== MAIN REPORT GENERATOR ====================
export async function generateReport(
  type: string,
  config: ReportConfig
): Promise<ReportData> {
  switch (type) {
    case 'OCCUPANCY':
      return generateOccupancyReport(config);
    case 'FINANCIAL':
      return generateFinancialReport(config);
    case 'INCIDENT':
      return generateIncidentReport(config);
    case 'CAREGIVER':
      return generateCaregiverReport(config);
    case 'COMPLIANCE':
      return generateComplianceReport(config);
    case 'INQUIRY':
      return generateInquiryReport(config);
    case 'RESIDENT':
      return generateResidentReport(config);
    case 'FACILITY_COMPARISON':
      return generateFacilityComparisonReport(config);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}
