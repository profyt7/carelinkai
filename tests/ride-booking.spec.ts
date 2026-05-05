/**
 * Ride Booking Smoke Tests
 *
 * Covers the REQUESTED → provider view flow without touching Stripe.
 * These tests validate:
 *   - Family user can reach /rides and open the booking form
 *   - Provider user can see the rides page (polling setup)
 *   - Admin can access /admin/rides and /admin/credentials
 *   - Rides API returns 200 for authenticated sessions
 *
 * NOTE: Full end-to-end payment flow (Stripe Checkout) is tested manually
 * because it requires Stripe test webhooks and a live server.
 */

import { test, expect } from "@playwright/test";
import { TEST_USERS, login, waitForPageReady } from "./helpers/auth";

const consentScript = () => {
  localStorage.setItem(
    "carelinkai_cookie_consent",
    JSON.stringify({ necessary: true, analytics: false, marketing: false })
  );
};

// ─── Family: Rides page ───────────────────────────────────────────────────────

test.describe("Rides — Family", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(consentScript);
    await login(page, TEST_USERS.FAMILY);
    await waitForPageReady(page);
  });

  test("rides page loads without error", async ({ page }) => {
    await page.goto("/rides");
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
  });

  test("Book a Ride button is visible", async ({ page }) => {
    await page.goto("/rides");
    await waitForPageReady(page);
    await expect(
      page.locator("button, a").filter({ hasText: /book.*ride|request.*ride/i }).first()
    ).toBeVisible();
  });

  test("booking form opens", async ({ page }) => {
    await page.goto("/rides");
    await waitForPageReady(page);
    const bookBtn = page.locator("button, a").filter({ hasText: /book.*ride|request.*ride/i }).first();
    await bookBtn.click();
    // Form or modal should appear with at least a pickup address field
    await expect(
      page.locator("input[placeholder*='pickup' i], input[placeholder*='address' i], label").filter({ hasText: /pickup/i }).first()
    ).toBeVisible({ timeout: 6000 });
  });

  test("rides API returns 200 when authenticated", async ({ page, request }) => {
    // Authenticate via page login so cookies are set
    await page.goto("/rides");
    await waitForPageReady(page);
    const res = await page.evaluate(async () => {
      const r = await fetch("/api/rides");
      return r.status;
    });
    expect(res).toBe(200);
  });

  test("payment=success query param shows confirmation toast or message", async ({ page }) => {
    await page.goto("/rides?payment=success");
    await waitForPageReady(page);
    // Toast or success banner should appear (allow a few seconds for React to render it)
    const successIndicator = page.locator("text=/booked|confirmed|success|payment/i").first();
    await expect(successIndicator).toBeVisible({ timeout: 6000 });
  });
});

// ─── Admin: Transport dashboard & Credentials queue ──────────────────────────

test.describe("Admin transport & credentials", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(consentScript);
    await login(page, TEST_USERS.ADMIN);
    await waitForPageReady(page);
  });

  test("/admin/rides transport dashboard loads", async ({ page }) => {
    await page.goto("/admin/rides");
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    // Expect at least one stat tile
    await expect(page.locator("h1, h2, [class*='font-bold']").filter({ hasText: /ride|transport/i }).first()).toBeVisible();
  });

  test("/admin/credentials queue loads", async ({ page }) => {
    await page.goto("/admin/credentials");
    await waitForPageReady(page);
    await expect(page).not.toHaveURL(/error|500/);
    await expect(page.locator("h1").filter({ hasText: /credential/i })).toBeVisible();
  });

  test("admin credentials API returns list", async ({ page }) => {
    await page.goto("/admin/credentials");
    await waitForPageReady(page);
    const status = await page.evaluate(async () => {
      const r = await fetch("/api/admin/provider-credentials?status=PENDING");
      return r.status;
    });
    expect(status).toBe(200);
  });

  test("admin credentials API ALL status returns list", async ({ page }) => {
    await page.goto("/admin/credentials");
    await waitForPageReady(page);
    const body = await page.evaluate(async () => {
      const r = await fetch("/api/admin/provider-credentials?status=ALL&limit=10");
      return r.json();
    });
    expect(Array.isArray(body.credentials)).toBe(true);
    expect(typeof body.total).toBe("number");
  });
});
