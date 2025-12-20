/**
 * Cloudinary upload utilities for documents
 * Feature #6: Smart Document Processing
 */

import { v2 as cloudinary } from 'cloudinary';
import { FileValidationResult, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/types/documents';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Validate file before upload
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      errorCode: 'FILE_TOO_LARGE',
    };
  }

  // Check file type
  const isValidType = Object.keys(SUPPORTED_FILE_TYPES).includes(file.type);
  if (!isValidType) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload PDF, JPG, or PNG files.',
      errorCode: 'INVALID_TYPE',
    };
  }

  return { valid: true };
}

/**
 * Upload file to Cloudinary
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'carelinkai/documents',
        resource_type: 'auto',
        public_id: fileName,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
