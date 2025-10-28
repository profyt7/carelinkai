import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { MOCK_RESIDENTS } from '@/lib/mock/residents';

async function fetchResidents() {
  const cookieHeader = cookies().toString();
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host') ?? '';
  const origin = `${proto}://${host}`;
  const res = await fetch(`${origin}/api/residents?limit=50`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error('Failed to load residents');
  return res.json();
}

export default async function ResidentsPage() {
  if (process.env['NEXT_PUBLIC_RESIDENTS_ENABLED'] === 'false') return notFound();
  const mockCookie = cookies().get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
  const showMock = ['1','true','yes','on'].includes(mockCookie);
  const items: Array<{ id: string; firstName: string; lastName: string; status: string }> = showMock
    ? MOCK_RESIDENTS
    : (await fetchResidents()).items ?? [];
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-800">Residents</h1>
        <div />
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-neutral-700">Name</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-neutral-700">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {items.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 text-sm text-neutral-800">{r.firstName} {r.lastName}</td>
                <td className="px-4 py-2 text-sm text-neutral-700">{r.status}</td>
                <td className="px-4 py-2 text-right">
                  <Link className="text-primary-600 hover:underline text-sm" href={`/operator/residents/${r.id}`}>View</Link>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-sm text-neutral-500" colSpan={3}>No residents found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

