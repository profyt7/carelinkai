/**
 * Permission Definitions for CareLinkAI RBAC System
 * 
 * This file defines all permissions and their mappings to roles.
 * It provides helper functions to check permissions based on user roles.
 */

import { UserRole } from "@prisma/client";

/**
 * All available permissions in the system
 */
export const PERMISSIONS = {
  // Resident Permissions
  RESIDENTS_VIEW: "residents.view",
  RESIDENTS_CREATE: "residents.create",
  RESIDENTS_UPDATE: "residents.update",
  RESIDENTS_DELETE: "residents.delete",
  RESIDENTS_VIEW_ALL: "residents.view_all", // View all residents across all homes
  
  // Assessment Permissions
  ASSESSMENTS_VIEW: "assessments.view",
  ASSESSMENTS_CREATE: "assessments.create",
  ASSESSMENTS_UPDATE: "assessments.update",
  ASSESSMENTS_DELETE: "assessments.delete",
  
  // Incident Permissions
  INCIDENTS_VIEW: "incidents.view",
  INCIDENTS_CREATE: "incidents.create",
  INCIDENTS_UPDATE: "incidents.update",
  INCIDENTS_DELETE: "incidents.delete",
  INCIDENTS_RESOLVE: "incidents.resolve",
  
  // Compliance Permissions
  COMPLIANCE_VIEW: "compliance.view",
  COMPLIANCE_CREATE: "compliance.create",
  COMPLIANCE_UPDATE: "compliance.update",
  COMPLIANCE_DELETE: "compliance.delete",
  COMPLIANCE_VERIFY: "compliance.verify",
  
  // Family Permissions
  FAMILY_CONTACTS_VIEW: "family_contacts.view",
  FAMILY_CONTACTS_CREATE: "family_contacts.create",
  FAMILY_CONTACTS_UPDATE: "family_contacts.update",
  FAMILY_CONTACTS_DELETE: "family_contacts.delete",
  
  // Home Permissions
  HOMES_VIEW: "homes.view",
  HOMES_CREATE: "homes.create",
  HOMES_UPDATE: "homes.update",
  HOMES_DELETE: "homes.delete",
  HOMES_VIEW_ALL: "homes.view_all", // View all homes (admin only)
  
  // Caregiver Permissions
  CAREGIVERS_VIEW: "caregivers.view",
  CAREGIVERS_CREATE: "caregivers.create",
  CAREGIVERS_UPDATE: "caregivers.update",
  CAREGIVERS_DELETE: "caregivers.delete",
  CAREGIVERS_VIEW_ALL: "caregivers.view_all",
  CAREGIVERS_ASSIGN: "caregivers.assign", // Assign caregivers to residents
  CAREGIVERS_MANAGE_CERTIFICATIONS: "caregivers.manage_certifications",
  CAREGIVERS_MANAGE_DOCUMENTS: "caregivers.manage_documents",
  
  // Inquiry Permissions
  INQUIRIES_VIEW: "inquiries.view",
  INQUIRIES_CREATE: "inquiries.create",
  INQUIRIES_UPDATE: "inquiries.update",
  INQUIRIES_DELETE: "inquiries.delete",
  INQUIRIES_VIEW_ALL: "inquiries.view_all",
  INQUIRIES_CONVERT: "inquiries.convert", // Convert inquiry to resident
  
  // Operator Permissions
  OPERATORS_VIEW: "operators.view",
  OPERATORS_CREATE: "operators.create",
  OPERATORS_UPDATE: "operators.update",
  OPERATORS_DELETE: "operators.delete",
  
  // User Management Permissions
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DELETE: "users.delete",
  USERS_VIEW_ALL: "users.view_all",
  
  // System Permissions
  SYSTEM_SETTINGS: "system.settings",
  AUDIT_LOGS_VIEW: "audit_logs.view",
  
  // Reports & Analytics Permissions
  REPORTS_VIEW: "reports.view",
  REPORTS_GENERATE: "reports.generate",
  REPORTS_EXPORT: "reports.export",
  REPORTS_DELETE: "reports.delete",
  REPORTS_SCHEDULE: "reports.schedule",
  REPORTS_MANAGE: "reports.manage",
  ANALYTICS_VIEW: "analytics.view",
  
  // Document Processing Permissions (Feature #6)
  DOCUMENTS_VIEW: "documents.view",
  DOCUMENTS_CREATE: "documents.create",
  DOCUMENTS_UPDATE: "documents.update",
  DOCUMENTS_DELETE: "documents.delete",
  DOCUMENTS_VIEW_ALL: "documents.view_all",         // View all documents across all homes
  DOCUMENTS_EXTRACT: "documents.extract",           // Trigger OCR and AI extraction
  DOCUMENTS_CLASSIFY: "documents.classify",         // Classify documents
  DOCUMENTS_MANAGE_TEMPLATES: "documents.manage_templates", // Manage document templates (admin only)
  DOCUMENTS_GENERATE: "documents.generate",         // Generate documents from templates
  
  // Tour Scheduling Permissions
  TOURS_REQUEST: "tours.request",          // Family can request tours
  TOURS_VIEW: "tours.view",                // View tours
  TOURS_VIEW_ALL: "tours.view_all",        // View all tours (operator/admin)
  TOURS_CONFIRM: "tours.confirm",          // Confirm tour requests (operator/admin)
  TOURS_RESCHEDULE: "tours.reschedule",    // Reschedule tours
  TOURS_CANCEL: "tours.cancel",            // Cancel tours
  TOURS_MANAGE_SLOTS: "tours.manage_slots", // Manage available tour slots (operator/admin)
  
  // Admin-only Permissions
  ADMIN_FULL_ACCESS: "admin.full_access",  // Full admin access (for data exports, system settings, etc.)
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role-to-Permission Mappings
 * Each role has a set of permissions they can perform
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // ADMIN: Full system access
  ADMIN: Object.values(PERMISSIONS),
  
  // OPERATOR: Full access to their assigned homes and related data
  OPERATOR: [
    // Residents - scoped to their homes
    PERMISSIONS.RESIDENTS_VIEW,
    PERMISSIONS.RESIDENTS_CREATE,
    PERMISSIONS.RESIDENTS_UPDATE,
    PERMISSIONS.RESIDENTS_DELETE,
    
    // Assessments
    PERMISSIONS.ASSESSMENTS_VIEW,
    PERMISSIONS.ASSESSMENTS_CREATE,
    PERMISSIONS.ASSESSMENTS_UPDATE,
    PERMISSIONS.ASSESSMENTS_DELETE,
    
    // Incidents
    PERMISSIONS.INCIDENTS_VIEW,
    PERMISSIONS.INCIDENTS_CREATE,
    PERMISSIONS.INCIDENTS_UPDATE,
    PERMISSIONS.INCIDENTS_DELETE,
    PERMISSIONS.INCIDENTS_RESOLVE,
    
    // Compliance
    PERMISSIONS.COMPLIANCE_VIEW,
    PERMISSIONS.COMPLIANCE_CREATE,
    PERMISSIONS.COMPLIANCE_UPDATE,
    PERMISSIONS.COMPLIANCE_DELETE,
    PERMISSIONS.COMPLIANCE_VERIFY,
    
    // Family Contacts
    PERMISSIONS.FAMILY_CONTACTS_VIEW,
    PERMISSIONS.FAMILY_CONTACTS_CREATE,
    PERMISSIONS.FAMILY_CONTACTS_UPDATE,
    PERMISSIONS.FAMILY_CONTACTS_DELETE,
    
    // Homes - their own homes only
    PERMISSIONS.HOMES_VIEW,
    PERMISSIONS.HOMES_UPDATE,
    
    // Caregivers - scoped to their homes
    PERMISSIONS.CAREGIVERS_VIEW,
    PERMISSIONS.CAREGIVERS_CREATE,
    PERMISSIONS.CAREGIVERS_UPDATE,
    PERMISSIONS.CAREGIVERS_ASSIGN,
    PERMISSIONS.CAREGIVERS_MANAGE_CERTIFICATIONS,
    PERMISSIONS.CAREGIVERS_MANAGE_DOCUMENTS,
    
    // Inquiries - scoped to their homes
    PERMISSIONS.INQUIRIES_VIEW,
    PERMISSIONS.INQUIRIES_UPDATE,
    PERMISSIONS.INQUIRIES_CONVERT,
    
    // Reports & Analytics
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_DELETE,
    PERMISSIONS.REPORTS_SCHEDULE,
    PERMISSIONS.REPORTS_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
    
    // Documents - manage documents for their homes
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_CREATE,
    PERMISSIONS.DOCUMENTS_UPDATE,
    PERMISSIONS.DOCUMENTS_DELETE,
    PERMISSIONS.DOCUMENTS_EXTRACT,
    PERMISSIONS.DOCUMENTS_CLASSIFY,
    PERMISSIONS.DOCUMENTS_GENERATE,
    
    // Tours - manage tours for their homes
    PERMISSIONS.TOURS_VIEW_ALL,
    PERMISSIONS.TOURS_CONFIRM,
    PERMISSIONS.TOURS_RESCHEDULE,
    PERMISSIONS.TOURS_CANCEL,
    PERMISSIONS.TOURS_MANAGE_SLOTS,
  ],
  
  // CAREGIVER: Limited access - view residents, create care notes, view assessments/incidents
  CAREGIVER: [
    // Residents - view only their assigned residents
    PERMISSIONS.RESIDENTS_VIEW,
    
    // Assessments - view and create
    PERMISSIONS.ASSESSMENTS_VIEW,
    PERMISSIONS.ASSESSMENTS_CREATE,
    
    // Incidents - view, create, and update (but not delete)
    PERMISSIONS.INCIDENTS_VIEW,
    PERMISSIONS.INCIDENTS_CREATE,
    PERMISSIONS.INCIDENTS_UPDATE,
    
    // Compliance - view only
    PERMISSIONS.COMPLIANCE_VIEW,
    
    // Family Contacts - view only
    PERMISSIONS.FAMILY_CONTACTS_VIEW,
    
    // Documents - view and create only
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_CREATE,
  ],
  
  // FAMILY: View-only access to their family member's information
  FAMILY: [
    // Residents - view only their family member
    PERMISSIONS.RESIDENTS_VIEW,
    
    // Assessments - view only
    PERMISSIONS.ASSESSMENTS_VIEW,
    
    // Incidents - view only
    PERMISSIONS.INCIDENTS_VIEW,
    
    // Compliance - view only
    PERMISSIONS.COMPLIANCE_VIEW,
    
    // Family Contacts - view and manage
    PERMISSIONS.FAMILY_CONTACTS_VIEW,
    PERMISSIONS.FAMILY_CONTACTS_CREATE,
    PERMISSIONS.FAMILY_CONTACTS_UPDATE,
    
    // Homes - view only
    PERMISSIONS.HOMES_VIEW,
    
    // Inquiries - create and view their own
    PERMISSIONS.INQUIRIES_VIEW,
    PERMISSIONS.INQUIRIES_CREATE,
    
    // Documents - view and upload documents for their resident
    PERMISSIONS.DOCUMENTS_VIEW,
    PERMISSIONS.DOCUMENTS_CREATE,
    
    // Tours - request and manage their own tours
    PERMISSIONS.TOURS_REQUEST,
    PERMISSIONS.TOURS_VIEW,
    PERMISSIONS.TOURS_CANCEL,
    PERMISSIONS.TOURS_RESCHEDULE,
  ],
  
  // STAFF: Similar to OPERATOR but may have different scope
  STAFF: [
    PERMISSIONS.RESIDENTS_VIEW,
    PERMISSIONS.ASSESSMENTS_VIEW,
    PERMISSIONS.ASSESSMENTS_CREATE,
    PERMISSIONS.INCIDENTS_VIEW,
    PERMISSIONS.INCIDENTS_CREATE,
    PERMISSIONS.COMPLIANCE_VIEW,
    PERMISSIONS.FAMILY_CONTACTS_VIEW,
    PERMISSIONS.HOMES_VIEW,
    PERMISSIONS.CAREGIVERS_VIEW,
    PERMISSIONS.INQUIRIES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  
  // AFFILIATE: Limited access for referral partners
  AFFILIATE: [
    PERMISSIONS.HOMES_VIEW,
    PERMISSIONS.INQUIRIES_CREATE,
    PERMISSIONS.REPORTS_VIEW,
  ],
  
  // PROVIDER: Access to marketplace and inquiries
  PROVIDER: [
    PERMISSIONS.INQUIRIES_VIEW,
    PERMISSIONS.INQUIRIES_UPDATE,
    PERMISSIONS.REPORTS_VIEW,
  ],
};

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a user role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role];
}

