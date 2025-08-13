import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { mkdir } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/server/sse";
import type { 
  DocumentType, 
  FamilyDocumentWithDetails, 
  DocumentFilterParams 
} from "@/lib/types/family";
import { 
  checkFamilyMembership,
  hasPermissionToUploadDocuments,
  hasPermissionToViewDocuments,
  createActivityRecord
} from "@/lib/services/family";

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/heic",
  "image/heif",
  // Other
  "application/zip",
  "application/x-zip-compressed"
];

// Validate document creation input
const documentCreateSchema = z.object({
  // Prisma uses cuid() for IDs, so validate accordingly
  familyId: z.string().cuid(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  type: z.enum([
    "CARE_PLAN",
    "MEDICAL_RECORD",
    "INSURANCE_DOCUMENT",
    "LEGAL_DOCUMENT",
    "PERSONAL_DOCUMENT",
    "PHOTO",
    "VIDEO",
    "OTHER"
  ]),
  isEncrypted: z.boolean().default(true),
  tags: z.array(z.string()).optional()
});

// Validate document filter parameters
const documentFilterSchema = z.object({
  // Accept Prisma cuid() format here as well
  familyId: z.string().cuid(),
  type: z.union([
    z.enum([
      "CARE_PLAN",
      "MEDICAL_RECORD",
      "INSURANCE_DOCUMENT",
      "LEGAL_DOCUMENT",
      "PERSONAL_DOCUMENT",
      "PHOTO",
      "VIDEO",
      "OTHER"
    ]),
    z.array(z.enum([
      "CARE_PLAN",
      "MEDICAL_RECORD",
      "INSURANCE_DOCUMENT",
      "LEGAL_DOCUMENT",
      "PERSONAL_DOCUMENT",
      "PHOTO",
      "VIDEO",
      "OTHER"
    ]))
  ]).optional(),
  search: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  uploaderId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Added "fileSize" to enable size-based sorting
  sortBy: z.enum(["createdAt", "updatedAt", "title", "fileSize"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

// Ensure upload directory exists
async function ensureUploadDirExists(familyId: string): Promise<string> {
  // Create base uploads directory if it doesn't exist
  const baseUploadDir = path.join(process.cwd(), "public", "uploads", "family");
  
  // Create family-specific directory
  const familyUploadDir = path.join(baseUploadDir, familyId);
  
  // Create documents directory within family directory
  const documentsDir = path.join(familyUploadDir, "documents");
  
  try {
    // Recursively create directories
    await mkdir(documentsDir, { recursive: true });
    return documentsDir;
  } catch (error) {
    console.error("Failed to create upload directories:", error);
    throw new Error("Failed to create upload directories");
  }
}

// Generate a secure filename
function generateSecureFilename(originalFilename: string): string {
  const fileExt = path.extname(originalFilename);
  const timestamp = Date.now();
  const uuid = uuidv4();
  
  // Remove any potentially dangerous characters from the original name
  const sanitizedName = path.basename(originalFilename, fileExt)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .substring(0, 50); // Limit length
  
  return `${sanitizedName}_${timestamp}_${uuid}${fileExt}`;
}

// GET handler for fetching documents
export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  console.log(`[Documents API] GET request started at ${new Date(startedAt).toISOString()}`, {
    params: Object.fromEntries(request.nextUrl.searchParams.entries())
  });

  // Create timeout promise that resolves after 15 seconds
  const timeoutPromise = new Promise<NextResponse>((resolve) => {
    setTimeout(() => {
      const elapsed = Date.now() - startedAt;
      console.log(`[Documents API] Request timed out after ${elapsed}ms`);
      resolve(NextResponse.json({ error: 'Request timed out' }, { status: 504 }));
    }, 15000);
  });

  // Inner handle function containing the original logic
  async function handle(): Promise<NextResponse> {
    try {
      // Get session and verify authentication
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Parse query parameters
      const searchParams = request.nextUrl.searchParams;
      const filterParams: Record<string, any> = {
        familyId: searchParams.get("familyId"),
        type: searchParams.get("type"),
        search: searchParams.get("search"),
        tags: searchParams.get("tags"),
        uploaderId: searchParams.get("uploaderId"),
        page: searchParams.get("page"),
        limit: searchParams.get("limit"),
        sortBy: searchParams.get("sortBy"),
        sortOrder: searchParams.get("sortOrder")
      };
      
      // Handle array parameters
      if (searchParams.has("type") && searchParams.getAll("type").length > 1) {
        filterParams['type'] = searchParams.getAll("type");
      }
      
      if (searchParams.has("tags") && searchParams.getAll("tags").length > 1) {
        filterParams['tags'] = searchParams.getAll("tags");
      }
      
      // Clean up undefined values
      Object.keys(filterParams).forEach(key => {
        if (filterParams[key] === null || filterParams[key] === undefined) {
          delete filterParams[key];
        }
      });
      
      // Validate filter parameters
      const validationResult = documentFilterSchema.safeParse(filterParams);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: validationResult.error.format() },
          { status: 400 }
        );
      }
      
      const filters = validationResult.data as DocumentFilterParams;
      console.log(`[Documents API] Validation successful, elapsed: ${Date.now() - startedAt}ms`, { filters });
      
      // Check if user is a member of the family
      const isMember = await checkFamilyMembership(session.user.id, filters.familyId);
      if (!isMember) {
        return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
      }
      
      // Check if user has permission to view documents
      const canViewDocuments = await hasPermissionToViewDocuments(session.user.id, filters.familyId);
      if (!canViewDocuments) {
        return NextResponse.json({ error: "No permission to view documents" }, { status: 403 });
      }
      
      // Calculate pagination
      const skip = (filters.page - 1) * filters.limit;
      
      // Build query filters
      const whereClause: any = {
        familyId: filters.familyId
      };
      
      // Add type filter
      if (filters.type) {
        if (Array.isArray(filters.type)) {
          whereClause.type = { in: filters.type };
        } else {
          whereClause.type = filters.type;
        }
      }
      
      // Add uploader filter
      if (filters.uploaderId) {
        whereClause.uploaderId = filters.uploaderId;
      }
      
      // Add tags filter
      if (filters.tags) {
        const tagsArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        whereClause.tags = {
          hasSome: tagsArray
        };
      }
      
      // Add search filter (support both `search` and `searchQuery`)
      const searchValue = (filters as any).search ?? filters.searchQuery;
      if (searchValue) {
        whereClause.OR = [
          { title: { contains: searchValue, mode: 'insensitive' } },
          { description: { contains: searchValue, mode: 'insensitive' } },
          { fileName: { contains: searchValue, mode: 'insensitive' } }
        ];
      }
      
      console.log(`[Documents API] Starting Prisma queries, elapsed: ${Date.now() - startedAt}ms`, { whereClause });
      
      // Query documents with pagination
      const [documents, totalCount] = await Promise.all([
        prisma.familyDocument.findMany({
          where: whereClause,
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImageUrl: true
              }
            },
            comments: {
              select: {
                id: true
              }
            }
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder
          },
          skip,
          take: filters.limit
        }),
        prisma.familyDocument.count({
          where: whereClause
        })
      ]);
      
      console.log(`[Documents API] Prisma queries completed, elapsed: ${Date.now() - startedAt}ms`, { 
        documentCount: documents.length,
        totalCount
      });
      
      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / filters.limit);
      const hasNextPage = filters.page < totalPages;
      const hasPreviousPage = filters.page > 1;
      
      // Transform documents to include comment count
      const documentsWithDetails = documents.map(doc => ({
        ...doc,
        commentCount: doc.comments.length,
        comments: undefined // Remove comments array
      })) as FamilyDocumentWithDetails[];
      
      const elapsed = Date.now() - startedAt;
      console.log(`[Documents API] Request successful, returning response, total elapsed: ${elapsed}ms`);
      
      // Return documents with pagination metadata
      return NextResponse.json({
        documents: documentsWithDetails,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage
        }
      });
      
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      console.error(`[Documents API] Error fetching documents after ${elapsed}ms:`, error);
      return NextResponse.json(
        { error: "Failed to fetch documents" },
        { status: 500 }
      );
    }
  }

  // Race between the handler and the timeout
  return await Promise.race([handle(), timeoutPromise]);
}

