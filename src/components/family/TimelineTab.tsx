'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FiFileText, FiEdit2, FiMessageSquare, FiImage, FiUsers, FiUserPlus, FiUserCheck, FiFolder } from 'react-icons/fi';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

type Activity = {
  id: string;
  description: string;
  type: string;
  resourceType?: string;
  createdAt: string;
  actor?: {
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: { thumbnail?: string } | null;
  };
};

type ActivityFilter = 'ALL' | 'DOCUMENTS' | 'NOTES' | 'MEDIA' | 'MEMBERS';

interface TimelineTabProps {
  familyId: string | null;
  showMock?: boolean;
}

export default function TimelineTab({ familyId, showMock = false }: TimelineTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('ALL');

  const isTypeInFilter = useCallback((t: string, f: ActivityFilter) => {
    if (f === 'ALL') return true;
    const docTypes = [
      'DOCUMENT_UPLOADED',
      'DOCUMENT_UPDATED',
      'DOCUMENT_DELETED',
      'DOCUMENT_COMMENTED',
    ];
    const noteTypes = ['NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED', 'NOTE_COMMENTED'];
    const mediaTypes = ['GALLERY_CREATED', 'GALLERY_UPDATED', 'PHOTO_UPLOADED'];
    const memberTypes = ['MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_ROLE_CHANGED'];
    const maps: Record<ActivityFilter, string[]> = {
      DOCUMENTS: docTypes,
      NOTES: noteTypes,
      MEDIA: mediaTypes,
      MEMBERS: memberTypes,
      ALL: [],
    };
    return maps[f].includes(t);
  }, []);

  const iconForType = (t: string) => {
    if (t.startsWith('DOCUMENT')) return <FiFileText />;
    if (t.startsWith('NOTE_') && !t.includes('COMMENT')) return <FiEdit2 />;
    if (t.endsWith('COMMENTED')) return <FiMessageSquare />;
    if (t.startsWith('GALLERY') || t === 'PHOTO_UPLOADED') return <FiImage />;
    if (t === 'MEMBER_INVITED') return <FiUserPlus />;
    if (t === 'MEMBER_JOINED') return <FiUserCheck />;
    if (t === 'MEMBER_ROLE_CHANGED') return <FiUsers />;
    return <FiFolder />;
  };

  const filteredActivities = useMemo(
    () => activities.filter((a) => isTypeInFilter(a.type, activityFilter)),
    [activities, activityFilter, isTypeInFilter]
  );

  const groupActivitiesByDate = (activities: Activity[]) => {
    const groups: Record<string, Activity[]> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.createdAt)
        .toISOString()
        .split('T')[0] as string;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  };

  useEffect(() => {
    if (showMock) {
      setLoading(true);
      const now = Date.now();
      const mockActs: Activity[] = [
        { id: 'act-1', description: 'Uploaded Care Plan', type: 'DOCUMENT_UPLOADED', createdAt: new Date(now - 2*3600_000).toISOString(), actor: { firstName: 'Ava', lastName: 'Johnson' } },
        { id: 'act-2', description: 'Added emergency contact', type: 'MEMBER_ROLE_CHANGED', createdAt: new Date(now - 4*3600_000).toISOString(), actor: { firstName: 'Noah', lastName: 'Williams' } },
        { id: 'act-3', description: 'Left a note on Medical Records', type: 'NOTE_CREATED', createdAt: new Date(now - 26*3600_000).toISOString(), actor: { firstName: 'Sophia', lastName: 'Martinez' } },
      ];
      setActivities(mockActs);
      setLoading(false);
      return;
    }
    
    if (!familyId) return;

    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/family/activity?familyId=${familyId}&limit=50`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error('Failed to load activity');
        const json = await res.json();
        setActivities(json.items ?? []);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message ?? 'Error loading activity');
        }
      } finally {
        setLoading(false);
      }
    };
    load();

    const es = new EventSource(
      `/api/sse?topics=${encodeURIComponent(`family:${familyId}`)}`
    );
    es.addEventListener('activity:created', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data?.activity) {
          setActivities((prev) => [data.activity, ...prev]);
        }
      } catch {
        /* ignore */
      }
    });

    return () => {
      controller.abort();
      es.close();
    };
  }, [familyId, showMock]);

  if (loading) {
    return <LoadingState type="list" count={5} />;
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-medium">Error loading activity</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (filteredActivities.length === 0 && activityFilter === 'ALL') {
    return (
      <EmptyState
        icon={FiFileText}
        title="No activity yet"
        description="Activity will appear here as you and your family interact with documents, notes, and other features."
      />
    );
  }

  return (
    <div>
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(['ALL', 'DOCUMENTS', 'NOTES', 'MEDIA', 'MEMBERS'] as ActivityFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setActivityFilter(filter)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activityFilter === filter
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            {filter.charAt(0) + filter.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Activity Timeline */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FiFileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No {activityFilter.toLowerCase()} activity found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupActivitiesByDate(filteredActivities).map(([date, items]) => (
            <div key={date}>
              <h3 className="mb-3 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                {new Date(date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <ul className="space-y-3">
                {items.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600">
                        {React.cloneElement(iconForType(a.type) as any, {
                          className: 'h-5 w-5',
                        })}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {a.description}
                        </div>
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600">
                            {`${a.actor?.firstName?.[0] ?? ''}${a.actor?.lastName?.[0] ?? ''}`}
                          </span>
                          <span>
                            {a.actor
                              ? `${a.actor.firstName ?? ''} ${a.actor.lastName ?? ''}`
                              : '—'}{' '}
                            • {new Date(a.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
