import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PrismaClient, UserRole } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorBillingPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;

  const payments = await prisma.payment.findMany({
    where: op ? { booking: { home: { operatorId: op.id } } } : {},
    orderBy: { createdAt: 'desc' },
    take: 25,
    include: { booking: { include: { home: true, family: true } }, user: true },
  });

  return (
    <DashboardLayout title="Billing" showSearch={false}>
      <div className="p-4 sm:p-6">
        <div className="card">
          <div className="font-medium mb-3">Recent Payments</div>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Home</th>
                  <th>Family</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>{p.booking?.home?.name || '-'}</td>
                    <td>{p.booking?.familyId ? 'Family' : '-'}</td>
                    <td>{p.type}</td>
                    <td>{formatCurrency(Number(p.amount))}</td>
                    <td>{p.status}</td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-neutral-600 py-6">No payments yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
