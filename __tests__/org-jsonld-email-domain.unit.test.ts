/**
 * OL-196 — the Organization JSON-LD carries the company's real address, phone,
 * email and service counties; no outward-facing address or link uses the
 * carelinkai.com domain (we own getcarelinkai.com).
 */
import fs from 'fs';
import path from 'path';
import { buildOrganizationJsonLd } from '@/lib/seo/jsonld';

const root = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('Organization JSON-LD (OL-196)', () => {
  const org = buildOrganizationJsonLd({ includeFeeModel: false }) as Record<string, any>;

  it('has the Canton mailing address, phone and email', () => {
    expect(org['address']).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '6545 Market Ave North, STE 100',
      addressLocality: 'Canton',
      addressRegion: 'OH',
      postalCode: '44721',
      addressCountry: 'US',
    });
    expect(org['telephone']).toBe('+12162459482');
    expect(org['email']).toBe('chris@getcarelinkai.com');
    expect(org['contactPoint']).toMatchObject({ telephone: '+12162459482', email: 'chris@getcarelinkai.com' });
  });

  it('serves exactly the six Northeast Ohio counties', () => {
    expect(org['areaServed']).toEqual(
      ['Cuyahoga', 'Lake', 'Geauga', 'Medina', 'Summit', 'Lorain'].map((c) => ({ '@type': 'AdministrativeArea', name: `${c} County, Ohio` })),
    );
  });
});

describe('no carelinkai.com contact addresses or links (OL-196)', () => {
  const OUTWARD_FILES = [
    'src/app/operator/acceptance/page.tsx',
    'src/app/api/admin/settings/route.ts',
    'src/app/api/discharge-planner/placement-request/route.ts',
    'src/app/api/push/subscribe/route.ts',
    'src/app/api/push/send/route.ts',
    'src/lib/notifications/tour-notifications.ts',
    'src/lib/email-templates.ts',
    'src/lib/email/inquiry-email-service.ts',
    'src/lib/email/transactional.ts',
    'public/offline.html',
    'scripts/generate-vapid.js',
    '.env.example',
  ];
  it.each(OUTWARD_FILES)('%s uses getcarelinkai.com only', (f) => {
    // A bare "carelinkai.com" not preceded by "get" (addresses and links alike).
    expect(read(f)).not.toMatch(/(?<!get)carelinkai\.com/i);
  });
});
