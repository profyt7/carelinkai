import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, getUserScope, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';
import { CertificationStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/caregivers/compliance
 * Get compliance dashboard data for caregivers
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.CAREGIVERS_VIEW);
    
    // Get user scope for filtering
    const scope = await getUserScope(user.id);
    const caregiverWhere: any = {};

    // Apply data scoping
    if (scope.homeIds.length > 0 && user.role !== 'ADMIN') {
      caregiverWhere.employments = {
        some: {
          operator: {
            homes: {
              some: {
                id: { in: scope.homeIds }
              }
            }
          }
        }
      };
    }

    // Get all caregivers in scope
    const totalCaregivers = await prisma.caregiver.count({
      where: caregiverWhere,
    });

    // Get caregivers with certifications
    const caregivers = await prisma.caregiver.findMany({
      where: caregiverWhere,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        certifications: true,
      },
    });

    // Calculate certification status
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let currentCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let noCertsCount = 0;

    const caregiversWithExpiringCerts = [];

    for (const caregiver of caregivers) {
      if (caregiver.certifications.length === 0) {
        noCertsCount++;
        continue;
      }

      let hasExpired = false;
      let hasExpiringSoon = false;
      let allCurrent = true;

      for (const cert of caregiver.certifications) {
        if (cert.expiryDate) {
          if (cert.expiryDate < now) {
            hasExpired = true;
            allCurrent = false;
          } else if (cert.expiryDate < thirtyDaysFromNow) {
            hasExpiringSoon = true;
            allCurrent = false;
            
            // Add to expiring list
            caregiversWithExpiringCerts.push({
              caregiverId: caregiver.id,
              caregiverName: `${caregiver.user.firstName} ${caregiver.user.lastName}`,
              certificationType: cert.certificationType,
              certificationName: cert.certificationName || cert.certificationType,
              expiryDate: cert.expiryDate,
              daysUntilExpiry: Math.ceil((cert.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            });
          }
        }
      }

      if (hasExpired) {
        expiredCount++;
      } else if (hasExpiringSoon) {
        expiringSoonCount++;
      } else if (allCurrent) {
        currentCount++;
      }
    }

    // Sort expiring certs by days until expiry
    caregiversWithExpiringCerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    return NextResponse.json({
      summary: {
        totalCaregivers,
        currentCount,
        expiringSoonCount,
        expiredCount,
        noCertsCount,
      },
      expiringCertifications: caregiversWithExpiringCerts,
    });
  } catch (error) {
    return handleAuthError(error);
  }
}
