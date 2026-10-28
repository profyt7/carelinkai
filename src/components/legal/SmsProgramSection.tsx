import { SMS_CONSENT_TEXT } from "@/lib/consent/sms-consent";

/**
 * OL-184 — the "SMS program" section shared by /privacy and /terms (10DLC
 * campaign disclosure). Quotes the exact opt-in sentence from sms-consent.ts so
 * the legal pages and every checkbox can never drift apart.
 */
export default function SmsProgramSection({ number, accent }: { number: number; accent: string }) {
  return (
    <section className="mb-10" id="sms-program" data-testid="sms-program">
      <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
        <span
          className="w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3"
          style={{ backgroundColor: accent }}
        >
          {number}
        </span>
        SMS Program
      </h2>
      <p className="text-slate-600 leading-relaxed mb-4">
        CareLinkAI sends text messages (the &quot;CareLinkAI SMS alerts&quot; program) only to people who opt in by checking an
        unchecked box next to a mobile number field on our site. The box reads:
      </p>
      <blockquote className="border-l-4 border-slate-300 pl-4 italic text-slate-700 mb-4" data-testid="sms-program-consent-text">
        {SMS_CONSENT_TEXT}
      </blockquote>
      <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
        <li>Messages are about callback requests and listing updates. Message frequency varies.</li>
        <li>Message and data rates may apply. Opting in is not a condition of using CareLinkAI or of any purchase.</li>
        <li>
          Reply <strong>STOP</strong> to any message to opt out; you will get one confirmation and no further texts. Reply{" "}
          <strong>HELP</strong> for help, or email{" "}
          <a href="mailto:support@getcarelinkai.com" className="underline">
            support@getcarelinkai.com
          </a>
          . You can also uncheck the box in your account settings.
        </li>
        <li>Carriers are not liable for delayed or undelivered messages.</li>
        <li>
          We do not sell, rent or share your mobile number or SMS opt-in with third parties or affiliates for their marketing.
          We keep a record of your opt-in (the text you agreed to, the time, and the form) as proof of consent.
        </li>
      </ul>
    </section>
  );
}
