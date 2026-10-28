"use client";

/**
 * State Inspection History (OL-113): factual ODH survey/citation history on the
 * public listing page. Public-records data with a source link — deliberately NO
 * letter grades, NO "verified" language, NO editorializing (FTC/CarePatrol
 * lesson: we present substantiated facts, families draw conclusions).
 * Self-fetching so the listing page render is never blocked.
 */

import { useEffect, useState } from "react";
import { FiChevronDown, FiChevronUp, FiClipboard, FiExternalLink } from "react-icons/fi";

interface InspectionCitation {
  rule?: string | null;
  scopeSeverity?: string | null;
  summary?: string | null;
}

interface InspectionRecord {
  id: string;
  surveyDate: string; // YYYY-MM-DD
  surveyType: string | null;
  citationCount: number;
  citations: InspectionCitation[];
  sourceUrl: string | null;
}

interface InspectionData {
  odhLicenseNumber: string | null;
  records: InspectionRecord[];
  dataAsOf: string | null;
}

const NAVIGATOR_URL = "https://aging.ohio.gov/navigator";

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function InspectionHistory({ homeId }: { homeId: string }) {
  const [data, setData] = useState<InspectionData | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/homes/${homeId}/inspections`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((json) => {
        if (!cancelled) {
          if (json?.success && json.data) setData(json.data as InspectionData);
          else setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [homeId]);

  // Fetch failed → render nothing rather than an alarming error inside a trust section.
  if (failed) return null;

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-neutral-800">State Inspection History</h2>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        {!data ? (
          <div className="animate-pulse space-y-3" aria-label="Loading inspection history">
            <div className="h-4 w-2/3 rounded bg-neutral-100" />
            <div className="h-4 w-1/2 rounded bg-neutral-100" />
          </div>
        ) : data.records.length === 0 ? (
          <div>
            <p className="text-neutral-700">
              {data.dataAsOf
                ? `No inspection records were found for this facility in Ohio Department of Health data as of ${formatDate(data.dataAsOf.slice(0, 10))}.`
                : "State inspection records haven't been loaded for this facility yet."}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              You can look this facility up directly in the state&apos;s{" "}
              <a
                href={NAVIGATOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary-600 underline hover:text-primary-700"
              >
                Ohio Long-Term Care Quality Navigator
              </a>
              .
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200">
            {data.records.map((rec) => {
              const hasDetail = rec.citations.length > 0;
              const isOpen = Boolean(expanded[rec.id]);
              return (
                <li key={rec.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start">
                      <div className="mr-3 rounded-full bg-primary-100 p-2 text-primary-600 flex-shrink-0">
                        <FiClipboard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-800">{formatDate(rec.surveyDate)}</p>
                        <p className="text-sm text-neutral-600">
                          {rec.surveyType && rec.surveyType !== "Unspecified"
                            ? `${rec.surveyType} survey`
                            : "Survey"}
                          {" · "}
                          {rec.citationCount === 0
                            ? "No citations in this survey"
                            : `${rec.citationCount} citation${rec.citationCount === 1 ? "" : "s"}`}
                        </p>
                      </div>
                    </div>
                    {rec.sourceUrl && (
                      <a
                        href={rec.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        View state record
                        <FiExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  {hasDetail && (
                    <div className="mt-2 pl-11">
                      <button
                        onClick={() => setExpanded((e) => ({ ...e, [rec.id]: !isOpen }))}
                        className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        {isOpen ? (
                          <>
                            <FiChevronUp className="mr-1 h-4 w-4" />
                            Hide citation details
                          </>
                        ) : (
                          <>
                            <FiChevronDown className="mr-1 h-4 w-4" />
                            Show citation details
                          </>
                        )}
                      </button>
                      {isOpen && (
                        <ul className="mt-2 space-y-2">
                          {rec.citations.map((c, i) => (
                            <li key={i} className="rounded-md bg-neutral-50 border border-neutral-200 p-3 text-sm">
                              {c.rule && <p className="font-medium text-neutral-800">Rule cited: {c.rule}</p>}
                              {c.scopeSeverity && (
                                <p className="text-neutral-600">Scope/severity (as published): {c.scopeSeverity}</p>
                              )}
                              {c.summary && <p className="mt-1 text-neutral-700">{c.summary}</p>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-4 border-t border-neutral-200 pt-3 text-xs text-neutral-500">
          Inspection data comes from Ohio Department of Health public records{data?.dataAsOf ? ` (as of ${formatDate(data.dataAsOf.slice(0, 10))})` : ""}. Families should confirm current details with the facility and the{" "}
          <a
            href={NAVIGATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-neutral-700"
          >
            state&apos;s official source
          </a>
          .
        </p>
      </div>
    </div>
  );
}
