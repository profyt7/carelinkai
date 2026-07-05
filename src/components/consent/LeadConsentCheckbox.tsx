"use client";

/**
 * TCPA/marketing consent checkbox for family-facing lead forms
 * (feat/lead-consent-capture). UNCHECKED BY DEFAULT — consent must be an
 * affirmative act. Declining NEVER blocks submission; the parent form submits
 * either way and the server records the state. Copy comes from the versioned
 * lead-consent-text module (v1 pending attorney review), never hardcoded here.
 */

import {
  CURRENT_LEAD_CONSENT_VERSION,
  LeadConsentPayload,
  leadConsentText,
} from "@/lib/consent/lead-consent-text";

export function emptyLeadConsent(): LeadConsentPayload {
  return { given: false, textVersion: CURRENT_LEAD_CONSENT_VERSION };
}

/** Render the versioned copy verbatim, linking the "Privacy Policy" phrase if present. */
function ConsentCopy({ text }: { text: string }) {
  const marker = "Privacy Policy";
  const idx = text.indexOf(marker);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-800">
        {marker}
      </a>
      {text.slice(idx + marker.length)}
    </>
  );
}

interface LeadConsentCheckboxProps {
  checked: boolean;
  onChange: (payload: LeadConsentPayload) => void;
  /** Unique per form instance so label htmlFor stays valid with multiple mounts. */
  idPrefix: string;
  className?: string;
}

export default function LeadConsentCheckbox({
  checked,
  onChange,
  idPrefix,
  className,
}: LeadConsentCheckboxProps) {
  const id = `${idPrefix}-lead-consent`;
  return (
    <div className={className ?? "mt-3"}>
      <label htmlFor={id} className="flex items-start gap-2 cursor-pointer">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) =>
            onChange({ given: e.target.checked, textVersion: CURRENT_LEAD_CONSENT_VERSION })
          }
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-xs leading-relaxed text-neutral-600">
          <ConsentCopy text={leadConsentText()} />
        </span>
      </label>
    </div>
  );
}
