/**
 * Database Transaction Utilities
 * Provides wrappers for critical operations with transaction support
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../logger';

const prisma = new PrismaClient();

export interface TransactionOptions {
  maxRetries?: number;
  timeout?: number;
}

/**
 * Execute a function within a Prisma transaction with retry logic
 */
export async function executeTransaction<T>(
  fn: (tx: PrismaClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { maxRetries = 3, timeout = 10000 } = options;
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          return await fn(tx as unknown as PrismaClient);
        },
        {
          timeout,
        }
      );
      
      if (attempt > 1) {
        logger.info('Transaction succeeded after retry', { attempt });
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if error is retryable
      const isRetryable = isRetryableError(lastError);
      
      if (!isRetryable || attempt === maxRetries) {
        logger.error('Transaction failed', {
          attempt,
          maxRetries,
          error: lastError.message,
          isRetryable,
        });
        throw lastError;
      }
      
      logger.warn('Transaction failed, retrying', {
        attempt,
        maxRetries,
        error: lastError.message,
      });
      
      // Wait before retry (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Transaction failed');
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error): boolean {
  const retryableCodes = [
    'P2034', // Transaction conflict
    'P1001', // Cannot reach database
    'P1002', // Database timeout
    'P1008', // Operations timed out
    'P1017', // Server has closed the connection
  ];
  
  const errorMessage = error.message.toLowerCase();
  
  // Check Prisma error codes
  if (retryableCodes.some(code => errorMessage.includes(code.toLowerCase()))) {
    return true;
  }
  
  // Check for connection errors
  if (
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('econnreset') ||
    errorMessage.includes('econnrefused')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Execute a query with retry logic (for non-transaction operations)
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      if (attempt > 1) {
        logger.info('Query succeeded after retry', { attempt });
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      const isRetryable = isRetryableError(lastError);
      
      if (!isRetryable || attempt === maxRetries) {
        logger.error('Query failed', {
          attempt,
          maxRetries,
          error: lastError.message,
          isRetryable,
        });
        throw lastError;
      }
      
      logger.warn('Query failed, retrying', {
        attempt,
        maxRetries,
        error: lastError.message,
      });
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Query failed');
}

export { prisma };
