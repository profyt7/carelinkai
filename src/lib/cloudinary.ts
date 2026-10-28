/**
 * Cloudinary Configuration
 * 
 * This file provides a centralized configuration for Cloudinary.
 * It exports both the server-side v2 API and configuration utilities.
 * 
 * @module lib/cloudinary
 */

import { v2 as cloudinary } from 'cloudinary';

/**
 * Configure Cloudinary with environment variables
 * This should only be called on the server-side
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Check if Cloudinary is properly configured
 * @returns true if all required environment variables are set
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Get Cloudinary configuration status
 * @returns Object with configuration status and details
 */
export function getCloudinaryConfig() {
  return {
    configured: isCloudinaryConfigured(),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    hasApiKey: !!process.env.CLOUDINARY_API_KEY,
    hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
  };
}

/**
 * Upload options for different file types
 */
export const UPLOAD_PRESETS = {
  // Family gallery photos
  FAMILY_GALLERY: {
    folder: 'carelinkai/family',
    resource_type: 'auto' as const,
    transformation: [
      { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
    ],
  },
  
  // Family documents (uploaded by family members)
  FAMILY_DOCUMENTS: {
    folder: 'carelinkai/family/documents',
    resource_type: 'auto' as const,
  },
  
  // Resident documents (medical records, etc.)
  RESIDENT_DOCUMENTS: {
    folder: 'carelinkai/residents/documents',
    resource_type: 'auto' as const,
  },
  
  // Caregiver documents (certifications, licenses, etc.)
  CAREGIVER_DOCUMENTS: {
    folder: 'carelinkai/caregivers/documents',
    resource_type: 'auto' as const,
  },
  
  // Inquiry attachments
  INQUIRY_DOCUMENTS: {
    folder: 'carelinkai/inquiries',
    resource_type: 'auto' as const,
  },
  
  // Profile photos
  PROFILE_PHOTOS: {
    folder: 'carelinkai/profiles',
    resource_type: 'image' as const,
    transformation: [
      { width: 400, height: 400, crop: 'fill', quality: 'auto', gravity: 'face' },
    ],
  },
} as const;

/**
 * Generate a thumbnail URL from a Cloudinary public ID
 * @param publicId - The Cloudinary public ID
 * @param width - Thumbnail width (default: 300)
 * @param height - Thumbnail height (default: 300)
 * @returns Thumbnail URL
 */
export function getThumbnailUrl(
  publicId: string,
  width: number = 300,
  height: number = 300
): string {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto',
    fetch_format: 'auto',
  });
}

/**
 * Delete a file from Cloudinary
 * @param publicId - The Cloudinary public ID to delete
 * @param resourceType - The resource type (image, video, raw)
 * @returns Promise with deletion result
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<any> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Upload a file buffer to Cloudinary
 * @param buffer - File buffer to upload
 * @param options - Upload options
 * @returns Promise with upload result
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder: string;
    resourceType?: 'auto' | 'image' | 'video' | 'raw';
    publicId?: string;
    transformation?: any[];
  }
): Promise<any> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        resource_type: options.resourceType || 'auto',
        public_id: options.publicId,
        transformation: options.transformation,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
}

// Export the configured cloudinary instance as default
export default cloudinary;
