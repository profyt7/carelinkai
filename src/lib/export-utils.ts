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

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone;
}

/**
 * Calculate days between dates
 */
export function calculateDaysBetween(date1: Date | string, date2: Date | string = new Date()): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

type InquiryExport = {
  id: string;
  status: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  family: {
    name: string;
    email: string;
    phone?: string | null;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
    };
  };
  home: {
    name: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
    };
  };
  message?: string | null;
  internalNotes?: string | null;
  tourDate?: Date | string | null;
  aiMatchScore?: number | null;
  convertedToResidentId?: string | null;
  conversionDate?: Date | string | null;
  convertedBy?: {
    firstName: string;
    lastName: string;
  } | null;
  _count?: {
    documents?: number;
  };
};

/**
 * Convert inquiry data to CSV format
 */
export function exportInquiriesToCSV(inquiries: InquiryExport[]): string {
  const data = inquiries.map((inquiry) => {
    const contactPerson = `${inquiry.family.user.firstName} ${inquiry.family.user.lastName}`;
    const contactEmail = inquiry.family.user.email || inquiry.family.email;
    const contactPhone = inquiry.family.user.phone || inquiry.family.phone || '';
    const homeAddress = inquiry.home.address
      ? `${inquiry.home.address.street || ''}, ${inquiry.home.address.city || ''}, ${inquiry.home.address.state || ''}`.trim()
      : '';
    
    const daysSinceInquiry = calculateDaysBetween(inquiry.createdAt);
    const lastActivityDate = inquiry.updatedAt ? formatDateForCSV(inquiry.updatedAt) : formatDateForCSV(inquiry.createdAt);
    
    return {
      'Family Name': inquiry.family.name,
      'Contact Person Name': contactPerson,
      'Contact Email': contactEmail,
      'Contact Phone': formatPhoneNumber(contactPhone),
      'Inquiry Date': formatDateForCSV(inquiry.createdAt),
      'Days Since Inquiry': daysSinceInquiry,
      'Status': inquiry.status.replace(/_/g, ' '),
      'Home/Facility': inquiry.home.name,
      'Facility Address': homeAddress,
      'Tour Date': inquiry.tourDate ? formatDateForCSV(inquiry.tourDate) : 'Not Scheduled',
      'AI Match Score': inquiry.aiMatchScore ? `${inquiry.aiMatchScore}%` : 'N/A',
      'Last Activity Date': lastActivityDate,
      'Documents Count': inquiry._count?.documents || 0,
      'Converted to Resident': inquiry.convertedToResidentId ? 'Yes' : 'No',
      'Conversion Date': inquiry.conversionDate ? formatDateForCSV(inquiry.conversionDate) : 'N/A',
      'Converted By': inquiry.convertedBy ? `${inquiry.convertedBy.firstName} ${inquiry.convertedBy.lastName}` : 'N/A',
      'Initial Message': inquiry.message?.replace(/\n/g, ' ').substring(0, 200) || '',
      'Internal Notes': inquiry.internalNotes?.replace(/\n/g, ' ').substring(0, 200) || '',
    };
  });

  const csv = Papa.unparse(data);
  return csv;
}
