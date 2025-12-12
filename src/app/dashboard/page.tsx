import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OperatorDashboardContent } from "@/components/dashboard/OperatorDashboardContent";
import { FamilyDashboardContent } from "@/components/dashboard/FamilyDashboardContent";
import { CaregiverDashboardContent } from "@/components/dashboard/CaregiverDashboardContent";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Show role-specific dashboard content
  switch (session.user.role) {
    case 'ADMIN':
    case 'OPERATOR':
      return <OperatorDashboardContent />;
    case 'CAREGIVER':
    case 'AIDE':
      return <CaregiverDashboardContent />;
    case 'FAMILY':
      return <FamilyDashboardContent />;
    default:
      return <FamilyDashboardContent />;
  }
}
