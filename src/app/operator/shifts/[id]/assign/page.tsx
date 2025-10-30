import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import AssignShiftForm from '@/components/operator/AssignShiftForm';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AssignShiftPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
    return null;
  }

  const shift = await prisma.caregiverShift.findUnique({
    where: { id: params.id },
    include: { home: true, caregiver: { include: { user: true } } },
  });
  if (!shift) return null;

  let caregivers: { id: string; name: string }[] = [];
  if (user.role === UserRole.ADMIN) {
    const cgs = await prisma.caregiver.findMany({ include: { user: true } });
    caregivers = cgs.map((c) => ({ id: c.id, name: `${c.user.firstName} ${c.user.lastName}` }));
  } else {
    const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
    const employments = await prisma.caregiverEmployment.findMany({
      where: { operatorId: operator!.id, isActive: true },
      include: { caregiver: { include: { user: true } } },
      orderBy: { startDate: 'desc' },
    });
    caregivers = employments.map((e) => ({ id: e.caregiver.id, name: `${e.caregiver.user.firstName} ${e.caregiver.user.lastName}` }));
  }

  return (
    <DashboardLayout title={`Assign Shift - ${shift.home.name}`} showSearch={false}>
      <div className="p-4 sm:p-6 space-y-4">
        <div className="card p-4">
          <div className="text-sm text-neutral-600">Home</div>
          <div className="font-medium">{shift.home.name}</div>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-neutral-600">Start</div>
              <div>{shift.startTime.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-neutral-600">End</div>
              <div>{shift.endTime.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-neutral-600">Rate</div>
              <div>${'{'}Number(shift.hourlyRate).toFixed(2){'}'}</div>
            </div>
          </div>
        </div>
        <AssignShiftForm shiftId={shift.id} caregivers={caregivers} initialCaregiverId={shift.caregiverId} />
      </div>
    </DashboardLayout>
  );
}
