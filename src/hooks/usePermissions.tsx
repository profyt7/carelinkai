/**
 * Permission Hooks for CareLinkAI RBAC System
 * 
 * React hooks for checking permissions in components
 */

import React from "react";
import { useSession } from "next-auth/react";
import { UserRole } from "@prisma/client";
import {
  Permission,
  ResourceType,
  ResourceAction,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  canPerformAction,
  getPermissionForResource,
} from "@/lib/permissions";

/**
 * Hook to get current user's permissions
 */
export function usePermissions() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return {
      permissions: [],
      role: null,
      isLoading: true,
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      canPerformAction: () => false,
    };
  }
  
  if (!session?.user?.role) {
    return {
      permissions: [],
      role: null,
      isLoading: false,
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      canPerformAction: () => false,
    };
  }
  
  const role = session.user.role as UserRole;
  const permissions = getPermissionsForRole(role);
  
  return {
    permissions,
    role,
    isLoading: false,
    hasPermission: (permission: Permission) => hasPermission(role, permission),
    hasAnyPermission: (perms: Permission[]) => hasAnyPermission(role, perms),
    hasAllPermissions: (perms: Permission[]) => hasAllPermissions(role, perms),
    canPerformAction: (resourceType: ResourceType, action: ResourceAction) =>
      canPerformAction(role, resourceType, action),
  };
}

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { hasPermission: checkPermission, isLoading } = usePermissions();
  
  if (isLoading) {
    return false;
  }
  
  return checkPermission(permission);
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { hasAnyPermission: checkAnyPermission, isLoading } = usePermissions();
  
  if (isLoading) {
    return false;
  }
  
  return checkAnyPermission(permissions);
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useHasAllPermissions(permissions: Permission[]): boolean {
  const { hasAllPermissions: checkAllPermissions, isLoading } = usePermissions();
  
  if (isLoading) {
    return false;
  }
  
  return checkAllPermissions(permissions);
}

/**
 * Hook to check if user can perform an action on a resource type
 */
export function useCanAccess(
  resourceType: ResourceType,
  action: ResourceAction
): boolean {
  const { canPerformAction: checkAction, isLoading } = usePermissions();
  
  if (isLoading) {
    return false;
  }
  
  return checkAction(resourceType, action);
}

/**
 * Hook to get user's role
 */
export function useUserRole(): UserRole | null {
  const { data: session } = useSession();
  return (session?.user?.role as UserRole) || null;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: UserRole): boolean {
  const userRole = useUserRole();
  return userRole === role;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(roles: UserRole[]): boolean {
  const userRole = useUserRole();
  return userRole !== null && roles.includes(userRole);
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  return useHasRole("ADMIN");
}

/**
 * Hook to check if user is operator
 */
export function useIsOperator(): boolean {
  return useHasRole("OPERATOR");
}

/**
 * Hook to check if user is caregiver
 */
export function useIsCaregiver(): boolean {
  return useHasRole("CAREGIVER");
}

/**
 * Hook to check if user is family member
 */
export function useIsFamily(): boolean {
  return useHasRole("FAMILY");
}

/**
 * Hook to check if user can manage operators (admin or staff only)
 */
export function useCanManageOperators(): boolean {
  return useHasAnyRole(["ADMIN", "STAFF"]);
}

/**
 * Hook to check if user can view system-wide data
 */
export function useCanViewSystemWide(): boolean {
  return useHasAnyRole(["ADMIN", "STAFF"]);
}

/**
 * Component wrapper for permission-based rendering
 * 
 * @example
 * ```tsx
 * <PermissionGuard permission="residents.create" fallback={<div>No access</div>}>
 *   <CreateResidentButton />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasAccess = useHasPermission(permission);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Component wrapper for role-based rendering
 * 
 * @example
 * ```tsx
 * <RoleGuard roles={["ADMIN", "OPERATOR"]} fallback={<div>No access</div>}>
 *   <AdminPanel />
 * </RoleGuard>
 * ```
 */
export function RoleGuard({
  roles,
  children,
  fallback = null,
}: {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasAccess = useHasAnyRole(roles);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Component wrapper for action-based rendering
 * 
 * @example
 * ```tsx
 * <ActionGuard resourceType="resident" action="create" fallback={<div>No access</div>}>
 *   <CreateResidentButton />
 * </ActionGuard>
 * ```
 */
export function ActionGuard({
  resourceType,
  action,
  children,
  fallback = null,
}: {
  resourceType: ResourceType;
  action: ResourceAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasAccess = useCanAccess(resourceType, action);
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
