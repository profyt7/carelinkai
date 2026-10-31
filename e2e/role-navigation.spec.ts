import { test, expect, type Page } from '@playwright/test';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { flattenNav, getMobileTabIds, getNavForRole, type NavItem } from '../src/config/navigation';

/**
 * OL-206 — per-role navigation on the real app shell. For each of the 8 roles:
 * sign in, open /dashboard, and check the sidebar tone, the top-level labels,
 * that every destination the role has (context/NAV_ROUTE_MAPPING.md, enforced
 * by __tests__/navigation-role-parity.unit.test.ts) is a link in the sidebar,
 * and the 4 + More bottom bar at 390px.
 */

type RoleCase = {
  role: string;
  tone: 'navy' | 'light';
  /** Top-level labels in order; `[label, paidFeature]` drops out while that feature is off. */
  labels: Array<string | [string, string]>;
  seed: (page: Page, email: string) => Promise<void>;
};

const prisma = new PrismaClient();
// CI runs one `next dev` server for the whole job: the first hit on a route compiles it,
// which can take well past Playwright's default request timeout under load.
const REQ_TIMEOUT = 180_000;

const devUpsert = (endpoint: string, extra: Record<string, unknown> = {}) => async (page: Page, email: string) => {
  const r = await page.request.post(`/api/dev/${endpoint}`, { data: { email, ...extra }, timeout: REQ_TIMEOUT });
  expect(r.ok(), `${endpoint} ${r.status()}`).toBeTruthy();
};

// STAFF / PROVIDER / AFFILIATE have no dev upsert endpoint; a bare user row is
// all the nav needs (the role comes from the session).
const dbUpsert = (role: UserRole) => async (_page: Page, email: string) => {
  await prisma.user.upsert({
    where: { email },
    update: { role, status: UserStatus.ACTIVE },
    create: { email, role, status: UserStatus.ACTIVE, firstName: 'Nav', lastName: role, emailVerified: new Date() },
  });
};

const OPERATOR_LABELS = ['Dashboard', 'Communities', 'Inquiries & Tours', 'Residents', 'Family', 'Staffing', 'Operations', 'Reports & Insights', 'Messages', 'Learn', 'Help', 'Settings'];

const CASES: RoleCase[] = [
  {
    role: 'FAMILY',
    tone: 'light',
    labels: ['Home', 'Find Care', 'AI Match', 'Saved Homes', 'My Inquiries', 'Tours', 'Hire a Caregiver', 'Messages', 'Care Resources', 'Account', 'More'],
    seed: devUpsert('upsert-family'),
  },
  { role: 'OPERATOR', tone: 'navy', labels: OPERATOR_LABELS, seed: devUpsert('upsert-operator', { companyName: 'Nav Ops', homes: [{ name: 'Nav Home', capacity: 4 }] }) },
  { role: 'STAFF', tone: 'navy', labels: OPERATOR_LABELS.filter((l) => l !== 'Reports & Insights'), seed: dbUpsert(UserRole.STAFF) },
  { role: 'ADMIN', tone: 'navy', labels: [...OPERATOR_LABELS.slice(0, 8), 'Admin', ...OPERATOR_LABELS.slice(8)], seed: devUpsert('upsert-admin') },
  {
    role: 'CAREGIVER',
    tone: 'light',
    labels: ['Overview', 'Find Work', 'My Applications', 'Shifts', 'Earnings', 'Messages', 'Settings', 'More'],
    seed: devUpsert('upsert-caregiver'),
  },
  {
    role: 'DISCHARGE_PLANNER',
    tone: 'navy',
    labels: ['Overview', 'Find Placement', 'Care Concierge', 'Messages', 'Learn', 'Settings', 'More'],
    seed: devUpsert('upsert-discharge-planner'),
  },
  {
    role: 'PROVIDER',
    tone: 'light',
    labels: ['Overview', 'Rides', 'Credentials', ['Billing', 'PROVIDER_LISTING'], 'Messages', 'Settings', 'More'],
    seed: dbUpsert(UserRole.PROVIDER),
  },
  {
    role: 'AFFILIATE',
    tone: 'light',
    labels: ['Overview', 'Affiliate Dashboard', 'Messages', 'Settings', 'More'],
    seed: dbUpsert(UserRole.AFFILIATE),
  },
];

const LEGACY_ADMIN_HREFS = [
  '/admin/users', '/admin/operators', '/admin/caregivers', '/admin/homes', '/admin/home-claims', '/admin/inquiries', '/admin/affiliates', '/admin/discharge-planners',
  '/admin/concierge', '/admin/concierge/metrics', '/admin/checkout-preflight', '/admin/dp-leads', '/admin/availability-pings', '/admin/call-qa',
  '/admin/inbound-leads', '/admin/analytics', '/admin/analytics/funnel', '/admin/audit-logs', '/admin/phi-access', '/admin/exports', '/admin/system-health', '/admin/tools',
];

test.describe.configure({ mode: 'serial' });
test.afterAll(async () => prisma.$disconnect());

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
      localStorage.setItem('carelinkai_onboarding_completed', 'true');
      for (const r of ['FAMILY', 'ADMIN', 'OPERATOR', 'STAFF', 'CAREGIVER', 'DISCHARGE_PLANNER', 'PROVIDER', 'AFFILIATE']) localStorage.setItem(`carelinkai_onboarding_completed_${r}`, 'true');
      // Start each test from the defaults (every group collapsed), once per tab so a reload keeps saved toggles.
      if (!sessionStorage.getItem('ol206-nav-reset')) {
        localStorage.removeItem('carelinkai-nav-collapsed');
        sessionStorage.setItem('ol206-nav-reset', '1');
      }
    } catch {}
  });
});

