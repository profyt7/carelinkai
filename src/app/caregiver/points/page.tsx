import DashboardLayout from '@/components/layout/DashboardLayout';
import PointsDashboard from '@/components/caregiver/PointsDashboard';

export const metadata = { title: 'My Points — CareLinkAI' };

export default function CaregiverPointsPage() {
  return (
    <DashboardLayout title="My Points">
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">My Points & Rewards</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Earn points for reliability, great reviews, and consistent work.
          </p>
        </div>
        <PointsDashboard />
      </div>
    </DashboardLayout>
  );
}
