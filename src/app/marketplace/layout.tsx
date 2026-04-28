import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default async function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/marketplace");
  }

  return <DashboardLayout title="Marketplace">{children}</DashboardLayout>;
}
