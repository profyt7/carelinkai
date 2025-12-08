import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

type Props = { params: { id: string } };

export default async function FamilyResidentPage({ params }: Props) {
  // RBAC: family members only. Admins are redirected to dashboard.
  const { session, error } = await requireAnyRole(['FAMILY' as any], {
    forbiddenMessage: 'Family access required',
  });
  if (error) return error as any;

  const userId = session!.user!.id as string;

  // Resolve user's active family membership
  const membership = await prisma.familyMember.findFirst({
    where: { userId, status: 'ACTIVE' as any },
    select: { familyId: true, role: true },
  });
  if (!membership) {
    redirect('/family');
  }

  // Fetch resident owned by family, with safe fields only
  const resident = await prisma.resident.findFirst({
    where: { id: params.id, familyId: membership.familyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      admissionDate: true,
      dischargeDate: true,
      dateOfBirth: true,
      home: { select: { id: true, name: true } },
    },
  });
  if (!resident) {
    redirect('/family');
  }

  // Upcoming appointments (next 30 days) for this resident
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: {
      residentId: resident.id,
      startTime: { gte: now, lte: in30 },
      status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] as any },
    },
    orderBy: { startTime: 'asc' },
    select: { id: true, title: true, startTime: true, type: true, location: true },
  });

  // Family-safe contacts (read-only)
  const contacts = await prisma.residentContact.findMany({
    where: { residentId: resident.id },
    select: {
      id: true,
      name: true,
      relationship: true,
      email: true,
      phone: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: 'desc' as any }, { createdAt: 'asc' as any }],
  });

  // Compliance summary (family-safe counts only)
  const in14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [openCount, completedCount, dueSoonCount, overdueCount] = await Promise.all([
    prisma.residentComplianceItem.count({
      where: { residentId: resident.id, status: 'OPEN' as any },
    }),
    prisma.residentComplianceItem.count({
      where: { residentId: resident.id, status: 'COMPLETED' as any },
    }),
    prisma.residentComplianceItem.count({
      where: {
        residentId: resident.id,
        status: 'OPEN' as any,
        expiryDate: { gte: now, lte: in14 },
      },
    }),
    prisma.residentComplianceItem.count({
      where: {
        residentId: resident.id,
        status: 'OPEN' as any,
        expiryDate: { lt: now },
      },
    }),
  ]);

  // Family-visible notes for this resident
  const notes = await prisma.residentNote.findMany({
    where: { residentId: resident.id, visibility: 'FAMILY' as any },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      content: true,
      createdAt: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  // Family documents linked to this resident (counts only)
  const docCounts = await prisma.familyDocument.groupBy({
    by: ['type'],
    where: { residentId: resident.id },
    _count: { _all: true },
  });

  // Timeline (appointments within +/-30d, latest family notes, documents)
  const pastWindow = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const futureWindow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const limit = 25;
  const [appointmentsT, notesT, documentsT] = await Promise.all([
    prisma.appointment.findMany({
      where: { residentId: resident.id, startTime: { gte: pastWindow, lte: futureWindow } },
      select: { id: true, title: true, startTime: true, endTime: true, status: true, type: true },
      orderBy: { startTime: 'desc' },
      take: limit,
    }),
    prisma.familyNote.findMany({
      where: { familyId: membership.familyId, residentId: resident.id },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.familyDocument.findMany({
      where: { familyId: membership.familyId, residentId: resident.id },
      select: { id: true, title: true, type: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);
  const timelineItems = [
    ...appointmentsT.map(a => ({ kind: 'appointment' as const, id: a.id, title: a.title, at: a.startTime })),
    ...notesT.map(n => ({ kind: 'note' as const, id: n.id, title: n.title, at: n.createdAt })),
    ...documentsT.map(d => ({ kind: 'document' as const, id: d.id, title: d.title, at: d.createdAt })),
  ].sort((a, b) => (b.at as any) - (a.at as any)).slice(0, limit);

  // Audit READ access (minimal metadata)
  try {
    const sess = await getServerSession(authOptions);
    if (sess?.user?.id) {
      await prisma.auditLog.create({
        data: {
          userId: sess.user.id,
          action: 'READ' as any,
          resourceType: 'Resident',
          resourceId: resident.id,
          description: 'Family viewed resident summary',
          metadata: { route: '/family/residents/[id]' },
        },
      });
    }
  } catch {}

  const ageYears = (() => {
    const dob = resident.dateOfBirth ? new Date(resident.dateOfBirth) : null;
    if (!dob) return null;
    const diff = Date.now() - dob.getTime();
    const age = new Date(diff).getUTCFullYear() - 1970;
    return age;
  })();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-800">
          {resident.firstName} {resident.lastName}
        </h1>
        <p className="text-neutral-600">
          Status: <span className="font-medium">{resident.status}</span>
          {ageYears !== null && (
            <> • Age: <span className="font-medium">{ageYears}</span></>
          )}
          {resident.home && (
            <> • Home: <span className="font-medium">{resident.home.name}</span></>
          )}
        </p>
        <p className="text-neutral-600 mt-1">
          {resident.admissionDate && (
            <>Admitted: {format(new Date(resident.admissionDate), 'MMM d, yyyy')}</>
          )}
          {resident.dischargeDate && (
            <> • Discharged: {format(new Date(resident.dischargeDate), 'MMM d, yyyy')}</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border p-4 bg-white">
          <h2 className="font-medium mb-2">Documents</h2>
          {docCounts.length === 0 ? (
            <p className="text-sm text-neutral-500">No documents linked.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {docCounts.map((d) => (
                <li key={d.type} className="flex justify-between">
                  <span>{String(d.type).replace(/_/g, ' ')}</span>
                  <span className="font-medium">{d._count._all}</span>
                </li>
              ))}
            </ul>
          )}
          <a href={`/family?tab=documents`} className="inline-block mt-3 text-primary-700 text-sm hover:underline">
            View all documents
          </a>
        </div>

        <div className="rounded-lg border p-4 bg-white md:col-span-2">
          <h2 className="font-medium mb-2">Upcoming Appointments</h2>
          {appointments.length === 0 ? (
            <p className="text-sm text-neutral-500">No upcoming appointments.</p>
          ) : (
            <ul className="divide-y">
              {appointments.map((a) => (
                <li key={a.id} className="py-2 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-neutral-600">
                      {format(new Date(a.startTime), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {String(a.type).replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
      {/* Contacts & Compliance Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-lg border p-4 bg-white md:col-span-2">
          <h2 className="font-medium mb-2">Contacts</h2>
          {contacts.length === 0 ? (
            <p className="text-sm text-neutral-500">No contacts on file.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-600">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Relationship</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contacts.map((c) => (
                    <tr key={c.id} className="align-top">
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-neutral-800">{c.name}</span>
                          {c.isPrimary && (
                            <span className="text-[10px] rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5">PRIMARY</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-neutral-700">{c.relationship ?? '—'}</td>
                      <td className="py-2 pr-4 text-neutral-700">{c.phone ?? '—'}</td>
                      <td className="py-2 pr-4 text-neutral-700">{c.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border p-4 bg-white">
          <h2 className="font-medium mb-2">Compliance Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-neutral-500">Open</div>
              <div className="text-xl font-semibold">{openCount}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-neutral-500">Completed</div>
              <div className="text-xl font-semibold">{completedCount}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-neutral-500">Due Soon (14d)</div>
              <div className="text-xl font-semibold">{dueSoonCount}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-neutral-500">Overdue</div>
              <div className="text-xl font-semibold">{overdueCount}</div>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-3">
            Family can view status counts only. Details are available through the operator portal.
          </p>
        </div>
      </div>

        </div>
      </div>

      <div className="mt-6 rounded-lg border p-4 bg-white">
        <h2 className="font-medium mb-2">Care Team Notes (Family-visible)</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-neutral-500">No notes available.</p>
        ) : (
          <ul className="divide-y">
            {notes.map((n) => (
              <li key={n.id} className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="text-neutral-700">
                    {/* content is plain text in this view */}
                    {typeof n.content === 'string' ? n.content.slice(0, 240) : ''}
                    {typeof n.content === 'string' && n.content.length > 240 ? '…' : ''}
                  </div>
                  <div className="text-xs text-neutral-500 ml-3 whitespace-nowrap">
                    {n.createdBy ? `${n.createdBy.firstName ?? ''} ${n.createdBy.lastName ?? ''}` : '—'} • {format(new Date(n.createdAt as any), 'MMM d, yyyy')}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-lg border p-4 bg-white">
        <h2 className="font-medium mb-2">Timeline</h2>
        {timelineItems.length === 0 ? (
          <p className="text-sm text-neutral-500">No recent activity.</p>
        ) : (
          <ul className="divide-y">
            {timelineItems.map((it) => (
              <li key={`${it.kind}-${it.id}`} className="py-2 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 uppercase">{it.kind}</span>
                  <span className="text-neutral-800">{it.title}</span>
                </div>
                <div className="text-xs text-neutral-500 ml-3 whitespace-nowrap">{format(new Date(it.at as any), 'MMM d, yyyy')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
