/**
 * Authorization Utilities for CareLinkAI RBAC System
 * 
 * Server-side utilities for authorization and data scoping
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  Permission,
  ResourceType,
  ResourceAction,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canPerformAction,
} from "@/lib/permissions";

/**
 * Error thrown when authorization fails
 */
export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Error thrown when user is not authenticated
 */
export class UnauthenticatedError extends Error {
  constructor(message: string = "Not authenticated") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

/**
 * Get the current authenticated user's session
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
  return {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    role: session.user.role as UserRole,
  };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new UnauthenticatedError("You must be logged in to access this resource");
  }
  
  return user;
}

/**
 * Require specific role(s) - throws if user doesn't have any of the roles
 */
export async function requireRole(roles: UserRole | UserRole[]) {
  const user = await requireAuth();
  
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  if (!allowedRoles.includes(user.role)) {
    throw new UnauthorizedError(
      `Access denied. Required role: ${allowedRoles.join(" or ")}`
    );
  }
  
  return user;
}

/**
 * Require specific permission - throws if user doesn't have it
 */
export async function requirePermission(permission: Permission) {
  const user = await requireAuth();
  
  if (!hasPermission(user.role, permission)) {
    throw new UnauthorizedError(
      `Access denied. Required permission: ${permission}`
    );
  }
  
  return user;
}

/**
 * Require any of the specified permissions - throws if user doesn't have any
 */
export async function requireAnyPermission(permissions: Permission[]) {
  const user = await requireAuth();
  
  if (!hasAnyPermission(user.role, permissions)) {
    throw new UnauthorizedError(
      `Access denied. Required permissions: ${permissions.join(" or ")}`
    );
  }
  
  return user;
}

/**
 * Require all of the specified permissions - throws if user doesn't have all
 */
export async function requireAllPermissions(permissions: Permission[]) {
  const user = await requireAuth();
  
  if (!hasAllPermissions(user.role, permissions)) {
    throw new UnauthorizedError(
      `Access denied. Required permissions: ${permissions.join(" and ")}`
    );
  }
  
  return user;
}

/**
 * Check if user can perform action on resource
 */
export async function requireAction(
  resourceType: ResourceType,
  action: ResourceAction
) {
  const user = await requireAuth();
  
  if (!canPerformAction(user.role, resourceType, action)) {
    throw new UnauthorizedError(
      `Access denied. Cannot ${action} ${resourceType}`
    );
  }
  
  return user;
}

/**
 * Get user's data scope based on their role
 * This determines which data the user can access
 */
export async function getUserScope(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      operator: {
        include: {
          homes: {
            select: {
              id: true,
            },
          },
        },
      },
      family: {
        include: {
          residents: {
            select: {
              id: true,
            },
          },
        },
      },
      caregiver: {
        include: {
          employments: {
            where: {
              isActive: true,
            },
            include: {
              operator: {
                include: {
                  homes: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  
  if (!user) {
    throw new Error("User not found");
  }
  
  // ADMIN has access to everything
  if (user.role === "ADMIN" || user.role === "STAFF") {
    return {
      role: user.role,
      homeIds: "ALL" as const,
      residentIds: "ALL" as const,
      operatorIds: "ALL" as const,
    };
  }
  
  // OPERATOR has access to their homes and residents in those homes
  if (user.role === "OPERATOR" && user.operator) {
    const homeIds = user.operator.homes.map(h => h.id);
    return {
      role: user.role,
      homeIds,
      operatorId: user.operator.id,
      // Resident IDs will be fetched when needed based on homeIds
      residentIds: [] as string[],
      operatorIds: [user.operator.id],
    };
  }
  
  // FAMILY has access to their own residents
  if (user.role === "FAMILY" && user.family) {
    const residentIds = user.family.residents.map(r => r.id);
    return {
      role: user.role,
      familyId: user.family.id,
      residentIds,
      homeIds: [] as string[],
      operatorIds: [] as string[],
    };
  }
  
  // CAREGIVER has access to residents in homes where they're employed
  if (user.role === "CAREGIVER" && user.caregiver) {
    const homeIds: string[] = [];
    user.caregiver.employments.forEach(emp => {
      emp.operator.homes.forEach(home => {
        if (!homeIds.includes(home.id)) {
          homeIds.push(home.id);
        }
      });
    });
    
    return {
      role: user.role,
      caregiverId: user.caregiver.id,
      homeIds,
      residentIds: [] as string[],
      operatorIds: user.caregiver.employments.map(e => e.operatorId),
    };
  }
  
  // Default: no access
  return {
    role: user.role,
    homeIds: [] as string[],
    residentIds: [] as string[],
    operatorIds: [] as string[],
  };
}

/**
 * Filter Prisma where clause based on user scope
 * This is used to scope queries to only the data the user can access
 */
export async function getScopedWhereClause(userId: string) {
  const scope = await getUserScope(userId);
  
  // Admin has no restrictions
  if (scope.homeIds === "ALL") {
    return {};
  }
  
  // Build where clause based on scope
  const whereClause: any = {};
  
  if (scope.role === "OPERATOR") {
    // Operators see data from their homes
    if (scope.homeIds.length > 0) {
      whereClause.homeId = { in: scope.homeIds };
    } else {
      // No homes assigned - no access
      whereClause.id = { in: [] };
    }
  } else if (scope.role === "FAMILY") {
    // Family sees only their residents
    if (scope.residentIds.length > 0) {
      whereClause.id = { in: scope.residentIds };
    } else {
      // No residents - no access
      whereClause.id = { in: [] };
    }
  } else if (scope.role === "CAREGIVER") {
    // Caregivers see residents in their assigned homes
    if (scope.homeIds.length > 0) {
      whereClause.homeId = { in: scope.homeIds };
    } else {
      // No homes assigned - no access
      whereClause.id = { in: [] };
    }
  }
  
  return whereClause;
}

/**
 * Check if user can access a specific resident
 */
export async function canAccessResident(
  userId: string,
  residentId: string
): Promise<boolean> {
  const scope = await getUserScope(userId);
  
  // Admin has access to all residents
  if (scope.residentIds === "ALL") {
    return true;
  }
  
  // Family members can access their own residents
  if (scope.role === "FAMILY") {
    return scope.residentIds.includes(residentId);
  }
  
  // Operators and caregivers: check if resident is in their homes
  if (scope.role === "OPERATOR" || scope.role === "CAREGIVER") {
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
      select: { homeId: true },
    });
    
    if (!resident?.homeId) {
      return false;
    }
    
    return scope.homeIds === "ALL" || scope.homeIds.includes(resident.homeId);
  }
  
  return false;
}

/**
 * Require access to a specific resident - throws if access denied
 */
export async function requireResidentAccess(
  userId: string,
  residentId: string
) {
  const hasAccess = await canAccessResident(userId, residentId);
  
  if (!hasAccess) {
    throw new UnauthorizedError("You do not have access to this resident");
  }
}

/**
 * Check if user can access a specific home
 */
export async function canAccessHome(
  userId: string,
  homeId: string
): Promise<boolean> {
  const scope = await getUserScope(userId);
  
  // Admin has access to all homes
  if (scope.homeIds === "ALL") {
    return true;
  }
  
  // Operators and caregivers: check if home is in their scope
  if (scope.role === "OPERATOR" || scope.role === "CAREGIVER") {
    return scope.homeIds.includes(homeId);
  }
  
  // Family members: check if any of their residents are in this home
  if (scope.role === "FAMILY") {
    const residents = await prisma.resident.findMany({
      where: {
        id: { in: scope.residentIds },
        homeId,
      },
    });
    
    return residents.length > 0;
  }
  
  return false;
}

/**
 * Require access to a specific home - throws if access denied
 */
export async function requireHomeAccess(userId: string, homeId: string) {
  const hasAccess = await canAccessHome(userId, homeId);
  
  if (!hasAccess) {
    throw new UnauthorizedError("You do not have access to this home");
  }
}

/**
 * Get operators that the user can manage
 * (Admin can see all, others see none)
 */
export async function getManageableOperatorIds(userId: string): Promise<string[] | "ALL"> {
  const scope = await getUserScope(userId);
  
  if (scope.role === "ADMIN" || scope.role === "STAFF") {
    return "ALL";
  }
  
  return [];
}

/**
 * Handle authorization errors and return appropriate response
 */
export function handleAuthError(error: unknown) {
  if (error instanceof UnauthenticatedError) {
    return Response.json(
      { error: error.message },
      { status: 401 }
    );
  }
  
  if (error instanceof UnauthorizedError) {
    return Response.json(
      { error: error.message },
      { status: 403 }
    );
  }
  
  // Unknown error
  console.error("Authorization error:", error);
  return Response.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
