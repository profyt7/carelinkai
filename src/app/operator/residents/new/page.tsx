import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NewResidentForm } from '@/components/operator/residents/NewResidentForm';

export default function NewResidentPage() {
  if (process.env['NEXT_PUBLIC_RESIDENTS_ENABLED'] === 'false') return notFound();
  return (
    <div className="p-4 sm:p-6">
      <Link href="/operator/residents" className="text-sm text-neutral-600 hover:underline">Back</Link>
      <h1 className="text-xl sm:text-2xl font-semibold mt-2 text-neutral-800">New Resident</h1>
      <NewResidentForm />
    </div>
  );
}
