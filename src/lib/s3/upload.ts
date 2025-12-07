/**
 * S3 Upload Utilities with Retry Logic
 * Provides robust file upload handling with retries and validation
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../logger';
import { sanitizeFilename } from '../validation/sanitize';

// File type validation
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALLOWED_FILE_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

/**
 * Validate file type
 */
export function validateFileType(contentType: string, allowDocuments = true): FileValidationResult {
  const allowedTypes = allowDocuments ? ALLOWED_FILE_TYPES : ALLOWED_IMAGE_TYPES;
  
  if (!allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(size: number, contentType: string): FileValidationResult {
  const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
  const maxSizeMB = maxSize / (1024 * 1024);
  
  if (size > maxSize) {
    return {
      valid: false,
      error: `File is too large. Maximum size: ${maxSizeMB}MB`,
    };
  }
  
  return { valid: true };
}

/**
 * Comprehensive file validation
 */
export function validateFile(
  filename: string,
  contentType: string,
  size: number,
  allowDocuments = true
): FileValidationResult {
  // Validate filename
  if (!filename || filename.trim().length === 0) {
    return { valid: false, error: 'Filename is required' };
  }
  
  if (filename.length > 255) {
    return { valid: false, error: 'Filename is too long' };
  }
  
  // Validate file type
  const typeValidation = validateFileType(contentType, allowDocuments);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  // Validate file size
  const sizeValidation = validateFileSize(size, contentType);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  return { valid: true };
}

/**
 * Generate S3 client
 */
function getS3Client(): S3Client {
  return new S3Client({
    region: process.env['AWS_REGION'] || 'us-east-1',
    credentials: {
      accessKeyId: process.env['AWS_ACCESS_KEY_ID']!,
      secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY']!,
    },
  });
}

/**
 * Generate unique S3 key for file
 */
export function generateS3Key(userId: string, category: string, filename: string): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(filename);
  const randomId = Math.random().toString(36).substring(2, 10);
  
  return `${category}/${userId}/${timestamp}-${randomId}-${sanitized}`;
}

/**
 * Generate presigned URL with retry logic
 */
export async function generatePresignedUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
  maxRetries = 3
): Promise<UploadResult> {
  const s3Client = getS3Client();
  const bucketName = process.env['AWS_S3_BUCKET'];
  
  if (!bucketName) {
    logger.error('S3 bucket name not configured');
    return {
      success: false,
      error: 'File upload is not configured',
    };
  }
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      });
      
      const presignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn,
      });
      
      logger.info('Generated presigned URL', {
        key,
        attempt,
        contentType,
      });
      
      return {
        success: true,
        url: presignedUrl,
        key,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      logger.warn('Failed to generate presigned URL', {
        key,
        attempt,
        maxRetries,
        error: lastError.message,
      });
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error('Failed to generate presigned URL after retries', {
    key,
    maxRetries,
    error: lastError?.message,
  });
  
  return {
    success: false,
    error: 'Failed to generate upload URL. Please try again.',
  };
}

/**
 * Upload file to S3 with retry logic (client-side helper)
 */
export async function uploadToS3(
  presignedUrl: string,
  file: File | Blob,
  contentType: string,
  maxRetries = 3,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      
      // Extract URL without query parameters
      const url = presignedUrl.split('?')[0];
      
      if (onProgress) {
        onProgress(100);
      }
      
      return {
        success: true,
        url,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Failed to upload file. Please try again.',
  };
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  const ext = parts[parts.length - 1];
  return parts.length > 1 && ext ? ext.toLowerCase() : '';
}

/**
 * Get content type from file extension
 */
export function getContentTypeFromExtension(extension: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    pdf: 'application/pdf',
  };
  
  return map[extension.toLowerCase()] || 'application/octet-stream';
}
