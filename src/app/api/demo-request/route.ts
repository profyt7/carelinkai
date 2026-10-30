import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { escapeHtml as e, sendEmail } from '@/lib/email/transactional';
import { recordLeadConsent } from '@/lib/consent/lead-consent';
import { LEAD_CONSENT_FORMS } from '@/lib/consent/lead-consent-text';
import { captureError } from '@/lib/sentry';

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  role: z.string().max(50).optional(),
  message: z.string().max(1000).optional(),
  // TCPA/marketing consent from LeadConsentCheckbox — z.unknown so a missing/
  // malformed payload can never fail validation; server normalizes to false.
  consent: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { consent, ...data } = parsed.data;

    const record = await prisma.demoRequest.create({ data });

    // Immutable TCPA/marketing consent evidence (both states). Never blocks
    // the demo request (recorder swallows its own errors).
    await recordLeadConsent({
      consent,
      sourceForm: LEAD_CONSENT_FORMS.DEMO_REQUEST,
      req,
      contactName: data.name,
      contactEmail: data.email,
      contactPhone: data.phone ?? null,
      demoRequestId: record.id,
    });

    // Notify Chris — non-blocking. The form promises a reply within one business day and this
    // email is the only notice (no admin list), so a failed send goes to Sentry, not just the log.
    notifyAdmin(record).catch((err) => {
      console.error('[DEMO_REQUEST] Notification failed:', err instanceof Error ? err.message : String(err));
      captureError(err instanceof Error ? err : new Error(String(err)), { tags: { feature: 'demo-request', channel: 'email' }, extra: { demoRequestId: record.id } });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DEMO_REQUEST] Error:', err);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}

async function notifyAdmin(record: {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  role?: string | null;
  message?: string | null;
}) {
  // Same recipient as the other admin alerts (it used to fall back to EMAIL_FROM — the
  // noreply sender — which only "worked" because the old mock provider sent nothing).
  const adminEmail =
    process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.CLAIM_NOTIFY_EMAIL || 'chris@getcarelinkai.com';

  const lines = [
    `Name: ${record.name}`,
    `Email: ${record.email}`,
    record.company ? `Company: ${record.company}` : null,
    record.phone ? `Phone: ${record.phone}` : null,
    record.role ? `Role: ${record.role}` : null,
    record.message ? `\nMessage:\n${record.message}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // OL-181: Resend (the old EmailService fell through to its mock provider and sent nothing).
  const sent = await sendEmail({
    to: adminEmail,
    categories: ['demo-request'],
    subject: `🎯 New Demo Request — ${record.name}${record.company ? ` (${record.company})` : ''}`,
    text: `New demo request received on CareLinkAI:\n\n${lines}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5;margin-bottom:4px">New Demo Request</h2>
        <p style="color:#666;font-size:13px;margin-top:0">Someone wants to see CareLinkAI in action.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
          <tr><td style="padding:8px 0;color:#888;width:100px">Name</td><td style="padding:8px 0;font-weight:600;color:#111">${e(record.name)}</td></tr>
          <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0"><a href="mailto:${e(record.email)}" style="color:#4f46e5">${e(record.email)}</a></td></tr>
          ${record.company ? `<tr><td style="padding:8px 0;color:#888">Company</td><td style="padding:8px 0;color:#111">${e(record.company)}</td></tr>` : ''}
          ${record.phone ? `<tr><td style="padding:8px 0;color:#888">Phone</td><td style="padding:8px 0;color:#111">${e(record.phone)}</td></tr>` : ''}
          ${record.role ? `<tr><td style="padding:8px 0;color:#888">Role</td><td style="padding:8px 0;color:#111">${e(record.role)}</td></tr>` : ''}
        </table>
        ${record.message ? `<div style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:8px;font-size:14px;color:#333">${e(record.message)}</div>` : ''}
        <a href="https://getcarelinkai.com/admin" style="display:inline-block;margin-top:24px;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View in Admin</a>
      </div>
    `,
  });
  // sendEmail reports failure instead of throwing.
  if (!sent.success) throw sent.error instanceof Error ? sent.error : new Error('demo-request admin email failed');
}
