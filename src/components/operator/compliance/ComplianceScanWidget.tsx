'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FiShield, FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiLoader, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import type { ComplianceFinding, ComplianceScanResult } from '@/app/api/operator/compliance/scan/route';

type Category = 'RATIO' | 'LICENSE' | 'CERTIFICATION' | 'BACKGROUND_CHECK';

const CATEGORY_LABELS: Record<Category, string> = {
  RATIO: 'Staffing Ratios',
  LICENSE: 'Licenses',
  CERTIFICATION: 'Certifications',
  BACKGROUND_CHECK: 'Background Checks',
};

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === 'CRITICAL') return <FiAlertCircle className="text-error-500 flex-shrink-0" size={16} />;
  if (severity === 'WARNING') return <FiAlertTriangle className="text-amber-500 flex-shrink-0" size={16} />;
  return <FiCheckCircle className="text-success-500 flex-shrink-0" size={16} />;
}

function FindingRow({ f }: { f: ComplianceFinding }) {
  const borderColor =
    f.severity === 'CRITICAL' ? 'border-error-200 bg-error-50' :
    f.severity === 'WARNING' ? 'border-amber-200 bg-amber-50' :
    'border-success-100 bg-success-50';

  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${borderColor}`}>
      <SeverityIcon severity={f.severity} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800">{f.title}</p>
        <p className="text-xs text-neutral-500 mt-0.5">{f.detail}</p>
      </div>
      {f.actionUrl && (
        <Link
          href={f.actionUrl}
          className="flex-shrink-0 text-xs text-indigo-600 hover:underline whitespace-nowrap"
        >
          Fix →
        </Link>
      )}
    </div>
  );
}

export default function ComplianceScanWidget() {
  const [result, setResult] = useState<ComplianceScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['CRITICAL']));

  const runScan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/operator/compliance/scan');
      if (!res.ok) throw new Error('Scan failed');
      const data: ComplianceScanResult = await res.json();
      setResult(data);
      // Auto-expand categories that have critical findings
      const critCats = new Set(
        data.findings.filter((f) => f.severity === 'CRITICAL').map((f) => f.category)
      );
      setExpandedCategories(critCats.size > 0 ? critCats : new Set(Object.keys(CATEGORY_LABELS)));
    } catch (err: any) {
      setError('Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const categories = Object.keys(CATEGORY_LABELS) as Category[];

  return (
    <div className="rounded-xl border border-indigo-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-indigo-100 p-2">
            <FiShield size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-800">AI Compliance Scanner</h3>
            <p className="text-xs text-neutral-500">
              Checks ratios, licenses, certifications, and background checks
            </p>
          </div>
        </div>
        <button
          onClick={runScan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
        >
          {loading ? (
            <><FiLoader size={14} className="animate-spin" /> Scanning...</>
          ) : (
            <><FiShield size={14} /> Run Scan</>
          )}
        </button>
      </div>

      {/* Pre-scan state */}
      {!result && !loading && !error && (
        <div className="p-8 text-center text-neutral-500 text-sm">
          Click <strong>Run Scan</strong> to check your compliance status across all homes and caregivers.
        </div>
      )}

      {error && (
        <div className="p-5 text-sm text-error-600">{error}</div>
      )}

      {result && (
        <div className="p-5 space-y-5">
          {/* Score cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-error-50 border border-error-200 p-3 text-center">
              <div className="text-2xl font-bold text-error-600">{result.counts.critical}</div>
              <div className="text-xs text-error-500 font-medium mt-0.5">Critical</div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{result.counts.warning}</div>
              <div className="text-xs text-amber-500 font-medium mt-0.5">Warnings</div>
            </div>
            <div className="rounded-lg bg-success-50 border border-success-200 p-3 text-center">
              <div className="text-2xl font-bold text-success-600">{result.counts.ok}</div>
              <div className="text-xs text-success-500 font-medium mt-0.5">Passing</div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">AI Summary</p>
            <p className="text-sm text-neutral-700">{result.summary}</p>
          </div>

          {/* Findings by category */}
          <div className="space-y-3">
            {categories.map((cat) => {
              const catFindings = result.findings.filter((f) => f.category === cat);
              if (catFindings.length === 0) return null;
              const hasCritical = catFindings.some((f) => f.severity === 'CRITICAL');
              const hasWarning = catFindings.some((f) => f.severity === 'WARNING');
              const isExpanded = expandedCategories.has(cat);

              return (
                <div key={cat} className="rounded-lg border border-neutral-200 overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-700">{CATEGORY_LABELS[cat]}</span>
                      {hasCritical && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-error-100 text-error-600 font-medium">
                          {catFindings.filter((f) => f.severity === 'CRITICAL').length} critical
                        </span>
                      )}
                      {!hasCritical && hasWarning && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">
                          {catFindings.filter((f) => f.severity === 'WARNING').length} warning{catFindings.filter((f) => f.severity === 'WARNING').length > 1 ? 's' : ''}
                        </span>
                      )}
                      {!hasCritical && !hasWarning && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-success-100 text-success-600 font-medium">
                          All clear
                        </span>
                      )}
                    </div>
                    {isExpanded ? <FiChevronUp size={14} className="text-neutral-400" /> : <FiChevronDown size={14} className="text-neutral-400" />}
                  </button>

                  {isExpanded && (
                    <div className="p-3 space-y-2">
                      {catFindings.map((f, i) => (
                        <FindingRow key={i} f={f} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-neutral-400 text-right">
            Scanned {new Date(result.scannedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
