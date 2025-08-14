/**
 * HIPAA-Compliant Audit Logging System
 * 
 * This module provides a comprehensive audit logging system that tracks all user actions,
 * data access, modifications, and security events in compliance with HIPAA regulations.
 * 
 * Key features:
 * - Detailed audit trails for all data operations
 * - Immutable log entries with timestamps and user identification
 * - Capture of contextual information (IP, user agent, etc.)
 * - Support for compliance reporting and investigations
 * - Enforced retention policies (7+ years for HIPAA)
 */

import { PrismaClient, AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Initialize Prisma client
const prisma = new PrismaClient();

// Constants
const AUDIT_LOG_RETENTION_DAYS = parseInt(
  process.env["AUDIT_LOG_RETENTION_DAYS"] || "2555"
); // Default: 7 years (HIPAA requirement)
const AUDIT_LOGGING_ENABLED = process.env["AUDIT_LOGGING_ENABLED"] !== "false"; // Enabled by default

// Types for audit logging
export interface AuditLogOptions {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  actionedBy?: string | null; // For admin actions on behalf of users
}

export interface AuditQuery {
  userId?: string;
  actionedBy?: string;
  action?: AuditAction | AuditAction[];
  resourceType?: string | string[];
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  limit?: number;
  offset?: number;
  sortDirection?: "asc" | "desc";
}

/**
 * Create an audit log entry
 * 
 * @param options Audit log options
 * @returns The created audit log entry
 */
export async function createAuditLog(options: AuditLogOptions) {
  if (!AUDIT_LOGGING_ENABLED) {
    return null;
  }

  try {
    // Sanitize metadata to prevent storing sensitive information
    const sanitizedMetadata = options.metadata 
      ? sanitizeMetadata(options.metadata) 
      : undefined;

    // Create the audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: options.userId,
        actionedBy: options.actionedBy || null,
        action: options.action,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        description: options.description,
        metadata: sanitizedMetadata,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    });

    return auditLog;
  } catch (error) {
    // Log error but don't throw - audit logging should not break application flow
    console.error("Failed to create audit log:", error);
    
    // In production, we might want to send this to a monitoring service
    if (process.env.NODE_ENV === "production") {
      // reportToMonitoring("AUDIT_LOG_FAILURE", error);
    }
    
    return null;
  }
}

/**
 * Create an audit log from a Next.js API route request
 * 
 * @param req Next.js request object
 * @param action Audit action
 * @param resourceType Type of resource being accessed
 * @param resourceId ID of the resource (if applicable)
 * @param description Description of the action
 * @param metadata Additional metadata
 * @returns The created audit log entry
 */
export async function createAuditLogFromRequest(
  req: NextRequest,
  action: AuditAction,
  resourceType: string,
  resourceId: string | null,
  description: string,
  metadata?: Record<string, any>
) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    if (!userId) {
      console.warn("Attempted to create audit log without authenticated user");
      return null;
    }
    
    // Extract IP address and user agent
    const ipAddress = req.headers.get("x-forwarded-for") || 
                      req.headers.get("x-real-ip") || 
                      "unknown";
    
    const userAgent = req.headers.get("user-agent") || "unknown";
    
    // Create the audit log
    return await createAuditLog({
      userId,
      action,
      resourceType,
      resourceId,
      description,
      metadata,
      ipAddress: ipAddress.toString(),
      userAgent: userAgent.toString(),
    });
  } catch (error) {
    console.error("Failed to create audit log from request:", error);
    return null;
  }
}

/**
 * Query audit logs based on various criteria
 * 
 * @param query Query parameters
 * @returns Array of matching audit logs
 */
export async function queryAuditLogs(query: AuditQuery) {
  const {
    userId,
    actionedBy,
    action,
    resourceType,
    resourceId,
    startDate,
    endDate,
    ipAddress,
    limit = 100,
    offset = 0,
    sortDirection = "desc",
  } = query;
  
  // Build the where clause
  const where: any = {};
  
  if (userId) where.userId = userId;
  if (actionedBy) where.actionedBy = actionedBy;
  
  if (action) {
    if (Array.isArray(action)) {
      where.action = { in: action };
    } else {
      where.action = action;
    }
  }
  
  if (resourceType) {
    if (Array.isArray(resourceType)) {
      where.resourceType = { in: resourceType };
    } else {
      where.resourceType = resourceType;
    }
  }
  
  if (resourceId) where.resourceId = resourceId;
  if (ipAddress) where.ipAddress = ipAddress;
  
  // Date range
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }
  
  // Execute the query
  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: sortDirection,
      },
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        actionedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  
  return {
    logs,
    totalCount,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(totalCount / limit),
    hasMore: offset + limit < totalCount,
  };
}

/**
 * Get the audit trail for a specific resource
 * 
 * @param resourceType Type of resource
 * @param resourceId ID of the resource
 * @param limit Maximum number of logs to return
 * @returns Array of audit logs for the resource
 */
