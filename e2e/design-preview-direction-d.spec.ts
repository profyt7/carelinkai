/**
 * OL-202 — /design-preview renders Direction D ("CareLinkAI Signature") and the
 * D section never shows capacity-derived availability ("N Available",
 * "Waitlist") at any preview width. /design-preview is behind login
 * (middleware), so the spec signs in with the dev endpoint first.
 *
 *   npx playwright test --config=playwright.e2e.config.ts e2e/design-preview-direction-d.spec.ts
 */
import { test, expect } from '@playwright/test';

const EMAIL = `design-preview-${Date.now()}@test.carelinkai.com`;
const FORBIDDEN = /\b\d+ Available\b|Waitlist/i;
const PREVIEWS = ['family-search', 'family-dashboard', 'facility-profile', 'operator-dashboard'];

test('@critical /design-preview renders Direction D with honest availability', async ({ page, request }) => {
  expect((await request.post('/api/dev/upsert-family', { data: { email: EMAIL } })).ok(), 'family seed').toBe(true);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
      localStorage.setItem('carelinkai_onboarding_completed_FAMILY', 'true');
    } catch {
      /* storage blocked — assertions don't depend on it */
    }
  });
  await page.goto('/');
  const login = await page.evaluate(
    async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status,
    EMAIL,
  );
  expect(login, 'dev-login').toBe(200);

  await page.goto('/design-preview', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Direction D').first()).toBeVisible({ timeout: 60000 });
  const d = page.getByTestId('direction-d');
  await expect(d).toBeVisible();
  // The result count comes from the fixture length, never an invented number.
  await expect(d.getByTestId('d-result-count')).toHaveText(/^\d+ care homes near Cleveland, OH$/);

  for (const mode of ['desktop', 'tablet', 'mobile']) {
    for (const p of PREVIEWS) await d.locator(`[data-testid="d-preview-${p}"] button[data-mode="${mode}"]`).click();
    await expect(d.getByTestId('availability-badge').first()).toBeVisible();
    await expect(d, `D section at ${mode}`).not.toContainText(FORBIDDEN);
  }
});
