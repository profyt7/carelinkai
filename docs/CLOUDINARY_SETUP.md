# Cloudinary Integration Guide

## Overview

CareLinkAI uses Cloudinary for image and file upload management. This document provides a comprehensive guide to the Cloudinary integration.

## Table of Contents

- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Architecture](#architecture)
- [Usage Examples](#usage-examples)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)

## Configuration

### Local Development

1. **Environment Variables**: Copy the `.env.example` file to `.env` and update the Cloudinary credentials:

```bash
cp .env.example .env
```

2. **Update .env** with your Cloudinary credentials:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
```

3. **Verify Configuration**: Run the test script to verify your connection:

```bash
node test-cloudinary.js
```

If successful, you should see:
```
✅ SUCCESS: Cloudinary connection is working!
```

## Environment Variables

### Public Variables (Client-Side)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name (safe to expose in browser)

### Private Variables (Server-Side Only)
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Your Cloudinary API key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret (⚠️ **NEVER** expose this publicly)
- `CLOUDINARY_URL`: Complete Cloudinary URL (optional, used by some SDKs)

## Architecture

### File Structure

```
src/
├── lib/
│   └── cloudinary.ts          # Centralized Cloudinary configuration
├── app/
│   └── api/
│       ├── upload/
│       │   └── route.ts       # Generic file upload endpoint
│       └── family/
│           └── gallery/
│               ├── upload/
│               │   └── route.ts     # Gallery photo upload
│               └── [photoId]/
│                   └── route.ts     # Photo management (delete)
└── components/
    ├── family/
    │   ├── GalleryTab.tsx     # Gallery UI component
    │   └── DocumentsTab.tsx   # Documents UI component
    └── operator/
        └── residents/
            └── DocumentUploadModal.tsx  # Document upload modal
```

### Centralized Configuration

The `src/lib/cloudinary.ts` file provides:

1. **Configured Cloudinary Instance**: Pre-configured v2 API client
2. **Helper Functions**:
   - `isCloudinaryConfigured()`: Check if Cloudinary is properly configured
   - `getCloudinaryConfig()`: Get configuration status
   - `getThumbnailUrl()`: Generate thumbnail URLs
   - `deleteFromCloudinary()`: Delete files from Cloudinary
   - `uploadToCloudinary()`: Upload files to Cloudinary

3. **Upload Presets**: Predefined configurations for different use cases:
   - `FAMILY_GALLERY`: Family gallery photos
   - `RESIDENT_DOCUMENTS`: Resident documents
   - `CAREGIVER_DOCUMENTS`: Caregiver documents
   - `INQUIRY_DOCUMENTS`: Inquiry attachments
   - `PROFILE_PHOTOS`: User profile photos

## Usage Examples

### Server-Side Upload (API Route)

```typescript
import cloudinary, { 
  isCloudinaryConfigured, 
  UPLOAD_PRESETS,
  getThumbnailUrl 
} from '@/lib/cloudinary';

export async function POST(request: NextRequest) {
  // Check configuration
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: 'Cloudinary not configured' },
      { status: 503 }
    );
  }

  // Get file from form data
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Convert to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Upload using preset
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          ...UPLOAD_PRESETS.FAMILY_GALLERY,
          folder: `${UPLOAD_PRESETS.FAMILY_GALLERY.folder}/custom-subfolder`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(buffer);
  });

  // Generate thumbnail
  const thumbnailUrl = getThumbnailUrl(result.public_id);

  return NextResponse.json({
    url: result.secure_url,
    thumbnailUrl,
    publicId: result.public_id,
  });
}
```

### Deleting Files

```typescript
import { deleteFromCloudinary } from '@/lib/cloudinary';

// Delete an image
await deleteFromCloudinary(publicId, 'image');

// Delete a video
await deleteFromCloudinary(publicId, 'video');

// Delete a raw file (PDF, etc.)
await deleteFromCloudinary(publicId, 'raw');
```

### Client-Side Upload (Using CldUploadWidget)

```typescript
import { CldUploadWidget } from 'next-cloudinary';

function UploadComponent() {
  return (
    <CldUploadWidget
      uploadPreset="your_upload_preset"
      onSuccess={(result) => {
        console.log('Upload successful:', result);
      }}
    >
      {({ open }) => (
        <button onClick={() => open()}>
          Upload Image
        </button>
      )}
    </CldUploadWidget>
  );
}
```

## API Endpoints

### POST /api/upload

Generic file upload endpoint for documents.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file`: File to upload (max 10MB)