export async function getResourceAuditTrail(
  resourceType: string,
  resourceId: string,
  limit = 50
) {
  return prisma.auditLog.findMany({
    where: {
      resourceType,
      resourceId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      actionedByUser: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Get the audit trail for a specific user
 * 
 * @param userId User ID
 * @param limit Maximum number of logs to return
 * @returns Array of audit logs for the user
 */
export async function getUserAuditTrail(userId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/**
 * Get recent security events (login attempts, permission changes, etc.)
 * 
 * @param limit Maximum number of events to return
 * @returns Array of security-related audit logs
 */
export async function getSecurityEvents(limit = 100) {
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { action: "LOGIN" },
        { action: "LOGOUT" },
        { action: "ACCESS_DENIED" },
        { description: { contains: "permission" } },
        { description: { contains: "security" } },
        { description: { contains: "password" } },
        { description: { contains: "authentication" } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Generate a HIPAA compliance report for a date range
 * 
 * @param startDate Start date for the report
 * @param endDate End date for the report
 * @returns Compliance report data
 */
export async function generateComplianceReport(startDate: Date, endDate: Date) {
  // Get all logs in the date range
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });
  
  // Calculate statistics
  const totalEvents = logs.length;
  
  const actionCounts = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const resourceTypeCounts = logs.reduce((acc, log) => {
    acc[log.resourceType] = (acc[log.resourceType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const userCounts = logs.reduce((acc, log) => {
    acc[log.userId] = (acc[log.userId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Get top users by activity
  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, count]) => ({ userId, count }));
  
  // Get user details for top users
  const userDetails = await prisma.user.findMany({
    where: {
      id: {
        in: topUsers.map(u => u.userId),
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });
  
  // Merge user details with activity counts
  const topUsersWithDetails = topUsers.map(user => {
    const details = userDetails.find(u => u.id === user.userId);
    return {
      ...user,
      ...details,
    };
  });
  
  return {
    reportPeriod: {
      startDate,
      endDate,
      durationDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    },
    summary: {
      totalEvents,
      uniqueUsers: Object.keys(userCounts).length,
      uniqueResourceTypes: Object.keys(resourceTypeCounts).length,
    },
    actionBreakdown: actionCounts,
    resourceTypeBreakdown: resourceTypeCounts,
    topUsers: topUsersWithDetails,
    generatedAt: new Date(),
  };
}

/**
 * Purge old audit logs based on retention policy
 * This should be run as a scheduled job
 * 
 * @returns Number of purged logs
 */
export async function purgeOldAuditLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - AUDIT_LOG_RETENTION_DAYS);
  
  // In a real HIPAA environment, we might want to archive logs before deletion
  // For now, we'll just count and delete
  const count = await prisma.auditLog.count({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });
  
  if (count > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    
    // Log this operation (but not to the audit log to avoid recursion)
    console.info(`Purged ${count} audit logs older than ${AUDIT_LOG_RETENTION_DAYS} days`);
  }
  
  return count;
}

/**
 * Record an access attempt to PHI (Protected Health Information)
 * Special handling for HIPAA-sensitive data
 * 
 * @param userId User accessing the data
 * @param resourceType Type of PHI resource
 * @param resourceId ID of the resource
 * @param purpose Purpose of access (treatment, payment, operations, etc.)
 * @param successful Whether access was granted
 * @param request Optional request object for IP and user agent
 */
export async function recordPHIAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  purpose: string,
  successful: boolean,
  request?: NextRequest
) {
  const action = successful ? "READ" : "ACCESS_DENIED";
  const description = `${successful ? "Accessed" : "Attempted to access"} PHI: ${resourceType} for purpose: ${purpose}`;
  
  const metadata = {
    purpose,
    phi: true, // Flag this as PHI access
    accessGranted: successful,
    accessReason: purpose,
  };
  
  if (request) {
    return createAuditLogFromRequest(
      request,
      action as AuditAction,
      resourceType,
      resourceId,
      description,
      metadata
    );
  } else {
    return createAuditLog({
      userId,
      action: action as AuditAction,
      resourceType,
      resourceId,
      description,
      metadata,
    });
  }
}

/**
 * Record a data export event (important for HIPAA compliance)
 * 
 * @param userId User performing the export
 * @param resourceType Type of resource exported
 * @param format Export format (CSV, PDF, etc.)
 * @param filters Filters applied to the export
 * @param recordCount Number of records exported
 * @param request Optional request object
 */
export async function recordDataExport(
  userId: string,
  resourceType: string,
  format: string,
  filters: Record<string, any>,
  recordCount: number,
  request?: NextRequest
) {
  const description = `Exported ${recordCount} ${resourceType} records in ${format} format`;
  
  const metadata = {
    exportFormat: format,
    filters,
    recordCount,
    exportId: uuidv4(), // Unique ID for this export
    timestamp: new Date().toISOString(),
  };
  
  if (request) {
    return createAuditLogFromRequest(
      request,
      "EXPORT",
      resourceType,
      null,
      description,
      metadata
    );
  } else {
    return createAuditLog({
      userId,
      action: "EXPORT",
      resourceType,
      resourceId: null,
      description,
      metadata,
    });
  }
}

/**
 * Sanitize metadata to prevent storing sensitive information
 * 
 * @param metadata Metadata object to sanitize
 * @returns Sanitized metadata
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sensitiveKeys = [
    "password", "token", "secret", "key", "auth", "credential", "ssn", 
    "social", "credit", "card", "cvv", "pin", "passphrase"
  ];
  
  const sanitized = { ...metadata };
  
  // Deep sanitization
  function sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if this key contains sensitive information
      const isKeySensitive = sensitiveKeys.some(
        sensitiveKey => key.toLowerCase().includes(sensitiveKey.toLowerCase())
      );
      
      if (isKeySensitive) {
        // Redact sensitive values
        result[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        // Recursively sanitize objects and arrays
        result[key] = Array.isArray(value)
          ? value.map(item => typeof item === "object" ? sanitizeObject(item) : item)
          : sanitizeObject(value);
      } else {
        // Keep non-sensitive values
        result[key] = value;
      }
    }
    
    return result;
  }
  
  return sanitizeObject(sanitized);
}

/**
 * Check if a user has accessed a specific resource before
 * Useful for detecting unusual access patterns
 * 
 * @param userId User ID
 * @param resourceType Resource type
 * @param resourceId Resource ID
 * @returns Whether the user has accessed this resource before
 */
export async function hasUserAccessedResourceBefore(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  const previousAccess = await prisma.auditLog.findFirst({
    where: {
      userId,
      resourceType,
      resourceId,
      action: "READ",
    },
  });
  
  return !!previousAccess;
}

/**
 * Get unusual access patterns that might indicate security issues
 * 
 * @param lookbackDays Number of days to analyze
 * @returns List of potentially suspicious activities
 */
export async function detectUnusualAccessPatterns(lookbackDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
  
  // Get all access logs in the period
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: cutoffDate,
      },
      action: {
        in: ["READ", "UPDATE", "DELETE", "EXPORT"],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });
  
  // Group by user and resource type
  const userResourceAccess: Record<string, Record<string, number>> = {};
  
  logs.forEach((log) => {
    const userKey = log.userId;
    const resourceKey = log.resourceType;

    if (!userResourceAccess[userKey]) {
      userResourceAccess[userKey] = {};
    }

    const userMap = userResourceAccess[userKey]!;
    userMap[resourceKey] = (userMap[resourceKey] || 0) + 1;
  });
  
  // Identify unusual patterns
  const unusualPatterns = [];
  
  for (const [userId, resourceAccess] of Object.entries(userResourceAccess)) {
    const user = logs.find(log => log.userId === userId)?.user;
    
    // Check for high volume access
    for (const [resourceType, count] of Object.entries(resourceAccess)) {
      // Thresholds would be calibrated based on normal usage patterns
      // These are just examples
      const threshold = getAccessThresholdForRole(user?.role, resourceType);
      
      if (count > threshold) {
        unusualPatterns.push({
          userId,
          userEmail: user?.email,
          userRole: user?.role,
          resourceType,
          accessCount: count,
          threshold,
          severity: getSeverityLevel(count, threshold),
          type: "HIGH_VOLUME_ACCESS",
        });
      }
    }
    
    // Other pattern checks would go here (off-hours access, etc.)
  }
  
  return unusualPatterns;
}

/**
 * Get the access threshold for a specific role and resource type
 * These thresholds would be calibrated based on normal usage patterns
 * 
 * @param role User role
 * @param resourceType Resource type
 * @returns Threshold for number of accesses
 */
function getAccessThresholdForRole(role: string | undefined, resourceType: string): number {
  // These thresholds would be calibrated based on normal usage patterns
  // These are just examples
  const baseThresholds: Record<string, number> = {
    "Resident": 100,
    "AssistedLivingHome": 150,
    "Caregiver": 200,
    "Document": 75,
    "Payment": 50,
    "User": 30,
  };
  
  // Adjust threshold based on role
  const roleMultiplier = role === "ADMIN" ? 3 :
                        role === "OPERATOR" ? 2 :
                        role === "CAREGIVER" ? 1.5 :
                        1;
  
  return Math.round((baseThresholds[resourceType] || 50) * roleMultiplier);
}

/**
 * Get the severity level based on how much the count exceeds the threshold
 * 
 * @param count Actual count
 * @param threshold Threshold value
 * @returns Severity level (low, medium, high)
 */
function getSeverityLevel(count: number, threshold: number): "low" | "medium" | "high" {
  const ratio = count / threshold;
  
  if (ratio > 3) return "high";
  if (ratio > 1.5) return "medium";
  return "low";
}
