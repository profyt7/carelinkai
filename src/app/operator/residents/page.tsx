import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { MOCK_RESIDENTS } from '@/lib/mock/residents';
import { InlineActions, StatusPill } from '@/components/operator/residents/InlineActions';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import EmptyState from '@/components/ui/empty-state';
import { FiUsers, FiSearch, FiDownload, FiPlus } from 'react-icons/fi';
import Image from 'next/image';
import { NewResidentButton, ExportResidentsButton, ResidentRowActions } from '@/components/operator/residents/ResidentsListActions';
import { ResidentsPageContent } from '@/components/operator/residents/ResidentsPageContent';
import { prisma } from '@/lib/prisma';
import { requirePermission, getUserScope } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';

async function fetchResidentsDirect(params: { q?: string; status?: string; homeId?: string; familyId?: string; cursor?: string; showArchived?: string }) {
  const user = await requirePermission(PERMISSIONS.RESIDENTS_VIEW);
  const scope = await getUserScope(user.id);

  let allowedHomeIds: string[] | null = null;
  if (scope.homeIds === 'ALL') {
    allowedHomeIds = null;
  } else if (scope.role === 'FAMILY') {
    allowedHomeIds = null;
  } else {
    allowedHomeIds = scope.homeIds as string[];
    if (allowedHomeIds.length === 0) return { items: [], nextCursor: null };
  }

  const where: any = {};
  if (params.q) {
    where.OR = [
      { firstName: { contains: params.q, mode: 'insensitive' } },
      { lastName: { contains: params.q, mode: 'insensitive' } },
    ];
  }
  if (params.status) where.status = params.status;
  if (params.homeId) where.homeId = params.homeId;
  if (params.familyId) where.familyId = params.familyId;
  if (params.showArchived !== 'true') where.archivedAt = null;

  if (scope.role === 'FAMILY' && Array.isArray(scope.residentIds) && scope.residentIds.length > 0) {
    where.id = { in: scope.residentIds };
  } else if (allowedHomeIds !== null) {
    where.homeId = where.homeId ?? { in: allowedHomeIds };
  }

  const limit = 50;
  const queryOpts: any = {
    where,
    take: limit + 1,
    orderBy: { id: 'asc' as const },
    select: {
      id: true, firstName: true, lastName: true, status: true,
      photoUrl: true, dateOfBirth: true, admissionDate: true, careNeeds: true,
      home: { select: { id: true, name: true } },
    },
  };
  if (params.cursor) { queryOpts.cursor = { id: params.cursor }; queryOpts.skip = 1; }

  const rows = await prisma.resident.findMany(queryOpts);
  let nextCursor: string | null = null;
  let items = rows;
  if (rows.length > limit) {
    const last = rows[rows.length - 1];
    if (last) nextCursor = (last as any).id as string;
    items = rows.slice(0, limit);
  }
  return { items, nextCursor };
}

async function fetchHomes() {
  const user = await requirePermission(PERMISSIONS.RESIDENTS_VIEW);
  const scope = await getUserScope(user.id);
  if (scope.homeIds === 'ALL') {
    const homes = await prisma.assistedLivingHome.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
    return { homes };
  }
  const homeIds = scope.homeIds as string[];
  if (homeIds.length === 0) return { homes: [] as Array<{ id: string; name: string }> };
  const homes = await prisma.assistedLivingHome.findMany({
    where: { id: { in: homeIds } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  return { homes };
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
  const mockCookie = (await cookies()).get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
  const showMock = ['1','true','yes','on'].includes(mockCookie);
  const liveCookie = (await cookies()).get('carelink_show_live')?.value?.toString().trim().toLowerCase() || '';
  const forceLive = ['1','true','yes','on'].includes(liveCookie) || ['1','true','yes','on'].includes((searchParams?.live ?? '').toString().trim().toLowerCase());
  const q = searchParams?.q?.toString() || '';
  const status = searchParams?.status?.toString() || '';
  const homeId = searchParams?.homeId?.toString() || '';
  const familyId = searchParams?.familyId?.toString() || '';
  const cursor = searchParams?.cursor?.toString() || '';
  const showArchived = searchParams?.showArchived?.toString() || '';
  let data: any;
  let fetchError: string | null = null;
  try {
    if (showMock && !forceLive) {
      data = MOCK_RESIDENTS;
    } else {
      data = await fetchResidentsDirect({ q, status, homeId, familyId, cursor, showArchived });
    }
  } catch (err: any) {
    if (err?.name === 'UnauthenticatedError' || err?.status === 401) {
      redirect('/auth/login');
    }
    fetchError = err instanceof Error ? err.message : 'Failed to load residents';
    data = { items: [], nextCursor: null };
  }
  const { homes } = showMock ? { homes: [] as Array<{ id: string; name: string }> } : await fetchHomes();
  const items: ResidentItem[] = Array.isArray(data) ? data : (data.items ?? []);
  const nextCursor = Array.isArray(data) ? null : (data.nextCursor ?? null);
  
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <Breadcrumbs items={[
        { label: 'Operator', href: '/operator' },
        { label: 'Residents' }
      ]} />
      
      {fetchError && (
        <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">
          Error loading residents: {fetchError}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Residents</h1>
          <p className="text-sm text-neutral-600 mt-1">Manage resident profiles and care information</p>
        </div>
        <NewResidentButton />
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
            
            <ExportResidentsButton q={q} status={status} homeId={homeId} familyId={familyId} />
            
            {showMock && (
              <form action="/operator/residents" className="inline">
                <input type="hidden" name="live" value={forceLive ? '' : '1'} />
                <button
                  className="btn btn-sm border border-neutral-300 hover:bg-neutral-50 text-neutral-700 px-4 py-2 rounded-lg"
                  formAction={(async () => {
                    'use server';
                    const cookieStore = await cookies();
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
        <ResidentsPageContent 
          items={items} 
          nextCursor={nextCursor}
          q={q}
          status={status}
          homeId={homeId}
          familyId={familyId}
        />
      )}
    </div>
  );
}

