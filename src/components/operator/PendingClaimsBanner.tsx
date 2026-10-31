"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PendingClaim = { id: string; homeId: string; homeName: string };

/** Operator dashboard (fix/self-serve-claim): "Claim submitted — we'll verify and email you" per pending claim. */
export default function PendingClaimsBanner() {
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/operator/home-claims", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { claims: [] }))
      .then((d) => alive && setClaims(Array.isArray(d?.claims) ? d.claims : []))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  if (claims.length === 0) return null;
  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 p-4" role="status" data-testid="operator-pending-claims">
      <p className="font-semibold text-primary-900">Claim submitted — we&apos;ll verify and email you.</p>
      <ul className="mt-1 space-y-0.5 text-sm text-primary-900">
        {claims.map((c) => (
          <li key={c.id}>
            <Link href={`/homes/${c.homeId}`} className="underline hover:no-underline">{c.homeName}</Link> · under review
          </li>
        ))}
      </ul>
    </div>
  );
}