for (const c of CASES) {
  test(`${c.role}: role navigation on the app shell`, async ({ page }) => {
    test.setTimeout(480_000); // cold compiles on the shared CI dev server
    const email = `ol206-e2e-${c.role.toLowerCase()}@test.carelinkai.com`;
    await c.seed(page, email);

    await page.setViewportSize({ width: 1280, height: 900 });
    // Log in through the page's request context: it shares the browser's cookie jar, so no
    // page (and no homepage compile) is needed just to get an origin for fetch().
    const login = await page.request.post('/api/dev/login', { data: { email }, timeout: REQ_TIMEOUT });
    expect(login.status()).toBe(200);
    const paid = (await (await page.request.get('/api/paid-features', { timeout: REQ_TIMEOUT })).json().catch(() => ({}))) as Record<string, boolean>;
    const opts = { paidFeatures: paid, marketplaceEnabled: process.env.NEXT_PUBLIC_MARKETPLACE_ENABLED !== 'false' };

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 180_000 });
    const aside = page.locator('aside[data-tone]');
    await expect(aside).toBeVisible({ timeout: 120_000 });
    await expect(aside).toHaveAttribute('data-tone', c.tone);

    // Top-level labels, in order.
    const nav = aside.locator('nav[aria-label="Main navigation"]');
    await expect(nav.locator('a[href="/dashboard"]')).toBeVisible();
    const expectedLabels = c.labels.filter((l) => typeof l === 'string' || paid[l[1]] === true).map((l) => (typeof l === 'string' ? l : l[0]));
    // Polled: until the session (and /api/paid-features) loads, the nav shows the role-less default.
    const expectRoleLabels = () =>
      expect
        .poll(
          () =>
            nav.evaluate((el) =>
              Array.from(el.children).map((n) => ((n.matches('a,button') ? n : n.querySelector('a,button')) as HTMLElement | null)?.textContent?.trim() ?? ''),
            ),
          { timeout: 60_000 },
        )
        .toEqual(expectedLabels);
    await expectRoleLabels();

    // Every destination for this role is a link in the (expanded) sidebar, and nothing else is.
    const tree = getNavForRole(c.role, opts);
    const expectedHrefs = flattenNav(tree).map((i: NavItem) => i.href);
    const moreGroup = tree.find((i) => i.id === 'more');
    expect(!!moreGroup).toBe(c.role !== 'OPERATOR' && c.role !== 'STAFF' && c.role !== 'ADMIN');
    if (moreGroup) expect(tree[tree.length - 1].id).toBe('more');

    // Every group starts collapsed (nothing inside is active on the dashboard); expand them all.
    const groups = tree.filter((i) => i.children);
    const toggle = (id: string) => nav.locator(`[data-nav-group="${id}"] > button`);
    for (const g of groups) {
      await expect(toggle(g.id)).toHaveAttribute('aria-expanded', 'false');
      for (const child of g.children ?? []) await expect(nav.locator(`[data-nav-group="${g.id}"] a[href="${child.href}"]`)).toHaveCount(0);
      await toggle(g.id).click();
      await expect(toggle(g.id)).toHaveAttribute('aria-expanded', 'true');
    }
    if (groups.length) {
      // The manual expand is saved and wins over the collapsed default after a reload.
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(aside).toBeVisible({ timeout: 120_000 });
      await expectRoleLabels();
      for (const g of groups) await expect(toggle(g.id)).toHaveAttribute('aria-expanded', 'true');
    }
    const hrefs = await nav.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect([...new Set(hrefs)].sort()).toEqual([...new Set(expectedHrefs)].sort());

    if (c.role === 'ADMIN') {
      const adminHrefs = await nav.locator('[data-nav-group="Admin"] ul a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      expect(adminHrefs.filter((h) => h?.startsWith('/admin/'))).toEqual(LEGACY_ADMIN_HREFS);
    }

    // Phone: 4 tabs + More.
    await page.setViewportSize({ width: 390, height: 844 });
    const bar = page.locator('nav.mobile-tab-bar');
    await expect(bar).toBeVisible();
    await expect(aside).toBeHidden();
    const leaves = flattenNav(tree);
    const expectedTabs = getMobileTabIds(c.role, opts).map((id) => leaves.find((i) => i.id === id)?.href);
    expect(expectedTabs).toHaveLength(4);
    expect(await bar.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(expectedTabs);
    await expect(bar.getByRole('button', { name: 'More navigation' })).toBeVisible();

    // More opens the drawer with the same groups expanded. A real pointer click
    // (OL-208): the floating widgets sit above the tab bar via --bottom-stack-offset,
    // so nothing intercepts the tap — Playwright fails the click if anything does.
    const more = bar.getByRole('button', { name: 'More navigation' });
    await expect
      .poll(() => more.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      }))
      .toBe(true);
    await more.click();
    const drawer = page.locator('[data-nav-drawer]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('data-tone', c.tone);
    if (moreGroup) {
      // The drawer starts every group at its default, so More is collapsed here too.
      const drawerMore = drawer.locator('[data-nav-group="more"] > button');
      await expect(drawerMore).toHaveAttribute('aria-expanded', 'false');
      await drawerMore.focus();
      await page.keyboard.press('Enter');
      await expect(drawerMore).toHaveAttribute('aria-expanded', 'true');
    }
    const drawerHrefs = await drawer.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect([...new Set(drawerHrefs)].sort()).toEqual([...new Set(expectedHrefs)].sort());
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
}
