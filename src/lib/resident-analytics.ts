import { differenceInDays } from 'date-fns';

export type ResidentAnalyticsData = {
  totalResidents: number;
  activeResidents: number;
  inactiveResidents: number;
  hospitalizedResidents: number;
  averageAge: number;
  occupancyRate: number;
  recentAdmissions: number; // Last 30 days
  
  byCareLevelData: {
    careLevel: string;
    count: number;
    percentage: number;
    fill: string;
  }[];
  
  byStatusData: {
    status: string;
    count: number;
    percentage: number;
    fill: string;
  }[];
  
  ageDistributionData: {
    ageRange: string;
    count: number;
  }[];
  
  admissionTrendsData: {
    month: string;
    count: number;
  }[];
};

export type ResidentForAnalytics = {
  id: string;
  status: string;
  careLevel: string;
  dateOfBirth: Date | string;
  admissionDate: Date | string;
  assessments?: any[];
  incidents?: any[];
  _count?: {
    assessments?: number;
    incidents?: number;
    caregiverAssignments?: number;
  };
};

const CARE_LEVEL_COLORS: Record<string, string> = {
  INDEPENDENT: '#10b981',
  ASSISTED_LIVING: '#3b82f6',
  MEMORY_CARE: '#8b5cf6',
  SKILLED_NURSING: '#f59e0b',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#10b981',
  INACTIVE: '#6b7280',
  HOSPITALIZED: '#f59e0b',
  DECEASED: '#ef4444',
};

export function calculateResidentAnalytics(
  residents: ResidentForAnalytics[],
  totalCapacity: number = 100
): ResidentAnalyticsData {
  const totalResidents = residents.length;
  const activeResidents = residents.filter(r => r.status === 'ACTIVE').length;
  const inactiveResidents = residents.filter(r => r.status === 'INACTIVE').length;
  const hospitalizedResidents = residents.filter(r => r.status === 'HOSPITALIZED').length;
  
  // Calculate average age
  const ages = residents.map(r => calculateAge(r.dateOfBirth));
  const averageAge = ages.length > 0 
    ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
    : 0;
  
  // Calculate occupancy rate
  const occupancyRate = totalCapacity > 0 
    ? Math.round((activeResidents / totalCapacity) * 100)
    : 0;
  
  // Recent admissions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentAdmissions = residents.filter(
    r => new Date(r.admissionDate) >= thirtyDaysAgo
  ).length;
  
  // By care level
  const careLevelCounts: Record<string, number> = {
    INDEPENDENT: 0,
    ASSISTED_LIVING: 0,
    MEMORY_CARE: 0,
    SKILLED_NURSING: 0,
  };
  
  residents.forEach(r => {
    if (r.careLevel in careLevelCounts) {
      careLevelCounts[r.careLevel]++;
    }
  });
  
  const byCareLevelData = Object.entries(careLevelCounts)
    .filter(([_, count]) => count > 0)
    .map(([level, count]) => ({
      careLevel: level.replace(/_/g, ' '),
      count,
      percentage: totalResidents > 0 ? Math.round((count / totalResidents) * 100) : 0,
      fill: CARE_LEVEL_COLORS[level] || '#6b7280',
    }));
  
  // By status
  const statusCounts: Record<string, number> = {
    ACTIVE: activeResidents,
    INACTIVE: inactiveResidents,
    HOSPITALIZED: hospitalizedResidents,
    DECEASED: residents.filter(r => r.status === 'DECEASED').length,
  };
  
  const byStatusData = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([status, count]) => ({
      status: status.replace(/_/g, ' '),
      count,
      percentage: totalResidents > 0 ? Math.round((count / totalResidents) * 100) : 0,
      fill: STATUS_COLORS[status] || '#6b7280',
    }));
  
  // Age distribution
  const ageRanges: Record<string, number> = {
    '60-69': 0,
    '70-79': 0,
    '80-89': 0,
    '90+': 0,
  };
  
  ages.forEach(age => {
    if (age < 70) ageRanges['60-69']++;
    else if (age < 80) ageRanges['70-79']++;
    else if (age < 90) ageRanges['80-89']++;
    else ageRanges['90+']++;
  });
  
  const ageDistributionData = Object.entries(ageRanges).map(([range, count]) => ({
    ageRange: range,
    count,
  }));
  
  // Admission trends (last 6 months)
  const admissionTrendsData = calculateAdmissionTrends(residents);
  
  return {
    totalResidents,
    activeResidents,
    inactiveResidents,
    hospitalizedResidents,
    averageAge,
    occupancyRate,
    recentAdmissions,
    byCareLevelData,
    byStatusData,
    ageDistributionData,
    admissionTrendsData,
  };
}

function calculateAdmissionTrends(residents: ResidentForAnalytics[]) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const trends: { month: string; count: number }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    const count = residents.filter(r => {
      const admissionDate = new Date(r.admissionDate);
      return admissionDate.getMonth() === date.getMonth() &&
             admissionDate.getFullYear() === date.getFullYear();
    }).length;
    
    trends.push({ month: monthKey, count });
  }
  
  return trends;
}

export function calculateAge(dateOfBirth: Date | string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
}

export function getDaysSinceAdmission(admissionDate: Date | string): number {
  const today = new Date();
  const admission = new Date(admissionDate);
  return differenceInDays(today, admission);
}
