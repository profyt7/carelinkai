import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PrismaClient, UserRole } from '@prisma/client';
import InquiriesFilterPanel from '@/components/operator/InquiriesFilterPanel';
import Breadcrumbs from '@/components/ui/breadcrumbs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorInquiriesPage({ 
  searchParams 
}: { 
  searchParams?: { 
    status?: string; 
    homeId?: string; 
    startDate?: string; 
    endDate?: string; 
    page?: string;
    sortBy?: string;
    sortOrder?: string;
  } 
}) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;

  // Get operator's homes for filter dropdown
  const homes = op 
    ? await prisma.assistedLivingHome.findMany({
        where: { operatorId: op.id },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : [];

  return (
    <DashboardLayout title="Inquiries" showSearch={false}>
      <div className="p-4 sm:p-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Inquiries' }
        ]} />
        <InquiriesFilterPanel 
          homes={homes}
          initialFilters={searchParams}
        />
      </div>
    </DashboardLayout>
  );
}
