/**
 * User Profile Management API for CareLinkAI
 * 
 * This API handles user profile operations:
 * - GET: Retrieve user profile with role-specific data
 * - PATCH: Update user profile information
 * 
 * Features:
 * - Role-specific profile fields
 * - Input validation
 * - Security checks (authentication, authorization)
 * - Audit logging for profile changes
 * - Handles all user roles: FAMILY, OPERATOR, CAREGIVER, ADMIN, AFFILIATE
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole, AuditAction } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-db-simple";
import { z } from "zod";

// Initialize Prisma client
const prisma = new PrismaClient();

// Base user profile schema (common fields)
const baseProfileSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
  phone: z.string().optional().nullable(),
  timezone: z.string().optional(),
  notificationPrefs: z.record(z.any()).optional(),
});

// Family role specific schema
const familyProfileSchema = baseProfileSchema.extend({
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
});

// Operator role specific schema
const operatorProfileSchema = baseProfileSchema.extend({
  companyName: z.string().min(2, "Company name must be at least 2 characters").optional(),
  taxId: z.string().optional().nullable(),
  businessLicense: z.string().optional().nullable(),
});

// Caregiver role specific schema
const caregiverProfileSchema = baseProfileSchema.extend({
  bio: z.string().optional().nullable(),
  yearsExperience: z.number().int().min(0).optional().nullable(),
  hourlyRate: z.number().min(0).optional().nullable(),
  availability: z.record(z.any()).optional(),
});

// Affiliate role specific schema
const affiliateProfileSchema = baseProfileSchema.extend({
  organization: z.string().optional().nullable(),
  commissionRate: z.number().min(0).max(100).optional().nullable(),
  paymentDetails: z.record(z.any()).optional(),
});

/**
 * GET handler to retrieve user profile
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated via session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get user ID from session
    const userId = session.user.id;
    
    // Get user from database with basic profile info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        profileImageUrl: true,
        timezone: true,
        notificationPrefs: true,
        emailVerified: true,
        twoFactorEnabled: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    // Get role-specific profile data based on user role
    let roleSpecificData = null;
    
    switch (user.role) {
      case UserRole.FAMILY:
        roleSpecificData = await prisma.family.findUnique({
          where: { userId },
          select: {
            id: true,
            emergencyContact: true,
            emergencyPhone: true,
            residents: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                status: true,
              }
            }
          }
        });
        break;
        
      case UserRole.OPERATOR:
        roleSpecificData = await prisma.operator.findUnique({
          where: { userId },
          select: {
            id: true,
            companyName: true,
            taxId: true,
            businessLicense: true,
            homes: {
              select: {
                id: true,
                name: true,
                status: true,
                currentOccupancy: true,
                capacity: true,
              }
            }
          }
        });
        break;
        
      case UserRole.CAREGIVER:
        roleSpecificData = await prisma.caregiver.findUnique({
          where: { userId },
          select: {
            id: true,
            bio: true,
            yearsExperience: true,
            hourlyRate: true,
            availability: true,
            credentials: {
              select: {
                id: true,
                type: true,
                issueDate: true,
                expirationDate: true,
                isVerified: true,
              }
            }
          }
        });
        break;
        
      case UserRole.AFFILIATE:
        roleSpecificData = await prisma.affiliate.findUnique({
          where: { userId },
          select: {
            id: true,
            affiliateCode: true,
            organization: true,
            commissionRate: true,
            paymentDetails: true,
            referrals: {
              select: {
                id: true,
                status: true,
                conversionDate: true,
                commissionAmount: true,
                commissionPaid: true,
              }
            }
          }
        });
        break;
        
      case UserRole.ADMIN:
        // Admin role doesn't have specific profile data
        roleSpecificData = { isAdmin: true };
        break;
        
      default:
        roleSpecificData = {};
    }
    
    // Get addresses associated with the user
    const addresses = await prisma.address.findMany({
      where: { userId },
      select: {
        id: true,
        street: true,
        street2: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
        latitude: true,
        longitude: true,
      }
    });
    
    // Create audit log entry for profile view
    await prisma.auditLog.create({
      data: {
        action: AuditAction.READ,
        resourceType: "USER_PROFILE",
        resourceId: userId,
        description: "User viewed their profile",
        ipAddress: request.headers.get("x-forwarded-for") || 
                  // @ts-ignore - `ip` exists only in Node runtime requests
                  (request as any).ip || 
                  "unknown",
        userId: userId,
        actionedBy: userId
      }
    });
    
    // Return combined profile data
    return NextResponse.json({
      success: true,
      data: {
        user,
        roleSpecificData,
        addresses,
        role: user.role
      }
    });
    
  } catch (error: any) {
    console.error("Profile retrieval error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to retrieve profile", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PATCH handler to update user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify user is authenticated via session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    
    // Get user ID from session
    const userId = session.user.id;
    
    // Get user to determine role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate input based on user role
    let validationResult;
    switch (user.role) {
      case UserRole.FAMILY:
        validationResult = familyProfileSchema.safeParse(body);
        break;
      case UserRole.OPERATOR:
        validationResult = operatorProfileSchema.safeParse(body);
        break;
      case UserRole.CAREGIVER:
        validationResult = caregiverProfileSchema.safeParse(body);
        break;
      case UserRole.AFFILIATE:
        validationResult = affiliateProfileSchema.safeParse(body);
        break;
      default:
        validationResult = baseProfileSchema.safeParse(body);
    }
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid input data", 
          errors: validationResult.error.flatten().fieldErrors 
        }, 
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;
    
    // Extract base user data and role-specific data
    const { 
      firstName, 
      lastName, 
      phone, 
      timezone, 
      notificationPrefs,
      ...roleSpecificFields 
    } = validatedData;
    
    // Prepare base user update data
    const baseUserUpdate: any = {};
    if (firstName !== undefined) baseUserUpdate.firstName = firstName;
    if (lastName !== undefined) baseUserUpdate.lastName = lastName;
    if (phone !== undefined) baseUserUpdate.phone = phone;
    if (timezone !== undefined) baseUserUpdate.timezone = timezone;
    if (notificationPrefs !== undefined) baseUserUpdate.notificationPrefs = notificationPrefs;
    
    // Update user record with base fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: baseUserUpdate,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        timezone: true,
        updatedAt: true
      }
    });
    
    // Update role-specific data if any fields provided
    let roleSpecificUpdate = null;
    
    if (Object.keys(roleSpecificFields).length > 0) {
      switch (user.role) {
        case UserRole.FAMILY:
          if ('emergencyContact' in roleSpecificFields || 'emergencyPhone' in roleSpecificFields) {
            roleSpecificUpdate = await prisma.family.update({
              where: { userId },
              data: {
                emergencyContact: (roleSpecificFields as any)['emergencyContact'],
                emergencyPhone: (roleSpecificFields as any)['emergencyPhone']
              }
            });
          }
          break;
          
        case UserRole.OPERATOR:
          if ('companyName' in roleSpecificFields || 'taxId' in roleSpecificFields || 'businessLicense' in roleSpecificFields) {
            roleSpecificUpdate = await prisma.operator.update({
              where: { userId },
              data: {
                companyName: (roleSpecificFields as any)['companyName'],
                taxId: (roleSpecificFields as any)['taxId'],
                businessLicense: (roleSpecificFields as any)['businessLicense']
              }
            });
          }
          break;
          
        case UserRole.CAREGIVER:
          if ('bio' in roleSpecificFields || 'yearsExperience' in roleSpecificFields || 
              'hourlyRate' in roleSpecificFields || 'availability' in roleSpecificFields) {
            roleSpecificUpdate = await prisma.caregiver.update({
              where: { userId },
              data: {
                bio: (roleSpecificFields as any)['bio'],
                yearsExperience: (roleSpecificFields as any)['yearsExperience'],
                hourlyRate: (roleSpecificFields as any)['hourlyRate'],
                availability: (roleSpecificFields as any)['availability']
              }
            });
          }
          break;
          
        case UserRole.AFFILIATE:
          if ('organization' in roleSpecificFields || 'commissionRate' in roleSpecificFields || 
              'paymentDetails' in roleSpecificFields) {
            roleSpecificUpdate = await prisma.affiliate.update({
              where: { userId },
              data: {
                organization: (roleSpecificFields as any)['organization'],
                commissionRate: (roleSpecificFields as any)['commissionRate'],
                paymentDetails: (roleSpecificFields as any)['paymentDetails']
              }
            });
          }
          break;
      }
    }
    
    // Handle address updates if provided
    let addressUpdate = null;
    if (body.address) {
      // Check if user already has an address
      const existingAddress = await prisma.address.findFirst({
        where: { userId }
      });
      
      if (existingAddress) {
        // Update existing address
        addressUpdate = await prisma.address.update({
          where: { id: existingAddress.id },
          data: {
            street: body.address.street,
            street2: body.address.street2,
            city: body.address.city,
            state: body.address.state,
            zipCode: body.address.zipCode,
            country: body.address.country || "USA",
            latitude: body.address.latitude,
            longitude: body.address.longitude
          }
        });
      } else {
        // Create new address
        addressUpdate = await prisma.address.create({
          data: {
            userId,
            street: body.address.street,
            street2: body.address.street2,
            city: body.address.city,
            state: body.address.state,
            zipCode: body.address.zipCode,
            country: body.address.country || "USA",
            latitude: body.address.latitude,
            longitude: body.address.longitude
          }
        });
      }
    }
    
    // Get client IP for audit logging
    const clientIp = request.headers.get("x-forwarded-for") || 
                    // @ts-ignore - `ip` exists only in Node runtime requests
                    (request as any).ip || 
                    "unknown";
    
    // Create audit log entry for profile update
    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        resourceType: "USER_PROFILE",
        resourceId: userId,
        description: "User updated their profile",
        ipAddress: clientIp,
        metadata: {
          updatedFields: Object.keys({...baseUserUpdate, ...roleSpecificFields, ...(body.address ? {address: true} : {})})
        },
        userId: userId,
        actionedBy: userId
      }
    });
    
    // Return success response with updated data
    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
        roleSpecificUpdate,
        addressUpdate
      }
    });
    
  } catch (error: any) {
    console.error("Profile update error:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to update profile", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined 
      }, 
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
