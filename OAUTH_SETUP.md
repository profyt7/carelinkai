# OAuth Integration Guide for CareLinkAI  
_Set up Google & Apple single-sign-on for the `/auth/login` page_

---

## 1. Why add OAuth?

Enabling OAuth lets users sign-in with accounts they already trust, removes the need to remember another password, and off-loads MFA, fraud, and password-reset workflows to Google or Apple.  
CareLinkAI still receives a verified e-mail address and can attach it to an internal user record.

---

## 2. Google OAuth Setup

### 2.1 Create OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/).  
2. **Select** or **create** a project (e.g. `carelinkai-dev`).  
3. In the left menu choose **APIs & Services ▸ OAuth consent screen**  
   • User Type: _External_ → Create  
   • App name, logo, support email → Save & Continue (scopes can stay default)  
   • Add your e-mail as test user → Save & Continue → Back to Dashboard  
4. **Credentials ▸ Create Credentials ▸ OAuth client ID**  
   • Application type: _Web application_  
   • Name: `CareLinkAI Local`  
   • Authorized **JavaScript origins**  
     – `http://localhost:5000`  
   • Authorized **redirect URIs**  
     – `http://localhost:5000/api/auth/callback/google`  
   • Create → note the **Client ID** & **Client secret**

### 2.2 Add Production URIs later

After deployment add your production domain(s) to **origins** and **redirect URIs**, e.g.:

```
https://app.carelinkai.com
https://app.carelinkai.com/api/auth/callback/google
```

---

## 3. Apple OAuth Setup

> Apple’s process is more involved and requires an Apple Developer account (\$99/yr).

### 3.1 Register a Service ID

1. Log into [Apple Developer ▸ Certificates, IDs & Profiles](https://developer.apple.com/account/resources/identifiers/list).  
2. Identifiers ▸ **Service IDs** ▸ **+**  
   • Description: `CareLinkAI Web`  
   • Identifier (Client ID): `com.carelinkai.web`  
   • Continue ▸ Register

### 3.2 Enable “Sign in with Apple”

1. Open the Service ID you just created → **Configure**  
2. Check **Sign In with Apple** → **Configure**  
3. Select your **Primary App ID** (create one if needed)  
4. Add **Return URLs**  
   ```
   https://localhost:5000/api/auth/callback/apple
   ```
   (Add production URL after deploy)  
5. Save ▸ Continue ▸ Done

### 3.3 Create a Key for JWT Signing

1. Keys ▸ **+** → **Sign in with Apple**  
2. Key Name: `CareLinkAI Auth`  
3. Select the **Primary App ID**  
4. Register → **Download** the `.p8` file (only shown once)  
   – Key ID appears in the list (e.g. `ABC123DEF4`)

### 3.4 Collect Apple values

| Variable          | Where to find it                                     |
|-------------------|------------------------------------------------------|
| `APPLE_ID`        | Service ID (Client ID) e.g. `com.carelinkai.web`     |
| `APPLE_TEAM_ID`   | Top-right corner of Developer portal                 |
| `APPLE_KEY_ID`    | The Key you downloaded (column “Key ID”)             |
| `APPLE_PRIVATE_KEY` | Contents of the downloaded `.p8` file (wrap in quotes in `.env`) |

---

## 4. Environment Variables

Add the following to `carelinkai/.env.local` (or the hosting provider’s UI in production):

```
# ─── Google ───────────────────────────────
GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ─── Apple ────────────────────────────────
APPLE_ID=com.carelinkai.web
APPLE_TEAM_ID=ABCD123456
APPLE_KEY_ID=ABC123DEF4
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD...
-----END PRIVATE KEY-----"
```

_No restart → no env: **remember to restart** `npm run dev` (or redeploy) after editing vars._

---

## 5. Testing the Integration

1. Restart the dev server: `npm run dev`  
2. Navigate to `http://localhost:5000/auth/login`  
3. Click **Continue with Google** → complete Google consent → you should land on `/dashboard`.  
4. Click **Continue with Apple**  
   • Apple pops up its modal; use a real Apple ID or test account.  
5. Check database: new user record should exist with provider =`google`/`apple`.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| “Error 400: redirect_uri_mismatch” (Google) | Redirect URI not whitelisted | Add exact URI to Google console & save |
| “Invalid client secret” (Apple) | Expired JWT (valid 30 min) or bad private key | Regenerate client secret via `.env`, ensure correct newline escapes |
| Browser shows `NEXTAUTH_INVALID_PROVIDER` | Env vars missing | Verify variables & restart server |
| Infinite redirect loop after sign-in | `NEXTAUTH_URL` mismatch | Ensure it matches the public URL exactly |
| Apple modal closes instantly | Return URL not on allowed list | Add URL in Service ID configuration |

---

## 7. Security Considerations

* **Do NOT commit secrets** – keep `.env.local` out of git; set prod secrets in your hosting dashboard.  
* Rotate OAuth credentials if leaked.  
* Apple keys (.p8) can be scoped to Sign in only and revoked anytime.  
* Enforce HTTPS in production; OAuth forbids many flows on plain HTTP.  
* Limit Google credentials to required scopes (_openid email profile_), nothing more.  
* Review and prune unused OAuth providers periodically.

---

### You’re Ready!

Google & Apple buttons now appear on the login page and will only be active when the corresponding environment variables are present. Enjoy seamless single-sign-on in CareLinkAI 🚀
