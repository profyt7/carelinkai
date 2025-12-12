'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText, Download, Clock, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { generatePDF, downloadPDF } from '@/lib/utils/pdf-generator';
import { generateExcel, downloadExcel } from '@/lib/utils/excel-generator';
import { generateCSV, downloadCSV } from '@/lib/utils/csv-generator';

interface ReportGeneratorProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const REPORT_TEMPLATES = [
  { value: 'OCCUPANCY', label: 'Occupancy Report', icon: '📈' },
  { value: 'FINANCIAL', label: 'Financial Report', icon: '💰' },
  { value: 'INCIDENT', label: 'Incident Report', icon: '⚠️' },
  { value: 'CAREGIVER', label: 'Caregiver Report', icon: '👨‍⚕️' },
  { value: 'COMPLIANCE', label: 'Compliance Report', icon: '📋' },
  { value: 'INQUIRY', label: 'Inquiry Report', icon: '🎯' },
  { value: 'RESIDENT', label: 'Resident Report', icon: '👥' },
  { value: 'FACILITY_COMPARISON', label: 'Facility Comparison', icon: '🏢' },
];

const DATE_RANGES = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 3 Months' },
  { value: '180', label: 'Last 6 Months' },
  { value: '365', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

export function ReportGenerator({
  open,
  onClose,
  onSuccess,
}: ReportGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('OCCUPANCY');
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('PDF');
  const [dateRange, setDateRange] = useState('30');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [homes, setHomes] = useState<any[]>([]);
  const [selectedHomes, setSelectedHomes] = useState<string[]>([]);

  // Fetch homes for filtering
  useEffect(() => {
    if (open) {
      fetchHomes();
    }
  }, [open]);

  // Update title when type changes
  useEffect(() => {
    const template = REPORT_TEMPLATES.find((t) => t?.value === type);
    if (template) {
      setTitle(`${template?.label} - ${new Date().toLocaleDateString()}`);
    }
  }, [type]);

  const fetchHomes = async () => {
    try {
      const response = await fetch('/api/homes?status=ACTIVE&limit=100');
      if (response?.ok) {
        const data = await response?.json();
        setHomes(data?.homes || []);
      }
    } catch (error) {
      console.error('Error fetching homes:', error);
    }
  };

  const calculateDateRange = () => {
    if (dateRange === 'custom') {
      return {
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      };
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(dateRange || '30'));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  };

  const handleGenerate = async () => {
    if (!title?.trim()) {
      toast.error('Please enter a report title');
      return;
    }

    if (dateRange === 'custom' && (!startDate || !endDate)) {
      toast.error('Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      const dates = calculateDateRange();

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          format,
          startDate: dates?.startDate,
          endDate: dates?.endDate,
          homeIds: selectedHomes?.length ? selectedHomes : undefined,
          includeCharts,
          includeSummary,
          includeDetails,
        }),
      });

      if (!response?.ok) {
        throw new Error('Failed to generate report');
      }

      const result = await response?.json();
      const reportData = result?.data;

      if (!reportData) {
        throw new Error('No report data received');
      }

      // Generate and download file based on format
      const filename = `${title?.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`;

      if (format === 'PDF') {
        const blob = await generatePDF(reportData);
        downloadPDF(blob, `${filename}.pdf`);
      } else if (format === 'EXCEL') {
        const blob = await generateExcel(reportData);
        downloadExcel(blob, `${filename}.csv`);
      } else if (format === 'CSV') {
        const blob = await generateCSV(reportData);
        downloadCSV(blob, `${filename}.csv`);
      }

      toast.success('Report generated successfully!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(error?.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Report
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Report Template</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TEMPLATES?.map?.((template) => (
                  <SelectItem key={template?.value} value={template?.value}>
                    <span className="flex items-center gap-2">
                      <span>{template?.icon}</span>
                      <span>{template?.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Report Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e?.target?.value ?? '')}
              placeholder="Enter report title"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label htmlFor="dateRange">Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="dateRange">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES?.map?.((range) => (
                  <SelectItem key={range?.value} value={range?.value}>
                    {range?.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e?.target?.value ?? '')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e?.target?.value ?? '')}
                />
              </div>
            </div>
          )}

          {/* Facility Filter */}
          {homes?.length > 0 && (
            <div className="space-y-2">
              <Label>Facilities (Optional)</Label>
              <Select
                value={selectedHomes?.[0] ?? 'all'}
                onValueChange={(value) =>
                  setSelectedHomes(value === 'all' ? [] : [value])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All facilities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Facilities</SelectItem>
                  {homes?.map?.((home) => (
                    <SelectItem key={home?.id} value={home?.id}>
                      {home?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Export Format */}
          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="format">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF (Portable Document Format)</SelectItem>
                <SelectItem value="EXCEL">Excel (Spreadsheet)</SelectItem>
                <SelectItem value="CSV">CSV (Comma Separated Values)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Report Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeCharts"
                  checked={includeCharts}
                  onCheckedChange={(checked) =>
                    setIncludeCharts(checked === true)
                  }
                />
                <label
                  htmlFor="includeCharts"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include charts and visualizations
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSummary"
                  checked={includeSummary}
                  onCheckedChange={(checked) =>
                    setIncludeSummary(checked === true)
                  }
                />
                <label
                  htmlFor="includeSummary"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include executive summary
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeDetails"
                  checked={includeDetails}
                  onCheckedChange={(checked) =>
                    setIncludeDetails(checked === true)
                  }
                />
                <label
                  htmlFor="includeDetails"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include detailed data tables
                </label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
