import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import EmailService from '@/lib/email-service';

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  company: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  role: z.string().max(50).optional(),
  message: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const data = parsed.data;

    const record = await prisma.demoRequest.create({ data });

    // Notify Chris — non-blocking
    notifyAdmin(record).catch((err) =>
      console.error('[DEMO_REQUEST] Notification failed:', err)
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DEMO_REQUEST] Error:', err);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}

async function notifyAdmin(record: {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  role?: string | null;
  message?: string | null;
}) {
  const adminEmail =
    process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM ?? 'profyt7@gmail.com';

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

  await EmailService.sendEmail({
    to: adminEmail,
    subject: `🎯 New Demo Request — ${record.name}${record.company ? ` (${record.company})` : ''}`,
    text: `New demo request received on CareLinkAI:\n\n${lines}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5;margin-bottom:4px">New Demo Request</h2>
        <p style="color:#666;font-size:13px;margin-top:0">Someone wants to see CareLinkAI in action.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
          <tr><td style="padding:8px 0;color:#888;width:100px">Name</td><td style="padding:8px 0;font-weight:600;color:#111">${record.name}</td></tr>
          <tr><td style="padding:8px 0;color:#888">Email</td><td style="padding:8px 0"><a href="mailto:${record.email}" style="color:#4f46e5">${record.email}</a></td></tr>
          ${record.company ? `<tr><td style="padding:8px 0;color:#888">Company</td><td style="padding:8px 0;color:#111">${record.company}</td></tr>` : ''}
          ${record.phone ? `<tr><td style="padding:8px 0;color:#888">Phone</td><td style="padding:8px 0;color:#111">${record.phone}</td></tr>` : ''}
          ${record.role ? `<tr><td style="padding:8px 0;color:#888">Role</td><td style="padding:8px 0;color:#111">${record.role}</td></tr>` : ''}
        </table>
        ${record.message ? `<div style="margin-top:16px;padding:12px;background:#f9fafb;border-radius:8px;font-size:14px;color:#333">${record.message}</div>` : ''}
        <a href="https://getcarelinkai.com/admin" style="display:inline-block;margin-top:24px;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View in Admin</a>
      </div>
    `,
  });
}
