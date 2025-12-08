import DashboardLayout from '@/components/layout/DashboardLayout';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import NewEmploymentForm from '@/components/operator/NewEmploymentForm';

export default function NewCaregiverEmploymentPage() {
  return (
    <DashboardLayout title="New Caregiver Employment" showSearch={false}>
      <div className="p-6 max-w-2xl">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Caregivers', href: '/operator/caregivers' },
          { label: 'New Employment' }
        ]} />
        <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Add Caregiver by Email</h2>
          <NewEmploymentForm />
        </div>
      </div>
    </DashboardLayout>
  );
}
