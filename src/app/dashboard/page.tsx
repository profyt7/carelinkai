import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isOperatorAcceptanceCurrent } from "@/lib/legal";
import { prisma } from "@/lib/prisma";
import { OperatorDashboardContent } from "@/components/dashboard/OperatorDashboardContent";
import { FamilyDashboardContent } from "@/components/dashboard/FamilyDashboardContent";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  switch (session.user.role) {
    case 'ADMIN':
      return <OperatorDashboardContent />;

    case 'OPERATOR': {
      // Enforce BAA/DPA gate before showing any data — same check as AcceptanceGate
      // in the /operator/* layout, extended here so /dashboard is also covered.
      const operator = await prisma.operator.findUnique({
        where: { userId: session.user.id as string },
        select: { id: true },
      });
      if (operator) {
        const accepted = await isOperatorAcceptanceCurrent(operator.id);
        if (!accepted) {
          redirect('/operator/acceptance');
        }
      }
      return <OperatorDashboardContent />;
    }

    case 'CAREGIVER':
      redirect('/caregiver');

    case 'DISCHARGE_PLANNER':
      redirect('/discharge-planner');

    case 'PROVIDER':
      redirect('/provider');

    case 'FAMILY':
      return <FamilyDashboardContent />;

    default:
      return <FamilyDashboardContent />;
  }
}

