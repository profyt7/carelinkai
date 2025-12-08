import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import NewShiftForm from '@/components/operator/NewShiftForm';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewShiftPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;
  const homes = await prisma.assistedLivingHome.findMany({
    where: op ? { operatorId: op.id } : {},
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="p-4 sm:p-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Shifts', href: '/operator/shifts' },
          { label: 'New Shift' }
        ]} />
        <NewShiftForm homes={homes} />
      </div>
  );
}