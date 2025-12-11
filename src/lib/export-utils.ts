import Papa from 'papaparse';

type Caregiver = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber?: string | null;
  };
  employmentType: string;
  employmentStatus: string;
  yearsOfExperience?: number | null;
  specializations?: string[];
  certifications?: {
    id: string;
    name?: string;
    expiryDate?: Date | string | null;
  }[];
  _count?: {
    certifications?: number;
    assignments?: number;
    documents?: number;
  };
};

/**
 * Format date for CSV export
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  if (!date) return '';
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US');
  } catch {
    return '';
  }
}

/**
 * Check certification status
 */
function getCertificationStatus(caregiver: Caregiver): string {
  const certs = caregiver.certifications || [];
  if (certs.length === 0) return 'None';
  
  const today = new Date();
  const hasExpired = certs.some(cert => {
    if (!cert.expiryDate) return false;
    return new Date(cert.expiryDate) < today;
  });
  
  if (hasExpired) return 'Expired';
  
  const hasExpiring = certs.some(cert => {
    if (!cert.expiryDate) return false;
    const expiry = new Date(cert.expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });
  
  if (hasExpiring) return 'Expiring Soon';
  return 'Current';
}

/**
 * Convert caregiver data to CSV format
 */
export function exportCaregiversToCSV(caregivers: Caregiver[]): string {
  const data = caregivers.map(c => {
    // Get certification names
    const certificationNames = (c.certifications || [])
      .map(cert => cert.name || '')
      .filter(name => name)
      .join('; ');
    
    // Get next expiring certification date
    const expiryDates = (c.certifications || [])
      .map(cert => cert.expiryDate)
      .filter(date => date)
      .map(date => new Date(date!))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const nextExpiryDate = expiryDates.length > 0 
      ? formatDateForCSV(expiryDates[0]) 
      : '';
    
    return {
      'Name': `${c.user.firstName} ${c.user.lastName}`,
      'Email': c.user.email || '',
      'Phone': c.user.phoneNumber || '',
      'Employment Type': c.employmentType || '',
      'Employment Status': c.employmentStatus || '',
      'Years of Experience': c.yearsOfExperience ?? '',
      'Specializations': (c.specializations || []).join('; '),
      'Total Certifications': c._count?.certifications ?? 0,
      'Certification Status': getCertificationStatus(c),
      'Certification Names': certificationNames,
      'Next Expiry Date': nextExpiryDate,
      'Current Assignments': c._count?.assignments ?? 0,
      'Total Documents': c._count?.documents ?? 0,
    };
  });
  
  const csv = Papa.unparse(data);
  return csv;
}

/**
 * Download CSV file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(prefix: string = 'export'): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${prefix}-${timestamp}.csv`;
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
