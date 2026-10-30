/**
 * Provider launch taxonomy (10/29). These fail if:
 *   - the six launch categories change, or skilled and non-medical stop being labelled apart;
 *   - a legacy stored value stops mapping to its launch category (or an ambiguous one starts to);
 *   - the search page and API stop sharing the `serviceTypes` param, or a filter stops matching aliases;
 *   - signup accepts a category outside the six;
 *   - the delivery-mode migration does more than add a column;
 *   - the homepage Providers card names a category that can't be picked and found;
 *   - docs/PROVIDER_TAXONOMY.md loses a launch or future category.
 */
import fs from 'fs';
import path from 'path';
import {
  PROVIDER_CATEGORIES, PROVIDER_CATEGORY_SUMMARY, PROVIDER_CATEGORY_VALUES, categoryDisplayLabel, categoryFor,
  parseCategoryParam, serviceLabels, storedValuesFor,
} from '@/lib/providers/categories';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('six launch categories', () => {
  it('values and labels', () => {
    expect(PROVIDER_CATEGORIES.map((c) => [c.value, c.label])).toEqual([
      ['home-health', 'Home Health Care'],
      ['personal-care', 'Personal Care & Home Assistance'],
      ['therapy', 'Physical & Rehabilitation Therapy'],
      ['transportation', 'Medical Transportation'],
      ['meal-delivery', 'Meal Delivery & Nutrition'],
      ['medical-equipment', 'Medical Equipment & Supplies'],
    ]);
  });

  it('skilled and non-medical are labelled apart', () => {
    const label = (v: string) => categoryDisplayLabel(PROVIDER_CATEGORIES.find((c) => c.value === v)!);
    expect(label('home-health')).toBe('Home Health Care (skilled, licensed)');
    expect(label('therapy')).toBe('Physical & Rehabilitation Therapy (skilled, licensed)');
    expect(label('personal-care')).toBe('Personal Care & Home Assistance (non-medical)');
    expect(PROVIDER_CATEGORIES.find((c) => c.value === 'personal-care')!.description).toMatch(/^Non-medical/);
    expect(PROVIDER_CATEGORIES.find((c) => c.value === 'home-health')!.description).toMatch(/^Skilled, licensed/);
  });
});

describe('existing → launch mapping (no stored value is rewritten)', () => {
  it.each([
    ['transportation', 'transportation'],
    ['personal-care', 'personal-care'],
    ['companionship', 'personal-care'],
    ['housekeeping', 'personal-care'],
    ['meal-prep', 'personal-care'],
    ['respite-care', 'personal-care'],
  ])('%s → %s', (stored, launch) => {
    expect(categoryFor(stored)?.value).toBe(launch);
  });

  it('ambiguous / future values map to nothing (never silently "skilled")', () => {
    expect(categoryFor('medical-services')).toBeUndefined();
    expect(categoryFor('home-modification')).toBeUndefined();
    expect(serviceLabels(['medical-services', 'home-modification'])).toEqual(['Medical services (unspecified)', 'Home modification']);
  });

  it('labels fold aliases into one category and keep legacy extras', () => {
    expect(serviceLabels(['companionship', 'housekeeping', 'therapy', 'medical-services'])).toEqual([
      'Personal Care & Home Assistance (non-medical)',
      'Physical & Rehabilitation Therapy (skilled, licensed)',
      'Medical services (unspecified)',
    ]);
  });
});

