import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PrismaClient, UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { MOCK_HOMES } from "@/lib/mock/homes";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorHomesPage({ searchParams }: { searchParams?: { operatorId?: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;
  const operatorOverrideId = user?.role === UserRole.ADMIN ? (searchParams?.operatorId || null) : null;

  // Runtime mock toggle via cookie (set by /api/mock-mode or ?mock=1)
  const mockCookie = cookies().get("carelink_mock_mode")?.value?.toString().trim().toLowerCase() || "";
  const showMock = ["1","true","yes","on"].includes(mockCookie);

  const homes = showMock
    ? null
    : await prisma.assistedLivingHome.findMany({
        where: operatorOverrideId ? { operatorId: operatorOverrideId } : (op ? { operatorId: op.id } : {}),
        include: { address: true },
        orderBy: { createdAt: 'desc' },
      });

  return (
    <DashboardLayout title="Homes" showSearch={false}>
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Your Homes</h2>
          {!showMock && (
            <Link href={`/operator/homes/new${operatorOverrideId ? `?operatorId=${operatorOverrideId}` : ''}`} className="btn btn-primary">Add Home</Link>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {showMock ? (
            <>
              {MOCK_HOMES.map((h) => (
                <div key={h.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{h.name}</div>
                      <div className="text-sm text-neutral-500">
                        {h.address?.city}, {h.address?.state} · {h.careLevel.join(', ')}
                      </div>
                    </div>
                    <span className="text-sm text-neutral-600">{h.availability} open</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>From {h.priceRange.formattedMin}/mo</span>
                    <Link href={`/homes/${h.id}`} className="text-primary-600 hover:underline">View</Link>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              {homes!.map((h) => (
                <div key={h.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{h.name}</div>
                      <div className="text-sm text-neutral-500">
                        {h.address?.city}, {h.address?.state} · {h.careLevel.join(', ')}
                      </div>
                    </div>
                    <span className="text-sm text-neutral-600">{h.capacity - h.currentOccupancy} open</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>Status: {h.status}</span>
                    <Link href={`/operator/homes/${h.id}`} className="text-primary-600 hover:underline">Manage</Link>
                  </div>
                </div>
              ))}
              {homes!.length === 0 && (
                <div className="card">
                  <div className="text-neutral-600">No homes yet. Click "Add Home" to create your first community.</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