// POST handler for uploading documents
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Parse form data
    const formData = await request.formData();
    
    // Extract document metadata
    const familyId = formData.get("familyId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string || "";
    const typeRaw = formData.get("type") as string;
    const isEncryptedRaw = formData.get("isEncrypted") as string;
    const tagsRaw = formData.get("tags") as string;
    
    // Parse tags if provided
    let tags: string[] = [];
    if (tagsRaw) {
      try {
        tags = JSON.parse(tagsRaw);
      } catch (e) {
        // If parsing fails, try to split by comma
        tags = tagsRaw.split(",").map(tag => tag.trim());
      }
    }
    
    // Parse document type
    const type = typeRaw as DocumentType;
    
    // Parse isEncrypted
    const isEncrypted = isEncryptedRaw === "true" || isEncryptedRaw === "1";
    
    // Validate metadata
    const validationResult = documentCreateSchema.safeParse({
      familyId,
      title,
      description,
      type,
      isEncrypted,
      tags
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid document metadata", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    const metadata = validationResult.data;
    
    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, metadata.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }
    
    // Check if user has permission to upload documents
    const canUpload = await hasPermissionToUploadDocuments(session.user.id, metadata.familyId);
    if (!canUpload) {
      return NextResponse.json({ error: "No permission to upload documents" }, { status: 403 });
    }
    
    // Get file from form data
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type", allowedTypes: ALLOWED_FILE_TYPES },
        { status: 400 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large", maxSizeBytes: MAX_FILE_SIZE },
        { status: 400 }
      );
    }
    
    // Ensure upload directory exists
    const uploadDir = await ensureUploadDirExists(metadata.familyId);
    
    // Generate secure filename
    const secureFilename = generateSecureFilename(file.name);
    
    // Full path to save the file
    const filePath = path.join(uploadDir, secureFilename);
    
    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Write file to disk
    fs.writeFileSync(filePath, fileBuffer);
    
    // Calculate relative URL path
    const fileUrl = `/uploads/family/${metadata.familyId}/documents/${secureFilename}`;
    
    // Create document record in database
    const document = await prisma.familyDocument.create({
      data: {
        familyId: metadata.familyId,
        uploaderId: session.user.id,
        title: metadata.title,
        description: metadata.description || "",
        fileUrl,
        fileName: file.name,
        fileType: file.type,
        // Use the actual buffer length in case the File.size is unreliable
        fileSize: fileBuffer.length,
        type: metadata.type,
        version: 1,
        isEncrypted: metadata.isEncrypted,
        tags: metadata.tags || []
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        }
      }
    });
    
    // Create activity record
    await createActivityRecord({
      familyId: metadata.familyId,
      actorId: session.user.id,
      type: "DOCUMENT_UPLOADED",
      resourceType: "document",
      resourceId: document.id,
      description: `${session.user.firstName || session.user.name} uploaded a new document: ${document.title}`
    });

    // ------------------------------------------------------------------
    // Publish SSE event so all family members receive real-time update
    // ------------------------------------------------------------------
    publish(`family:${metadata.familyId}`, "document:created", {
      familyId: metadata.familyId,
      document: { ...document, commentCount: 0 }
    });
    
    // Return success response with document data
    return NextResponse.json({
      success: true,
      document: {
        ...document,
        commentCount: 0
      }
    });
    
  } catch (error) {
    // ------------------------------------------------------------------
    // Enhanced error logging to help diagnose the exact server failure
    // ------------------------------------------------------------------
    console.error("Error uploading document:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack:  error instanceof Error ? error.stack   : undefined,
      name:   error instanceof Error ? error.name    : "Unknown"
    });

    // Return richer error information to the client (still generic enough
    // not to leak sensitive data)
    return NextResponse.json(
      { 
        error: "Failed to upload document",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      },
      { status: 500 }
    );
  }
}

