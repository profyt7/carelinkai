"use client";

/**
 * OL-184 — 10DLC SMS opt-in checkbox for every field where a user enters a
 * mobile number. UNCHECKED BY DEFAULT and never required: the form submits
 * either way; the server records consent only when checked (or a revocation
 * when an account had opted in). The sentence comes from sms-consent.ts.
 */

import {
  CURRENT_SMS_CONSENT_VERSION,
  SMS_CONSENT_TEXT,
  type SmsConsentPayload,
} from "@/lib/consent/sms-consent";

export { emptySmsConsent } from "@/lib/consent/sms-consent";

interface SmsConsentCheckboxProps {
  checked: boolean;
  onChange: (payload: SmsConsentPayload) => void;
  /** Unique per form instance so label htmlFor stays valid with multiple mounts. */
  idPrefix: string;
  className?: string;
}

export default function SmsConsentCheckbox({ checked, onChange, idPrefix, className }: SmsConsentCheckboxProps) {
  const id = `${idPrefix}-sms-consent`;
  return (
    <div className={className ?? "mt-3"}>
      <label htmlFor={id} className="flex items-start gap-2 cursor-pointer">
        <input
          id={id}
          name="smsConsent"
          type="checkbox"
          data-testid="sms-consent-checkbox"
          checked={checked}
          onChange={(e) => onChange({ given: e.target.checked, textVersion: CURRENT_SMS_CONSENT_VERSION })}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-xs leading-relaxed text-neutral-600">{SMS_CONSENT_TEXT}</span>
      </label>
    </div>
  );
}
