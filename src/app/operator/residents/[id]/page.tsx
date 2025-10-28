import { notFound } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';

async function fetchResident(id: string) {
  const cookieHeader = cookies().toString();
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/residents/${id}`, {
    cache: 'no-store',
    headers: { cookie: cookieHeader },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to load resident');
  return res.json();
}

async function fetchSection(id: string, section: 'assessments' | 'incidents' | 'notes') {
  const cookieHeader = cookies().toString();
  const res = await fetch(`${process.env.NEXTAUTH_URL ?? ''}/api/residents/${id}/${section}?limit=5`, {
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
    <div className="p-6">
      <Link href="/operator/residents" className="text-sm text-gray-600 hover:underline">Back</Link>
      <h1 className="text-2xl font-semibold mt-2">{resident.firstName} {resident.lastName}</h1>
      <p className="text-sm text-gray-600">Status: {resident.status}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <section className="border rounded p-4">
          <h2 className="font-semibold mb-2">Assessments</h2>
          <ul className="text-sm list-disc ml-4">
            {(assessments.items ?? []).map((a: any) => (
              <li key={a.id}>{a.type} {a.score != null ? `(score: ${a.score})` : ''}</li>
            ))}
          </ul>
        </section>
        <section className="border rounded p-4">
          <h2 className="font-semibold mb-2">Incidents</h2>
          <ul className="text-sm list-disc ml-4">
            {(incidents.items ?? []).map((i: any) => (
              <li key={i.id}>{i.type} (severity: {i.severity})</li>
            ))}
          </ul>
        </section>
        <section className="border rounded p-4">
          <h2 className="font-semibold mb-2">Notes</h2>
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

