import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import EmptyState from '@/components/ui/empty-state';
import { FiCalendar } from 'react-icons/fi';
import ShiftAutoFillPanel from '@/components/operator/shifts/ShiftAutoFillPanel';
import ShiftsTable from '@/components/operator/shifts/ShiftsTable';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OperatorShiftsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === 'OPERATOR' ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;

  const homes = op
    ? await prisma.assistedLivingHome.findMany({
        where: { operatorId: op.id },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : [];

  const where = op ? { home: { operatorId: op.id } } : {};

  const shifts = await prisma.caregiverShift.findMany({
    where,
    include: { home: { select: { id: true, name: true } }, caregiver: { include: { user: true } } },
    orderBy: { startTime: 'desc' },
  });

  return (
    <div className="p-4 sm:p-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Shifts' }
        ]} />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Shifts</h2>
          <div className="flex gap-2">
            <Link href="/operator/shifts/calendar" className="btn">Calendar</Link>
            <Link href="/operator/shifts/new" className="btn btn-primary">Create Shift</Link>
          </div>
        </div>
        {homes.length > 0 && (
          <div className="mb-6">
            <ShiftAutoFillPanel homes={homes} />
          </div>
        )}
        {shifts.length === 0 ? (
          <EmptyState
            icon={FiCalendar}
            title="No shifts scheduled yet"
            description="Create shifts to schedule caregivers at your facilities. You can assign shifts to caregivers and track their hours."
            action={{
              label: "Create Shift",
              href: "/operator/shifts/new"
            }}
          />
        ) : (
          <ShiftsTable shifts={shifts.map((s: any) => ({
            id: s.id,
            startTime: s.startTime.toISOString(),
            endTime: s.endTime.toISOString(),
            hourlyRate: s.hourlyRate,
            status: s.status,
            home: s.home ?? null,
            caregiver: s.caregiver ? { id: s.caregiver.id, user: { firstName: s.caregiver.user.firstName, lastName: s.caregiver.user.lastName } } : null,
          }))} />
        )}
      </div>
  );
}
