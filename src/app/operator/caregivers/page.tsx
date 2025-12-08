import { prisma } from '@/lib/prisma';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import Link from 'next/link';
import EmptyState from '@/components/ui/empty-state';
import { FiBriefcase } from 'react-icons/fi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OperatorCaregiversPage() {
  const employments = await prisma.caregiverEmployment.findMany({
    include: { caregiver: { include: { user: true } }, operator: { include: { user: true } } },
    orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
  });

  return (
    <div className="p-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Caregivers' }
        ]} />
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Caregiver Employments</h2>
          <Link href="/operator/caregivers/new" className="btn btn-primary">New Employment</Link>
        </div>

        {employments.length === 0 ? (
          <EmptyState
            icon={FiBriefcase}
            title="No caregiver employments yet"
            description="Add employment records for caregivers working at your facilities. Track start dates, positions, and employment status."
            action={{
              label: "Add Employment",
              href: "/operator/caregivers/new"
            }}
          />
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg border border-neutral-200 shadow-sm">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Caregiver</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Position</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Start</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">End</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {employments.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-sm">{`${e.caregiver.user.firstName} ${e.caregiver.user.lastName}`}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{e.caregiver.user.email}</td>
                    <td className="px-4 py-3 text-sm">{e.position}</td>
                    <td className="px-4 py-3 text-sm">{new Date(e.startDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm">{e.endDate ? new Date(e.endDate).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${e.isActive ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-700'}`}>
                        {e.isActive ? 'Active' : 'Ended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {e.isActive ? (
                        <form
                          action={async () => {
                            'use server';
                            await fetch(`${process.env.NEXTAUTH_URL || ''}/api/operator/caregivers/${e.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({}),
                            });
                          }}
                        >
                          <button type="submit" className="btn btn-secondary">End Employment</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
  );
}
