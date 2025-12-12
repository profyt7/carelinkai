import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const homeId = params.id;

    // Fetch home with relations
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      include: {
        address: true,
        residents: {
          where: { archivedAt: null },
          select: {
            id: true,
            dateOfBirth: true,
            gender: true,
            status: true,
            admissionDate: true,
            careNeeds: true,
          },
        },
        inquiries: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            tourDate: true,
            convertedToResidentId: true,
          },
        },
        caregiverShifts: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            caregiverId: true,
          },
        },
        reviews: {
          select: {
            id: true,
            rating: true,
            createdAt: true,
          },
        },
        licenses: {
          select: {
            id: true,
            type: true,
            expirationDate: true,
            status: true,
          },
        },
        inspections: {
          select: {
            id: true,
            inspectionDate: true,
            result: true,
          },
        },
      },
    });

    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }

    // Verify ownership (if not admin)
    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || operator.id !== home.operatorId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get incidents for residents at this home
    const residentIds = home.residents?.map(r => r.id) ?? [];
    const incidents = residentIds.length > 0 
      ? await prisma.residentIncident.findMany({
          where: { residentId: { in: residentIds } },
          select: {
            id: true,
            type: true,
            severity: true,
            status: true,
            occurredAt: true,
          },
        })
      : [];

    // Calculate analytics
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    // A. Occupancy Analytics
    const activeResidents = home.residents?.filter(r => r.status === 'ACTIVE') ?? [];
    const currentOccupancy = activeResidents.length;
    const occupancyRate = home.capacity > 0 ? (currentOccupancy / home.capacity) * 100 : 0;

    // Occupancy by care level (estimate from residents' care needs)
    const occupancyByCareLevel = {
      INDEPENDENT: 0,
      ASSISTED: 0,
      MEMORY_CARE: 0,
      SKILLED_NURSING: 0,
    };

    activeResidents.forEach((resident: any) => {
      const careNeeds = resident.careNeeds as any;
      if (careNeeds?.level) {
        const level = careNeeds.level as keyof typeof occupancyByCareLevel;
        if (level in occupancyByCareLevel) {
          occupancyByCareLevel[level]++;
        }
      } else {
        occupancyByCareLevel.ASSISTED++; // default
      }
    });

    // Average length of stay (in days)
    const activeWithAdmission = activeResidents.filter(r => r.admissionDate);
    const totalDaysStay = activeWithAdmission.reduce((sum, r) => {
      const days = Math.floor((now.getTime() - new Date(r.admissionDate!).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    const avgLengthOfStay = activeWithAdmission.length > 0 ? totalDaysStay / activeWithAdmission.length : 0;

    // Turnover rate (residents left in last 6 months / total residents)
    const dischargedRecent = home.residents?.filter(r => 
      r.status === 'DISCHARGED' && r.admissionDate && new Date(r.admissionDate) >= sixMonthsAgo
    ) ?? [];
    const turnoverRate = home.residents.length > 0 ? (dischargedRecent.length / home.residents.length) * 100 : 0;

    // Occupancy trend (last 6 months) - simplified calculation
    const occupancyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      // Simplified: use current occupancy for all months (in production, you'd track historical data)
      occupancyTrend.push({
        month: monthName,
        occupancy: occupancyRate,
      });
    }

    // B. Inquiry & Conversion Analytics
    const totalInquiries = home.inquiries?.length ?? 0;
    const convertedInquiries = home.inquiries?.filter(i => i.convertedToResidentId)?.length ?? 0;
    const conversionRate = totalInquiries > 0 ? (convertedInquiries / totalInquiries) * 100 : 0;

    // Inquiry funnel
    const inquiryFunnel = {
      NEW: home.inquiries?.filter(i => i.status === 'NEW')?.length ?? 0,
      CONTACTED: home.inquiries?.filter(i => i.status === 'CONTACTED')?.length ?? 0,
      TOUR_SCHEDULED: home.inquiries?.filter(i => i.status === 'TOUR_SCHEDULED')?.length ?? 0,
      TOUR_COMPLETED: home.inquiries?.filter(i => i.status === 'TOUR_COMPLETED')?.length ?? 0,
      QUALIFIED: home.inquiries?.filter(i => i.status === 'QUALIFIED')?.length ?? 0,
      PLACEMENT_OFFERED: home.inquiries?.filter(i => i.status === 'PLACEMENT_OFFERED')?.length ?? 0,
      PLACEMENT_ACCEPTED: home.inquiries?.filter(i => i.status === 'PLACEMENT_ACCEPTED')?.length ?? 0,
      CLOSED_LOST: home.inquiries?.filter(i => i.status === 'CLOSED_LOST')?.length ?? 0,
    };

    const toursThisMonth = home.inquiries?.filter(i => 
      i.tourDate && new Date(i.tourDate) >= oneMonthAgo
    )?.length ?? 0;

    // C. Financial Overview
    const priceMin = Number(home.priceMin ?? 0);
    const priceMax = Number(home.priceMax ?? 0);
    const avgPrice = (priceMin + priceMax) / 2;
    const monthlyRevenue = currentOccupancy * avgPrice;
    const revenuePerResident = currentOccupancy > 0 ? monthlyRevenue / currentOccupancy : avgPrice;
    const projectedAnnualRevenue = monthlyRevenue * 12;

    // Revenue trend (simplified)
    const revenueTrend = occupancyTrend.map(item => ({
      month: item.month,
      revenue: (item.occupancy / 100) * home.capacity * avgPrice,
    }));

    // Revenue by care level (estimate)
    const revenueByCareLevel = {
      INDEPENDENT: occupancyByCareLevel.INDEPENDENT * priceMin,
      ASSISTED: occupancyByCareLevel.ASSISTED * avgPrice,
      MEMORY_CARE: occupancyByCareLevel.MEMORY_CARE * priceMax * 1.1,
      SKILLED_NURSING: occupancyByCareLevel.SKILLED_NURSING * priceMax * 1.2,
    };

    // D. Resident Demographics
    const ageDistribution = {
      '65-74': 0,
      '75-84': 0,
      '85-94': 0,
      '95+': 0,
    };

    activeResidents.forEach((resident: any) => {
      const age = Math.floor((now.getTime() - new Date(resident.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      if (age >= 65 && age <= 74) ageDistribution['65-74']++;
      else if (age >= 75 && age <= 84) ageDistribution['75-84']++;
      else if (age >= 85 && age <= 94) ageDistribution['85-94']++;
      else if (age >= 95) ageDistribution['95+']++;
    });

    const genderDistribution = {
      Male: activeResidents.filter((r: any) => r.gender === 'Male').length,
      Female: activeResidents.filter((r: any) => r.gender === 'Female').length,
      Other: activeResidents.filter((r: any) => r.gender !== 'Male' && r.gender !== 'Female').length,
    };

    const avgAge = activeResidents.reduce((sum, r: any) => {
      const age = Math.floor((now.getTime() - new Date(r.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      return sum + age;
    }, 0) / (activeResidents.length || 1);

    // E. Staff Utilization
    const uniqueCaregivers = new Set(home.caregiverShifts?.map(s => s.caregiverId).filter(Boolean));
    const totalStaff = uniqueCaregivers.size;
    const staffToResidentRatio = currentOccupancy > 0 && totalStaff > 0 ? totalStaff / currentOccupancy : 0;

    const shiftsThisMonth = home.caregiverShifts?.filter(s => 
      new Date(s.startTime) >= oneMonthAgo
    )?.length ?? 0;

    const totalShiftHours = home.caregiverShifts?.reduce((sum, shift) => {
      const hours = (new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0) ?? 0;

    const avgHoursPerCaregiver = totalStaff > 0 ? totalShiftHours / totalStaff : 0;

    // F. Incident Tracking
    const totalIncidents = incidents.length;
    const incidentsBySeverity = {
      LOW: incidents.filter(i => i.severity === 'Minor').length,
      MEDIUM: incidents.filter(i => i.severity === 'Moderate').length,
      HIGH: incidents.filter(i => i.severity === 'Severe').length,
      CRITICAL: incidents.filter(i => i.severity === 'Critical').length,
    };

    const incidentTypes = incidents.reduce((acc: Record<string, number>, incident) => {
      acc[incident.type] = (acc[incident.type] || 0) + 1;
      return acc;
    }, {});

    // Incidents trend (last 6 months)
    const incidentsTrend = occupancyTrend.map(item => ({
      month: item.month,
      incidents: incidents.filter(i => {
        const incidentMonth = new Date(i.occurredAt).toLocaleString('default', { month: 'short' });
        return incidentMonth === item.month;
      }).length,
    }));

    // G. Reviews & Ratings
    const totalReviews = home.reviews?.length ?? 0;
    const avgRating = totalReviews > 0
      ? home.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const ratingDistribution = {
      '1': home.reviews?.filter(r => r.rating === 1)?.length ?? 0,
      '2': home.reviews?.filter(r => r.rating === 2)?.length ?? 0,
      '3': home.reviews?.filter(r => r.rating === 3)?.length ?? 0,
      '4': home.reviews?.filter(r => r.rating === 4)?.length ?? 0,
      '5': home.reviews?.filter(r => r.rating === 5)?.length ?? 0,
    };

    const recentReviews = home.reviews
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ?.slice(0, 5) ?? [];

    // H. Facility Comparison (fetch other homes)
    const allHomes = await prisma.assistedLivingHome.findMany({
      where: { status: 'ACTIVE' },
      include: {
        residents: { where: { status: 'ACTIVE', archivedAt: null } },
        inquiries: true,
        reviews: true,
      },
    });

    const comparison = allHomes.map(h => {
      const occupancy = h.capacity > 0 ? (h.residents.length / h.capacity) * 100 : 0;
      const revenue = h.residents.length * (Number(h.priceMin ?? 0) + Number(h.priceMax ?? 0)) / 2;
      const rating = h.reviews.length > 0 ? h.reviews.reduce((sum, r) => sum + r.rating, 0) / h.reviews.length : 0;
      return {
        id: h.id,
        name: h.name,
        occupancy: Math.round(occupancy),
        revenue: Math.round(revenue),
        rating: rating.toFixed(1),
        inquiries: h.inquiries.length,
      };
    }).sort((a, b) => b.occupancy - a.occupancy);

    const ranking = comparison.findIndex(h => h.id === homeId) + 1;
    const performanceScore = Math.round(
      (occupancyRate * 0.4) + 
      (avgRating * 20 * 0.3) + 
      (conversionRate * 0.3)
    );

    return NextResponse.json({
      home: {
        id: home.id,
        name: home.name,
        capacity: home.capacity,
      },
      occupancy: {
        current: currentOccupancy,
        capacity: home.capacity,
        rate: Math.round(occupancyRate * 10) / 10,
        trend: occupancyTrend,
        byCareLevel: occupancyByCareLevel,
        avgLengthOfStay: Math.round(avgLengthOfStay),
        turnoverRate: Math.round(turnoverRate * 10) / 10,
      },
      inquiries: {
        total: totalInquiries,
        conversionRate: Math.round(conversionRate * 10) / 10,
        funnel: inquiryFunnel,
        toursThisMonth,
      },
      financial: {
        monthlyRevenue: Math.round(monthlyRevenue),
        revenueTrend,
        byCareLevel: revenueByCareLevel,
        revenuePerResident: Math.round(revenuePerResident),
        projectedAnnualRevenue: Math.round(projectedAnnualRevenue),
      },
      demographics: {
        ageDistribution,
        genderDistribution,
        careLevelDistribution: occupancyByCareLevel,
        avgAge: Math.round(avgAge),
      },
      staff: {
        total: totalStaff,
        staffToResidentRatio: Math.round(staffToResidentRatio * 100) / 100,
        shiftsThisMonth,
        avgHoursPerCaregiver: Math.round(avgHoursPerCaregiver),
      },
      incidents: {
        total: totalIncidents,
        bySeverity: incidentsBySeverity,
        byType: incidentTypes,
        trend: incidentsTrend,
      },
      reviews: {
        total: totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        distribution: ratingDistribution,
        recent: recentReviews,
      },
      comparison: {
        facilities: comparison.slice(0, 10),
        ranking,
        totalFacilities: allHomes.length,
        performanceScore,
      },
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
