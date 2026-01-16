/**
 * Export Utilities for Data Exports
 */

import { prisma } from '@/lib/prisma';

/**
 * Save export history record to database
 */
export async function saveExportHistory({
  exportType,
  fileName,
  recordCount,
  filters,
  format,
  exportedById,
}: {
  exportType: string;
  fileName: string;
  recordCount: number;
  filters: Record<string, any>;
  format: string;
  exportedById: string;
}) {
  try {
    console.log('[saveExportHistory] Saving export history:', {
      exportType,
      fileName,
      recordCount,
      format,
      exportedById,
    });
    
    const record = await prisma.exportHistory.create({
      data: {
        exportType,
        fileName,
        recordCount,
        status: 'COMPLETED',
        filters: filters || {},
        format,
        completedAt: new Date(),
        exportedById,
      },
    });
    
    console.log('[saveExportHistory] Export history saved successfully:', record.id);
  } catch (error) {
    // Log but don't fail the export if history save fails
    console.error('[saveExportHistory] Failed to save export history:', error);
  }
}

// Convert array of objects to CSV string
export function toCSV(data: Record<string, any>[], columns?: { key: string; label: string }[]): string {
  if (data.length === 0) return '';
  
  // Use provided columns or auto-detect from first record
  const keys = columns ? columns.map(c => c.key) : Object.keys(data[0]);
  const headers = columns ? columns.map(c => c.label) : keys;
  
  // Helper to escape CSV values
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  // Build CSV rows
  const rows = [
    headers.join(','),
    ...data.map(record => 
      keys.map(key => {
        const value = key.includes('.') 
          ? key.split('.').reduce((obj, k) => obj?.[k], record)
          : record[key];
        return escapeCSV(value);
      }).join(',')
    )
  ];
  
  return rows.join('\n');
}

// Format date for export
export function formatExportDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// Format datetime for export
export function formatExportDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toISOString();
}

// Generate export filename
export function generateExportFilename(type: string, format: 'csv' | 'json'): string {
  const timestamp = new Date().toISOString().split('T')[0];
  return `${type}_export_${timestamp}.${format}`;
}

// Build date filter for Prisma
export function buildDateFilter(startDate?: string, endDate?: string) {
  const filter: any = {};
  if (startDate) {
    filter.gte = new Date(startDate);
  }
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
}

// User export columns
export const userExportColumns = [
  { key: 'id', label: 'ID' },
  { key: 'email', label: 'Email' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'role', label: 'Role' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Created At' },
  { key: 'lastLoginAt', label: 'Last Login' },
];

// Home export columns
export const homeExportColumns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'status', label: 'Status' },
  { key: 'licenseNumber', label: 'License Number' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'currentOccupancy', label: 'Current Occupancy' },
  { key: 'address.street', label: 'Street' },
  { key: 'address.city', label: 'City' },
  { key: 'address.state', label: 'State' },
  { key: 'address.zipCode', label: 'Zip Code' },
  { key: 'createdAt', label: 'Created At' },
];

// Inquiry export columns
export const inquiryExportColumns = [
  { key: 'id', label: 'ID' },
  { key: 'contactName', label: 'Contact Name' },
  { key: 'contactEmail', label: 'Email' },
  { key: 'contactPhone', label: 'Phone' },
  { key: 'residentName', label: 'Resident Name' },
  { key: 'relationship', label: 'Relationship' },
  { key: 'status', label: 'Status' },
  { key: 'source', label: 'Source' },
  { key: 'urgency', label: 'Urgency' },
  { key: 'careLevel', label: 'Care Level' },
  { key: 'budget', label: 'Budget' },
  { key: 'notes', label: 'Notes' },
  { key: 'home.name', label: 'Home Name' },
  { key: 'createdAt', label: 'Created At' },
];

// Caregiver export columns
export const caregiverExportColumns = [
  { key: 'id', label: 'ID' },
  { key: 'user.firstName', label: 'First Name' },
  { key: 'user.lastName', label: 'Last Name' },
  { key: 'user.email', label: 'Email' },
  { key: 'user.phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'yearsOfExperience', label: 'Years Experience' },
  { key: 'hourlyRate', label: 'Hourly Rate' },
  { key: 'specializations', label: 'Specializations' },
  { key: 'languages', label: 'Languages' },
  { key: 'createdAt', label: 'Created At' },
];

// Resident export columns
export const residentExportColumns = [
  { key: 'id', label: 'ID' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'status', label: 'Status' },
  { key: 'careLevel', label: 'Care Level' },
  { key: 'roomNumber', label: 'Room Number' },
  { key: 'admissionDate', label: 'Admission Date' },
  { key: 'home.name', label: 'Home Name' },
  { key: 'createdAt', label: 'Created At' },
];

// Audit log export columns
export const auditLogExportColumns = [
  { key: 'id', label: 'ID' },
  { key: 'action', label: 'Action' },
  { key: 'resourceType', label: 'Resource Type' },
  { key: 'resourceId', label: 'Resource ID' },
  { key: 'description', label: 'Description' },
  { key: 'user.email', label: 'User Email' },
  { key: 'user.firstName', label: 'User First Name' },
  { key: 'user.lastName', label: 'User Last Name' },
  { key: 'ipAddress', label: 'IP Address' },
  { key: 'createdAt', label: 'Timestamp' },
];
