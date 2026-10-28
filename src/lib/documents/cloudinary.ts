import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

/**
 * Upload a file to Cloudinary
 * @param file - File buffer or base64 string
 * @param options - Upload options (folder, resourceType, publicId, tags)
 * @returns Upload result with URL and metadata
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  options: {
    folder?: string;
    resourceType?: 'image' | 'raw' | 'video' | 'auto';
    publicId?: string;
    tags?: string[];
  } = {}
): Promise<UploadResult> {
  try {
    const {
      folder = 'carelinkai/documents',
      resourceType = 'auto',
      publicId,
      tags = [],
    } = options;

    const uploadOptions: any = {
      folder,
      resource_type: resourceType,
      tags: ['document', ...tags],
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    // Convert buffer to base64 if needed
    const fileData = typeof file === 'string' 
      ? file 
      : `data:application/octet-stream;base64,${file.toString('base64')}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileData, uploadOptions);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload file to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a file from Cloudinary
 * @param publicId - Cloudinary public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete file from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get file URL from Cloudinary with transformations
 * @param publicId - Cloudinary public ID
 * @param options - Transformation options
 * @returns Transformed URL
 */
export function getCloudinaryUrl(publicId: string, options: any = {}): string {
  return cloudinary.url(publicId, options);
}

/**
 * Check if Cloudinary is configured properly
 * @returns true if configured, false otherwise
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export default cloudinary;
