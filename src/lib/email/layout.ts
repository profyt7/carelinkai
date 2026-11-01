/**
 * One branded layout for every transactional email (feat/email-design). Visual only: wording, recipients and
 * timing stay with each sender. Clean card style:
 *  - light gray page (#F4F5F7), centered white card (max 600px, rounded, 1px #E9EAED border);
 *  - CareLinkAI logo PNG hosted on our domain (alt text); nothing in the logo is needed to understand the email;
 *  - ALWAYS LIGHT (fix/email-always-light): no dark-mode styles; `color-scheme: light only` is declared, and every
 *    layout element carries its own background / color inline (bgcolor too), so nothing depends on inheritance.
 *    Text in a sender's body that has no color of its own gets one inline (body text, or brand blue for links).
 *  - logo and the primary CTA centered; headings and paragraphs left-aligned;
 *  - Inter / Segoe UI / Roboto / Arial; at most ONE primary CTA, a bulletproof table button (VML for Outlook) with a
 *    descriptive fallback link under it (never the raw URL; the plain-text version keeps the URL);
 *  - disclaimers 14px muted #63666A (emailDisclaimer);
 *  - footer: "CareLinkAI · Cleveland, Ohio · (216) 245-9482", getcarelinkai.com, privacy and terms. No unsubscribe
 *    here; marketing emails keep their own preference/unsubscribe lines inside the body.
 * guardedResendSend wraps every HTML email that isn't already wrapped (LAYOUT_MARKER), so senders that only build a
 * body get the shell automatically. Plain-text versions are never touched.
 */

export const BRAND_BLUE = '#3978FC';
export const LAYOUT_MARKER = 'data-clk-layout="1"';
const PAGE_BG = '#F4F5F7';
const CARD_BG = '#FFFFFF';
const CARD_BORDER = '#E9EAED';
const TEXT = '#1A1A1A';
const MUTED = '#63666A';
const FONT = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const PHONE = '(216) 245-9482';

export function emailAppUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}

/** Images must be absolute https on our domain (Gmail's image proxy and Outlook block anything else). */
export function emailAssetBase(): string {
  const app = emailAppUrl();
  return /^https:\/\//i.test(app) ? app : 'https://getcarelinkai.com';
}

/**
 * Email-sized logo (2× file, explicit width/height so clients reserve the space): email-logo.png 296×76 → 148×38,
 * with a thin white edge so the navy wordmark stays readable even if an app forces a dark background. Always this
 * one; there is no dark-mode swap.
 */
const LOGO_W = 148;
const LOGO_H = 38;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Disclaimers (not-a-placement line, privacy notes, phone/no-PHI line): 14px, muted #63666A. Wording stays with the sender. */
export const DISCLAIMER_STYLE = `margin:0 0 14px;font-family:${FONT};font-size:14px;line-height:21px;color:${MUTED};text-align:left`;
export function emailDisclaimer(escapedHtml: string): string {
  return `<p class="clk-disclaimer" style="${DISCLAIMER_STYLE}">${escapedHtml}</p>`;
}

/**
 * The one primary call to action, centered in the card: a bulletproof button (table + VML for Outlook, both inside a
 * centered cell) with a descriptive fallback link under it ("Open secure payment link"), never the raw URL. The
 * destination is identical in all three places; the plain-text version of each email keeps the full URL.
 * `data-cta="primary"` lets tests assert there is at most one per email.
 */
export function emailButton(label: string, href: string, linkText: string): string {
  const l = esc(label);
  const h = esc(href);
  return (
    `<table role="presentation" align="center" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px" data-cta="primary"><tr><td align="center" style="text-align:center">` +
    `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${h}" style="height:44px;v-text-anchor:middle;width:260px;" arcsize="18%" stroke="f" fillcolor="${BRAND_BLUE}"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${l}</center></v:roundrect><![endif]-->` +
    `<!--[if !mso]><!-- --><a href="${h}" class="clk-btn" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-family:${FONT};font-size:16px;font-weight:600;line-height:44px;padding:0 24px;border-radius:8px;text-decoration:none;mso-hide:all">${l}</a><!--<![endif]-->` +
    `</td></tr></table>` +
    `<p class="clk-muted clk-fallback" align="center" style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};text-align:center"><a href="${h}" style="color:${BRAND_BLUE}">${esc(linkText)}</a></p>`
  );
}

