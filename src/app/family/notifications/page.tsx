import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function FamilyNotificationsPage() {
  const { session, error } = await requireAnyRole(['FAMILY' as any], { forbiddenMessage: 'Family access required' });
  if (error) return error as any;
  const userId = session!.user!.id as string;

  const membership = await prisma.familyMember.findFirst({
    where: { userId, status: 'ACTIVE' as any },
    select: { familyId: true },
  });
  if (!membership) redirect('/family');

  const now = new Date();
  const soon = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [dueSoon, overdue] = await Promise.all([
    prisma.residentComplianceItem.findMany({
      where: {
        status: 'OPEN' as any,
        dueDate: { gte: now, lte: soon },
        resident: { familyId: membership.familyId },
      },
      select: { id: true, dueDate: true, resident: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),
    prisma.residentComplianceItem.findMany({
      where: {
        status: 'OPEN' as any,
        dueDate: { lt: now },
        resident: { familyId: membership.familyId },
      },
      select: { id: true, dueDate: true, resident: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { dueDate: 'asc' },
      take: 50,
    }),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-neutral-800 mb-4">Notifications</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded border p-3 bg-white">
          <div className="text-xs text-neutral-500">Due Soon (14d)</div>
          <div className="text-xl font-semibold">{dueSoon.length}</div>
        </div>
        <div className="rounded border p-3 bg-white">
          <div className="text-xs text-neutral-500">Overdue</div>
          <div className="text-xl font-semibold">{overdue.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border p-4 bg-white">
          <h2 className="font-medium mb-2">Due Soon</h2>
          {dueSoon.length === 0 ? (
            <p className="text-sm text-neutral-500">No items due soon.</p>
          ) : (
            <ul className="divide-y">
              {dueSoon.map((i) => (
                <li key={i.id} className="py-2 text-sm flex items-center justify-between">
                  <div className="text-neutral-800">Compliance due soon for {i.resident.firstName} {i.resident.lastName}</div>
                  <div className="text-xs text-neutral-500 ml-3 whitespace-nowrap">{new Date(i.dueDate as any).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <h2 className="font-medium mb-2">Overdue</h2>
          {overdue.length === 0 ? (
            <p className="text-sm text-neutral-500">No overdue items.</p>
          ) : (
            <ul className="divide-y">
              {overdue.map((i) => (
                <li key={i.id} className="py-2 text-sm flex items-center justify-between">
                  <div className="text-neutral-800">Compliance overdue for {i.resident.firstName} {i.resident.lastName}</div>
                  <div className="text-xs text-neutral-500 ml-3 whitespace-nowrap">{new Date(i.dueDate as any).toLocaleDateString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
