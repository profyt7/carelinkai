import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import FamilyDashboard from "./FamilyDashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Redirect to role-specific dashboards
  switch (session.user.role) {
    case 'OPERATOR':
      redirect('/operator');
    case 'CAREGIVER':
      redirect('/caregiver');
    case 'PROVIDER':
      redirect('/provider');
    case 'ADMIN':
      redirect('/admin');
    case 'FAMILY':
    default:
      return <FamilyDashboard />;
  }
}
