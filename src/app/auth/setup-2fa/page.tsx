"use client";

/**
 * Forced 2FA enrolment (security package §3). ADMIN / STAFF / OPERATOR /
 * DISCHARGE_PLANNER accounts without an authenticator are sent here by
 * src/middleware.ts before any page loads (APIs answer 403 until done).
 *
 * Steps: scan QR (or type the key) → enter a 6-digit code → save the 10 backup
 * codes, which are shown once → tick "I've saved them" → continue. Continuing
 * refreshes the session so the requirement claim is cleared.
 */
import { Suspense, useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiLoader, FiShield } from "react-icons/fi";
import { safeCallbackUrl } from "@/lib/auth/two-factor-routes";

type Step = "loading" | "scan" | "codes" | "error";

function SetupTwoFactor() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const callbackUrl = safeCallbackUrl(useSearchParams().get("callbackUrl"));

  const [step, setStep] = useState<Step>("loading");
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const finish = async () => {
    setBusy(true);
    await update(); // re-runs the jwt callback: twoFactorSetupRequired is now false
    router.replace(callbackUrl);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }
    if (status !== "authenticated" || step !== "loading") return;
    if (!(session?.user as any)?.twoFactorSetupRequired) {
      router.replace(callbackUrl);
      return;
    }
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/setup-2fa");
        const data = await res.json();
        if (!data.success) {
          // Already enrolled elsewhere (another tab): refresh and go on.
          if (res.status === 400) return void finish();
          throw new Error(data.message || "Could not start setup.");
        }
        setQr(data.data.qrCode);
        setSecret(data.data.secret);
        setStep("scan");
      } catch (e: any) {
        setError(e.message);
        setStep("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/setup-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: code.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Invalid code.");
      setBackupCodes(data.data.backupCodes || []);
      setQr(null);
      setSecret(null);
      setCode("");
      setStep("codes");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const btn = "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60";

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow">
        <div className="flex items-center gap-2">
          <FiShield className="h-6 w-6 text-primary-600" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-neutral-900">Set up two-factor authentication</h1>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          Your account role requires an authenticator app. This takes about a minute, and you only do it once.
        </p>

        {error && <p className="mt-4 text-sm text-error-700" role="alert">{error}</p>}

        {step === "loading" && (
          <p className="mt-6 flex items-center gap-2 text-sm text-neutral-600"><FiLoader className="h-4 w-4 animate-spin" /> Preparing…</p>
        )}

        {step === "scan" && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-neutral-700">1. Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password…).</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URL QR code */}
            {qr && <img src={qr} alt="2FA QR code" width={180} height={180} className="rounded border border-neutral-200" />}
            {secret && (
              <p className="text-xs text-neutral-500">
                Can&apos;t scan? Enter this key: <code className="break-all font-mono text-neutral-800">{secret}</code>
              </p>
            )}
            <label htmlFor="setup-code" className="block text-sm text-neutral-700">2. Enter the 6-digit code it shows</label>
            <input
              id="setup-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="block w-40 rounded-md border border-neutral-300 px-3 py-2 text-sm tracking-widest"
            />
            <button type="button" onClick={confirm} disabled={busy || code.length !== 6} className={`${btn} bg-primary-600 text-white hover:bg-primary-700`}>
              {busy && <FiLoader className="mr-2 h-4 w-4 animate-spin" />}Verify
            </button>
          </div>
        )}

        {step === "codes" && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-neutral-800">
              3. Save these backup codes somewhere safe. Each one works once if you lose your phone. They won&apos;t be shown again.
            </p>
            <ul className="grid grid-cols-2 gap-1 rounded-md bg-neutral-50 p-3 font-mono text-sm text-neutral-800" data-testid="backup-codes">
              {backupCodes.map((c) => <li key={c}>{c}</li>)}
            </ul>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
              I&apos;ve saved them
            </label>
            <button type="button" onClick={finish} disabled={!saved || busy} className={`${btn} w-full bg-primary-600 text-white hover:bg-primary-700`}>
              {busy && <FiLoader className="mr-2 h-4 w-4 animate-spin" />}Continue
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="mt-6 text-xs text-neutral-500 underline hover:text-neutral-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function SetupTwoFactorPage() {
  return (
    <Suspense fallback={null}>
      <SetupTwoFactor />
    </Suspense>
  );
}
