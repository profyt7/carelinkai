"use client";

import React, { useState } from "react";
import ExplainMatchModal from "@/components/marketplace/ExplainMatchModal";

type Props = {
  title: string;
  score?: number | null;
  reasons?: string[];
  className?: string;
};

export default function ExplainMatchTrigger({ title, score, reasons, className }: Props) {
  const [open, setOpen] = useState(false);
  const hasExplain = (typeof score === "number" && score > 0) || (Array.isArray(reasons) && reasons.length > 0);

  if (!hasExplain) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        }
      >
        Explain
      </button>
      <ExplainMatchModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        score={score}
        reasons={reasons}
      />
    </>
  );
}
