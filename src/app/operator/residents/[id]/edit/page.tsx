import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { EditResidentForm } from '@/components/operator/residents/EditResidentForm';

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

export default async function EditResidentPage({ params }: { params: { id: string } }) {
  if (process.env['NEXT_PUBLIC_RESIDENTS_ENABLED'] === 'false') return notFound();
  const data = await fetchResident(params.id);
  if (!data?.resident) return notFound();
  const r = data.resident;
  return (
    <div className="p-4 sm:p-6">
      <Link href={`/operator/residents/${r.id}`} className="text-sm text-neutral-600 hover:underline">Back</Link>
      <h1 className="text-xl sm:text-2xl font-semibold mt-2 text-neutral-800">Edit Resident</h1>
      <EditResidentForm resident={{
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        gender: r.gender,
        status: r.status,
        dateOfBirth: r.dateOfBirth,
        homeId: r.homeId,
      }} />
    </div>
  );
}
