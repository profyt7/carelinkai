import { notFound } from 'next/navigation';
import Link from 'next/link';

async function fetchResidents() {
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/residents?limit=50`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load residents');
  return res.json();
}

export default async function ResidentsPage() {
  if (process.env['NEXT_PUBLIC_RESIDENTS_ENABLED'] !== 'true') return notFound();
  const data = await fetchResidents();
  const items: Array<{ id: string; firstName: string; lastName: string; status: string }> = data.items ?? [];
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Residents</h1>
        <div />
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-sm">{r.firstName} {r.lastName}</td>
                <td className="px-4 py-2 text-sm">{r.status}</td>
                <td className="px-4 py-2 text-right">
                  <Link className="text-indigo-600 hover:underline text-sm" href={`/operator/residents/${r.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