/**
 * Check if a user can access a specific resource
 * This is a helper that combines permission check with resource ownership
 */
export function canAccess(
  role: UserRole,
  permission: Permission,
  resource?: {
    ownerId?: string;
    operatorId?: string;
    homeId?: string;
    familyId?: string;
  },
  userId?: string
): boolean {
  // First check if role has the permission
  if (!hasPermission(role, permission)) {
    return false;
  }
  
  // If no resource specified, permission alone is sufficient
  if (!resource || !userId) {
    return true;
  }
  
  // ADMIN always has access
  if (role === "ADMIN") {
    return true;
  }
  
  // For other roles, check ownership/scope
  // This is a basic implementation - specific logic should be in auth-utils.ts
  switch (role) {
    case "OPERATOR":
      // Operators can access resources in their homes
      return Boolean(resource.operatorId === userId);
      
    case "FAMILY":
      // Family members can only access their own family's data
      return Boolean(resource.familyId === userId || resource.ownerId === userId);
      
    case "CAREGIVER":
      // Caregivers can access residents they're assigned to
      // This requires additional database checks
      return true; // Will be handled in auth-utils.ts
      
    default:
      return false;
  }
}

/**
 * Resource action types for permission checking
 */
export const RESOURCE_ACTIONS = {
  VIEW: "view",
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  VERIFY: "verify",
  RESOLVE: "resolve",
} as const;

