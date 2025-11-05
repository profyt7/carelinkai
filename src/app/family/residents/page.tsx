import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function FamilyResidentsIndex({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const { session, error } = await requireAnyRole(['FAMILY' as any], { forbiddenMessage: 'Family access required' });
  if (error) return error as any;
  const userId = session!.user!.id as string;

  const membership = await prisma.familyMember.findFirst({
    where: { userId, status: 'ACTIVE' as any },
    select: { familyId: true },
  });
  if (!membership) redirect('/family');

  // ASSUMPTION: TS config has noPropertyAccessFromIndexSignature enabled; use bracket access.
  const q = (typeof searchParams?.['q'] === 'string' ? searchParams?.['q'] : '').trim();
  const status = (typeof searchParams?.['status'] === 'string' ? searchParams?.['status'] : '').trim();

  const residents = await prisma.resident.findMany({
    where: {
      familyId: membership.familyId,
      ...(q ? { OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ] } : {}),
      ...(status ? { status: status as any } : {}),
    },
    select: { id: true, firstName: true, lastName: true, status: true, home: { select: { id: true, name: true } } },
    orderBy: [{ updatedAt: 'desc' }],
    take: 100,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-neutral-800 mb-4">Residents</h1>

      <form className="mb-4 flex gap-2" action="/family/residents" method="get">
        <input className="border rounded px-3 py-2 text-sm w-full max-w-sm" name="q" placeholder="Search by name" defaultValue={q} />
        <select className="border rounded px-3 py-2 text-sm" name="status" defaultValue={status}>
          <option value="">All Statuses</option>
          <option value="INQUIRY">INQUIRY</option>
          <option value="PENDING">PENDING</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DISCHARGED">DISCHARGED</option>
          <option value="DECEASED">DECEASED</option>
        </select>
        <button className="px-3 py-2 text-sm rounded bg-neutral-800 text-white" type="submit">Filter</button>
      </form>

      {residents.length === 0 ? (
        <p className="text-sm text-neutral-500">No residents found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-600">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Home</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {residents.map(r => (
                <tr key={r.id}>
                  <td className="py-2 pr-4">{r.firstName} {r.lastName}</td>
                  <td className="py-2 pr-4">{r.status}</td>
                  <td className="py-2 pr-4">{r.home?.name ?? '—'}</td>
                  <td className="py-2 pr-4"><a className="text-primary-700 hover:underline" href={`/family/residents/${r.id}`}>View</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
