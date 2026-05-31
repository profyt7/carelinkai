import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

// Regression suite for the 2026-05-18 dashboard scoping incident:
// API routes were returning cross-operator aggregates with no WHERE clause.
// Extended 2026-05-31 to cover leads and pipeline endpoints found in follow-up audit.
//
// Pattern: seed operators via dev endpoint, call APIs, assert isolation.
// Note: BAA-gate redirect tests live in the BAA extension PR; not included here
// because they depend on /api/acceptance and /legal/acceptance which ship separately.

async function seedOperator(request: any, email: string, name: string) {
  const res = await request.post('/api/dev/upsert-operator', {
    data: { email, companyName: name, homes: [{ name: `${name} Home`, capacity: 10 }] },
  });
  expect(res.ok()).toBeTruthy();
}

test.describe('@critical Operator dashboard scoping (regression 2026-05-18)', () => {
  test('operator A sees only their residents/inquiries — /api/dashboard/metrics isolated', async ({ page, request }) => {
    const opA = `scope-metrics-a-${Date.now()}@test.carelinkai.com`;
    const opB = `scope-metrics-b-${Date.now()}@test.carelinkai.com`;

    await seedOperator(request, opA, 'Scope Metrics A');
    await seedOperator(request, opB, 'Scope Metrics B');

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
    await seedOperator(request, opEmail, 'Scope Charts Op');
    await loginAs(page, opEmail);

    const charts = await page.evaluate(async () => {
      const r = await fetch('/api/dashboard/charts', { credentials: 'include' });
      return r.json();
    });

    const funnelTotal = (charts.conversionFunnel as Array<{ count: number }>)
      ?.reduce((sum, s) => sum + (s.count ?? 0), 0) ?? 0;
    expect(funnelTotal).toBe(0);
  });

  test('/api/operator/leads returns empty list for brand-new operator (Bug 2026-05-31)', async ({ page, request }) => {
    const opEmail = `scope-leads-${Date.now()}@test.carelinkai.com`;
    await seedOperator(request, opEmail, 'Leads Scope Op');
    await loginAs(page, opEmail);

    const leads = await page.evaluate(async () => {
      const r = await fetch('/api/operator/leads', { credentials: 'include' });
      return r.json();
    });

    // A brand-new operator with no leads must see 0, not the full cross-operator list.
    expect(leads.data?.pagination?.total ?? leads.data?.leads?.length ?? 0).toBe(0);
  });

  test('/api/operator/inquiries/pipeline returns zero stats for brand-new operator (Bug 2026-05-31)', async ({ page, request }) => {
    const opEmail = `scope-pipeline-${Date.now()}@test.carelinkai.com`;
    await seedOperator(request, opEmail, 'Pipeline Scope Op');
    await loginAs(page, opEmail);

    const pipeline = await page.evaluate(async () => {
      const r = await fetch('/api/operator/inquiries/pipeline', { credentials: 'include' });
      return r.json();
    });

    // Brand-new operator with no inquiries must see 0 total, not platform-wide counts.
    expect(pipeline.stats?.total ?? 0).toBe(0);
  });
});
