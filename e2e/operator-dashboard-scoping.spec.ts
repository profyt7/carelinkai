import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

// Regression suite for the 2026-05-18 dashboard scoping incident:
// API routes were returning cross-operator aggregates with no WHERE clause.
// Extended 2026-05-31 to cover leads and pipeline endpoints found in follow-up audit.
//
// Pattern: seed 2 operators, call APIs as each, assert isolation.

async function seedOperator(request: any, email: string, name: string, homeCount = 0) {
  const homes = Array.from({ length: homeCount }, (_, i) => ({
    name: `${name} Home ${i + 1}`,
    capacity: 10,
  }));
  const res = await request.post('/api/dev/upsert-operator', {
    data: { email, companyName: name, ...(homes.length ? { homes } : {}) },
  });
  expect(res.ok()).toBeTruthy();
}

async function acceptBaa(page: any) {
  const status = await page.evaluate(async () => {
    const r = await fetch('/api/acceptance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ acceptedBaa: true, acceptedDpa: true }),
    });
    return r.status;
  });
  // 200 = newly accepted; any 2xx acceptable. 400 means already current — both fine.
  expect(status).toBeLessThan(500);
}

test.describe('@critical Operator dashboard scoping (regression 2026-05-18)', () => {
  test('operator A sees only their residents/inquiries — /api/dashboard/metrics isolated', async ({ page, request }) => {
    const opA = `scope-metrics-a-${Date.now()}@test.carelinkai.com`;
    const opB = `scope-metrics-b-${Date.now()}@test.carelinkai.com`;

    await seedOperator(request, opA, 'Scope Metrics A', 3);
    await seedOperator(request, opB, 'Scope Metrics B', 5);

    for (const email of [opA, opB]) {
      await loginAs(page, email);
      await acceptBaa(page);
    }

    // --- Operator A ---
    await loginAs(page, opA);
    const metricsA = await page.evaluate(async () => {
      const r = await fetch('/api/dashboard/metrics', { credentials: 'include' });
      return r.json();
    });
    // upsert-operator seeds homes but NO residents — must be 0, not cross-tenant total
    expect(metricsA.totalResidents?.value).toBe(0);
    expect(metricsA.pendingInquiries?.value).toBe(0);

    // --- Operator B ---
    await loginAs(page, opB);
    const metricsB = await page.evaluate(async () => {
      const r = await fetch('/api/dashboard/metrics', { credentials: 'include' });
      return r.json();
    });
    expect(metricsB.totalResidents?.value).toBe(0);
    expect(metricsB.pendingInquiries?.value).toBe(0);
  });

  test('/api/dashboard/charts conversion funnel is zero for brand-new operator', async ({ page, request }) => {
    const opEmail = `scope-charts-${Date.now()}@test.carelinkai.com`;
    await seedOperator(request, opEmail, 'Scope Charts Op', 2);
    await loginAs(page, opEmail);
    await acceptBaa(page);

    const charts = await page.evaluate(async () => {
      const r = await fetch('/api/dashboard/charts', { credentials: 'include' });
      return r.json();
    });

    const funnelTotal = (charts.conversionFunnel as Array<{ count: number }>)
      ?.reduce((sum, s) => sum + (s.count ?? 0), 0) ?? 0;
    expect(funnelTotal).toBe(0);
  });

  test('/api/operator/leads returns empty list for brand-new operator (Bug 2026-05-31)', async ({ page, request }) => {
    const opA = `scope-leads-a-${Date.now()}@test.carelinkai.com`;
    const opB = `scope-leads-b-${Date.now()}@test.carelinkai.com`;

    await seedOperator(request, opA, 'Leads Scope A');
    await seedOperator(request, opB, 'Leads Scope B');

    await loginAs(page, opA);
    await acceptBaa(page);

    const leadsA = await page.evaluate(async () => {
      const r = await fetch('/api/operator/leads', { credentials: 'include' });
      return r.json();
    });

    // A brand-new operator with no leads assigned to them must see 0 leads,
    // not the full cross-operator lead list.
    expect(leadsA.data?.pagination?.total ?? leadsA.data?.leads?.length ?? 0).toBe(0);
  });

  test('/api/operator/inquiries/pipeline returns zero stats for operator with no homes (Bug 2026-05-31)', async ({ page, request }) => {
    const opEmail = `scope-pipeline-${Date.now()}@test.carelinkai.com`;
    // Seed operator with NO homes — tests the empty homeIds edge case
    await seedOperator(request, opEmail, 'Pipeline Scope Op', 0);
    await loginAs(page, opEmail);
    await acceptBaa(page);

    const pipeline = await page.evaluate(async () => {
      const r = await fetch('/api/operator/inquiries/pipeline', { credentials: 'include' });
      return r.json();
    });

    // An operator with no homes must see 0 total, not platform-wide counts
    expect(pipeline.stats?.total ?? 0).toBe(0);
  });

  test('operator without BAA acceptance is redirected from /dashboard to /legal/acceptance (Bug B)', async ({ page, request }) => {
    const opEmail = `scope-baa-gate-${Date.now()}@test.carelinkai.com`;
    await seedOperator(request, opEmail, 'BAA Gate Test');
    await loginAs(page, opEmail);

    // Navigate directly to /dashboard without accepting BAA
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/legal\/acceptance/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/legal\/acceptance/);
  });
});
