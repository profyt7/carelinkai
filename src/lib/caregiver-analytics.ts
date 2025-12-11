import { differenceInDays } from 'date-fns';

export type CaregiverAnalyticsData = {
  totalCaregivers: number;
  activeCaregivers: number;
  inactiveCaregivers: number;
  currentCerts: number;
  expiringSoonCerts: number;
  expiredCerts: number;
  currentAssignments: number;
  employmentTypeData: { type: string; count: number }[];
  assignmentData: { caregiver: string; assignments: number }[];
  certificationStatusData: { name: string; value: number; fill: string }[];
};

export type CaregiverForAnalytics = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
  };
  employmentType: string;
  employmentStatus: string;
  certifications?: {
    id: string;
    status?: string;
    expiryDate?: Date | string | null;
  }[];
  assignments?: {
    id: string;
    endDate?: Date | string | null;
  }[];
  _count?: {
    certifications?: number;
    assignments?: number;
  };
};

export function computeCaregiverAnalytics(
  caregivers: CaregiverForAnalytics[]
): CaregiverAnalyticsData {
  const totalCaregivers = caregivers.length;
  const activeCaregivers = caregivers.filter(
    (c) => c.employmentStatus === 'ACTIVE'
  ).length;
  const inactiveCaregivers = totalCaregivers - activeCaregivers;

  // Certification stats
  const allCertifications = caregivers.flatMap((c) => c.certifications || []);
  const today = new Date();

  let currentCerts = 0;
  let expiringSoonCerts = 0;
  let expiredCerts = 0;

  allCertifications.forEach((cert) => {
    if (!cert.expiryDate) {
      currentCerts++;
      return;
    }

    const expiryDate = new Date(cert.expiryDate);
    const daysUntilExpiry = differenceInDays(expiryDate, today);

    if (daysUntilExpiry < 0) {
      expiredCerts++;
    } else if (daysUntilExpiry <= 30) {
      expiringSoonCerts++;
    } else {
      currentCerts++;
    }
  });

  // Certification status data for pie chart
  const certificationStatusData = [
    { name: 'Current', value: currentCerts, fill: '#10b981' },
    { name: 'Expiring Soon', value: expiringSoonCerts, fill: '#f59e0b' },
    { name: 'Expired', value: expiredCerts, fill: '#ef4444' },
  ].filter((item) => item.value > 0);

  // Assignment stats
  const allAssignments = caregivers.flatMap((c) => c.assignments || []);
  const currentAssignments = allAssignments.filter((a) => !a.endDate).length;

  // Employment type distribution
  const employmentTypeMap = caregivers.reduce((acc, c) => {
    const type = c.employmentType || 'UNKNOWN';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const employmentTypeData = Object.entries(employmentTypeMap)
    .map(([type, count]) => ({
      type: type.replace(/_/g, ' '),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Assignment distribution (top 10 caregivers by assignment count)
  const assignmentData = caregivers
    .map((c) => ({
      caregiver: `${c.user.firstName} ${c.user.lastName}`,
      assignments: c.assignments?.filter((a) => !a.endDate).length || 0,
    }))
    .filter((item) => item.assignments > 0)
    .sort((a, b) => b.assignments - a.assignments)
    .slice(0, 10);

  return {
    totalCaregivers,
    activeCaregivers,
    inactiveCaregivers,
    currentCerts,
    expiringSoonCerts,
    expiredCerts,
    currentAssignments,
    employmentTypeData,
    assignmentData,
    certificationStatusData,
  };
}

export function getCertificationsExpiringSoon(
  caregivers: CaregiverForAnalytics[],
  daysThreshold: number = 30
) {
  const today = new Date();
  
  return caregivers
    .flatMap((caregiver) =>
      (caregiver.certifications || [])
        .filter((cert) => {
          if (!cert.expiryDate) return false;
          const daysUntilExpiry = differenceInDays(new Date(cert.expiryDate), today);
          return daysUntilExpiry > 0 && daysUntilExpiry <= daysThreshold;
        })
        .map((cert) => ({
          ...cert,
          caregiver,
          daysUntilExpiry: differenceInDays(new Date(cert.expiryDate!), today),
        }))
    )
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}
