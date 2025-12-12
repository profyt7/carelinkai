'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  FileText,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  ClipboardCheck,
  Target,
  UserPlus,
  Building,
  Calendar,
  Download,
  Trash2,
  Eye,
  Clock,
  Plus,
} from 'lucide-react';
import { ReportGenerator } from '@/components/reports/ReportGenerator';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { format } from 'date-fns';

const REPORT_TEMPLATES = [
  {
    type: 'OCCUPANCY',
    title: 'Occupancy Report',
    description: 'Track resident counts, occupancy rates, and capacity trends',
    icon: TrendingUp,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    type: 'FINANCIAL',
    title: 'Financial Report',
    description: 'Revenue, expenses, and per-resident cost analysis',
    icon: DollarSign,
    color: 'from-green-500 to-emerald-500',
  },
  {
    type: 'INCIDENT',
    title: 'Incident Report',
    description: 'All incidents by type, severity, and facility',
    icon: AlertTriangle,
    color: 'from-red-500 to-orange-500',
  },
  {
    type: 'CAREGIVER',
    title: 'Caregiver Report',
    description: 'Staff hours, certifications, and performance metrics',
    icon: Users,
    color: 'from-purple-500 to-pink-500',
  },
  {
    type: 'COMPLIANCE',
    title: 'Compliance Report',
    description: 'Assessments, certifications, and audit readiness',
    icon: ClipboardCheck,
    color: 'from-indigo-500 to-blue-500',
  },
  {
    type: 'INQUIRY',
    title: 'Inquiry Report',
    description: 'Pipeline, conversion rates, sources, and tours',
    icon: Target,
    color: 'from-amber-500 to-yellow-500',
  },
  {
    type: 'RESIDENT',
    title: 'Resident Report',
    description: 'Demographics, care levels, and length of stay',
    icon: UserPlus,
    color: 'from-teal-500 to-green-500',
  },
  {
    type: 'FACILITY_COMPARISON',
    title: 'Facility Comparison',
    description: 'Multi-facility metrics and performance comparison',
    icon: Building,
    color: 'from-violet-500 to-purple-500',
  },
];

export default function ReportsPage() {
  const [showGenerator, setShowGenerator] = useState(false);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentReports();
    fetchScheduledReports();
  }, []);

  const fetchRecentReports = async () => {
    try {
      const response = await fetch('/api/reports?limit=5&sortBy=createdAt&sortOrder=desc');
      if (response?.ok) {
        const data = await response?.json();
        setRecentReports(data?.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledReports = async () => {
    try {
      const response = await fetch('/api/reports/scheduled?limit=5&enabled=true');
      if (response?.ok) {
        const data = await response?.json();
        setScheduledReports(data?.scheduledReports || []);
      }
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (response?.ok) {
        toast.success('Report deleted successfully');
        fetchRecentReports();
      } else {
        throw new Error('Failed to delete report');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete report');
    }
  };

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">
            Reports & Analytics
          </h1>
          <p className="text-lg text-slate-600">
            Generate comprehensive reports and track key performance metrics
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            size="lg"
            className="h-auto py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={() => setShowGenerator(true)}
          >
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-6 w-6" />
              <span className="text-sm font-medium">Generate Report</span>
            </div>
          </Button>

          <Link href="/reports/history">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-auto py-6 border-2"
            >
              <div className="flex flex-col items-center gap-2">
                <Clock className="h-6 w-6" />
                <span className="text-sm font-medium">Report History</span>
              </div>
            </Button>
          </Link>

          <Link href="/reports/scheduled">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-auto py-6 border-2"
            >
              <div className="flex flex-col items-center gap-2">
                <Calendar className="h-6 w-6" />
                <span className="text-sm font-medium">Scheduled Reports</span>
              </div>
            </Button>
          </Link>

          <Link href="/reports/scheduled">
            <Button
              size="lg"
              variant="outline"
              className="w-full h-auto py-6 border-2"
            >
              <div className="flex flex-col items-center gap-2">
                <Plus className="h-6 w-6" />
                <span className="text-sm font-medium">Schedule Report</span>
              </div>
            </Button>
          </Link>
        </div>

        {/* Report Templates */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Report Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {REPORT_TEMPLATES?.map?.((template) => {
              const Icon = template?.icon;
              return (
                <Card
                  key={template?.type}
                  className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-400"
                  onClick={() => setShowGenerator(true)}
                >
                  <div className="p-6 space-y-4">
                    {/* Icon with gradient */}
                    <div
                      className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template?.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                        {template?.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {template?.description}
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={(e) => {
                          e?.stopPropagation();
                          setShowGenerator(true);
                        }}
                      >
                        Generate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={(e) => {
                          e?.stopPropagation();
                          toast.success('Preview coming soon!');
                        }}
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Recent Reports</h2>
            <Link href="/reports/history">
              <Button variant="ghost">View All</Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-slate-600">Loading reports...</p>
            </div>
          ) : recentReports?.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No reports yet
              </h3>
              <p className="text-slate-600 mb-4">
                Generate your first report to get started
              </p>
              <Button onClick={() => setShowGenerator(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentReports?.map?.((report) => (
                <Card key={report?.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">
                          {report?.title}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <span className="capitalize">{report?.type?.replace?.(/_/g, ' ')?.toLowerCase?.()}</span>
                          <span>•</span>
                          <span>{report?.user ? `${report?.user?.firstName ?? ''} ${report?.user?.lastName ?? ''}` : 'Unknown'}</span>
                          <span>•</span>
                          <span>
                            {report?.createdAt
                              ? format(new Date(report?.createdAt), 'MMM d, yyyy')
                              : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(report?.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Reports */}
        {scheduledReports?.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                Scheduled Reports
              </h2>
              <Link href="/reports/scheduled">
                <Button variant="ghost">View All</Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scheduledReports?.map?.((report) => (
                <Card key={report?.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {report?.title}
                        </h4>
                        <p className="text-sm text-slate-600 capitalize">
                          {report?.schedule?.toLowerCase?.()} at {report?.time}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="font-medium">Next run:</span>{' '}
                      {report?.nextRun
                        ? format(new Date(report?.nextRun), 'MMM d, yyyy')
                        : 'Not scheduled'}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      {/* Report Generator Modal */}
      <ReportGenerator
        open={showGenerator}
        onClose={() => setShowGenerator(false)}
        onSuccess={() => {
          fetchRecentReports();
        }}
      />
    </div>
  );
}
