/**
 * /founder — self-hosted founder intro (HeyGen replacement) smoke.
 *
 * The DP follow-up emails (Touch 1 + Touch 3) link here, so the page must load
 * WITHOUT a session, return 200, and carry a <video> pointing at the local MP4.
 * Runs with the ./e2e config: npx playwright test --config=playwright.e2e.config.ts e2e/founder-page.spec.ts
 */
import { test, expect } from '@playwright/test';

test.describe('@critical /founder — self-hosted founder intro', () => {
  test('returns 200 unauthenticated and embeds the local video', async ({ page, request }) => {
    // Raw HTTP first: no cookies, no bypass header — a planner clicking from email.
    const res = await request.get('/founder', { maxRedirects: 0 });
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('<video');
    expect(html).toContain('src="/founder-intro.mp4"');
    expect(html).toContain('poster="/founder-intro-poster.jpg"');
    expect(html).toContain('A 40-second intro from our founder');
    expect(html).not.toMatch(/heygen/i);
    // noindex — link-only page for planners
    expect(html).toMatch(/<meta name="robots" content="noindex/);

    // Rendered: the video element is present with controls, no forms, no nav chrome.
    await page.goto('/founder', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/auth\/login/);
    const video = page.locator('video');
    await expect(video).toHaveCount(1);
    await expect(video).toHaveAttribute('src', '/founder-intro.mp4');
    await expect(video).toHaveAttribute('controls', '');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('A 40-second intro from our founder');
    await expect(page.locator('form')).toHaveCount(0);
  });

  test('the video + poster assets are not behind auth', async ({ request }) => {
    // The middleware must let these through even when the files are missing
    // (404), i.e. no redirect to the login page.
    for (const path of ['/founder-intro.mp4', '/founder-intro-poster.jpg']) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect([200, 404]).toContain(res.status());
      expect(res.status()).not.toBe(307);
    }
  });
});
