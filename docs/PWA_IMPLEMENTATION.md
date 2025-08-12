# CareLink AI – Progressive Web App (PWA) Implementation Guide

Welcome to the definitive manual for CareLink AI’s PWA layer.  
Follow it end-to-end to replicate the exact setup running in development, test it thoroughly, ship it to production, and diagnose the most common pitfalls.

---

## 1. Prerequisites

| Tool | Version (tested) | Notes |
|------|-----------------|-------|
| Node.js | ≥ 18 .x | LTS recommended |
| npm / pnpm / yarn | Any modern | commands below assume **npm** |
| OpenSSL | optional | for entropy when generating secrets |
| Git & GitHub | – | standard workflow |
| HTTPS domain | for prod | required for Service Workers & Push |
| Chrome / Edge / Safari | latest | for device testing |

---

## 2. Installing Dependencies

```bash
# clone and install
git clone git@github.com:your-org/carelinkai.git
cd carelinkai
npm install

# install global helpers (optional)
npm i -g web-push lighthouse
```

> **Note**  
> `react-hot-toast` is now part of `package.json`. If you ran the project earlier with the temporary console fallback, remove the comment blocks around `Toaster` and `toast` imports after the package installs.

---

## 3. Environment Variables (`.env.local`)

Duplicate the template and fill real values:

```bash
cp .env.local.example .env.local
```

Key items to update:

```env
NEXT_PUBLIC_APP_URL=https://carelinkai.example.com

# NextAuth & DB
NEXTAUTH_SECRET=generated_secure_string
DATABASE_URL=mongodb+srv://...

# PWA
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated below>
VAPID_PRIVATE_KEY=<generated below>
VAPID_SUBJECT=mailto:support@carelinkai.com
```

---

## 4. Generating VAPID Keys

Run the built-in script:

```bash
npm run generate:vapid    # alias for node scripts/generate-vapid.js --update-env
```

The script:
1. Creates an EC (P-256) key pair.
2. Stores the keys in URL-safe Base64 form.
3. Optionally **writes them into `.env.local`** when `--update-env` flag is passed.

---

## 5. Icon & Splash Asset Creation

Two paths:

### 5.1 Quick Placeholder Icons

```bash
node scripts/generate-pwa-icons.js
```

Outputs SVG files in `public/icons/`.

### 5.2 Production-grade Icons

1. Open `public/icon-generator.html` in a browser.  
2. Click **Generate All Icons** → **Download All Icons as ZIP**.  
3. Extract into `public/icons/`.  
4. Replace default colors / letter “C” with branded artwork when ready.

Ensure the following core sizes exist:

* `icon-192x192.png`
* `icon-512x512.png`
* `maskable-icon-192x192.png`
* `maskable-icon-512x512.png`
* `apple-touch-icon.png`
* `favicon-32x32.png` / `favicon.ico`

---

## 6. Service Worker & Manifest

Nothing to configure — files live in `public/sw.js` and `public/manifest.json`.  
Key manifest fields you might tweak:

* `name`, `short_name`
* `start_url`
* `background_color`, `theme_color`
* `screenshots`, `shortcuts`

> Any edit requires a **hard refresh** (`⌘/Ctrl + Shift + R`) or bumping the
> `start_url` query string (`?v=2`) so browsers fetch the new manifest.

---

## 7. Local Testing

### 7.1 Start the Dev Server

```bash
npm run dev      # defaults to http://localhost:5000
```

Chrome DevTools → **Application** panel to inspect Manifest, SW, Cache, Push.

### 7.2 Automated Validation Script

```bash
node scripts/test-pwa.js
```

Checks:

* manifest integrity
* service-worker events (install/activate/fetch)
* offline fallback presence
* icon existence & size
* env vars (VAPID keys etc.)

### 7.3 Manual Sanity List

- Install prompt shows?  
  Disable DevTools > Application > Clear storage, reload.
- Offline mode works?  
  DevTools → Network → **Offline**, navigate around.
- Background sync?  
  Submit an inquiry offline, go online, verify it syncs.
- Push permission & subscription succeed?  
  Run `/api/push/subscribe`.
- Lighthouse score ≥ 90 in **PWA** category.

---

## 8. Push Notification Smoke Test

1. In a browser that supports Push (Chrome/Edge/Firefox Desktop/Android) open the app.  
2. Accept the **notification permission** prompt.  
3. Inspect **IndexedDB → _swPushSubscriptions_** entry.  
4. Trigger a test payload:

```bash
curl -X POST http://localhost:5000/api/push/send \
  -H "Content-Type: application/json" \
  -d '{"title":"CareLink AI Test","body":"It works! ✅"}'
```

You should receive a system toast (or console log if `react-hot-toast` still disabled) **and** a native OS push.

---

## 9. Production Build & Deploy

```bash
npm run build
npm run start          # serves `.next` on port 5000
```

### 9.1 Reverse Proxy (NGINX example)

```
server {
  listen 443 ssl;
  server_name carelinkai.example.com;

  location / {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # recommended security headers
  add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
  add_header Content-Security-Policy "
    default-src 'self';
    img-src 'self' data: https://*.tile.openstreetmap.org;
    connect-src 'self' wss:;
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;" always;
}
```

* **HTTPS required** for SW, Push and Geolocation.
* If using Vercel/Netlify, add equivalent headers in `next.config.js` rewrites.

---

## 10. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `react-hot-toast` _module not found_ | package missing | `npm i react-hot-toast` and uncomment imports |
| Map tiles grey / no imagery | CSP blocks OSM servers | add `https://*.tile.openstreetmap.org` to `img-src` |
| `Invalid LatLng object: (NaN, NaN)` | missing coords | check API returns `lat`+`lng` or `latitude`+`longitude` |
| Install prompt never fires | not served over HTTPS / SW error | check console; ensure `manifest.json` is fetched (status 200) |
| Updates don’t show | cached SW | DevTools → Application → “Update on reload” or bump cache version inside `sw.js` |
| Duplicate push notifications | multiple active subscriptions | clear site data or `navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister()))` |

---

## 11. Appendix – Useful Commands

| Task | Command |
|------|---------|
| Generate icons (SVG) | `node scripts/generate-pwa-icons.js` |
| Open icon generator UI | `open public/icon-generator.html` |
| Generate & inject VAPID keys | `npm run generate:vapid` |
| Validate PWA locally | `node scripts/test-pwa.js` |
| Build prod bundle | `npm run build` |
| Preview prod locally | `npm run start` |
| Lighthouse PWA audit | `lighthouse http://localhost:5000 --only-categories=pwa --view` |
| Wipe browser SW & caches | DevTools → Application → Clear storage → **Clear site data** |

---

### You’re Done! 🎉

Your CareLink AI instance now behaves like a high-quality installable mobile application with:

* Offline browsing & background sync  
* System-native push notifications  
* Icon / splash integration  
* One-click install on Android, iOS (Add to Home Screen), and desktop

If you hit new snags, add them to the troubleshooting table and share with the team. Happy shipping!
