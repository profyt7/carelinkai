/**
 * DP follow-up sequence COPY (feat/dp-lead-capture).
 *
 * Pure, side-effect-free copy generator so the wording is unit-testable
 * independent of Resend. These are 1:1, personal-style emails to busy hospital
 * discharge planners — deliberately NOT the heavy operator HTML template. Near
 * plain-text, warm, founder-out tone. Deliverability + reply-rate first.
 *
 * Cadence (days from the lead being logged): Touch 1 = 0 (immediate), Touch 2 =
 * +3, Touch 3 = +7, Touch 4 = +14. `email.ts` wraps this with the signature
 * block + CAN-SPAM footer (postal address + unsubscribe) — the copy here is the
 * body only. The founder intro video is surfaced on Touch 1 (and referenced
 * again on Touch 3).
 *
 * NO PHI, no patient details — this lane is planner relationship-building only.
 */

/** Day offsets from lead creation for touch 1..4. Length = max touches. */
export const DP_FOLLOWUP_OFFSETS_DAYS = [0, 3, 7, 14];
export const MAX_DP_TOUCHES = DP_FOLLOWUP_OFFSETS_DAYS.length;

/**
 * Placeholder for the founder-video link inside a paragraph. Kept out of the copy
 * strings so the anchor TEXT and the URL stay decoupled: the HTML renderer swaps
 * this token for a friendly-text anchor (VIDEO_LINK_TEXT → the video URL), while
 * the plain-text renderer swaps it for the raw URL (so it stays clickable in a
 * text client). Never put the raw URL in the copy directly.
 */
export const VIDEO_LINK_TOKEN = '{{VIDEO_LINK}}';
/** Friendly anchor text for the founder-video link in the HTML email. */
export const VIDEO_LINK_TEXT = 'Watch the 90-second intro';

export interface DpCopyInput {
  /** Planner first name; '' is fine — copy falls back to a neutral greeting. */
  plannerFirstName: string;
  /** Founder intro video URL (config-driven — FOUNDER_VIDEO_URL). */
  videoUrl: string;
}

export interface DpCopy {
  subject: string;
  /** Body paragraphs — rendered as <p> in HTML and joined by blank lines in text.
   *  Paragraphs may contain VIDEO_LINK_TOKEN where the founder-video link goes. */
  paragraphs: string[];
  /** The resolved founder-video URL the renderers substitute for the token. */
  videoUrl: string;
}

function greeting(firstName: string): string {
  const name = (firstName || '').trim();
  return name ? `Hi ${name},` : 'Hi there,';
}

/**
 * Build the body copy for a given touch (1..4). Unknown touch numbers clamp into
 * range so the sequence engine can never render an empty email.
 */
export function dpFollowupCopy(touch: number, input: DpCopyInput): DpCopy {
  const t = Math.min(Math.max(1, Math.round(touch) || 1), MAX_DP_TOUCHES);
  const hi = greeting(input.plannerFirstName);
  const video = input.videoUrl;
  const L = VIDEO_LINK_TOKEN; // paragraph placeholder for the founder-video link

  switch (t) {
    case 1:
      return {
        videoUrl: video,
        subject: 'A faster way to place your patients — CareLinkAI',
        paragraphs: [
          hi,
          "Thanks for taking my colleague's call. I'm Chris Tolliver, the founder of CareLinkAI — a free tool built to make discharge placement less of a phone-tag marathon.",
          'The short version: you tell us the patient’s needs, and we come back with a matched, availability-checked shortlist of assisted living and residential care options — so you spend minutes, not an afternoon, finding a bed that fits.',
          `I recorded a quick 90-second intro so you can see exactly how it works — no login needed: ${L}`,
          "There’s never a cost to you or your hospital. If it’s useful, just reply to this email and I’ll get you set up. If the timing’s wrong, no worries at all.",
        ],
      };
    case 2:
      return {
        videoUrl: video,
        subject: 'Following up — CareLinkAI for your placements',
        paragraphs: [
          hi,
          'Just floating this back to the top of your inbox in case it got buried — I know your days are full.',
          `If it’s easier to watch than read, the 90-second walkthrough is here: ${L}`,
          "Happy to answer anything, or to just leave a shortlist waiting for your next hard-to-place discharge. Whatever’s useful — a reply is all it takes.",
        ],
      };
    case 3:
      return {
        videoUrl: video,
        subject: 'The placement that took you all week',
        paragraphs: [
          hi,
          'Most of the planners I talk to lose the most time on the same thing: calling around to find who actually has an open bed at the right level of care, today.',
          'That’s the exact problem CareLinkAI solves — we do the calling and the availability checks, and hand you back a short, honest list. You stay in control of the placement; we just remove the busywork.',
          `Here’s the quick look again if you missed it: ${L}`,
          'Want me to run one live? Send me a (de-identified) idea of the kind of patient you place most often and I’ll show you what comes back.',
        ],
      };
    default: // 4 — final, soft close (no video link)
      return {
        videoUrl: video,
        subject: 'Last note from me — CareLinkAI',
        paragraphs: [
          hi,
          "I don’t want to crowd your inbox, so this is the last note I’ll send about getting started.",
          "The door stays open — CareLinkAI is free for discharge planners, and whenever you hit a placement that’s dragging, just reply here and we’ll jump in.",
          'Either way, thank you for the work you do getting people home safely. It matters.',
        ],
      };
  }
}
