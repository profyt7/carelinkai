import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PrismaClient, UserRole } from '@prisma/client';
import OperatorInquiriesTable from '@/components/operator/OperatorInquiriesTable';
import Breadcrumbs from '@/components/ui/breadcrumbs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorInquiriesPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;

  const where = op ? { home: { operatorId: op.id } } : {};

  const inquiries = await prisma.inquiry.findMany({
    where,
    include: { home: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const initial = inquiries.map((i) => ({
    id: i.id,
    status: i.status,
    createdAt: i.createdAt.toISOString(),
    tourDate: i.tourDate ? i.tourDate.toISOString() : null,
    home: { id: i.home.id, name: i.home.name },
  }));

  return (
    <DashboardLayout title="Inquiries" showSearch={false}>
      <div className="p-4 sm:p-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Inquiries' }
        ]} />
        <OperatorInquiriesTable initial={initial} />
      </div>
    </DashboardLayout>
  );
}
