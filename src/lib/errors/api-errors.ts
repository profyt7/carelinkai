/**
 * Standardized API Error Response Utility
 * Provides consistent error formatting across all API routes
 */

import { NextResponse } from 'next/server';
import { logger } from '../logger';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  
  // Operations
  OPERATION_FAILED = 'OPERATION_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface ApiErrorDetails {
  field?: string;
  constraint?: string;
  [key: string]: any;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetails;
  };
}

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: ApiErrorDetails
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number = 500,
  details?: ApiErrorDetails,
  logContext?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  // Log error server-side with context
  logger.error('API Error', {
    code,
    message,
    statusCode,
    details,
    ...logContext,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status: statusCode }
  );
}

/**
 * Handle API errors and convert to standardized response
 */
export function handleApiError(
  error: unknown,
  logContext?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  // Handle known ApiError
  if (error instanceof ApiError) {
    return createErrorResponse(
      error.code,
      error.message,
      error.statusCode,
      error.details,
      logContext
    );
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any;
    
    if (prismaError.code === 'P2002') {
      return createErrorResponse(
        ErrorCode.ALREADY_EXISTS,
        'A record with this information already exists',
        409,
        { constraint: prismaError.meta?.target },
        logContext
      );
    }
    
    if (prismaError.code === 'P2025') {
      return createErrorResponse(
        ErrorCode.NOT_FOUND,
        'The requested resource was not found',
        404,
        undefined,
        logContext
      );
    }
    
    // Other Prisma errors
    return createErrorResponse(
      ErrorCode.DATABASE_ERROR,
      'A database error occurred',
      500,
      undefined,
      { ...logContext, prismaCode: prismaError.code }
    );
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return createErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    message,
    500,
    undefined,
    { ...logContext, originalError: String(error) }
  );
}

/**
 * Common error response helpers
 */
export const ErrorResponses = {
  unauthorized: (message = 'Authentication required') =>
    createErrorResponse(ErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (message = 'You do not have permission to access this resource') =>
    createErrorResponse(ErrorCode.FORBIDDEN, message, 403),

  notFound: (resource = 'Resource') =>
    createErrorResponse(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  validation: (message: string, details?: ApiErrorDetails) =>
    createErrorResponse(ErrorCode.VALIDATION_ERROR, message, 400, details),

  alreadyExists: (resource = 'Resource') =>
    createErrorResponse(
      ErrorCode.ALREADY_EXISTS,
      `${resource} already exists`,
      409
    ),

  rateLimit: (retryAfter?: number) =>
    createErrorResponse(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      'Too many requests, please try again later',
      429,
      retryAfter ? { retryAfter } : undefined
    ),
};
