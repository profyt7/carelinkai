/**
 * Role-Based Access Control (RBAC) Utilities
 * Centralized authorization logic for API routes and UI pages
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorResponses, createErrorResponse, ErrorCode } from '../errors/api-errors';
import { logger } from '../logger';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
  };
}

/**
 * Get authenticated session from request
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
  return session as AuthSession;
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getAuthSession();
  
  if (!session) {
    logger.warn('Unauthorized access attempt');
    throw new Error('UNAUTHORIZED');
  }
  
  return session;
}

/**
 * Check if user has specific role
 */
export function hasRole(session: AuthSession, role: UserRole): boolean {
  return session.user.role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(session: AuthSession, roles: UserRole[]): boolean {
  return roles.includes(session.user.role);
}

/**
 * Require specific role - throws error if user doesn't have role
 */
export async function requireRole(role: UserRole): Promise<AuthSession> {
  const session = await requireAuth();
  
  if (!hasRole(session, role)) {
    logger.warn('Forbidden access attempt', {
      userId: session.user.id,
      userRole: session.user.role,
      requiredRole: role,
    });
    throw new Error('FORBIDDEN');
  }
  
  return session;
}

/**
 * Require any of the specified roles
 */
export async function requireAnyRole(roles: UserRole[]): Promise<AuthSession> {
  const session = await requireAuth();
  
  if (!hasAnyRole(session, roles)) {
    logger.warn('Forbidden access attempt', {
      userId: session.user.id,
      userRole: session.user.role,
      requiredRoles: roles,
    });
    throw new Error('FORBIDDEN');
  }
  
  return session;
}

/**
 * Check if user is admin
 */
export function isAdmin(session: AuthSession): boolean {
  return session.user.role === UserRole.ADMIN;
}

/**
 * Check if user is operator
 */
export function isOperator(session: AuthSession): boolean {
  return session.user.role === UserRole.OPERATOR;
}

/**
 * Check if user is admin or operator (staff)
 */
export function isStaff(session: AuthSession): boolean {
  return isAdmin(session) || isOperator(session);
}

/**
 * Require admin role
 */
export async function requireAdmin(): Promise<AuthSession> {
  return requireRole(UserRole.ADMIN);
}

/**
 * Require operator role
 */
export async function requireOperator(): Promise<AuthSession> {
  return requireRole(UserRole.OPERATOR);
}

/**
 * Require admin or operator role
 */
export async function requireStaff(): Promise<AuthSession> {
  return requireAnyRole([UserRole.ADMIN, UserRole.OPERATOR]);
}

/**
 * Check if user owns a resource
 */
export function ownsResource(session: AuthSession, resourceUserId: string): boolean {
  return session.user.id === resourceUserId;
}

/**
 * Require resource ownership or admin role
 */
export function requireOwnership(
  session: AuthSession,
  resourceUserId: string
): void {
  if (!ownsResource(session, resourceUserId) && !isAdmin(session)) {
    logger.warn('Unauthorized resource access attempt', {
      userId: session.user.id,
      resourceUserId,
    });
    throw new Error('FORBIDDEN');
  }
}

/**
 * Require resource ownership, admin, or operator role
 */
export function requireOwnershipOrStaff(
  session: AuthSession,
  resourceUserId: string
): void {
  if (!ownsResource(session, resourceUserId) && !isStaff(session)) {
    logger.warn('Unauthorized resource access attempt', {
      userId: session.user.id,
      resourceUserId,
    });
    throw new Error('FORBIDDEN');
  }
}

/**
 * RBAC middleware wrapper for API routes
 */
export function withAuth(
  handler: (req: NextRequest, session: AuthSession) => Promise<NextResponse>,
  options?: {
    roles?: UserRole[];
  }
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get session
      const session = await getAuthSession();
      
      if (!session) {
        return ErrorResponses.unauthorized();
      }
      
      // Check roles if specified
      if (options?.roles && !hasAnyRole(session, options.roles)) {
        return ErrorResponses.forbidden(
          'You do not have permission to access this resource'
        );
      }
      
      // Call handler with session
      return await handler(req, session);
    } catch (error) {
      logger.error('Auth middleware error', {
        path: req.nextUrl.pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      
      if (error instanceof Error) {
        if (error.message === 'UNAUTHORIZED') {
          return ErrorResponses.unauthorized();
        }
        if (error.message === 'FORBIDDEN') {
          return ErrorResponses.forbidden();
        }
      }
      
      return createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'An error occurred while processing your request',
        500
      );
    }
  };
}

/**
 * Permission definitions for different resources and actions
 */
export const Permissions = {
  // Profile permissions
  profile: {
    view: (session: AuthSession, userId: string) =>
      ownsResource(session, userId) || isStaff(session),
    edit: (session: AuthSession, userId: string) =>
      ownsResource(session, userId) || isAdmin(session),
    delete: (session: AuthSession, userId: string) =>
      ownsResource(session, userId) || isAdmin(session),
  },
  
  // Lead permissions
  lead: {
    create: (session: AuthSession) =>
      session.user.role === UserRole.FAMILY,
    view: (session: AuthSession, leadFamilyId: string) =>
      ownsResource(session, leadFamilyId) || isStaff(session),
    edit: (session: AuthSession, leadFamilyId: string) =>
      ownsResource(session, leadFamilyId) || isStaff(session),
    assign: (session: AuthSession) =>
      isStaff(session),
    updateStatus: (session: AuthSession) =>
      isStaff(session),
  },
  
  // Credential permissions
  credential: {
    create: (session: AuthSession, userId: string) =>
      ownsResource(session, userId),
    view: (session: AuthSession, userId: string) =>
      ownsResource(session, userId) || isStaff(session),
    edit: (session: AuthSession, userId: string) =>
      ownsResource(session, userId),
    delete: (session: AuthSession, userId: string) =>
      ownsResource(session, userId) || isAdmin(session),
    verify: (session: AuthSession) =>
      isAdmin(session),
  },
  
  // Message permissions
  message: {
    send: (session: AuthSession) => true, // All authenticated users
    view: (session: AuthSession, participantIds: string[]) =>
      participantIds.includes(session.user.id) || isStaff(session),
  },
  
  // Admin permissions
  admin: {
    viewUsers: (session: AuthSession) => isAdmin(session),
    editUsers: (session: AuthSession) => isAdmin(session),
    verifyCredentials: (session: AuthSession) => isAdmin(session),
    manageProviders: (session: AuthSession) => isAdmin(session),
  },
  
  // Operator permissions
  operator: {
    viewLeads: (session: AuthSession) => isStaff(session),
    assignLeads: (session: AuthSession) => isStaff(session),
    editHomes: (session: AuthSession) => isStaff(session),
  },
};
