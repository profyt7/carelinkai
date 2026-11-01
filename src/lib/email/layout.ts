/**
 * One branded layout for every transactional email (feat/email-design). Visual only: wording, recipients and
 * timing stay with each sender. Clean card style:
 *  - light gray page (#F4F5F7), centered white card (max 600px, rounded, 1px #E9EAED border);
 *  - CareLinkAI logo PNG hosted on our domain (alt text; the white-wordmark version in dark mode where the client
 *    supports it); nothing in the logo is needed to understand the email;
 *  - Inter / Segoe UI / Roboto / Arial; at most ONE primary CTA, a bulletproof table button (VML for Outlook) with a
 *    plain-text link under it;
 *  - footer: "CareLinkAI · Cleveland, Ohio · (216) 245-9482", getcarelinkai.com, privacy and terms. No unsubscribe
 *    here; marketing emails keep their own preference/unsubscribe lines inside the body.
 * guardedResendSend wraps every HTML email that isn't already wrapped (LAYOUT_MARKER), so senders that only build a
 * body get the shell automatically. Plain-text versions are never touched.
 */

export const BRAND_BLUE = '#3978FC';
export const LAYOUT_MARKER = 'data-clk-layout="1"';
const PAGE_BG = '#F4F5F7';
const CARD_BORDER = '#E9EAED';
const TEXT = '#1F2937';
const MUTED = '#6B7280';
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
 * Email-sized logos (2× files, explicit width/height so clients reserve the space):
 *  - email-logo.png 296×76 → 148×38, with a thin white edge so the navy wordmark stays readable when an app forces a
 *    dark background;
 *  - email-logo-on-dark.png 296×70 → 148×35, the white wordmark for the dark-mode swap.
 */
const LOGO_W = 148;
const LOGO_H = 38;
const LOGO_DARK_H = 35;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The one primary call to action: a bulletproof button (table + VML for Outlook) with a plain-text link fallback.
 * `data-cta="primary"` lets tests assert there is at most one per email.
 */
export function emailButton(label: string, href: string): string {
  const l = esc(label);
  const h = esc(href);
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px" data-cta="primary"><tr><td align="left">` +
    `<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${h}" style="height:44px;v-text-anchor:middle;width:260px;" arcsize="18%" stroke="f" fillcolor="${BRAND_BLUE}"><w:anchorlock/><center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${l}</center></v:roundrect><![endif]-->` +
    `<!--[if !mso]><!-- --><a href="${h}" class="clk-btn" style="display:inline-block;background:${BRAND_BLUE};color:#ffffff;font-family:${FONT};font-size:16px;font-weight:600;line-height:44px;padding:0 24px;border-radius:8px;text-decoration:none;mso-hide:all">${l}</a><!--<![endif]-->` +
    `</td></tr></table>` +
    `<p class="clk-muted" style="margin:0 0 16px;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED}">Or open this link: <a href="${h}" style="color:${BRAND_BLUE};word-break:break-all">${h}</a></p>`
  );
}

/** Structured body for templates that opt in: H1, short paragraphs (already-escaped HTML), one CTA, a footnote. */
export function emailContent(opts: { heading?: string; paragraphs: string[]; cta?: { label: string; url: string }; footnote?: string }): string {
  const h1 = opts.heading
    ? `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${TEXT}">${esc(opts.heading)}</h1>`
    : '';
  const body = opts.paragraphs.map((p) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:24px;color:${TEXT}">${p}</p>`).join('');
  const cta = opts.cta ? emailButton(opts.cta.label, opts.cta.url) : '';
  const foot = opts.footnote ? `<p class="clk-muted" style="margin:16px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED}">${opts.footnote}</p>` : '';
  return h1 + body + cta + foot;
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
<html lang="en" ${LAYOUT_MARKER}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>CareLinkAI</title>
<style>
  body { margin:0; padding:0; background:${PAGE_BG}; }
  a { color:${BRAND_BLUE}; }
  .clk-logo-dark { display:none; }
  @media (prefers-color-scheme: dark) {
    body, .clk-page { background:#111318 !important; }
    .clk-card { background:#1B1E24 !important; border-color:#2C3038 !important; }
    .clk-card, .clk-card p, .clk-card li, .clk-card td, .clk-card h1, .clk-card h2, .clk-card h3, .clk-card strong { color:#E8EAED !important; }
    .clk-muted, .clk-footer, .clk-footer a { color:#A0A6B0 !important; }
    .clk-card a { color:#7EA6FF !important; }
    .clk-card a.clk-btn { color:#ffffff !important; background:${BRAND_BLUE} !important; }
    .clk-logo-light { display:none !important; }
    .clk-logo-dark { display:inline-block !important; }
  }
  [data-ogsc] .clk-logo-light { display:none !important; }
  [data-ogsc] .clk-logo-dark { display:inline-block !important; }
  @media (max-width: 620px) { .clk-card-pad { padding:24px 20px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG}">
${pre}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="clk-page" style="background:${PAGE_BG}">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
  <tr><td align="left" style="padding:4px 4px 16px">
    <a href="${app}" style="text-decoration:none">
      <img src="${assets}/images/email-logo.png" width="${LOGO_W}" height="${LOGO_H}" alt="CareLinkAI" class="clk-logo-light" style="display:inline-block;border:0;width:${LOGO_W}px;height:${LOGO_H}px;font-family:${FONT};font-size:18px;font-weight:700;color:${TEXT}">
      <img src="${assets}/images/email-logo-on-dark.png" width="${LOGO_W}" height="${LOGO_DARK_H}" alt="CareLinkAI" class="clk-logo-dark" style="display:none;border:0;width:${LOGO_W}px;height:${LOGO_DARK_H}px;font-family:${FONT};font-size:18px;font-weight:700;color:#ffffff">
    </a>
  </td></tr>
  <tr><td class="clk-card clk-card-pad" style="background:#ffffff;border:1px solid ${CARD_BORDER};border-radius:12px;padding:32px;font-family:${FONT};font-size:16px;line-height:24px;color:${TEXT}">
${innerBody(opts.html)}
  </td></tr>
  <tr><td class="clk-footer" style="padding:20px 4px 8px;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED}" align="center">
    CareLinkAI · Cleveland, Ohio · <a href="tel:+12162459482" style="color:${MUTED};text-decoration:none">${PHONE}</a><br>
    <a href="${app}" style="color:${MUTED}">getcarelinkai.com</a> · <a href="${app}/privacy" style="color:${MUTED}">Privacy</a> · <a href="${app}/terms" style="color:${MUTED}">Terms</a>
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
