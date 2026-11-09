"use client";

/**
 * P0-2: real 2FA enrolment / removal (replaces the toggle that flipped a flag without any secret).
 * Enable: QR + manual key → 6-digit code → backup codes shown once.
 * Disable: current password.
 */
import { useState } from "react";
import { FiLoader, FiShield, FiSlash } from "react-icons/fi";

/** `required`: the account's role must keep 2FA on (no Disable button). */
type Props = { enabled: boolean; onChange: (enabled: boolean) => void; required?: boolean };
type Step = "idle" | "scan" | "codes" | "disable";

export default function TwoFactorPanel({ enabled, onChange, required = false }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const reset = () => { setStep("idle"); setError(null); setQr(null); setSecret(null); setCode(""); setPassword(""); };

  const start = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/setup-2fa");
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Could not start setup.");
      setQr(data.data.qrCode); setSecret(data.data.secret); setStep("scan");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/setup-2fa", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: code.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Invalid code.");
      setBackupCodes(data.data.backupCodes || []); setStep("codes"); setQr(null); setSecret(null); setCode("");
      onChange(true);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth/disable-2fa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationMethod: "password", verificationValue: password }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Could not disable 2FA.");
      reset(); onChange(false);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const btn = "inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60";
  const primary = `${btn} border-transparent bg-primary-600 text-white hover:bg-primary-700`;
  const danger = `${btn} border-error-300 bg-white text-error-700 hover:bg-error-50`;
  const ghost = `${btn} border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50`;

  return (
    <div className="mt-4 space-y-4" data-testid="two-factor-panel">
      {error && <p className="text-sm text-error-700" role="alert">{error}</p>}

      {step === "idle" && !enabled && (
        <button type="button" onClick={start} disabled={busy} className={primary}>
          {busy ? <FiLoader className="mr-2 h-4 w-4 animate-spin" /> : <FiShield className="mr-2 h-4 w-4" />}
          Enable 2FA
        </button>
      )}

      {step === "scan" && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-700">1. Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password…).</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL QR code */}
          {qr && <img src={qr} alt="2FA QR code" width={180} height={180} className="rounded border border-neutral-200" />}
          {secret && (
            <p className="text-xs text-neutral-500">
              Can&apos;t scan? Enter this key: <code className="break-all font-mono text-neutral-800">{secret}</code>
            </p>
          )}
          <label htmlFor="tfa-code" className="block text-sm text-neutral-700">2. Enter the 6-digit code it shows</label>
          <input
            id="tfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="block w-40 rounded-md border border-neutral-300 px-3 py-2 text-sm tracking-widest"
          />
          <div className="flex gap-2">
            <button type="button" onClick={confirm} disabled={busy || code.length !== 6} className={primary}>
              {busy && <FiLoader className="mr-2 h-4 w-4 animate-spin" />}Verify and enable
            </button>
            <button type="button" onClick={reset} disabled={busy} className={ghost}>Cancel</button>
          </div>
        </div>
      )}

      {step === "codes" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-neutral-800">Save these backup codes now. Each works once, and they won&apos;t be shown again.</p>
          <ul className="grid grid-cols-2 gap-1 font-mono text-sm text-neutral-800" data-testid="backup-codes">
            {backupCodes.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <button type="button" onClick={() => { setBackupCodes([]); setStep("idle"); }} className={ghost}>I&apos;ve saved them</button>
        </div>
      )}

      {step === "idle" && enabled && required && (
        <p className="text-sm text-neutral-600" data-testid="two-factor-required">
          Two-factor authentication is required for your account role, so it can&apos;t be turned off.
        </p>
      )}

      {step === "idle" && enabled && !required && (
        <button type="button" onClick={() => { setError(null); setStep("disable"); }} className={danger}>
          <FiSlash className="mr-2 h-4 w-4" />Disable 2FA
        </button>
      )}

      {step === "disable" && (
        <div className="space-y-3">
          <label htmlFor="tfa-password" className="block text-sm text-neutral-700">Confirm your password to turn off 2FA</label>
          <input
            id="tfa-password" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button type="button" onClick={disable} disabled={busy || !password} className={danger}>
              {busy && <FiLoader className="mr-2 h-4 w-4 animate-spin" />}Disable 2FA
            </button>
            <button type="button" onClick={reset} disabled={busy} className={ghost}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
