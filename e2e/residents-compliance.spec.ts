import { test, expect } from '@playwright/test';
import { upsertOperator, loginAs, getFirstHomeId, getFamilyId, createResident } from './_helpers';

// [non-bypass] to run only in the non-bypass project locally
test.describe('[non-bypass] Operator Residents: Compliance end-to-end', () => {
  test.skip(!!process.env.CI, 'Run locally only');

  const OP_EMAIL = process.env.OP_EMAIL || 'operator+e2e@carelinkai.com';
  const OP_PASSWORD = process.env.OP_PASSWORD || 'Operator123!';

  test('create resident, add compliance item, mark complete, verify summary', async ({ page, context }) => {
    // Seed operator and a home (use in-page fetch for server readiness and cookie context)
    await page.goto('/');
    await upsertOperator(page.request, OP_EMAIL, { companyName: 'E2E Operator Inc.', homes: [{ name: 'Compliance Home', capacity: 5 }] });
    const homeId: string | null = await getFirstHomeId(page);

    // Establish session via dev helper to avoid UI flakiness in CI-like runs
    // Use in-page fetch so Set-Cookie is applied to browser context reliably
    await loginAs(page, OP_EMAIL);

    // Acquire/ensure a familyId to associate the resident (use in-page fetch to include cookies)
    const familyId: string = await getFamilyId(page);

    // Create a resident associated with this operator's home (in-page fetch for auth)
    const residentId: string = await createResident(page, { familyId, homeId, firstName: 'E2E', lastName: 'Resident' });

    // Navigate to lightweight compliance-only page to avoid SSR streaming hangs in dev
    await page.goto(`/operator/residents/${residentId}/compliance`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Compliance', exact: true })).toBeVisible();

    // Wait for summary to load; initial completed should be 0 for a fresh resident
    await expect(page.getByText(/Completed: \d+/)).toBeVisible({ timeout: 15000 });

    // Add a compliance item via UI
    await page.getByLabel('Title').fill('Initial Care Plan Review');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Initial Care Plan Review')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/^OPEN$/)).toBeVisible();

    // Mark it complete
    await page.getByRole('button', { name: 'Mark complete' }).click();
    await expect(page.getByText(/^COMPLETED$/)).toBeVisible({ timeout: 10000 });

    // Summary should reflect 1 completed (dueSoon/overdue may vary if no dueDate)
    await expect(page.getByText('Completed: 1')).toBeVisible({ timeout: 10000 });

    // Cross-check via API summary
    const sum = await page.request.get(`/api/residents/${residentId}/compliance/summary`);
    expect(sum.ok()).toBeTruthy();
    const s = await sum.json();
    expect(s.open).toBe(0);
    expect(s.completed).toBe(1);
  });
});