// PUT handler for updating document metadata
export async function PUT(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate document ID
    const documentId = body.id;
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }
    
    // Find the document
    const document = await prisma.familyDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        familyId: true,
        uploaderId: true,
        title: true,
        description: true,
        type: true,
        isEncrypted: true,
        tags: true
      }
    });
    
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, document.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }
    
    // Check if user is the uploader or has admin permissions
    const isUploader = document.uploaderId === session.user.id;
    const hasPermission = isUploader || await hasPermissionToUploadDocuments(session.user.id, document.familyId);
    
    if (!hasPermission) {
      return NextResponse.json({ error: "No permission to update this document" }, { status: 403 });
    }
    
    // Extract updatable fields
    const updates: any = {};
    
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.type !== undefined) updates.type = body.type;
    if (body.isEncrypted !== undefined) updates.isEncrypted = body.isEncrypted;
    if (body.tags !== undefined) updates.tags = body.tags;
    
    // Validate updates
    const validationResult = documentCreateSchema.partial().safeParse({
      ...document,
      ...updates
    });
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid document updates", details: validationResult.error.format() },
        { status: 400 }
      );
    }
    
    // Update document in database
    const updatedDocument = await prisma.familyDocument.update({
      where: { id: documentId },
      data: updates,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        },
        comments: {
          select: {
            id: true
          }
        }
      }
    });
    
    // Create activity record
    await createActivityRecord({
      familyId: document.familyId,
      actorId: session.user.id,
      type: "DOCUMENT_UPDATED",
      resourceType: "document",
      resourceId: document.id,
      description: `${session.user.firstName || session.user.name} updated document: ${document.title}`
    });

    // ------------------------------------------------------------------
    // Publish SSE event for real-time updates
    // ------------------------------------------------------------------
    const normalized = {
      ...updatedDocument,
      commentCount: updatedDocument.comments.length,
      comments: undefined
    } as any;

    publish(`family:${document.familyId}`, "document:updated", {
      familyId: document.familyId,
      document: normalized
    });
    
    // Return success response with updated document
    return NextResponse.json({
      success: true,
      document: {
        ...updatedDocument,
        commentCount: updatedDocument.comments.length,
        comments: undefined
      }
    });
    
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

