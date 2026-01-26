export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/documents/search
 * Search and filter documents
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DocumentType, ValidationStatus, ReviewStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    
    const type = searchParams.get('type') as DocumentType | null;
    const validationStatus = searchParams.get('validationStatus') as ValidationStatus | null;
    const reviewStatus = searchParams.get('reviewStatus') as ReviewStatus | null;
    const residentId = searchParams.get('residentId');
    const inquiryId = searchParams.get('inquiryId');
    const uploadedById = searchParams.get('uploadedById');
    const autoClassified = searchParams.get('autoClassified');
    const minConfidence = searchParams.get('minConfidence');
    const maxConfidence = searchParams.get('maxConfidence');
    const searchTerm = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (validationStatus) {
      where.validationStatus = validationStatus;
    }

    if (reviewStatus) {
      where.reviewStatus = reviewStatus;
    }

    if (residentId) {
      where.residentId = residentId;
    }

    if (inquiryId) {
      where.inquiryId = inquiryId;
    }

    if (uploadedById) {
      where.uploadedById = uploadedById;
    }

    if (autoClassified !== null) {
      where.autoClassified = autoClassified === 'true';
    }

    if (minConfidence !== null || maxConfidence !== null) {
      where.classificationConfidence = {};
      
      if (minConfidence !== null) {
        where.classificationConfidence.gte = parseFloat(minConfidence);
      }
      
      if (maxConfidence !== null) {
        where.classificationConfidence.lte = parseFloat(maxConfidence);
      }
    }

    if (searchTerm) {
      where.OR = [
        { fileName: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } },
        { extractedText: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Execute query
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviewedBy: {
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
      }),
      prisma.document.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to search documents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
