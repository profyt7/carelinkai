import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getBaseUrl } from '@/lib/http';
import { getMockResident, getMockAssessments, getMockIncidents, getMockNotes } from '@/lib/mock/residents';
import { prisma } from '@/lib/prisma';
import { StatusActions } from '@/components/operator/residents/StatusActions';
import { ArchiveButton } from '@/components/operator/residents/ArchiveButton';
import { CreateNoteForm } from '@/components/operator/residents/forms/CreateNoteForm';
import { CreateAssessmentForm } from '@/components/operator/residents/forms/CreateAssessmentForm';
import { CreateIncidentForm } from '@/components/operator/residents/forms/CreateIncidentForm';
import { CompliancePanel } from '@/components/operator/residents/CompliancePanel';
import { ContactsPanel } from '@/components/operator/residents/ContactsPanel';
import { DocumentsPanel } from '@/components/operator/residents/DocumentsPanel';
import { TimelinePanel } from '@/components/operator/residents/TimelinePanel';
import { ResidentTimeline } from '@/components/operator/residents/ResidentTimeline';
import { ResidentNotes } from '@/components/operator/residents/ResidentNotes';
import { AssessmentsList } from '@/components/operator/residents/AssessmentsList';
import { IncidentsList } from '@/components/operator/residents/IncidentsList';
import Breadcrumbs from '@/components/ui/breadcrumbs';

async function fetchResident(id: string) {
  const cookieHeader = cookies().toString();
  const h = headers();
  const base = getBaseUrl(h);
  const res = await fetch(`${base}/api/residents/${id}`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load resident');
  return res.json();
}

async function fetchSection(id: string, section: 'assessments' | 'incidents' | 'notes') {
  const cookieHeader = cookies().toString();
  const h = headers();
  const base = getBaseUrl(h);
  const res = await fetch(`${base}/api/residents/${id}/${section}?limit=5`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) return { items: [] };
  return res.json();
}

export default async function ResidentDetail({ params }: { params: { id: string } }) {
  if (process.env['NEXT_PUBLIC_RESIDENTS_ENABLED'] === 'false') return notFound();
  
  // Get current user for notes editing permissions
  const session = await getServerSession(authOptions);
  let currentUserId: string | undefined;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    currentUserId = user?.id;
  }
  
  const mockCookie = cookies().get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
  const showMock = ['1','true','yes','on'].includes(mockCookie);
  let resident: any;
  let assessments: any = { items: [] };
  let incidents: any = { items: [] };
  let notes: any = { items: [] };
  if (showMock) {
    const r = getMockResident(params.id);
    if (r) {
      resident = r;
      assessments = getMockAssessments(r.id);
      incidents = getMockIncidents(r.id);
      notes = getMockNotes(r.id);
    } else {
      // Fallback to live data when ID not in mock set (e.g., newly created resident while mock mode is on)
      const data = await fetchResident(params.id);
      if (!data?.resident) return notFound();
      resident = data.resident;
      [assessments, incidents, notes] = await Promise.all([
        fetchSection(resident.id, 'assessments'),
        fetchSection(resident.id, 'incidents'),
        fetchSection(resident.id, 'notes'),
      ]);
    }
  } else {
    console.log('[ResidentDetail] fetching resident', params.id);
    const data = await fetchResident(params.id);
    console.log('[ResidentDetail] fetched resident', !!data);
    if (!data?.resident) return notFound();
    resident = data.resident;
    console.log('[ResidentDetail] fetching sections');
    [assessments, incidents, notes] = await Promise.all([
      fetchSection(resident.id, 'assessments'),
      fetchSection(resident.id, 'incidents'),
      fetchSection(resident.id, 'notes'),
    ]);
    console.log('[ResidentDetail] sections fetched');
  }
  return (
    <div className="p-4 sm:p-6">
      <Breadcrumbs items={[
        { label: 'Operator', href: '/operator' },
        { label: 'Residents', href: '/operator/residents' },
        { label: `${resident.firstName} ${resident.lastName}` }
      ]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-neutral-800">{resident.firstName} {resident.lastName}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-neutral-600">Status: {resident.status}</p>
            <Link href={`/operator/residents/${resident.id}/edit`} className="text-sm text-primary-600 hover:underline">Edit</Link>
            <a href={`/api/residents/${resident.id}/summary`} target="_blank" className="text-sm text-primary-600 hover:underline">Open Summary PDF</a>
          </div>
        </div>
        {!resident.archivedAt && (
          <ArchiveButton residentId={resident.id} residentName={`${resident.firstName} ${resident.lastName}`} />
        )}
      </div>
      <StatusActions residentId={resident.id} status={resident.status} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <section className="lg:col-span-3">
          <CompliancePanel residentId={resident.id} />
        </section>
        <section className="lg:col-span-3">
          <ContactsPanel residentId={resident.id} />
        </section>
        <section className="lg:col-span-3">
          <DocumentsPanel residentId={resident.id} />
        </section>
        
        {/* Timeline Section - Enhanced */}
        <section className="lg:col-span-2 card">
          <h2 className="font-semibold mb-4 text-neutral-800 text-lg">Resident Timeline</h2>
          <ResidentTimeline residentId={resident.id} />
        </section>
        
        {/* Quick Actions */}
        <section className="lg:col-span-1 space-y-6">
          <section className="card">
            <h2 className="font-semibold mb-2 text-neutral-800">Assessments</h2>
            <AssessmentsList residentId={resident.id} items={(assessments.items ?? []) as any[]} />
            <CreateAssessmentForm residentId={resident.id} />
          </section>
          <section className="card">
            <h2 className="font-semibold mb-2 text-neutral-800">Incidents</h2>
            <IncidentsList residentId={resident.id} items={(incidents.items ?? []) as any[]} />
            <CreateIncidentForm residentId={resident.id} />
          </section>
        </section>
        
        {/* Notes Section - Enhanced (Full Width) */}
        <section className="lg:col-span-3 card">
          <h2 className="font-semibold mb-4 text-neutral-800 text-lg">Resident Notes</h2>
          <ResidentNotes residentId={resident.id} currentUserId={currentUserId} />
        </section>
      </div>
    </div>
  );
}

