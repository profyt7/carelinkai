import {
  visibleAudiences,
  canViewGuide,
  filterGuidesForRole,
} from '@/lib/howto/access';
import { HOWTO_GUIDES, type HowToGuide } from '@/app/learn/howto/content';

const guide = (audiences: HowToGuide['audiences']): HowToGuide => ({
  slug: 'x',
  title: 'X',
  audiences,
  icon: '🧪',
  whoFor: 'test',
  summary: 'test',
  readTime: '1 min',
  steps: [],
});

describe('visibleAudiences', () => {
  it('always includes getting-started and family for signed-out viewers', () => {
    const set = visibleAudiences(null);
    expect(set.has('getting-started')).toBe(true);
    expect(set.has('family')).toBe(true);
    expect(set.has('operator')).toBe(false);
    expect(set.has('discharge-planner')).toBe(false);
  });

  it('adds the role-specific audience for each role', () => {
    expect(visibleAudiences('OPERATOR').has('operator')).toBe(true);
    expect(visibleAudiences('CAREGIVER').has('caregiver')).toBe(true);
    expect(visibleAudiences('PROVIDER').has('provider')).toBe(true);
    expect(visibleAudiences('DISCHARGE_PLANNER').has('discharge-planner')).toBe(true);
  });

  it('does not leak other roles to a given role', () => {
    const operator = visibleAudiences('OPERATOR');
    expect(operator.has('caregiver')).toBe(false);
    expect(operator.has('discharge-planner')).toBe(false);
  });

  it('lets admin/staff see all role audiences', () => {
    for (const a of ['operator', 'caregiver', 'provider', 'discharge-planner'] as const) {
      expect(visibleAudiences('ADMIN').has(a)).toBe(true);
      expect(visibleAudiences('STAFF').has(a)).toBe(true);
    }
  });

  it('treats affiliates as shared+family only (affiliate content deferred)', () => {
    const aff = visibleAudiences('AFFILIATE');
    expect(aff.has('getting-started')).toBe(true);
    expect(aff.has('family')).toBe(true);
    expect(aff.has('operator')).toBe(false);
  });
});

describe('canViewGuide / filterGuidesForRole', () => {
  it('hides operator guides from families', () => {
    expect(canViewGuide(guide(['operator']), 'FAMILY')).toBe(false);
    expect(canViewGuide(guide(['family']), 'FAMILY')).toBe(true);
    expect(canViewGuide(guide(['getting-started']), null)).toBe(true);
  });

  it('an operator sees shared/family + operator guides but not caregiver guides', () => {
    const visible = filterGuidesForRole(HOWTO_GUIDES, 'OPERATOR').map((g) => g.slug);
    // operator-only guide is visible
    expect(visible).toContain('leads-and-inquiries-pipeline');
    // caregiver-only guide is hidden
    expect(visible).not.toContain('profile-and-credentials');
    // shared + family always visible
    expect(visible).toContain('signup-and-login');
    expect(visible).toContain('search-homes');
  });

  it('a family sees only shared + family guides', () => {
    const visible = filterGuidesForRole(HOWTO_GUIDES, 'FAMILY');
    const audiences = new Set(visible.flatMap((g) => g.audiences));
    expect(audiences).toEqual(new Set(['getting-started', 'family']));
    // no operator/caregiver/provider/discharge-planner content leaks to family
    for (const a of ['operator', 'caregiver', 'provider', 'discharge-planner'] as const) {
      expect(audiences.has(a)).toBe(false);
    }
  });

  it('ships the full 29-guide catalog with the expected per-role counts', () => {
    expect(HOWTO_GUIDES).toHaveLength(29);
    const byAudience = (a: string) => HOWTO_GUIDES.filter((g) => g.audiences.includes(a as any)).length;
    expect(byAudience('getting-started')).toBe(3);
    expect(byAudience('family')).toBe(6);
    expect(byAudience('operator')).toBe(9);
    expect(byAudience('caregiver')).toBe(6);
    expect(byAudience('provider')).toBe(3);
    expect(byAudience('discharge-planner')).toBe(2);
  });

  it('every guide has content (steps + summary) and a unique slug', () => {
    const slugs = HOWTO_GUIDES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const g of HOWTO_GUIDES) {
      expect(g.summary.length).toBeGreaterThan(0);
      expect(g.steps.length).toBeGreaterThan(0);
      expect(g.audiences.length).toBe(1);
    }
  });

  it('never exposes an audience outside the catalog (no admin/affiliate guides exist)', () => {
    const audiences = new Set(HOWTO_GUIDES.flatMap((g) => g.audiences));
    expect(audiences.has('operator')).toBe(true);
    // The HowToAudience type has no 'admin'/'affiliate' member, so by
    // construction those cannot appear in the public catalog.
    expect([...audiences].every((a) => a !== ('admin' as any))).toBe(true);
    expect([...audiences].every((a) => a !== ('affiliate' as any))).toBe(true);
  });
});
