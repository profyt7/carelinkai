import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';

async function fetchResident(id: string) {
  const cookieHeader = cookies().toString();
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'https';
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
  const proto = h.get('x-forwarded-proto') ?? 'https';
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
  const data = await fetchResident(params.id);
  if (!data?.resident) return notFound();
  const { resident } = data;
  const [assessments, incidents, notes] = await Promise.all([
    fetchSection(resident.id, 'assessments'),
    fetchSection(resident.id, 'incidents'),
    fetchSection(resident.id, 'notes'),
  ]);
  return (
    <div className="p-4 sm:p-6">
      <Link href="/operator/residents" className="text-sm text-neutral-600 hover:underline">Back</Link>
      <h1 className="text-xl sm:text-2xl font-semibold mt-2 text-neutral-800">{resident.firstName} {resident.lastName}</h1>
      <p className="text-sm text-neutral-600">Status: {resident.status}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <section className="card">
          <h2 className="font-semibold mb-2 text-neutral-800">Assessments</h2>
          <ul className="text-sm list-disc ml-4">
            {(assessments.items ?? []).map((a: any) => (
              <li key={a.id}>{a.type} {a.score != null ? `(score: ${a.score})` : ''}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="font-semibold mb-2 text-neutral-800">Incidents</h2>
          <ul className="text-sm list-disc ml-4">
            {(incidents.items ?? []).map((i: any) => (
              <li key={i.id}>{i.type} (severity: {i.severity})</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2 className="font-semibold mb-2 text-neutral-800">Notes</h2>
          <ul className="text-sm list-disc ml-4">
            {(notes.items ?? []).map((n: any) => (
              <li key={n.id}>{n.content}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

