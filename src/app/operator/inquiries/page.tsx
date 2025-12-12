import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import InquiriesListClient from '@/components/operator/inquiries/InquiriesListClient';
import Breadcrumbs from '@/components/ui/breadcrumbs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorInquiriesPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  // Allow OPERATOR, ADMIN, and FAMILY roles
  const allowedRoles = [UserRole.OPERATOR, UserRole.ADMIN, UserRole.FAMILY];
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const isFamily = user.role === UserRole.FAMILY;
  const op = user.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;

  // Get operator's homes for filter dropdown (only for OPERATOR/ADMIN)
  const homes = op 
    ? await prisma.assistedLivingHome.findMany({
        where: { operatorId: op.id },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : [];

  // Get staff members for assignment filter (for future use, only for OPERATOR/ADMIN)
  const staff: Array<{ id: string; name: string }> = [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Breadcrumbs items={[
        { label: isFamily ? 'Dashboard' : 'Operator', href: isFamily ? '/dashboard' : '/operator' },
        { label: isFamily ? 'My Inquiries' : 'Home Inquiries' }
      ]} />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          {isFamily ? 'My Inquiries' : 'Home Inquiries'}
        </h1>
        <p className="text-neutral-600">
          {isFamily 
            ? 'Track your care home inquiries and application status.'
            : 'Manage inquiries from families interested in your assisted living homes. Track their status from initial contact to placement.'
          }
        </p>
      </div>

      {/* Main Content */}
      <InquiriesListClient 
        homes={homes}
        staff={staff}
        isFamily={isFamily}
      />
    </div>
  );
}
