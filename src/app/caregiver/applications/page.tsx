import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import {
  FiMapPin,
  FiBriefcase,
  FiClock,
  FiDollarSign,
  FiCheckCircle,
} from 'react-icons/fi';

export const dynamic = 'force-dynamic';

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  APPLIED: { label: 'Applied', className: 'bg-primary-100 text-primary-800' },
  INVITED: { label: 'Invited', className: 'bg-secondary-100 text-secondary-800' },
  INTERVIEWING: { label: 'Interviewing', className: 'bg-indigo-100 text-indigo-800' },
  OFFERED: { label: 'Offered', className: 'bg-warning-100 text-warning-800' },
  HIRED: { label: 'Hired', className: 'bg-success-100 text-success-800' },
  REJECTED: { label: 'Not Selected', className: 'bg-error-100 text-error-800' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-neutral-100 text-neutral-800' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-neutral-100 text-neutral-800' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function formatRate(min: any, max: any) {
  if (!min && !max) return null;
  const fmt = (v: any) => `$${Number(v).toFixed(0)}`;
  if (min && max) return `${fmt(min)}–${fmt(max)}/hr`;
  if (min) return `${fmt(min)}+/hr`;
  return `Up to ${fmt(max)}/hr`;
}

export default async function MyApplicationsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/auth/login');
  }

  const caregiver = await prisma.caregiver.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!caregiver) {
    redirect('/caregiver');
  }

  const applications = await (prisma as any).marketplaceApplication.findMany({
    where: { caregiverId: caregiver.id },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          city: true,
          state: true,
          setting: true,
          hourlyRateMin: true,
          hourlyRateMax: true,
          status: true,
        },
      },
      hire: {
        select: { id: true },
      },
    },
  });

  const activeCount = applications.filter(
    (a: any) => !['REJECTED', 'WITHDRAWN'].includes(a.status)
  ).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-1">My Applications</h1>
        <p className="text-neutral-500">
          {applications.length === 0
            ? 'No applications yet'
            : `${activeCount} active · ${applications.length} total`}
        </p>
      </div>

      {/* Empty state */}
      {applications.length === 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-10 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No applications yet</h3>
          <p className="text-neutral-600 mb-6">
            Browse open job listings and apply to positions that match your skills.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
          >
            Browse Jobs
          </Link>
        </div>
      )}

      {/* Application list */}
      {applications.length > 0 && (
        <div className="space-y-4">
          {applications.map((app: any) => {
            const rate = formatRate(app.listing.hourlyRateMin, app.listing.hourlyRateMax);
            const appliedAgo = formatDistance(new Date(app.createdAt), new Date(), { addSuffix: true });
            const listingClosed = app.listing.status !== 'OPEN';

            return (
              <div
                key={app.id}
                className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <StatusBadge status={app.status} />
                      {app.hire && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-50 text-success-700 border border-success-200">
                          <FiCheckCircle className="h-3 w-3" />
                          Hire recorded
                        </span>
                      )}
                      {listingClosed && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500">
                          Listing closed
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-neutral-900 truncate">
                      {app.listing.title}
                    </h3>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
                      {(app.listing.city || app.listing.state) && (
                        <span className="flex items-center gap-1">
                          <FiMapPin className="h-3.5 w-3.5 flex-shrink-0" />
                          {[app.listing.city, app.listing.state].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {app.listing.setting && (
                        <span className="flex items-center gap-1">
                          <FiBriefcase className="h-3.5 w-3.5 flex-shrink-0" />
                          {app.listing.setting}
                        </span>
                      )}
                      {rate && (
                        <span className="flex items-center gap-1">
                          <FiDollarSign className="h-3.5 w-3.5 flex-shrink-0" />
                          {rate}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FiClock className="h-3.5 w-3.5 flex-shrink-0" />
                        Applied {appliedAgo}
                      </span>
                    </div>

                    {app.note && (
                      <p className="mt-2 text-sm text-neutral-600 line-clamp-2 italic">
                        "{app.note}"
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <div className="flex-shrink-0">
                    <Link
                      href={`/marketplace/listings/${app.listing.id}`}
                      className="inline-flex items-center px-3.5 py-2 text-sm font-medium text-primary-700 border border-primary-200 bg-primary-50 rounded-lg hover:bg-primary-100 hover:border-primary-300 transition-colors"
                    >
                      View Listing
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Browse more */}
      {applications.length > 0 && (
        <div className="mt-8 text-center">
          <Link
            href="/marketplace"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            Browse more job listings →
          </Link>
        </div>
      )}
    </div>
  );
}