// DELETE handler for removing documents
export async function DELETE(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get document ID from URL
    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get("id");
    
    if (!documentId) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }
    
    // Find the document
    const document = await prisma.familyDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        familyId: true,
        uploaderId: true,
        title: true,
        fileUrl: true
      }
    });
    
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    
    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(session.user.id, document.familyId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this family" }, { status: 403 });
    }
    
    // Check if user is the uploader or has admin permissions
    const isUploader = document.uploaderId === session.user.id;
    const hasPermission = isUploader || await hasPermissionToUploadDocuments(session.user.id, document.familyId);
    
    if (!hasPermission) {
      return NextResponse.json({ error: "No permission to delete this document" }, { status: 403 });
    }
    
    // Get file path
    const filePath = path.join(process.cwd(), "public", document.fileUrl);
    
    // Delete file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete document from database
    await prisma.familyDocument.delete({
      where: { id: documentId }
    });
    
    // Create activity record
    await createActivityRecord({
      familyId: document.familyId,
      actorId: session.user.id,
      type: "DOCUMENT_DELETED",
      resourceType: "document",
      resourceId: document.id,
      description: `${session.user.firstName || session.user.name} deleted document: ${document.title}`
    });

    // ------------------------------------------------------------------
    // Publish SSE event for deletion so clients can remove the item
    // ------------------------------------------------------------------
    publish(`family:${document.familyId}`, "document:deleted", {
      familyId: document.familyId,
      documentId: document.id
    });
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: "Document deleted successfully"
    });
    
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
