/**
 * Test Data Fixtures
 * 
 * Provides reusable test data for E2E tests.
 */

export const TEST_RESIDENT_ID = 'test-resident-001';
export const TEST_HOME_ID = 'test-home-001';

export const TEST_RESIDENT = {
  firstName: 'Test',
  lastName: 'Resident',
  dateOfBirth: '1950-01-01',
  gender: 'FEMALE',
  status: 'ACTIVE',
};

export const TEST_ASSESSMENT = {
  type: 'FUNCTIONAL',
  score: 85,
  notes: 'Test assessment notes',
  recommendations: 'Test recommendations',
  status: 'COMPLETED',
};

export const TEST_INCIDENT = {
  type: 'FALL',
  severity: 'MINOR',
  description: 'Test incident description',
  actionsTaken: 'Test actions taken',
};

export const TEST_COMPLIANCE_ITEM = {
  type: 'MEDICAL_RECORDS',
  title: 'Test Compliance Item',
  status: 'CURRENT',
  issuedDate: new Date('2024-01-15'),
  expiryDate: new Date('2025-01-15'),
};

export const TEST_FAMILY_CONTACT = {
  name: 'Test Family Contact',
  relationship: 'Daughter',
  phone: '+1-555-0199',
  email: 'test.contact@example.com',
  isPrimaryContact: false,
  permissionLevel: 'VIEW_ONLY',
  contactPreference: 'EMAIL',
};

/**
 * Test URLs
 */
export const TEST_URLS = {
  home: '/',
  signin: '/auth/signin',
  signout: '/auth/signout',
  dashboard: '/dashboard',
  operator: '/operator',
  residents: '/operator/residents',
  residentDetail: (id: string) => `/operator/residents/${id}`,
  caregivers: '/operator/caregivers',
  operators: '/operator',
};

/**
 * Common UI selectors
 */
export const SELECTORS = {
  // Navigation
  nav: {
    dashboard: 'a[href="/dashboard"], a:has-text("Dashboard")',
    residents: 'a[href="/operator/residents"], a:has-text("Residents")',
    caregivers: 'a[href="/operator/caregivers"], a:has-text("Caregivers")',
    operators: 'a[href="/operator"], a:has-text("Operators")',
  },
  
  // Buttons
  buttons: {
    newResident: 'button:has-text("New Resident"), button:has-text("Add Resident")',
    save: 'button:has-text("Save")',
    cancel: 'button:has-text("Cancel")',
    delete: 'button:has-text("Delete")',
    edit: 'button:has-text("Edit")',
  },
  
  // Tables
  table: {
    row: 'tr[data-testid="table-row"], tbody tr',
    cell: 'td',
  },
  
  // Forms
  form: {
    input: 'input',
    select: 'select',
    textarea: 'textarea',
  },
  
  // Tabs
  tabs: {
    assessments: 'button:has-text("Assessments"), [role="tab"]:has-text("Assessments")',
    incidents: 'button:has-text("Incidents"), [role="tab"]:has-text("Incidents")',
    compliance: 'button:has-text("Compliance"), [role="tab"]:has-text("Compliance")',
    family: 'button:has-text("Family"), [role="tab"]:has-text("Family")',
  },
  
  // Badges
  badges: {
    viewOnly: 'span:has-text("View Only"), .badge:has-text("View Only")',
    restrictedAccess: 'text=/restricted access/i',
  },
};
