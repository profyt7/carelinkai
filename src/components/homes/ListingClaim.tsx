"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Self-serve listing claim on /homes/[id] (fix/self-serve-claim).
 *  - open + signed-in operator → one click files a PENDING_REVIEW claim (an admin verifies; nothing changes hands).
 *  - open + anyone else → /homes/[id]/claim (sign up or log in with the home carried through).
 *  - pending → "A claim for this listing is under review."
 *  - claimed → "This listing is managed by its community." + /contact.
 */
export type ListingClaimState = "open" | "pending" | "claimed";

const MESSAGES: Record<string, string> = {
  pending_exists: "A claim for this listing is already under review.",
  already_claimed: "This listing is managed by its community.",
  rate_limited: "Too many claim requests. Please try again later.",
  not_operator: "Claims need a care-home operator account.",
  sign_in: "Please sign in as an operator to claim this listing.",
};

export function ClaimListingButton({
  homeId,
  role,
  className = "",
  label = "Claim this listing",
}: {
  homeId: string;
  role?: string | null;
  className?: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "submitted" | "error">("idle");
  const [error, setError] = useState("");
  const btn = `inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60 ${className}`;

  if (role !== "OPERATOR") {
    return (
      <Link href={`/homes/${homeId}/claim`} className={btn} data-testid="listing-claim-button">
        {label}
      </Link>
    );
  }

  if (state === "submitted") {
    return (
      <p className="text-sm font-medium text-success-700" role="status" data-testid="listing-claim-submitted">
        Claim submitted — we&apos;ll verify and email you.{" "}
        <Link href="/operator" className="underline hover:no-underline">Go to your dashboard</Link>
      </p>
    );
  }

  const submit = async () => {
    setState("busy");
    setError("");
    try {
      const res = await fetch(`/api/homes/${homeId}/claim-request`, { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return setState("submitted");
      setError(MESSAGES[data?.reason] ?? "Something went wrong. Please try again or call (216) 245-9482.");
      setState("error");
    } catch {
      setError("Something went wrong. Please try again or call (216) 245-9482.");
      setState("error");
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={submit} disabled={state === "busy"} className={btn} data-testid="listing-claim-button">
        {state === "busy" ? "Submitting…" : label}
      </button>
      {state === "error" && (
        <span className="text-xs text-error-700" role="alert" data-testid="listing-claim-error">
          {error}
        </span>
      )}
    </span>
  );
}

/** The block at the foot of every listing: the obvious next step for an operator, or who manages it. */
export default function ListingClaim({ homeId, claimState, role }: { homeId: string; claimState: ListingClaimState; role?: string | null }) {
  if (claimState === "claimed") {
    return (
      <p className="text-sm text-neutral-700" data-testid="listing-claim-managed">
        This listing is managed by its community.{" "}
        <Link href="/contact" className="font-medium text-primary-700 underline hover:no-underline">
          Questions? Contact us
        </Link>
      </p>
    );
  }
  if (claimState === "pending") {
    return (
      <p className="text-sm text-neutral-700" data-testid="listing-claim-pending">
        A claim for this listing is under review.{" "}
        <Link href="/contact" className="font-medium text-primary-700 underline hover:no-underline">
          Questions? Contact us
        </Link>
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-testid="listing-claim-open">
      <p className="text-sm text-neutral-700">
        <strong className="block text-neutral-900">Operate this community?</strong>
        Claim your free listing to add photos and keep availability current. We verify every claim.
      </p>
      <ClaimListingButton homeId={homeId} role={role} className="shrink-0" />
    </div>
  );
}
