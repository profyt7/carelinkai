import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subDays, format } from 'date-fns';
import type { UserRole, AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function ResidentsAnalyticsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as UserRole | undefined;
  if (!session?.user || role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const since = subDays(new Date(), 30);

  const [admissions, discharges, activeCount, exportCsv, exportPdf] = await Promise.all([
    prisma.resident.findMany({ where: { admissionDate: { gte: since } }, select: { admissionDate: true } }),
    prisma.resident.findMany({ where: { dischargeDate: { gte: since } }, select: { dischargeDate: true } }),
    prisma.resident.count({ where: { status: 'ACTIVE' as any } }),
    prisma.auditLog.count({ where: { action: 'EXPORT' as AuditAction, resourceType: 'Resident', createdAt: { gte: since }, metadata: { path: ['exportFormat'], equals: 'csv' } as any } as any }),
    prisma.auditLog.count({ where: { action: 'EXPORT' as AuditAction, resourceType: 'Resident', createdAt: { gte: since }, metadata: { path: ['exportFormat'], equals: 'pdf' } as any } as any }),
  ]);

  function bucketDaily<T extends Date | null | undefined>(dates: T[], accessor: (t: T) => Date | null | undefined) {
    const map = new Map<string, number>();
    for (const d of dates) {
      const dt = accessor(d);
      if (!dt) continue;
      const key = format(dt, 'yyyy-MM-dd');
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    // Build last 30 days series
    const out: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const key = format(d, 'yyyy-MM-dd');
      out.push({ date: key, count: map.get(key) ?? 0 });
    }
    return out;
  }

  const admissionTrend = bucketDaily(admissions.map(a => a.admissionDate), (d) => d || null);
  const dischargeTrend = bucketDaily(discharges.map(a => a.dischargeDate), (d) => d || null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-neutral-800">Residents Analytics</h1>
      <p className="text-neutral-600 mb-4">Last 30 days overview</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-neutral-500">Admissions</div>
          <div className="text-2xl font-semibold">{admissions.length}</div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-neutral-500">Discharges</div>
          <div className="text-2xl font-semibold">{discharges.length}</div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-neutral-500">Current Active</div>
          <div className="text-2xl font-semibold">{activeCount}</div>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <div className="text-sm text-neutral-500">Exports (CSV/PDF)</div>
          <div className="text-2xl font-semibold">{exportCsv}/{exportPdf}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="rounded-lg border p-4 bg-white">
          <h2 className="font-medium mb-2">Admission Trend</h2>
          <ul className="text-sm max-h-72 overflow-auto">
            {admissionTrend.map((d) => (
              <li key={d.date} className="flex justify-between py-0.5"><span>{d.date}</span><span>{d.count}</span></li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border p-4 bg-white">
          <h2 className="font-medium mb-2">Discharge Trend</h2>
          <ul className="text-sm max-h-72 overflow-auto">
            {dischargeTrend.map((d) => (
              <li key={d.date} className="flex justify-between py-0.5"><span>{d.date}</span><span>{d.count}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
