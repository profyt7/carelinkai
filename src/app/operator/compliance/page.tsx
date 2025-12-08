import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import ComplianceQuickActions from "@/components/operator/ComplianceQuickActions";
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

  const [licenses, inspections, operators, homes] = await Promise.all([
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
    prisma.assistedLivingHome.findMany({ where: homeFilter, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
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
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Compliance' }
        ]} />
        {/* Quick create forms for licenses and inspections with Home selection */}
        <ComplianceQuickActions homes={homes} />
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
          <div className="divide-y">
            {licenses.filter(l => new Date(l.expirationDate) <= soon).map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{l.home.name} · {l.type}</div>
                  <div className="text-sm text-neutral-500 truncate">License #{l.licenseNumber}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a className="btn btn-secondary btn-sm" href={`/api/operator/homes/${l.homeId}/licenses/${l.id}/download`}>Download</a>
                  <form action={`/api/operator/homes/${l.homeId}/licenses/${l.id}`} method="post">
                    <button className="btn btn-danger btn-sm" type="submit">Delete</button>
                  </form>
                  <div className={`text-sm ${new Date(l.expirationDate) < today ? 'text-red-600' : 'text-amber-600'}`}>
                    {new Date(l.expirationDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {licenses.filter(l => new Date(l.expirationDate) <= soon).length === 0 && (
              <div className="py-3 text-neutral-600">No upcoming expirations.</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="font-medium mb-3">Recent Inspections</div>
          <div className="divide-y">
            {inspections.map((i) => (
              <div key={i.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{i.home.name} · {i.inspectionType}</div>
                  <div className="text-sm text-neutral-500 truncate">By {i.inspector}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {i.documentUrl ? (
                    <a className="btn btn-secondary btn-sm" href={`/api/operator/homes/${i.homeId}/inspections/${i.id}/download`}>Download</a>
                  ) : null}
                  <form action={`/api/operator/homes/${i.homeId}/inspections/${i.id}`} method="post">
                    <button className="btn btn-danger btn-sm" type="submit">Delete</button>
                  </form>
                  <div className="text-sm text-neutral-700">
                    {new Date(i.inspectionDate).toLocaleDateString()} · {i.result}
                  </div>
                </div>
              </div>
            ))}
            {inspections.length === 0 && (
              <div className="py-3 text-neutral-600">No inspections on record.</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
