'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Calendar, Trash2, Edit2, Plus, ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ScheduledReportsPage() {
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledReports();
  }, []);

  const fetchScheduledReports = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reports/scheduled?limit=50');
      if (response?.ok) {
        const data = await response?.json();
        setScheduledReports(data?.scheduledReports || []);
      }
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
      toast.error('Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/reports/scheduled/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });

      if (response?.ok) {
        toast.success(
          `Report ${!currentEnabled ? 'enabled' : 'disabled'} successfully`
        );
        fetchScheduledReports();
      } else {
        throw new Error('Failed to update report');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update report');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;

    try {
      const response = await fetch(`/api/reports/scheduled/${id}`, {
        method: 'DELETE',
      });

      if (response?.ok) {
        toast.success('Scheduled report deleted successfully');
        fetchScheduledReports();
      } else {
        throw new Error('Failed to delete report');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete report');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900">
                Scheduled Reports
              </h1>
              <p className="text-lg text-slate-600 mt-2">
                Manage automated report generation schedules
              </p>
            </div>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={() => toast.success('Feature coming soon!')}
            >
              <Plus className="mr-2 h-5 w-5" />
              Schedule New Report
            </Button>
          </div>
        </div>

        {/* Scheduled Reports List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600">Loading scheduled reports...</p>
          </div>
        ) : scheduledReports?.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No scheduled reports
            </h3>
            <p className="text-slate-600 mb-4">
              Set up automated reports to receive regular insights
            </p>
            <Button onClick={() => toast.success('Feature coming soon!')}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Your First Report
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scheduledReports?.map?.((report) => (
              <Card
                key={report?.id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-slate-900">
                        {report?.title}
                      </h3>
                      <p className="text-sm text-slate-600 capitalize mt-1">
                        {report?.type?.replace?.(/_/g, ' ')?.toLowerCase?.()}
                      </p>
                    </div>
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        report?.enabled
                          ? 'bg-green-100'
                          : 'bg-slate-100'
                      }`}
                    >
                      <Calendar
                        className={`h-5 w-5 ${
                          report?.enabled
                            ? 'text-green-600'
                            : 'text-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <span className="capitalize">
                        {report?.schedule?.toLowerCase?.()} at {report?.time}
                      </span>
                    </div>
                    {report?.nextRun && (
                      <div className="text-slate-600">
                        <span className="font-medium">Next run:</span>{' '}
                        {format(new Date(report?.nextRun), 'MMM d, yyyy')}
                      </div>
                    )}
                    {report?.lastRun && (
                      <div className="text-slate-600">
                        <span className="font-medium">Last run:</span>{' '}
                        {format(new Date(report?.lastRun), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>

                  {/* Recipients */}
                  <div className="text-sm">
                    <span className="font-medium text-slate-700">Recipients:</span>
                    <div className="mt-1 space-y-1">
                      {report?.recipients?.slice?.(0, 2)?.map?.((email: string) => (
                        <div key={email} className="text-slate-600">
                          {email}
                        </div>
                      ))}
                      {report?.recipients?.length > 2 && (
                        <div className="text-slate-500">
                          +{report?.recipients?.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={report?.enabled}
                        onCheckedChange={() =>
                          handleToggle(report?.id, report?.enabled)
                        }
                      />
                      <span className="text-sm text-slate-600">
                        {report?.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toast.success('Edit feature coming soon!')}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(report?.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
