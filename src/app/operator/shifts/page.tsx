import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OperatorShiftsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === 'OPERATOR' ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;

  const where = op ? { home: { operatorId: op.id } } : {};

  const shifts = await prisma.caregiverShift.findMany({
    where,
    include: { home: { select: { id: true, name: true } }, caregiver: { include: { user: true } } },
    orderBy: { startTime: 'desc' },
  });

  return (
    <DashboardLayout title="Shifts" showSearch={false}>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Shifts</h2>
          <Link href="/operator/shifts/new" className="btn btn-primary">Create Shift</Link>
        </div>
        <div className="overflow-x-auto card">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-600">
                <th className="py-2 pr-4">Home</th>
                <th className="py-2 pr-4">Start</th>
                <th className="py-2 pr-4">End</th>
                <th className="py-2 pr-4">Rate</th>
                <th className="py-2 pr-4">Caregiver</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s: any) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2 pr-4">{s.home?.name || 'Unknown'}</td>
                  <td className="py-2 pr-4">{s.startTime.toLocaleString()}</td>
                  <td className="py-2 pr-4">{s.endTime.toLocaleString()}</td>
                  <td className="py-2 pr-4">${'{'}Number(s.hourlyRate).toFixed(2){'}'}</td>
                  <td className="py-2 pr-4">{s.caregiver ? `${s.caregiver.user.firstName} ${s.caregiver.user.lastName}` : '—'}</td>
                  <td className="py-2 pr-4">{s.status}</td>
                  <td className="py-2 pr-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/operator/shifts/${s.id}/assign`} className="btn btn-sm">{s.caregiver ? 'Reassign' : 'Assign'}</Link>
                      {s.caregiver && (
                        <form action={`/api/operator/shifts/${s.id}/assign`} method="post" onSubmit={(e) => {
                          // Convert POST form to PATCH via fetch for consistency
                          e.preventDefault();
                        }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={async () => {
                              await fetch(`/api/operator/shifts/${s.id}/assign`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caregiverId: null }) });
                              // Simple server navigation refresh pattern
                              location.reload();
                            }}
                          >
                            Unassign
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-neutral-500">No shifts yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
