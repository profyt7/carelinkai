#!/usr/bin/env node
/**
 * OL-202 — screenshots + axe for Direction D on /design-preview.
 *
 *   node scripts/design-preview-screenshots.cjs [baseUrl=http://localhost:3000] [outDir=./design-preview-shots]
 *
 * Needs a dev/preview server with ALLOW_DEV_ENDPOINTS=1 (the route is login-gated,
 * so it signs in through /api/dev/login) and Playwright's Chromium. Writes
 * d-{preview}-{1280|820|390}.png, the profile device shots (390×660 top + scrolled
 * to the footer, guest and signed in), design-preview-full.png, and axe.json
 * (WCAG 2.0/2.1/2.2 A+AA + best-practice on the D section at desktop and mobile).
 * The PNGs are for the PR, not the repo.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = process.argv[2] || 'http://localhost:3000';
const out = path.resolve(process.argv[3] || 'design-preview-shots');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const PREVIEWS = ['family-search', 'family-dashboard', 'facility-profile', 'operator-dashboard'];
const MODES = { desktop: 1280, tablet: 820, mobile: 390 };

async function setModes(page, mode) {
  for (const p of PREVIEWS) await page.locator(`[data-testid="d-preview-${p}"] button[data-mode="${mode}"]`).click();
  await page.waitForTimeout(600);
}

async function scrollFrame(page, id, where) {
  await page.getByTestId(`d-frame-${id}`).evaluate((el, w) => {
    for (const n of [el, ...el.querySelectorAll('*')]) {
      if (n.scrollHeight > n.clientHeight + 2 && getComputedStyle(n).overflowY !== 'visible') n.scrollTop = w === 'bottom' ? n.scrollHeight : 0;
    }
  }, where);
  await page.waitForTimeout(500);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('carelinkai_cookie_consent', JSON.stringify({ necessary: true, analytics: false, marketing: false }));
      for (const r of ['FAMILY', 'ADMIN', 'OPERATOR']) localStorage.setItem(`carelinkai_onboarding_completed_${r}`, 'true');
    } catch {}
  });
  const page = await ctx.newPage();
  const email = 'design-review@test.carelinkai.com';
  await page.request.post(`${base}/api/dev/upsert-family`, { data: { email } });
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 240000 });
  const st = await page.evaluate(
    async (e) => (await fetch('/api/dev/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e }), credentials: 'include' })).status,
    email,
  );
  if (st !== 200) throw new Error(`dev login failed: ${st}`);
  await page.goto(`${base}/design-preview`, { waitUntil: 'networkidle', timeout: 240000 });
  await page.getByTestId('direction-d').waitFor({ timeout: 120000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/design-preview-full.png`, fullPage: true });

  // Frame shots: let the 1280 frame fit, hide the site's global floating widgets (not part of D).
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addStyleTag({ content: '.max-w-6xl{max-width:none!important}' });
  await page.evaluate(() => {
    const d = document.querySelector('[data-testid="direction-d"]');
    for (const el of document.querySelectorAll('body *')) if (getComputedStyle(el).position === 'fixed' && !d.contains(el)) el.style.display = 'none';
  });

  const axe = {};
  for (const mode of Object.keys(MODES)) {
    await setModes(page, mode);
    for (const p of PREVIEWS) {
      const frame = page.getByTestId(`d-frame-${p}`);
      await scrollFrame(page, p, 'top');
      await frame.scrollIntoViewIfNeeded();
      await frame.screenshot({ path: `${out}/d-${p}-${MODES[mode]}.png` });
    }
    if (mode === 'mobile') {
      // Profile device proof: scrolled to the footer, guest and signed in.
      const profile = page.getByTestId('d-frame-facility-profile');
      await scrollFrame(page, 'facility-profile', 'bottom');
      await profile.screenshot({ path: `${out}/d-facility-profile-390-footer.png` });
      await page.locator('[data-testid="d-preview-facility-profile"] button[data-viewer="family"]').click();
      await page.waitForTimeout(600);
      await scrollFrame(page, 'facility-profile', 'top');
      await profile.screenshot({ path: `${out}/d-facility-profile-390-signed-in.png` });
      await scrollFrame(page, 'facility-profile', 'bottom');
      await profile.screenshot({ path: `${out}/d-facility-profile-390-signed-in-footer.png` });
      await page.locator('[data-testid="d-preview-facility-profile"] button[data-viewer="guest"]').click();
      await scrollFrame(page, 'facility-profile', 'top');
    }
    if (mode !== 'tablet') {
      await page.addScriptTag({ content: AXE });
      axe[mode] = await page.evaluate(async () => {
        const res = await window.axe.run(document.querySelector('[data-testid="direction-d"]'), {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
        });
        return res.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')) }));
      });
    }
  }
  fs.writeFileSync(`${out}/axe.json`, JSON.stringify(axe, null, 2));
  for (const [m, v] of Object.entries(axe)) {
    console.log(`axe ${m}: ${v.length} violation types`);
    for (const x of v) console.log(` - ${x.impact} ${x.id}: ${x.help} → ${x.nodes.join(', ')}`);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