/** Structured body for templates that opt in: H1, short paragraphs (already-escaped HTML), one CTA, a footnote. */
export function emailContent(opts: { heading?: string; paragraphs: string[]; cta?: { label: string; url: string; linkText: string }; footnote?: string }): string {
  const h1 = opts.heading
    ? `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${TEXT}">${esc(opts.heading)}</h1>`
    : '';
  const body = opts.paragraphs.map((p) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:24px;color:${TEXT}">${p}</p>`).join('');
  const cta = opts.cta ? emailButton(opts.cta.label, opts.cta.url, opts.cta.linkText) : '';
  const foot = opts.footnote ? emailDisclaimer(opts.footnote) : '';
  return h1 + body + cta + foot;
}

/**
 * Don't rely on inheritance: give every text element in a sender's body an inline color when it has none (body
 * text; links brand blue). Elements that already set a color keep it. Backgrounds are left alone (an inner cell may
 * sit on a tinted box). Conditional-comment (VML) markup has its own colors and is not matched.
 */
const TEXT_TAGS = /<(h[1-6]|p|li|ul|ol|td|th|span|div|strong|b|em|i|small|label|blockquote|a)\b([^>]*)>/gi;
export function inlineTextColors(html: string): string {
  return html.replace(TEXT_TAGS, (whole: string, tag: string, attrs: string) => {
    const color = tag.toLowerCase() === 'a' ? BRAND_BLUE : TEXT;
    const m = attrs.match(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/i);
    if (!m) return `<${tag}${attrs} style="color:${color}">`;
    if (/(^|;)\s*color\s*:/i.test(m[2]!)) return whole;
    const own = m[2]!.trim().replace(/;\s*$/, '');
    const style = own ? `${own};color:${color}` : `color:${color}`;
    return `<${tag}${attrs.replace(m[0], ` style=${m[1]}${style}${m[1]}`)}>`;
  });
}

/** Strip an outer <html>/<body> document so a full legacy page can sit inside the card. */
function innerBody(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return (m ? m[1]! : html).replace(/<!doctype[^>]*>/gi, '').replace(/<\/?(html|head)[^>]*>/gi, '');
}

export function isWrapped(html: string): boolean {
  return html.includes(LAYOUT_MARKER);
}

/** The full document: gray page, white card, logo, body, footer. Idempotent. */
export function renderEmailLayout(opts: { html: string; preheader?: string }): string {
  if (isWrapped(opts.html)) return opts.html;
  const app = emailAppUrl();
  const assets = emailAssetBase();
  const pre = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(opts.preheader)}</div>`
    : '';
  return `<!doctype html>
<html lang="en" ${LAYOUT_MARKER} style="color-scheme:light only;background:${PAGE_BG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>CareLinkAI</title>
<style>
  :root { color-scheme: light only; supported-color-schemes: light only; }
  body { margin:0; padding:0; background:${PAGE_BG}; color:${TEXT}; }
  a { color:${BRAND_BLUE}; }
  @media (max-width: 620px) { .clk-card-pad { padding:24px 20px !important; } }
</style>
</head>
<body bgcolor="${PAGE_BG}" style="margin:0;padding:0;background:${PAGE_BG};background-color:${PAGE_BG};color:${TEXT}">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE_BG}" class="clk-page" style="background:${PAGE_BG};background-color:${PAGE_BG};color:${TEXT}">
<tr><td align="center" bgcolor="${PAGE_BG}" style="padding:24px 12px;background:${PAGE_BG};background-color:${PAGE_BG};color:${TEXT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE_BG}" style="max-width:600px;background:${PAGE_BG};background-color:${PAGE_BG};color:${TEXT}">
  <tr><td align="center" bgcolor="${PAGE_BG}" style="padding:4px 4px 16px;text-align:center;background:${PAGE_BG};background-color:${PAGE_BG};color:${TEXT}">
    <a href="${app}" style="text-decoration:none;color:${TEXT}">
      <img src="${assets}/images/email-logo.png" width="${LOGO_W}" height="${LOGO_H}" alt="CareLinkAI" style="display:inline-block;border:0;width:${LOGO_W}px;height:${LOGO_H}px;font-family:${FONT};font-size:18px;font-weight:700;color:${TEXT}">
    </a>
  </td></tr>
  <tr><td class="clk-card clk-card-pad" align="left" bgcolor="${CARD_BG}" style="text-align:left;background:${CARD_BG};background-color:${CARD_BG};border:1px solid ${CARD_BORDER};border-radius:12px;padding:32px;font-family:${FONT};font-size:16px;line-height:24px;color:${TEXT}">
${inlineTextColors(innerBody(opts.html))}
  </td></tr>
  <tr><td class="clk-footer" bgcolor="${PAGE_BG}" style="padding:20px 4px 8px;background:${PAGE_BG};background-color:${PAGE_BG};font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED}" align="center">
    <span style="color:${MUTED}">CareLinkAI · Cleveland, Ohio · </span><a href="tel:+12162459482" style="color:${MUTED};text-decoration:none">${PHONE}</a><br>
    <a href="${app}" style="color:${MUTED}">getcarelinkai.com</a><span style="color:${MUTED}"> · </span><a href="${app}/privacy" style="color:${MUTED}">Privacy</a><span style="color:${MUTED}"> · </span><a href="${app}/terms" style="color:${MUTED}">Terms</a>
  </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Strip emoji (pictographs, dingbats, flags, variation selectors) from a subject or heading. */
export function stripEmoji(s: string): string {
  return s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
