import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { MOCK_RESIDENTS } from '@/lib/mock/residents';
import { InlineActions, StatusPill } from '@/components/operator/residents/InlineActions';

async function fetchResidents(params: { q?: string; status?: string; homeId?: string; familyId?: string; cursor?: string }) {
  const cookieHeader = cookies().toString();
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? '';
  const origin = `${proto}://${host}`;
  const qParam = params.q ? `&q=${encodeURIComponent(params.q)}` : '';
  const sParam = params.status ? `&status=${encodeURIComponent(params.status)}` : '';
  const hParam = params.homeId ? `&homeId=${encodeURIComponent(params.homeId)}` : '';
  const fParam = params.familyId ? `&familyId=${encodeURIComponent(params.familyId)}` : '';
  const cParam = params.cursor ? `&cursor=${encodeURIComponent(params.cursor)}` : '';
  const res = await fetch(`${origin}/api/residents?limit=50${qParam}${sParam}${hParam}${fParam}${cParam}`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) throw new Error('Failed to load residents');
  return res.json();
}

async function fetchHomes() {
  // Server-side same-origin fetch with cookies for RBAC scoping to operator homes
  const cookieHeader = cookies().toString();
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? '';
  const origin = `${proto}://${host}`;
  const res = await fetch(`${origin}/api/operator/homes`, { cache: 'no-store', headers: { cookie: cookieHeader } });
  if (!res.ok) return { homes: [] as Array<{ id: string; name: string }> };
  const json = await res.json();
  return { homes: (json.homes ?? []).map((h: any) => ({ id: h.id, name: h.name })) };
}

export default async function ResidentsPage({ searchParams }: { searchParams?: { q?: string; status?: string; homeId?: string; familyId?: string; cursor?: string; live?: string } }) {
  if (process.env['NEXT_PUBLIC_RESIDENTS_ENABLED'] === 'false') return notFound();
  const mockCookie = cookies().get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
  const showMock = ['1','true','yes','on'].includes(mockCookie);
  const liveCookie = cookies().get('carelink_show_live')?.value?.toString().trim().toLowerCase() || '';
  const forceLive = ['1','true','yes','on'].includes(liveCookie) || ['1','true','yes','on'].includes((searchParams?.live ?? '').toString().trim().toLowerCase());
  const q = searchParams?.q?.toString() || '';
  const status = searchParams?.status?.toString() || '';
  const homeId = searchParams?.homeId?.toString() || '';
  const familyId = searchParams?.familyId?.toString() || '';
  const cursor = searchParams?.cursor?.toString() || '';
  const data = showMock && !forceLive ? MOCK_RESIDENTS : await fetchResidents({ q, status, homeId, familyId, cursor });
  const { homes } = showMock ? { homes: [] as Array<{ id: string; name: string }> } : await fetchHomes();
  const items: Array<{ id: string; firstName: string; lastName: string; status: string }> = Array.isArray(data) ? data : (data.items ?? []);
  const nextCursor = Array.isArray(data) ? null : (data.nextCursor ?? null);
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
            {/* Assumption: Operator should filter by their homes; provide a dropdown for convenience */}
            <select name="homeId" defaultValue={homeId} className="border rounded px-2 py-1 text-sm">
              <option value="">All Homes</option>
              {homes.map((h: { id: string; name: string }) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <input type="text" name="familyId" placeholder="Family ID" defaultValue={familyId} className="border rounded px-2 py-1 text-sm" />
            <button className="btn btn-sm" type="submit">Search</button>
          </form>
          {showMock && (
            <form action="/operator/residents" className="inline">
              <input type="hidden" name="live" value={forceLive ? '' : '1'} />
              <button
                className="btn btn-sm"
                formAction={(async () => {
                  'use server';
                  const cookieStore = cookies();
                  try { cookieStore.set('carelink_show_live', forceLive ? '0' : '1', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60*60*6 }); } catch {}
                })}
                type="submit"
              >
                {forceLive ? 'Showing Live' : 'Show Live Data'}
              </button>
            </form>
          )}
          {/* Assumption: same-origin CSV export endpoint; preserves current filters; filename hint for UX */}
          <a className="btn btn-sm" download="residents.csv" href={`${origin}/api/residents?limit=1000${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${encodeURIComponent(status)}` : ''}${homeId ? `&homeId=${encodeURIComponent(homeId)}` : ''}${familyId ? `&familyId=${encodeURIComponent(familyId)}` : ''}&format=csv`}>
            Export CSV
          </a>
          <Link href="/operator/residents/new" className="btn btn-sm">New Resident</Link>
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
                  <InlineActions id={r.id} status={r.status} homes={homes} />
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
      {nextCursor && (
        <div className="mt-4">
          <Link className="btn btn-sm" href={`/operator/residents?${new URLSearchParams({ q, status, homeId, familyId, cursor: nextCursor }).toString()}`}>Next</Link>
        </div>
      )}
    </div>
  );
}