describe('search filter', () => {
  it('a category matches itself plus its aliases; old alias links expand too; unknown values match only themselves', () => {
    expect(storedValuesFor(['personal-care']).sort()).toEqual(['companionship', 'housekeeping', 'meal-prep', 'personal-care', 'respite-care']);
    expect(storedValuesFor(['companionship']).sort()).toEqual(storedValuesFor(['personal-care']).sort());
    expect(storedValuesFor(['home-health', 'therapy']).sort()).toEqual(['home-health', 'therapy']);
    expect(storedValuesFor(['medical-services'])).toEqual(['medical-services']);
  });

  it('serviceTypes is the param (serviceType/services still read)', () => {
    expect(parseCategoryParam(new URLSearchParams('serviceTypes=home-health,Therapy'))).toEqual(['home-health', 'therapy']);
    expect(parseCategoryParam(new URLSearchParams('serviceType=therapy'))).toEqual(['therapy']);
    expect(parseCategoryParam(new URLSearchParams('services=meal-delivery'))).toEqual(['meal-delivery']);
    expect(parseCategoryParam(new URLSearchParams(''))).toEqual([]);
  });

  it('page and API use the same param', () => {
    const page = read('src/app/marketplace/providers/page.tsx');
    expect(page).toContain('params.set("serviceTypes", selectedServiceTypes.join(","))');
    expect(page).toContain('PROVIDER_CATEGORIES.map');
    const api = read('src/app/api/marketplace/providers/route.ts');
    expect(api).toContain('storedValuesFor(parseCategoryParam(searchParams))');
    expect(api).toContain("where.serviceTypes = { hasSome: serviceTypeFilters }");
  });
});

describe('signup, profile, public data', () => {
  it('signup accepts only the six categories for providers', () => {
    const api = read('src/app/api/auth/register/route.ts');
    expect(api).toContain('PROVIDER_CATEGORY_VALUES.includes(s)');
    expect(api).toContain('serviceTypes: Array.from(new Set(serviceTypes ?? []))');
    expect(read('src/app/auth/register/page.tsx')).toContain('data-testid="register-provider-categories"');
  });

  it('profile offers the six categories, delivery mode and an admin-only license field', () => {
    const p = read('src/app/settings/profile/page.tsx');
    expect(p).toContain('PROVIDER_CATEGORIES.map((c) => ({ value: c.value, label: categoryDisplayLabel(c)');
    expect(p).toContain('toggleArrayValue("deliveryModes", m.value)');
    expect(p).toContain('Visible to CareLinkAI admins only');
    expect(read('src/app/api/profile/route.ts')).toContain("deliveryModes: z.array(z.enum(['in-home', 'facility', 'remote'])).max(3).optional()");
  });

  it('the license number is never in the public provider API', () => {
    const api = read('src/app/api/marketplace/providers/[id]/route.ts');
    expect(api).not.toMatch(/licenseNumber:\s*(provider|mockProvider)\.licenseNumber/);
    expect(read('src/app/api/admin/providers/[id]/route.ts')).toContain('licenseNumber: provider.licenseNumber');
  });
});

describe('schema', () => {
  it('serviceTypes is already a list (multi-category), so no data copy is needed', () => {
    expect(read('prisma/schema.prisma')).toMatch(/serviceTypes\s+String\[\]/);
  });

  it('the delivery-mode migration only adds a column', () => {
    const sql = read('prisma/migrations/20261030010000_provider_delivery_modes/migration.sql').replace(/--.*$/gm, '').trim();
    expect(sql).toBe('ALTER TABLE "Provider" ADD COLUMN "deliveryModes" TEXT[] DEFAULT ARRAY[]::TEXT[];');
  });
});

describe('homepage and docs', () => {
  it('the Providers card summary names exactly the six categories', () => {
    expect(PROVIDER_CATEGORY_SUMMARY).toBe('Home health care, personal care, therapy, medical transportation, meal delivery and medical equipment');
    const home = read('src/app/HomePageClient.tsx');
    expect(home).toContain('{`${PROVIDER_CATEGORY_SUMMARY}.`}');
    expect(home).toContain('PROVIDER_CATEGORIES.map((c) => c.label)');
    expect(home).not.toMatch(/'Physical Therapy'|'Housekeeping'|'Companionship'/);
  });

  it('docs list the six launch and eight future categories', () => {
    const doc = read('docs/PROVIDER_TAXONOMY.md');
    for (const c of PROVIDER_CATEGORIES) expect(doc).toContain(c.label);
    for (const f of ['Hospice & Palliative', 'Pharmacy & Medication', 'Home Safety & Accessibility', 'Adult Day & Respite', 'Mental Health & Counseling', 'Care Management & Placement', 'Legal & Financial', 'Moving & Downsizing']) {
      expect(doc).toContain(f);
    }
    expect(PROVIDER_CATEGORY_VALUES).toHaveLength(6);
  });
});