export type ResourceAction = typeof RESOURCE_ACTIONS[keyof typeof RESOURCE_ACTIONS];

/**
 * Resource types in the system
 */
export const RESOURCE_TYPES = {
  RESIDENT: "resident",
  ASSESSMENT: "assessment",
  INCIDENT: "incident",
  COMPLIANCE: "compliance",
  FAMILY_CONTACT: "family_contact",
  HOME: "home",
  CAREGIVER: "caregiver",
  INQUIRY: "inquiry",
  OPERATOR: "operator",
  USER: "user",
} as const;

export type ResourceType = typeof RESOURCE_TYPES[keyof typeof RESOURCE_TYPES];

/**
 * Map resource type and action to permission
 */
export function getPermissionForResource(
  resourceType: ResourceType,
  action: ResourceAction
): Permission | null {
  const permissionKey = `${resourceType.toUpperCase()}S_${action.toUpperCase()}` as keyof typeof PERMISSIONS;
  return PERMISSIONS[permissionKey] || null;
}

/**
 * Check if user can perform action on resource type
 */
export function canPerformAction(
  role: UserRole,
  resourceType: ResourceType,
  action: ResourceAction
): boolean {
  const permission = getPermissionForResource(resourceType, action);
  if (!permission) {
    return false;
  }
  return hasPermission(role, permission);
}
