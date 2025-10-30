import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PrismaClient, UserRole } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorBillingPage({ searchParams }: { searchParams?: { operatorId?: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const isAdmin = user?.role === UserRole.ADMIN;
  const operatorOverrideId = isAdmin ? (searchParams?.operatorId || null) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;
  const effectiveOperatorId = operatorOverrideId || op?.id || null;

  const payments = await prisma.payment.findMany({
    where: effectiveOperatorId ? { booking: { home: { operatorId: effectiveOperatorId } } } : {},
    orderBy: { createdAt: 'desc' },
    take: 25,
    include: { booking: { include: { home: true, family: true } }, user: true },
  });
  const operators = isAdmin
    ? await prisma.operator.findMany({ orderBy: { companyName: 'asc' }, select: { id: true, companyName: true } })
    : [];
  const selected = effectiveOperatorId || "";
  const selectedName = selected
    ? operators.find((o) => o.id === selected)?.companyName || 'Unknown Operator'
    : 'All Operators';

  return (
    <DashboardLayout title="Billing" showSearch={false}>
      <div className="p-4 sm:p-6 space-y-6">
        {isAdmin && (
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="text-sm text-neutral-500">Viewing scope</div>
                <div className="text-lg font-medium">{selectedName}</div>
              </div>
              <form method="GET" className="flex items-center gap-2">
                <label className="text-sm text-neutral-600" htmlFor="operatorId">Operator</label>
                <select id="operatorId" name="operatorId" defaultValue={selected} className="form-select">
                  <option value="">All Operators</option>
                  {operators.map((o) => (
                    <option key={o.id} value={o.id}>{o.companyName}</option>
                  ))}
                </select>
                <button className="btn btn-secondary" type="submit">Apply</button>
              </form>
            </div>
          </div>
        )}
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
