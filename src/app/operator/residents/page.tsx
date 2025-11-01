import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { MOCK_RESIDENTS } from '@/lib/mock/residents';
import { InlineActions, StatusPill } from '@/components/operator/residents/InlineActions';

async function fetchResidents(q?: string, status?: string) {
  const cookieHeader = cookies().toString();
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host') ?? '';
  const origin = `${proto}://${host}`;
  const qParam = q ? `&q=${encodeURIComponent(q)}` : '';
  const sParam = status ? `&status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${origin}/api/residents?limit=50${qParam}${sParam}`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error('Failed to load residents');
  return res.json();
}

export default async function ResidentsPage({ searchParams }: { searchParams?: { q?: string; status?: string } }) {
  if (process.env['NEXT_PUBLIC_RESIDENTS_ENABLED'] === 'false') return notFound();
  const mockCookie = cookies().get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
  const showMock = ['1','true','yes','on'].includes(mockCookie);
  const q = searchParams?.q?.toString() || '';
  const status = searchParams?.status?.toString() || '';
  const items: Array<{ id: string; firstName: string; lastName: string; status: string }> = showMock
    ? MOCK_RESIDENTS
    : (await fetchResidents(q, status)).items ?? [];
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('host') ?? '';
  const origin = `${proto}://${host}`;
  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold text-neutral-800">Residents</h1>
        <div className="flex items-center gap-3">
          <form action="/operator/residents" className="flex items-center gap-2">
            <input
              type="text"
              name="q"
              placeholder="Search by name"
              defaultValue={q}
              className="border rounded px-2 py-1 text-sm"
            />
            <select name="status" defaultValue={status} className="border rounded px-2 py-1 text-sm">
              <option value="">All Statuses</option>
              <option value="INQUIRY">Inquiry</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="DISCHARGED">Discharged</option>
              <option value="DECEASED">Deceased</option>
            </select>
            <button className="btn btn-sm" type="submit">Search</button>
          </form>
          <a className="btn btn-sm" href={`${origin}/api/residents?limit=1000${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${encodeURIComponent(status)}` : ''}&format=csv`}>
            Export CSV
          </a>
        </div>
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
                <td className="px-4 py-2 text-sm text-neutral-700"><StatusPill status={r.status} /></td>
                <td className="px-4 py-2 text-right flex items-center gap-3 justify-end">
                  <InlineActions id={r.id} status={r.status} />
                  <Link className="text-primary-600 hover:underline text-sm" href={`/operator/residents/${r.id}`}>Details</Link>
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

