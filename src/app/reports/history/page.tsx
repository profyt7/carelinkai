'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Download, Trash2, Eye, Search, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ReportHistoryPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReports();
  }, [search, typeFilter, formatFilter, page]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page?.toString?.() ?? '1',
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc',
        ...(search ? { search } : {}),
        ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
        ...(formatFilter !== 'all' ? { format: formatFilter } : {}),
      });

      const response = await fetch(`/api/reports?${params}`);
      if (response?.ok) {
        const data = await response?.json();
        setReports(data?.reports || []);
        setTotalPages(data?.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      if (response?.ok) {
        toast.success('Report deleted successfully');
        fetchReports();
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
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Report History</h1>
            <p className="text-lg text-slate-600 mt-2">
              View and manage all generated reports
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e?.target?.value ?? '');
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Report Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="OCCUPANCY">Occupancy</SelectItem>
                <SelectItem value="FINANCIAL">Financial</SelectItem>
                <SelectItem value="INCIDENT">Incident</SelectItem>
                <SelectItem value="CAREGIVER">Caregiver</SelectItem>
                <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                <SelectItem value="INQUIRY">Inquiry</SelectItem>
                <SelectItem value="RESIDENT">Resident</SelectItem>
                <SelectItem value="FACILITY_COMPARISON">Facility Comparison</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={formatFilter}
              onValueChange={(value) => {
                setFormatFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Formats</SelectItem>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="EXCEL">Excel</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Reports List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-slate-600">Loading reports...</p>
          </div>
        ) : reports?.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No reports found
            </h3>
            <p className="text-slate-600 mb-4">
              Try adjusting your filters or generate a new report
            </p>
            <Link href="/reports">
              <Button>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {reports?.map?.((report) => (
                <Card key={report?.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-slate-900">
                          {report?.title}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-slate-600 mt-1">
                          <span className="capitalize bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            {report?.type?.replace?.(/_/g, ' ')?.toLowerCase?.()}
                          </span>
                          <span className="capitalize bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {report?.format}
                          </span>
                          <span>•</span>
                          <span>
                            {report?.user
                              ? `${report?.user?.firstName ?? ''} ${report?.user?.lastName ?? ''}`
                              : 'Unknown'}
                          </span>
                          <span>•</span>
                          <span>
                            {report?.createdAt
                              ? format(new Date(report?.createdAt), 'MMM d, yyyy h:mm a')
                              : 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" title="View Details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" title="Download">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(report?.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        onClick={() => setPage(pageNum)}
                        size="sm"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
