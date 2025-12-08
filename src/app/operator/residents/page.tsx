import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { getBaseUrl } from '@/lib/http';
import { MOCK_RESIDENTS } from '@/lib/mock/residents';
import { InlineActions, StatusPill } from '@/components/operator/residents/InlineActions';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import EmptyState from '@/components/ui/empty-state';
import { FiUsers, FiSearch, FiDownload, FiPlus } from 'react-icons/fi';
import Image from 'next/image';

async function fetchResidents(params: { q?: string; status?: string; homeId?: string; familyId?: string; cursor?: string; showArchived?: string }) {
  const cookieHeader = cookies().toString();
  const qParam = params.q ? `&q=${encodeURIComponent(params.q)}` : '';
  const sParam = params.status ? `&status=${encodeURIComponent(params.status)}` : '';
  const hParam = params.homeId ? `&homeId=${encodeURIComponent(params.homeId)}` : '';
  const fParam = params.familyId ? `&familyId=${encodeURIComponent(params.familyId)}` : '';
  const cParam = params.cursor ? `&cursor=${encodeURIComponent(params.cursor)}` : '';
  const aParam = params.showArchived === 'true' ? '&showArchived=true' : '';
  const h = headers();
  const base = getBaseUrl(h);
  const res = await fetch(`${base}/api/residents?limit=50${qParam}${sParam}${hParam}${fParam}${cParam}${aParam}`, {
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
  const base = getBaseUrl(h);
  const res = await fetch(`${base}/api/operator/homes`, { cache: 'no-store', headers: { cookie: cookieHeader } });
  if (!res.ok) return { homes: [] as Array<{ id: string; name: string }> };
  const json = await res.json();
  return { homes: (json.homes ?? []).map((h: any) => ({ id: h.id, name: h.name })) };
}

type ResidentItem = {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  photoUrl?: string | null;
  dateOfBirth?: string;
  admissionDate?: string | null;
  careNeeds?: any;
  home?: { id: string; name: string } | null;
};

export default async function ResidentsPage({ searchParams }: { searchParams?: { q?: string; status?: string; homeId?: string; familyId?: string; cursor?: string; live?: string; showArchived?: string } }) {
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
  const showArchived = searchParams?.showArchived?.toString() || '';
  const data = showMock && !forceLive ? MOCK_RESIDENTS : await fetchResidents({ q, status, homeId, familyId, cursor, showArchived });
  const { homes } = showMock ? { homes: [] as Array<{ id: string; name: string }> } : await fetchHomes();
  const items: ResidentItem[] = Array.isArray(data) ? data : (data.items ?? []);
  const nextCursor = Array.isArray(data) ? null : (data.nextCursor ?? null);
  
  // Calculate age helper
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Breadcrumbs items={[
        { label: 'Operator', href: '/operator' },
        { label: 'Residents' }
      ]} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Residents</h1>
          <p className="text-sm text-neutral-600 mt-1">Manage resident profiles and care information</p>
        </div>
        <Link href="/operator/residents/new" className="btn bg-primary-600 hover:bg-primary-700 text-white inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm">
          <FiPlus className="w-4 h-4" />
          <span>New Resident</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-4 mb-6">
        <form action="/operator/residents" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                <FiSearch className="inline w-4 h-4 mr-1" />
                Search
              </label>
              <input
                type="text"
                name="q"
                placeholder="Search by name, room, or ID"
                defaultValue={q}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
              <select name="status" defaultValue={status} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">All Statuses</option>
                <option value="INQUIRY">Inquiry</option>
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="DISCHARGED">Discharged</option>
                <option value="DECEASED">Deceased</option>
              </select>
            </div>
            
            {/* Home Filter */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Home</label>
              <select name="homeId" defaultValue={homeId} className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">All Homes</option>
                {homes.map((h: { id: string; name: string }) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="showArchived"
                value="true"
                defaultChecked={showArchived === 'true'}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Show Archived</span>
            </label>
            
            <div className="flex-1" />
            
            <button type="submit" className="btn btn-sm bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2">
              <FiSearch className="w-4 h-4" />
              <span>Search</span>
            </button>
            
            <a 
              className="btn btn-sm border border-neutral-300 hover:bg-neutral-50 text-neutral-700 px-4 py-2 rounded-lg inline-flex items-center gap-2" 
              download="residents.csv" 
              href={`/api/residents?limit=1000${q ? `&q=${encodeURIComponent(q)}` : ''}${status ? `&status=${encodeURIComponent(status)}` : ''}${homeId ? `&homeId=${encodeURIComponent(homeId)}` : ''}${familyId ? `&familyId=${encodeURIComponent(familyId)}` : ''}&format=csv`}
            >
              <FiDownload className="w-4 h-4" />
              <span>Export</span>
            </a>
            
            {showMock && (
              <form action="/operator/residents" className="inline">
                <input type="hidden" name="live" value={forceLive ? '' : '1'} />
                <button
                  className="btn btn-sm border border-neutral-300 hover:bg-neutral-50 text-neutral-700 px-4 py-2 rounded-lg"
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
          </div>
        </form>
      </div>
      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={FiUsers}
            title="No residents yet"
            description="Add residents to track their care and information. Start by creating your first resident profile."
            action={{
              label: "Add Resident",
              href: "/operator/residents/new"
            }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Resident</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Admission</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {items.map((r) => {
                  const age = r.dateOfBirth ? calculateAge(r.dateOfBirth) : null;
                  const roomNumber = r.careNeeds?.roomNumber || '—';
                  const admissionFormatted = r.admissionDate 
                    ? new Date(r.admissionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—';
                  
                  return (
                    <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-10 w-10">
                            {r.photoUrl ? (
                              <Image
                                src={r.photoUrl}
                                alt={`${r.firstName} ${r.lastName}`}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-neutral-200 flex items-center justify-center">
                                <span className="text-neutral-600 font-medium text-sm">
                                  {r.firstName[0]}{r.lastName[0]}
                                </span>
                              </div>
                            )}
                          </div>
                          <div>
                            <Link href={`/operator/residents/${r.id}`} className="text-sm font-medium text-neutral-900 hover:text-primary-600">
                              {r.firstName} {r.lastName}
                            </Link>
                            {r.home && (
                              <p className="text-xs text-neutral-500">{r.home.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                        {age ? `${age} yrs` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                        {roomNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">
                        {admissionFormatted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center gap-3 justify-end">
                          <Link 
                            href={`/operator/residents/${r.id}`} 
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View
                          </Link>
                          <Link 
                            href={`/operator/residents/${r.id}/edit`} 
                            className="text-neutral-600 hover:text-neutral-900"
                          >
                            Edit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {nextCursor && (
        <div className="mt-4">
          <Link className="btn btn-sm" href={`/operator/residents?${new URLSearchParams({ q, status, homeId, familyId, cursor: nextCursor }).toString()}`}>Next</Link>
        </div>
      )}
    </div>
  );
}

