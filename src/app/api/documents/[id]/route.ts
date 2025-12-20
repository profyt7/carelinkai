
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFromCloudinary } from '@/lib/documents/cloudinary';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        inquiry: {
          select: {
            id: true,
            contactName: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
    });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get document to check permissions
    const document = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete
    // (Only uploader or admin can delete)
    if (document.uploadedById !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to delete this document' },
        { status: 403 }
      );
    }

    // Delete from database first
    await prisma.document.delete({
      where: { id: params.id },
    });

    // Try to delete from Cloudinary (non-blocking)
    try {
      // Extract public ID from Cloudinary URL
      const urlParts = document.fileUrl.split('/');
      const publicIdWithExt = urlParts.slice(urlParts.indexOf('upload') + 2).join('/');
      const publicId = publicIdWithExt.split('.')[0];
      
      await deleteFromCloudinary(publicId);
    } catch (cloudinaryError) {
      // Log error but don't fail the request
      console.error('Failed to delete from Cloudinary:', cloudinaryError);
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get document to check permissions
    const existingDocument = await prisma.document.findUnique({
      where: { id: params.id },
    });

    if (!existingDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update
    if (existingDocument.uploadedById !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to update this document' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { notes, tags, category, isRequired, expirationDate } = body;

    // Update document
    const document = await prisma.document.update({
      where: { id: params.id },
      data: {
        notes: notes !== undefined ? notes : undefined,
        tags: tags !== undefined ? tags : undefined,
        category: category !== undefined ? category : undefined,
        isRequired: isRequired !== undefined ? isRequired : undefined,
        expirationDate: expirationDate !== undefined ? new Date(expirationDate) : undefined,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        resident: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        inquiry: {
          select: {
            id: true,
            contactName: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      document,
      message: 'Document updated successfully',
    });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
