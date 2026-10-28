/**
 * API Middleware for CareLinkAI RBAC System
 * 
 * Middleware functions for protecting API routes with authentication and authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import {
  getCurrentUser,
  requireAuth,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireAction,
  handleAuthError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/lib/auth-utils";
import type {
  Permission,
  ResourceType,
  ResourceAction,
} from "@/lib/permissions";

/**
 * Middleware to require authentication
 * 
 * Usage in API routes:
 * ```ts
 * export async function GET(request: Request) {
 *   try {
 *     const user = await requireAuth();
 *     // ... your code
 *   } catch (error) {
 *     return handleAuthError(error);
 *   }
 * }
 * ```
 */
export async function withAuth(
  handler: (request: Request, user: any) => Promise<Response>
) {
  return async (request: Request) => {
    try {
      const user = await requireAuth();
      return await handler(request, user);
    } catch (error) {
      return handleAuthError(error);
    }
  };
}

/**
 * Middleware to require specific role(s)
 * 
 * Usage in API routes:
 * ```ts
 * export const GET = withRole(["ADMIN", "OPERATOR"], async (request, user) => {
 *   // ... your code
 * });
 * ```
 */
export function withRole(
  roles: UserRole | UserRole[],
  handler: (request: Request, user: any) => Promise<Response>
) {
  return async (request: Request) => {
    try {
      const user = await requireRole(roles);
      return await handler(request, user);
    } catch (error) {
      return handleAuthError(error);
    }
  };
}

/**
 * Middleware to require specific permission
 * 
 * Usage in API routes:
 * ```ts
 * export const GET = withPermission("residents.view", async (request, user) => {
 *   // ... your code
 * });
 * ```
 */
export function withPermission(
  permission: Permission,
  handler: (request: Request, user: any) => Promise<Response>
) {
  return async (request: Request) => {
    try {
      const user = await requirePermission(permission);
      return await handler(request, user);
    } catch (error) {
      return handleAuthError(error);
    }
  };
}

/**
 * Middleware to require any of the specified permissions
 * 
 * Usage in API routes:
 * ```ts
 * export const GET = withAnyPermission(
 *   ["residents.view", "residents.view_all"],
 *   async (request, user) => {
 *     // ... your code
 *   }
 * );
 * ```
 */
export function withAnyPermission(
  permissions: Permission[],
  handler: (request: Request, user: any) => Promise<Response>
) {
  return async (request: Request) => {
    try {
      const user = await requireAnyPermission(permissions);
      return await handler(request, user);
    } catch (error) {
      return handleAuthError(error);
    }
  };
}

/**
 * Middleware to require ability to perform action on resource
 * 
 * Usage in API routes:
 * ```ts
 * export const POST = withAction("resident", "create", async (request, user) => {
 *   // ... your code
 * });
 * ```
 */
export function withAction(
  resourceType: ResourceType,
  action: ResourceAction,
  handler: (request: Request, user: any) => Promise<Response>
) {
  return async (request: Request) => {
    try {
      const user = await requireAction(resourceType, action);
      return await handler(request, user);
    } catch (error) {
      return handleAuthError(error);
    }
  };
}

/**
 * Helper to create a protected API route with multiple middleware
 * 
 * Usage:
 * ```ts
 * export const GET = protectedRoute(
 *   { roles: ["ADMIN", "OPERATOR"] },
 *   async (request, user) => {
 *     // ... your code
 *   }
 * );
 * ```
 */
export function protectedRoute(
  options: {
    roles?: UserRole | UserRole[];
    permission?: Permission;
    permissions?: Permission[];
    action?: { resourceType: ResourceType; action: ResourceAction };
  },
  handler: (request: Request, user: any) => Promise<Response>
) {
  return async (request: Request) => {
    try {
      const user = await requireAuth();
      
      // Check role if specified
      if (options.roles) {
        await requireRole(options.roles);
      }
      
      // Check permission if specified
      if (options.permission) {
        await requirePermission(options.permission);
      }
      
      // Check any permissions if specified
      if (options.permissions) {
        await requireAnyPermission(options.permissions);
      }
      
      // Check action if specified
      if (options.action) {
        await requireAction(options.action.resourceType, options.action.action);
      }
      
      return await handler(request, user);
    } catch (error) {
      return handleAuthError(error);
    }
  };
}

/**
 * Utility to check if request is authenticated
 */
export async function isAuthenticated(request: Request): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    return user !== null;
  } catch {
    return false;
  }
}

/**
 * Utility to get user from request
 */
export async function getUserFromRequest(
  request: Request
): Promise<any | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/**
 * Create error response for authorization failures
 */
export function createAuthErrorResponse(
  error: unknown,
  defaultMessage: string = "Unauthorized"
): Response {
  if (error instanceof UnauthenticatedError) {
    return Response.json(
      { error: error.message || "Not authenticated" },
      { status: 401 }
    );
  }
  
  if (error instanceof UnauthorizedError) {
    return Response.json(
      { error: error.message || "Access denied" },
      { status: 403 }
    );
  }
  
  console.error("Authorization error:", error);
  return Response.json(
    { error: defaultMessage },
    { status: 500 }
  );
}