**Response:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../image.jpg",
  "publicId": "carelinkai/...",
  "format": "jpg",
  "size": 123456,
  "originalFilename": "image.jpg"
}
```

**Allowed File Types:**
- PDF: `.pdf`
- Images: `.jpg`, `.jpeg`, `.png`
- Documents: `.doc`, `.docx`

### POST /api/family/gallery/upload

Upload photos to family gallery.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `file`: Image/video file
  - `familyId`: Family ID
  - `caption`: Photo caption
  - `albumId` (optional): Album ID

**Response:**
```json
{
  "photo": {
    "id": "...",
    "cloudinaryUrl": "...",
    "thumbnailUrl": "...",
    "caption": "...",
    "uploadedBy": { ... }
  }
}
```

### DELETE /api/family/gallery/[photoId]

Delete a photo from family gallery.

**Request:**
- Method: `DELETE`
- Path: `/api/family/gallery/{photoId}`

**Response:**
```json
{
  "success": true
}
```

## Troubleshooting

### Common Issues

#### 1. "api_secret mismatch" Error

**Cause**: Incorrect Cloudinary credentials.

**Solution**:
1. Verify your credentials in the Cloudinary dashboard
2. Check for typos in cloud name, API key, or API secret
3. Ensure there are no extra spaces or special characters
4. Verify the cloud name format (e.g., `dygtsnud8` vs `dygtsnudz`)

#### 2. "Cloudinary not configured" Error

**Cause**: Missing environment variables.

**Solution**:
1. Verify all required environment variables are set in `.env`
2. Restart the development server after updating `.env`
3. Check that environment variables are being loaded correctly

#### 3. Upload Fails with 401 Error

**Cause**: Invalid or expired API credentials.

**Solution**:
1. Regenerate API credentials in Cloudinary dashboard
2. Update environment variables
3. Redeploy application

#### 4. File Size Limit Exceeded

**Cause**: File exceeds 10MB limit.

**Solution**:
1. Compress the file before uploading
2. Adjust `MAX_FILE_SIZE` in API route if needed
3. Configure Cloudinary account for larger file sizes

### Testing Connection

Run the connection test script:

```bash
cd /home/ubuntu/carelinkai-project
node test-cloudinary.js
```

This will verify:
- Cloudinary credentials are correct
- API connectivity is working
- Account is active and accessible

## Deployment

### Render Deployment

#### Step 1: Add Environment Variables to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your CareLinkAI service
3. Navigate to the **Environment** tab
4. Add the following environment variables:

```
CLOUDINARY_CLOUD_NAME=dygtsnudz
CLOUDINARY_API_KEY=328392542172231
CLOUDINARY_API_SECRET=KhpohAEFOsjVKuXRENaBhCoIYFQ
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dygtsnudz
CLOUDINARY_URL=cloudinary://328392542172231:KhpohAEFOsjVKuXRENaBhCoIYFQ@dygtsnudz
```

5. Click **Save Changes**

#### Step 2: Verify Deployment

After Render redeploys:

1. Check deployment logs for errors
2. Test file upload functionality:
   - Try uploading an image in Gallery
   - Try uploading a document
   - Verify files appear in Cloudinary dashboard

3. Monitor for errors:
   - Check Render logs
   - Check browser console
   - Verify API responses

### Other Platforms (Vercel, AWS, etc.)

For other platforms, add the same environment variables through their respective dashboards:

- **Vercel**: Project Settings → Environment Variables
- **AWS Amplify**: App Settings → Environment Variables
- **Heroku**: Settings → Config Vars
- **Railway**: Variables tab

## Security Best Practices

### ✅ Do:
- Keep `CLOUDINARY_API_SECRET` private (server-side only)
- Use `NEXT_PUBLIC_` prefix only for cloud name
- Rotate API credentials periodically
- Set up Cloudinary upload presets with restrictions
- Enable signed uploads for sensitive content
- Implement file size and type validation
- Use HTTPS for all uploads

### ❌ Don't:
- Expose API secret in client-side code
- Commit credentials to version control
- Share credentials in public channels
- Use same credentials across environments
- Allow unrestricted file uploads

## Cloudinary Dashboard

Access your Cloudinary dashboard at:
https://console.cloudinary.com/

### Key Features:
- **Media Library**: View all uploaded files
- **Analytics**: Monitor usage and bandwidth
- **Settings**: Manage API credentials and upload presets
- **Transformations**: Configure image transformations
- **Reports**: View usage reports and optimize storage

## Support

- **Cloudinary Documentation**: https://cloudinary.com/documentation
- **CareLinkAI Issues**: https://github.com/profyt7/carelinkai/issues
- **Render Support**: https://render.com/docs

## Changelog

- **2025-12-13**: Initial Cloudinary integration
  - Added centralized configuration (`src/lib/cloudinary.ts`)
  - Updated API routes to use centralized config
  - Added upload presets for different use cases
  - Created documentation and testing utilities
