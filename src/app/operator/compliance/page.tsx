import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PrismaClient, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorCompliancePage({ searchParams }: { searchParams?: { operatorId?: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const isAdmin = user?.role === UserRole.ADMIN;
  const operatorOverrideId = isAdmin ? (searchParams?.operatorId || null) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;
  const effectiveOperatorId = operatorOverrideId || op?.id || null;

  const homeFilter = effectiveOperatorId ? { operatorId: effectiveOperatorId } : {};

  const [licenses, inspections, operators] = await Promise.all([
    prisma.license.findMany({
      where: { home: homeFilter },
      orderBy: { expirationDate: 'asc' },
      take: 20,
      include: { home: { select: { name: true } } },
    }),
    prisma.inspection.findMany({
      where: { home: homeFilter },
      orderBy: { inspectionDate: 'desc' },
      take: 20,
      include: { home: { select: { name: true } } },
    }),
    isAdmin ? prisma.operator.findMany({ orderBy: { companyName: 'asc' }, select: { id: true, companyName: true } }) : Promise.resolve([] as any[]),
  ]);

  const today = new Date();
  const soon = new Date();
  soon.setMonth(soon.getMonth() + 2);

  const selected = effectiveOperatorId || "";
  const selectedName = selected
    ? operators.find((o: any) => o.id === selected)?.companyName || 'Unknown Operator'
    : 'All Operators';

  return (
    <DashboardLayout title="Compliance" showSearch={false}>
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
                  {operators.map((o: any) => (
                    <option key={o.id} value={o.id}>{o.companyName}</option>
                  ))}
                </select>
                <button className="btn btn-secondary" type="submit">Apply</button>
              </form>
            </div>
          </div>
        )}
        <div className="card">
          <div className="font-medium mb-3">Licenses (expiring soon)</div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Home</th>
                  <th>Type</th>
                  <th>Number</th>
                  <th>Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {licenses.filter(l => new Date(l.expirationDate) <= soon).map((l) => (
                  <tr key={l.id}>
                    <td>{l.home.name}</td>
                    <td>{l.type}</td>
                    <td>{l.licenseNumber}</td>
                    <td className={new Date(l.expirationDate) < today ? 'text-red-600' : 'text-amber-600'}>{new Date(l.expirationDate).toLocaleDateString()}</td>
                    <td>{l.status}</td>
                  </tr>
                ))}
                {licenses.filter(l => new Date(l.expirationDate) <= soon).length === 0 && (
                  <tr><td className="table-empty" colSpan={5}>No upcoming expirations.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="font-medium mb-3">Recent Inspections</div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Home</th>
                  <th>Type</th>
                  <th>Inspector</th>
                  <th>Date</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((i) => (
                  <tr key={i.id}>
                    <td>{i.home.name}</td>
                    <td>{i.inspectionType}</td>
                    <td>{i.inspector}</td>
                    <td>{new Date(i.inspectionDate).toLocaleDateString()}</td>
                    <td>{i.result}</td>
                  </tr>
                ))}
                {inspections.length === 0 && (
                  <tr><td className="table-empty" colSpan={5}>No inspections on record.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
