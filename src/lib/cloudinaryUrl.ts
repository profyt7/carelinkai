/**
 * Cloudinary URL Helper Utility (Client-Side Safe)
 * 
 * This utility provides functions to generate optimized Cloudinary URLs with transformation parameters.
 * It bypasses Next.js Image Optimization and uses Cloudinary's own optimization instead.
 * 
 * This file contains NO server-side dependencies and can be safely imported in client components.
 * 
 * Configuration:
 * - Cloud Name: dygtsnu8z
 * - Base URL: https://res.cloudinary.com/dygtsnu8z/image/upload/
 * 
 * @module lib/cloudinaryUrl
 */

/**
 * Transformation options for Cloudinary URLs
 */
export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | 'auto:low' | number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  crop?: 'scale' | 'fit' | 'fill' | 'crop' | 'thumb' | 'pad';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  fetchFormat?: 'auto';
}

const CLOUDINARY_CLOUD_NAME = 'dygtsnu8z';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/`;

/**
 * Checks if a URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
}

/**
 * Extracts the public ID from a Cloudinary URL
 * Example: https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830428/carelinkai/homes/home-1.jpg
 * Returns: carelinkai/homes/home-1.jpg (without version)
 */
export function extractCloudinaryPublicId(url: string): string | null {
  try {
    // Match pattern: /upload/v<version>/<public-id>
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (match && match[1]) {
      return match[1];
    }
    
    // Alternative: /upload/<public-id>
    const altMatch = url.match(/\/upload\/(.+?)(?:\.\w+)?$/);
    if (altMatch && altMatch[1]) {
      return altMatch[1];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting Cloudinary public ID:', error);
    return null;
  }
}

/**
 * Builds transformation parameters string for Cloudinary URL
 */
function buildTransformationString(options: CloudinaryTransformOptions): string {
  const params: string[] = [];
  
  if (options.width) {
    params.push(`w_${options.width}`);
  }
  
  if (options.height) {
    params.push(`h_${options.height}`);
  }
  
  if (options.quality) {
    params.push(`q_${options.quality}`);
  }
  
  if (options.format) {
    params.push(`f_${options.format}`);
  }
  
  if (options.crop) {
    params.push(`c_${options.crop}`);
  }
  
  if (options.gravity) {
    params.push(`g_${options.gravity}`);
  }
  
  if (options.fetchFormat) {
    params.push(`f_${options.fetchFormat}`);
  }
  
  return params.join(',');
}

/**
 * Generates an optimized Cloudinary URL with transformation parameters
 * 
 * @param url - The original Cloudinary URL or public ID
 * @param options - Transformation options for image optimization
 * @returns Optimized Cloudinary URL with transformations
 * 
 * @example
 * ```ts
 * const optimizedUrl = getCloudinaryUrl(
 *   'https://res.cloudinary.com/dygtsnu8z/image/upload/v1765830428/carelinkai/homes/home-1.jpg',
 *   { width: 640, quality: 'auto', format: 'auto' }
 * );
 * // Returns: https://res.cloudinary.com/dygtsnu8z/image/upload/w_640,q_auto,f_auto/carelinkai/homes/home-1.jpg
 * ```
 */
export function getCloudinaryUrl(
  url: string,
  options: CloudinaryTransformOptions = {}
): string {
  // If it's not a Cloudinary URL, return as-is
  if (!isCloudinaryUrl(url)) {
    return url;
  }
  
  // Extract public ID
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) {
    console.warn('Could not extract public ID from Cloudinary URL:', url);
    return url;
  }
  
  // Build transformation string
  const transformations = buildTransformationString(options);
  
  // Construct optimized URL
  if (transformations) {
    return `${CLOUDINARY_BASE_URL}${transformations}/${publicId}`;
  }
  
  // If no transformations, return with base URL
  return `${CLOUDINARY_BASE_URL}${publicId}`;
}

/**
 * Preset configurations for common use cases
 */
export const CloudinaryPresets = {
  // Search/Grid card thumbnails - 640px wide, auto quality, auto format
  thumbnail: {
    width: 640,
    quality: 'auto' as const,
    format: 'auto' as const,
  },
  
  // Small thumbnails (avatars, profile pics) - 200px, auto quality, auto format
  avatar: {
    width: 200,
    height: 200,
    quality: 'auto' as const,
    format: 'auto' as const,
    crop: 'fill' as const,
    gravity: 'face' as const,
  },
  
  // Medium size for detail pages - 800px wide
  medium: {
    width: 800,
    quality: 'auto' as const,
    format: 'auto' as const,
  },
  
  // Large size for full-screen views - 1200px wide
  large: {
    width: 1200,
    quality: 'auto' as const,
    format: 'auto' as const,
  },
  
  // Hero images - 1600px wide, best quality
  hero: {
    width: 1600,
    quality: 'auto:best' as const,
    format: 'auto' as const,
  },
};

/**
 * Convenience function to get a thumbnail URL
 */
export function getCloudinaryThumbnail(url: string): string {
  return getCloudinaryUrl(url, CloudinaryPresets.thumbnail);
}

/**
 * Convenience function to get an avatar URL
 */
export function getCloudinaryAvatar(url: string): string {
  return getCloudinaryUrl(url, CloudinaryPresets.avatar);
}

/**
 * Convenience function to get a medium-sized image URL
 */
export function getCloudinaryMedium(url: string): string {
  return getCloudinaryUrl(url, CloudinaryPresets.medium);
}

/**
 * Convenience function to get a large image URL
 */
export function getCloudinaryLarge(url: string): string {
  return getCloudinaryUrl(url, CloudinaryPresets.large);
}
