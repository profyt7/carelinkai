/**
 * Client-Side RBAC Utilities
 * For use in React components to show/hide UI elements based on roles
 */

'use client';

import { useSession } from 'next-auth/react';
import { UserRole } from '@prisma/client';

/**
 * Hook to get current user's role
 */
export function useUserRole(): UserRole | null {
  const { data: session } = useSession();
  return (session?.user as any)?.role || null;
}

/**
 * Hook to check if user has specific role
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
  return userRole ? roles.includes(userRole) : false;
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  return useHasRole(UserRole.ADMIN);
}

/**
 * Hook to check if user is operator
 */
export function useIsOperator(): boolean {
  return useHasRole(UserRole.OPERATOR);
}

/**
 * Hook to check if user is staff (admin or operator)
 */
export function useIsStaff(): boolean {
  return useHasAnyRole([UserRole.ADMIN, UserRole.OPERATOR]);
}

/**
 * Hook to check if user is family
 */
export function useIsFamily(): boolean {
  return useHasRole(UserRole.FAMILY);
}

/**
 * Hook to check if user is aide/caregiver
 */
export function useIsAide(): boolean {
  return useHasRole(UserRole.CAREGIVER);
}

/**
 * Hook to check if user is provider
 */
export function useIsProvider(): boolean {
  return useHasRole(UserRole.PROVIDER);
}

/**
 * Component to conditionally render based on role
 */
export function RoleGate({
  children,
  roles,
  fallback = null,
}: {
  children: React.ReactNode;
  roles: UserRole[];
  fallback?: React.ReactNode;
}) {
  const hasRole = useHasAnyRole(roles);
  return hasRole ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component to show content only to admins
 */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return <RoleGate roles={[UserRole.ADMIN]} fallback={fallback}>{children}</RoleGate>;
}

/**
 * Component to show content only to staff (admin or operator)
 */
export function StaffOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <RoleGate roles={[UserRole.ADMIN, UserRole.OPERATOR]} fallback={fallback}>
      {children}
    </RoleGate>
  );
}
