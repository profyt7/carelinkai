"use client";

import React from "react";

export default function UnassignShiftButton({ shiftId, className }: { shiftId: string; className?: string }) {
  const [loading, setLoading] = React.useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={loading}
      onClick={async () => {
        try {
          setLoading(true);
          const res = await fetch(`/api/operator/shifts/${shiftId}/assign`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ caregiverId: null }),
          });
          if (!res.ok) throw new Error("unassign failed");
          location.reload();
        } catch {
          // eslint-disable-next-line no-alert
          alert("Failed to unassign shift");
        } finally {
          setLoading(false);
        }
      }}
    >
      {loading ? "Unassigning…" : "Unassign"}
    </button>
  );
}
