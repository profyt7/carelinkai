"use client";

import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  score?: number | null;
  reasons?: string[];
};

export default function ExplainMatchModal({ open, onClose, title, score, reasons }: Props) {
  if (!open) return null;
  const s = typeof score === "number" ? Math.max(0, Math.min(100, Math.round(score))) : null;
  const list = Array.isArray(reasons) ? reasons.filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full rounded-t-2xl bg-white p-4 shadow-xl md:w-[640px] md:rounded-2xl">
        <div className="mb-3 flex items-center justify-between border-b pb-2">
          <h3 className="text-base font-semibold text-neutral-800">Why this recommendation</h3>
          <button onClick={onClose} className="rounded p-1 hover:bg-neutral-100" aria-label="Close">×</button>
        </div>
        <div className="mb-3">
          <div className="text-sm font-medium text-neutral-800">{title}</div>
          {s !== null && (
            <div className="mt-1 text-xs text-neutral-600">Match score: {s}%</div>
          )}
        </div>
        {list.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1 text-sm text-neutral-700">
            {list.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-neutral-600">No additional explanation available.</div>
        )}
        <div className="mt-4 flex justify-end gap-2 border-t pt-3">
          <button onClick={onClose} className="rounded-md border border-neutral-300 px-4 py-1.5 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}
