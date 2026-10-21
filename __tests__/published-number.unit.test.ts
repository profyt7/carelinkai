/**
 * OL-167d — the published phone line (216) 245-9482 appears on every surface
 * Chris listed, always from the one constant in src/lib/contact.ts, and the
 * copy around it never invites patient detail by phone.
 */
import fs from 'fs';
import path from 'path';
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_E164, CONTACT_PHONE_TEL } from '@/lib/contact';
import { buildLlmsTxt } from '@/lib/seo/llms-txt';
import { buildOrganizationJsonLd } from '@/lib/seo/jsonld';
import { isPublicPage } from '@/lib/routing/public-routes';

const root = path.join(__dirname, '..');
const read = (f: string) => fs.readFileSync(path.join(root, f), 'utf8');

describe('published number', () => {
  it('constants agree', () => {
    expect(CONTACT_PHONE_DISPLAY).toBe('(216) 245-9482');
    expect(CONTACT_PHONE_E164).toBe('+12162459482');
    expect(CONTACT_PHONE_TEL).toBe('tel:+12162459482');
  });
  it('footer (public shell + homepage), /contact and /concierge (both lanes) render it from the constant with a tel: link', () => {
    for (const f of ['src/components/layout/PublicShell.tsx', 'src/app/HomePageClient.tsx', 'src/app/contact/page.tsx', 'src/app/concierge/ConciergeScreener.tsx']) {
      const src = read(f);
      expect({ f, imports: /from ['"]@\/lib\/contact['"]/.test(src), tel: /CONTACT_PHONE_TEL/.test(src), display: /CONTACT_PHONE_DISPLAY/.test(src), literal: /245-9482/.test(src) }).toEqual({ f, imports: true, tel: true, display: true, literal: false });
    }
    // Both /concierge lanes carry the line (free lane and offer panel).
    expect(read('src/app/concierge/ConciergeScreener.tsx').match(/data-testid="concierge-phone-line"/g)).toHaveLength(2);
    expect(isPublicPage('/contact')).toBe(true);
  });
  it('/llms.txt carries the contact line; Organization JSON-LD carries telephone + contactPoint', () => {
    const txt = buildLlmsTxt();
    expect(txt).toContain('Contact: (216) 245-9482 (+12162459482)');
    expect(txt).toContain('No patient details by phone');
    const org = buildOrganizationJsonLd() as Record<string, unknown>;
    expect(org['telephone']).toBe('+12162459482');
  });
  it('copy rules stay intact around the number: no "AI" pitch, no facility fee on the marketing surfaces', () => {
    for (const f of ['src/app/contact/page.tsx', 'src/lib/contact.ts', 'src/app/concierge/ConciergeScreener.tsx']) {
      const src = read(f);
      expect({ f, ai: /\bAI\b/.test(src), fee: /pays CareLinkAI a fee|move-in fee|referral fee/i.test(src) }).toEqual({ f, ai: false, fee: false });
    }
  });
});
