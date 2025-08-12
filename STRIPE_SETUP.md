# Stripe Integration Setup Guide for CareLinkAI

Welcome to the Stripe setup walkthrough. Follow these steps to get payments running locally and in production.

---

## 1. Why You Saw “Please call Stripe() with your publishable key”

CareLinkAI’s front-end loads Stripe using:

```ts
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");
```

If `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is **missing or empty**, Stripe.js throws:

```
IntegrationError: Please call Stripe() with your publishable key. You used an empty string.
```

Adding valid keys in the environment file immediately resolves the runtime error.

---

## 2. Obtain Your Stripe API Keys

1. Sign in to the [Stripe Dashboard](https://dashboard.stripe.com/).  
2. Switch to **Test Mode** (toggle in the left sidebar) while developing.  
3. Navigate to **Developers ▸ API keys**.  
4. Copy the two keys you need:  
   • **Publishable key** – starts with `pk_test_`  
   • **Secret key** – starts with `sk_test_`  
5. For production later, repeat these steps with Test Mode *off* to grab your `pk_live_` and `sk_live_` keys.

---

## 3. Replace the Placeholder Keys in `.env.local`

Open `carelinkai/.env.local` and locate the Stripe section:

```bash
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_********************************
STRIPE_SECRET_KEY=sk_test_********************************
```

1. Paste your real test keys in place of the asterisks—**do not wrap them in quotes**.  
2. Save the file.  
3. Restart the Next.js dev server so the new variables are loaded:

```bash
npm run dev          # or yarn dev / pnpm dev
```

**Tip:** Commit _everything except the secret key_. Add `STRIPE_SECRET_KEY` to `.gitignore` or use environment variables in your hosting dashboard.

---

## 4. Test the Integration

1. Ensure the site builds with no Stripe errors.  
2. Open a payment or checkout page in the app.  
3. Use Stripe’s test card numbers (e.g., `4242 4242 4242 4242`, any valid future date, any CVC).  
4. Confirm the payment succeeds in the Dashboard under **Payments (Test mode)**.  

If you deployed to Vercel or another platform, add the same keys in that platform’s **Environment Variables** UI and redeploy.

---

## 5. Security Best-Practices

• **Never expose `STRIPE_SECRET_KEY` on the client.** It must stay server-side only.  
• Keep production and test keys separate; never mix them.  
• Rotate keys if they are ever leaked.  
• Use Stripe’s webhooks to validate events instead of trusting client data alone.  
• For production, enable 2-factor authentication on your Stripe account.

---

## 6. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `IntegrationError: Invalid key provided` | Key is malformed or copied with whitespace/quotes | Remove quotes/extra chars, verify key starts with pk\_test\_ or pk\_live\_ |
| Still seeing the empty-key error after editing `.env.local` | Next.js dev server cached old env | Stop the dev process and restart `npm run dev` |
| Payments succeed locally but fail on production | Keys not set in hosting environment | Add keys to host’s environment variables and redeploy |
| Webhook signature verification fails | Wrong webhook signing secret | Copy the **Signing secret** from Dashboard ▸ Webhooks |
| “No such customer” / “No such payment\_intent” | Mixing test keys with live objects | Use the matching mode keys or delete and recreate objects |

---

🎉 You’re all set. Payments should now initialize without errors in CareLinkAI.
