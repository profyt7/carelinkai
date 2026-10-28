/**
 * OL-192 — /privacy and /terms show the real company contact details (from
 * src/lib/contact.ts), never the old 1-800-555-1234 / San Francisco placeholder.
 */

import { renderToStaticMarkup } from 'react-dom/server';

import PrivacyPolicyPage from '@/app/privacy/page';
import TermsOfServicePage from '@/app/terms/page';
import {
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_MAILTO,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
} from '@/lib/contact';

describe('company contact constants', () => {
  it('hold the real address, phone and email', () => {
    expect(COMPANY_ADDRESS).toBe('6545 Market Ave North, STE 100, Canton, OH 44721');
    expect(CONTACT_PHONE_DISPLAY).toBe('(216) 245-9482');
    expect(CONTACT_PHONE_TEL).toBe('tel:+12162459482');
    expect(COMPANY_EMAIL).toBe('chris@getcarelinkai.com');
    expect(COMPANY_MAILTO).toBe('mailto:chris@getcarelinkai.com');
  });
});

describe.each([
  ['/privacy', PrivacyPolicyPage],
  ['/terms', TermsOfServicePage],
])('%s contact block', (_route, Page) => {
  const html = renderToStaticMarkup(<Page />);

  it('renders the real address, phone and email with links', () => {
    expect(html).toContain('6545 Market Ave North, STE 100, Canton, OH 44721');
    expect(html).toContain('(216) 245-9482');
    expect(html).toContain('href="tel:+12162459482"');
    expect(html).toContain('chris@getcarelinkai.com');
    expect(html).toContain('href="mailto:chris@getcarelinkai.com"');
  });

  it('no longer carries the placeholder phone or address', () => {
    expect(html).not.toContain('555-1234');
    expect(html).not.toContain('San Francisco');
  });
});
