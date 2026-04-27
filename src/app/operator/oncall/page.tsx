export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import OnCallQueue from '@/components/operator/oncall/OnCallQueue';
import { planHasFeature } from '@/lib/subscription';

export default async function OnCallAIPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) redirect('/dashboard');

  // Gate: Professional+ only
  if (!planHasFeature(op.subscriptionPlan, 'PROFESSIONAL')) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl">
        <Breadcrumbs items={[{ label: 'Operator', href: '/operator' }, { label: 'On-Call AI' }]} />
        <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary-100 mb-4">
            <span className="text-2xl">⚡</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 mb-2">On-Call AI — Professional Feature</h2>
          <p className="text-neutral-600 mb-6 max-w-md mx-auto">
            Automatically text and call your caregivers to fill open shifts. First to reply YES gets the shift.
            Available on the <strong>Professional</strong> and <strong>Growth</strong> plans.
          </p>
          <Link
            href="/operator/billing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors"
          >
            Upgrade to Professional
          </Link>
          <p className="text-xs text-neutral-400 mt-4">Current plan: {op.subscriptionPlan ?? 'No plan'}</p>
        </div>
      </div>
    );
  }

  const homes = await prisma.assistedLivingHome.findMany({
    where: { operatorId: op.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  const openShifts = await prisma.caregiverShift.findMany({
    where: {
      home: { operatorId: op.id },
      status: 'OPEN',
      caregiverId: null,
      shiftNeed: null,
    },
    select: { id: true, homeId: true, startTime: true, endTime: true },
    orderBy: { startTime: 'asc' },
    take: 50,
  });

  const formattedShifts = openShifts.map((s) => ({
    id: s.id,
    homeId: s.homeId,
    label: `${s.startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${s.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – ${s.endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
  }));

  return (
    <div className="p-4 sm:p-6">
      <Breadcrumbs items={[{ label: 'Operator', href: '/operator' }, { label: 'On-Call AI' }]} />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-neutral-900">On-Call AI</h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Auto-outreach
          </span>
        </div>
        <p className="text-sm text-neutral-500">
          CareLinkAI automatically texts and calls your caregivers to fill open shifts.
          First caregiver to reply YES gets the shift — others are notified it's filled.
        </p>
      </div>

      <OnCallQueue homes={homes} openShifts={formattedShifts} />
    </div>
  );
}
