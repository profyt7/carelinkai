'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Info, AlertCircle, X, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type Alert = {
  id: string;
  type: 'license' | 'inspection' | 'occupancy' | 'inquiry' | 'staff' | 'incident';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  createdAt: Date;
};

type AlertsSummary = {
  total: number;
  critical: number;
  warning: number;
  info: number;
};

type HomeAlertsProps = {
  homeId: string;
  maxAlerts?: number;
};

export default function HomeAlerts({ homeId, maxAlerts = 5 }: HomeAlertsProps) {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary>({ total: 0, critical: 0, warning: 0, info: 0 });
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/operator/homes/${homeId}/alerts`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch alerts');
        }
        
        const data = await res.json();
        setAlerts(data.alerts ?? []);
        setSummary(data.summary ?? { total: 0, critical: 0, warning: 0, info: 0 });
      } catch (error) {
        console.error('Failed to load alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (homeId) {
      fetchAlerts();
    }
  }, [homeId]);

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const visibleAlerts = alerts
    .filter(alert => !dismissedAlerts.has(alert.id))
    .slice(0, showAll ? undefined : maxAlerts);

  const hasMoreAlerts = alerts.length > maxAlerts && !showAll;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-500" />
          <span className="text-sm text-neutral-600">Loading alerts...</span>
        </div>
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-neutral-200 p-6">
        <div className="flex items-center gap-2 text-green-700">
          <Info className="h-5 w-5" />
          <span className="font-medium">No alerts</span>
        </div>
        <p className="text-sm text-neutral-600 mt-1">
          All systems are operating normally
        </p>
      </div>
    );
  }

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityStyles = (severity: Alert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-neutral-700" />
          <h3 className="text-lg font-semibold text-neutral-900">Alerts & Notifications</h3>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {summary.critical > 0 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md font-medium">
              {summary.critical} Critical
            </span>
          )}
          {summary.warning > 0 && (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-md font-medium">
              {summary.warning} Warning
            </span>
          )}
          {summary.info > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md font-medium">
              {summary.info} Info
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {visibleAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border p-4 ${getSeverityStyles(alert.severity)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                <div className="flex-1">
                  <h4 className="font-medium text-neutral-900">{alert.title}</h4>
                  <p className="text-sm text-neutral-700 mt-1">{alert.message}</p>
                  {alert.actionLabel && alert.actionUrl && (
                    <Link
                      href={alert.actionUrl}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 mt-2"
                    >
                      {alert.actionLabel}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDismiss(alert.id)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasMoreAlerts && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-4 w-full py-2 text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200 rounded-md hover:bg-primary-50 transition-colors"
        >
          Show {alerts.length - maxAlerts} more alerts
        </button>
      )}
    </div>
  );
}
