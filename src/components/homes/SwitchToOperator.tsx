"use client";

import { signOut } from "next-auth/react";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * Signed in as a non-operator (e.g. a family) on /homes/[id]/claim: claims need an operator account, so offer
 * to sign out and either create one (with this home carried through signup) or sign in to an existing one.
 * Both buttons stay disabled until hydrated: a tap on the server-rendered HTML would otherwise do nothing.
 */
export function SwitchToOperator({ registerHref, loginHref }: { registerHref: string; loginHref: string }) {
  const hydrated = useHydrated();
  const btn = "flex w-full items-center justify-center rounded-lg px-4 py-3 font-semibold disabled:cursor-wait disabled:opacity-60";
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={!hydrated}
        onClick={() => void signOut({ callbackUrl: registerHref })}
        className={`${btn} bg-primary-600 text-white hover:bg-primary-700`}
        data-testid="claim-page-switch-register"
      >
        Sign out and create an operator account
      </button>
      <button
        type="button"
        disabled={!hydrated}
        onClick={() => void signOut({ callbackUrl: loginHref })}
        className={`${btn} border border-neutral-300 text-neutral-800 hover:bg-neutral-50`}
        data-testid="claim-page-switch-login"
      >
        Sign in with an operator account
      </button>
    </div>
  );
}
