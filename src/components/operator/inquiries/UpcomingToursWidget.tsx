'use client';

import { FiCalendar, FiClock, FiUser, FiMapPin } from 'react-icons/fi';
import { format, differenceInHours, isPast } from 'date-fns';
import Link from 'next/link';

interface UpcomingTour {
  id: string;
  tourDate: Date | string;
  family: {
    user: {
      firstName: string;
      lastName: string;
    };
  };
  home: {
    name: string;
  };
  status: string;
}

interface UpcomingToursWidgetProps {
  tours: UpcomingTour[];
}

export function UpcomingToursWidget({ tours }: UpcomingToursWidgetProps) {
  const sortedTours = [...tours].sort((a, b) => {
    const dateA = new Date(a.tourDate).getTime();
    const dateB = new Date(b.tourDate).getTime();
    return dateA - dateB;
  });

  const getUrgencyColor = (tourDate: Date | string) => {
    const date = new Date(tourDate);
    const now = new Date();
    const hoursUntil = differenceInHours(date, now);

    if (isPast(date)) return 'bg-error-50 border-error-200 text-error-800';
    if (hoursUntil < 24) return 'bg-warning-50 border-warning-200 text-warning-800';
    if (hoursUntil < 72) return 'bg-warning-50 border-warning-200 text-warning-800';
    return 'bg-primary-50 border-primary-200 text-primary-800';
  };

  const getUrgencyLabel = (tourDate: Date | string) => {
    const date = new Date(tourDate);
    const now = new Date();
    const hoursUntil = differenceInHours(date, now);

    if (isPast(date)) return 'Overdue';
    if (hoursUntil < 24) return 'Today';
    if (hoursUntil < 48) return 'Tomorrow';
    if (hoursUntil < 72) return 'This week';
    return 'Upcoming';
  };

  if (sortedTours.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border border-neutral-200">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FiCalendar className="w-5 h-5" />
          Upcoming Tours
        </h3>
        <div className="text-center py-8 text-neutral-500">
          <FiCalendar className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
          <p>No tours scheduled</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-neutral-200">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FiCalendar className="w-5 h-5" />
        Upcoming Tours
        <span className="ml-auto text-sm font-normal text-neutral-500">
          {sortedTours.length} scheduled
        </span>
      </h3>

      <div className="space-y-3">
        {sortedTours.slice(0, 5).map((tour) => (
          <Link
            key={tour.id}
            href={`/operator/inquiries/${tour.id}`}
            className="block p-3 border rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FiUser className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <span className="font-medium truncate">
                    {tour.family.user.firstName} {tour.family.user.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-600 mb-1">
                  <FiMapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{tour.home.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <FiClock className="w-4 h-4 flex-shrink-0" />
                  <span>{format(new Date(tour.tourDate), 'MMM d, yyyy • h:mm a')}</span>
                </div>
              </div>
              <div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getUrgencyColor(
                    tour.tourDate
                  )}`}
                >
                  {getUrgencyLabel(tour.tourDate)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {sortedTours.length > 5 && (
        <div className="mt-4 text-center">
          <Link
            href="/operator/inquiries?filter=tours"
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            View all {sortedTours.length} tours →
          </Link>
        </div>
      )}
    </div>
  );
}
