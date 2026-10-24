/**
 * Follow-up to OL-171–174:
 *  (1) /homes/[id] has no mock mode — no cookie / runtime toggle, no hard-coded
 *      "Sunshine Care Home" listing — so production can never render mock data;
 *  (2) /learn and the listing share one CareCredit block: "Financing option
 *      (CareCredit)" + the not-affiliated line, never "partnered with";
 *  (3) the listing's sticky bar and booking sidebar sit below the sticky site
 *      header via --site-header-h, which both public shells set.
 */
import fs from 'fs';
import path from 'path';
import { CARECREDIT_DISCLOSURE, CARECREDIT_TITLE } from '@/lib/financing/carecredit';
import { SITE_HEADER_HEIGHT_PX } from '@/components/site/SiteHeader';

const root = path.join(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('(1) listing page has no mock mode', () => {
  const src = read('src/app/homes/[id]/page.tsx');

  it('carries no mock listing, cookie check or runtime mock toggle', () => {
    for (const banned of ['MOCK_HOME', 'runtime/mocks', 'carelink_mock_mode', 'showMock', 'Sunshine Care Home', 'San Francisco', '123 Maple']) {
      expect({ banned, found: src.includes(banned) }).toEqual({ banned, found: false });
    }
  });

  it('always loads the real listing from /api/homes/:id', () => {
    expect(src).toMatch(/fetch\(`\/api\/homes\/\$\{id\}/);
  });
});

describe('(2) CareCredit wording', () => {
  it('says "Financing option" and that we are not affiliated', () => {
    expect(CARECREDIT_TITLE).toBe('Financing option (CareCredit)');
    expect(CARECREDIT_DISCLOSURE).toMatch(/not affiliated/);
  });

  it('/learn and the listing both render the shared title + disclosure; no page claims a partnership', () => {
    for (const p of ['src/app/learn/page.tsx', 'src/app/homes/[id]/page.tsx']) {
      const src = read(p);
      expect(src).toContain('{CARECREDIT_TITLE}');
      expect(src).toContain('{CARECREDIT_DISCLOSURE}');
      expect(src).toContain('data-testid="carecredit-disclosure"');
      expect(src).not.toMatch(/partner(ed|s|ship)? with CareCredit/i);
    }
  });
});

describe('(3) listing sticky bar clears the sticky site header', () => {
  it('the header has a fixed height and both shells expose it as --site-header-h', () => {
    expect(SITE_HEADER_HEIGHT_PX).toBe(65);
    expect(read('src/components/site/SiteHeader.tsx')).toMatch(/className="[^"]*\bh-16\b/);
    for (const p of ['src/components/site/SiteShell.tsx', 'src/components/layout/PublicShell.tsx']) {
      expect(read(p)).toMatch(/--site-header-h[\s\S]*SITE_HEADER_HEIGHT_PX/);
    }
  });

  it('the listing sticky bar and booking sidebar offset by --site-header-h', () => {
    const src = read('src/app/homes/[id]/page.tsx');
    expect(src).toMatch(/sticky top-\[var\(--site-header-h,0px\)\][^"]*" data-testid="listing-sticky-bar"/);
    expect(src).toContain('sticky top-[calc(var(--site-header-h,0px)+5rem)]');
    expect(src).not.toMatch(/sticky top-0\b/);
  });
});
