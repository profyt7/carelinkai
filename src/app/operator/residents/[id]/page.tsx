import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { getMockResident, getMockAssessments, getMockIncidents, getMockNotes } from '@/lib/mock/residents';
import { StatusActions } from '@/components/operator/residents/StatusActions';
import { CreateNoteForm } from '@/components/operator/residents/forms/CreateNoteForm';
import { CreateAssessmentForm } from '@/components/operator/residents/forms/CreateAssessmentForm';
import { CreateIncidentForm } from '@/components/operator/residents/forms/CreateIncidentForm';
import { CompliancePanel } from '@/components/operator/residents/CompliancePanel';

async function fetchResident(id: string) {
  const cookieHeader = cookies().toString();
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? '';
  const origin = `${proto}://${host}`;
  const res = await fetch(`${origin}/api/residents/${id}`, {
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
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? '';
  const origin = `${proto}://${host}`;
  const res = await fetch(`${origin}/api/residents/${id}/${section}?limit=5`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (!res.ok) return { items: [] };
  return res.json();
}

export default async function ResidentDetail({ params }: { params: { id: string } }) {
  if (process.env['NEXT_PUBLIC_RESIDENTS_ENABLED'] === 'false') return notFound();
  const mockCookie = cookies().get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
  const showMock = ['1','true','yes','on'].includes(mockCookie);
  let resident: any;
  let assessments: any = { items: [] };
  let incidents: any = { items: [] };
  let notes: any = { items: [] };
  if (showMock) {
    const r = getMockResident(params.id);
    if (!r) return notFound();
    resident = r;
    assessments = getMockAssessments(r.id);
    incidents = getMockIncidents(r.id);
    notes = getMockNotes(r.id);
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
      <Link href="/operator/residents" className="text-sm text-neutral-600 hover:underline">Back</Link>
      <h1 className="text-xl sm:text-2xl font-semibold mt-2 text-neutral-800">{resident.firstName} {resident.lastName}</h1>
      <div className="flex items-center gap-3">
        <p className="text-sm text-neutral-600">Status: {resident.status}</p>
        <Link href={`/operator/residents/${resident.id}/edit`} className="text-sm text-primary-600 hover:underline">Edit</Link>
      </div>
      {/* Downloadable PDF summary for operations use */}
      {(() => {
        const h = headers();
        const proto = h.get('x-forwarded-proto') ?? 'http';
        const host = h.get('host') ?? '';
        const origin = `${proto}://${host}`;
        const href = `${origin}/api/residents/${resident.id}/summary`;
        return <a href={href} target="_blank" className="text-sm text-primary-600 hover:underline">Open Summary PDF</a>;
      })()}
      <StatusActions residentId={resident.id} status={resident.status} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <section className="lg:col-span-3">
          <CompliancePanel residentId={resident.id} />
        </section>
        <section className="card">
          <h2 className="font-semibold mb-2 text-neutral-800">Assessments</h2>
          <ul className="text-sm list-disc ml-4">
            {(assessments.items ?? []).map((a: any) => (
              <li key={a.id}>{a.type} {a.score != null ? `(score: ${a.score})` : ''}</li>
            ))}
          </ul>
          <CreateAssessmentForm residentId={resident.id} />
        </section>
        <section className="card">
          <h2 className="font-semibold mb-2 text-neutral-800">Incidents</h2>
          <ul className="text-sm list-disc ml-4">
            {(incidents.items ?? []).map((i: any) => (
              <li key={i.id}>{i.type} (severity: {i.severity})</li>
            ))}
          </ul>
          <CreateIncidentForm residentId={resident.id} />
        </section>
        <section className="card">
          <h2 className="font-semibold mb-2 text-neutral-800">Notes</h2>
          <ul className="text-sm list-disc ml-4">
            {(notes.items ?? []).map((n: any) => (
              <li key={n.id}>{n.content}</li>
            ))}
          </ul>
          <CreateNoteForm residentId={resident.id} />
        </section>
      </div>
    </div>
  );
}

