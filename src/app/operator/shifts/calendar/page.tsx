import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday=0
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

function addDays(d: Date, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export default async function ShiftsCalendarPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;

  const start = startOfWeek(new Date());
  const end = addDays(start, 7);

  const where = op ? { home: { operatorId: op.id } } : {};
  const shifts = await prisma.caregiverShift.findMany({
    where: { ...where, startTime: { gte: start }, endTime: { lt: end } },
    include: { home: { select: { name: true } }, caregiver: { include: { user: true } } },
    orderBy: { startTime: 'asc' },
  });

  const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

  return (
    <div className="p-4 sm:p-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Shifts', href: '/operator/shifts' },
          { label: 'Calendar' }
        ]} />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">This Week</h2>
          <div className="flex gap-2">
            <Link href="/operator/shifts" className="btn">List View</Link>
            <Link href="/operator/shifts/new" className="btn btn-primary">Create Shift</Link>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-4">
          {days.map((d, idx) => {
            const key = d.toISOString().slice(0, 10);
            const dayShifts = shifts.filter((s) => s.startTime.toDateString() === d.toDateString());
            const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <div key={key} className="card p-3 min-h-[160px]">
                <div className="font-medium mb-2">{label}</div>
                <div className="space-y-2">
                  {dayShifts.length === 0 && (
                    <div className="text-sm text-neutral-500">No shifts</div>
                  )}
                  {dayShifts.map((s) => (
                    <div key={s.id} className="rounded border p-2 text-sm">
                      <div className="font-medium">{s.home?.name || 'Home'}</div>
                      <div className="flex justify-between text-neutral-600">
                        <span>
                          {s.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' '}–{' '}
                          {s.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>${'{'}Number(s.hourlyRate).toFixed(2){'}'}</span>
                      </div>
                      <div className="mt-1">
                        {s.caregiver ? `${s.caregiver.user.firstName} ${s.caregiver.user.lastName}` : 'Unassigned'}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Link href={`/operator/shifts/${s.id}/assign`} className="btn btn-xs">Assign</Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
  );
}
