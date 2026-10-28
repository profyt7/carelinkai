"use client";
import { useParams } from 'next/navigation';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { CompliancePanel } from '@/components/operator/residents/CompliancePanel';

export default function ResidentComplianceOnly() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <div className="p-4 sm:p-6">
      <Breadcrumbs items={[
        { label: 'Operator', href: '/operator' },
        { label: 'Residents', href: '/operator/residents' },
        { label: 'Compliance' }
      ]} />
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 text-neutral-800">Compliance (Test View)</h1>
      {id && <CompliancePanel residentId={id} />}
    </div>
  );
}
