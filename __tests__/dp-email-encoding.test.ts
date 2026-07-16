/**
 * Acceptance test for the DP follow-up email's UTF-8 handling + image-free
 * header. Drives the real render path (renderDpFollowupHtml) and inspects the raw
 * HTML source: meta charset present, punctuation entity-encoded, and NO logo
 * <img> (image-free for hospital-inbox deliverability; brand carried by the
 * text-only "CareLinkAI Placements" signature). A live send needs prod env.
 */

// renderDpFollowupHtml is a pure function, but importing @/lib/email constructs a
// Resend client at module load (throws without a key) — mock the SDK so the import
// is side-effect-free.
jest.mock('resend', () => ({ Resend: jest.fn().mockImplementation(() => ({ emails: { send: jest.fn() } })) }));

import { renderDpFollowupHtml } from '@/lib/email';
import { dpFollowupCopy } from '@/lib/dp-outreach/copy';

const opts = {
  unsubscribeUrl: 'https://getcarelinkai.com/api/outreach/unsubscribe?token=abc.def',
  postalAddress: '1234 Main St, Cleveland, OH 44114',
};
// Touch 1 copy is the richest in non-ASCII punctuation (em-dashes + curly quotes).
const copy = dpFollowupCopy(1, { plannerFirstName: 'Maria', videoUrl: 'https://app.heygen.com/videos/founder-x' });
const html = renderDpFollowupHtml(copy, opts);

describe('DP email — UTF-8 charset', () => {
  it('declares <meta charset="utf-8"> inside a real <head>', () => {
    expect(html).toContain('<meta charset="utf-8">');
    expect(html.toLowerCase()).toContain('<head>');
    // http-equiv belt for older clients
    expect(html).toContain('content="text/html; charset=UTF-8"');
  });

  it('is pure 7-bit ASCII — no raw non-ASCII bytes that can mojibake', () => {
    expect(/[^\x00-\x7F]/.test(html)).toBe(false);
  });

  it('emits an exact, clean viewport meta (no corrupted bytes)', () => {
    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  });

  it('the rendered <head> contains no U+FFFD replacement character', () => {
    const head = html.split('</head>')[0];
    expect(head).not.toContain('�'); // raw replacement char
    expect(head).not.toContain('&#65533;'); // ...nor its entity form
  });
});

describe('DP email — punctuation renders as HTML entities', () => {
  it('em-dashes ship as &#8212; and never as raw —', () => {
    expect(html).toContain('&#8212;'); // em-dash present, encoded
    expect(html).not.toContain('—'); // no raw em-dash byte
  });

  it('curly apostrophes ship as &#8217; (e.g. "patient’s")', () => {
    expect(html).toContain('&#8217;');
    expect(html).not.toContain('’');
  });

  it('the footer middot ships as &#183; (not a raw ·)', () => {
    expect(html).toContain('&#183;');
    expect(html).not.toContain('·');
  });
});

describe('DP email — image-free header', () => {
  it('contains no logo <img> (image-free for deliverability)', () => {
    expect(html).not.toContain('<img');
  });

  it('keeps the text-only "CareLinkAI Placements" signature branding', () => {
    expect(html).toContain('CareLinkAI Placements');
  });
});

describe('DP email — content preserved', () => {
  it('renders the founder video as a friendly-text anchor, href unchanged', () => {
    // href still points at the same video URL...
    expect(html).toContain('<a href="https://app.heygen.com/videos/founder-x"');
    // ...but the visible anchor text is friendly, not the raw URL
    expect(html).toContain('>Watch the 90-second intro</a>');
    expect(html).not.toContain('>https://app.heygen.com/videos/founder-x</a>');
  });
  it('keeps the unsubscribe link (CAN-SPAM)', () => {
    expect(html).toContain(opts.unsubscribeUrl.replace(/&/g, '&amp;'));
  });
});
