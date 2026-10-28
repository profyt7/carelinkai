/**
 * POST /api/lead/dp — scoped DP lead-capture submit (feat/dp-lead-capture).
 *
 * The only write surface for Anita's `/lead/new` form. No login: a shared-secret
 * token (LEAD_CAPTURE_TOKEN) is the authorization, validated server-side here as
 * well as on the page render, so the endpoint can't be posted to without it.
 *
 * Spam guards: shared-secret token + a hidden honeypot field + a light per-IP
 * rate limit. NO PHI — planner contact + interest only. On success we create the
 * DPLead and fire Touch 1 of the follow-up sequence (fire-and-forget; the
 * sequence self-gates on DP_FOLLOWUP_ENABLED).
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { leadCaptureTokenValid } from '@/lib/dp-outreach/lead-capture-token';
import { startDpSequenceOnLead } from '@/lib/dp-outreach/dp-followup';
import { rateLimitExceeded } from '@/lib/edge-rate-limit';
import { captureError } from '@/lib/sentry';

const DEPARTMENTS = ['Case Management', 'Social Work', 'Discharge Planning'] as const;
const INTEREST = ['HOT', 'WARM'] as const;

const schema = z.object({
  k: z.string().min(1), // shared-secret token
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  hospital: z.string().trim().min(1).max(200),
  department: z.enum(DEPARTMENTS).optional().nullable(),
  interestLevel: z.enum(INTEREST).default('WARM'),
  notes: z.string().trim().max(2000).optional().nullable(),
  consent: z.literal(true), // "Planner verbally agreed to be contacted" — required
  // Honeypot: real users never fill this hidden field. Any value → silent drop.
  company: z.string().max(0).optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Honeypot filled or consent missing or bad fields — generic 400, no detail.
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 });
  }
  const data = parsed.data;

  // Shared-secret gate (constant-time). Wrong/absent token → 403.
  if (!leadCaptureTokenValid(data.k)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  // Light per-IP rate limit (10/min) — the token is the primary guard; this just
  // blunts a leaked-token flood. Bypassed under ALLOW_DEV_ENDPOINTS (CI/e2e).
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    if (rateLimitExceeded(`lead-dp:${ip}`, 10)) {
      return NextResponse.json({ error: 'Too many submissions, please wait a moment.' }, { status: 429 });
    }
  }

  try {
    const lead = await prisma.dPLead.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        hospital: data.hospital,
        department: data.department ?? null,
        interestLevel: data.interestLevel,
        consent: true,
        notes: data.notes?.trim() ? data.notes.trim() : null,
        source: 'anita_form',
        status: 'active',
      },
      select: { id: true },
    });

    // Fire Touch 0/1 immediately (self-gates on DP_FOLLOWUP_ENABLED). Never blocks
    // the "Logged ✓" response, and its own failures go to Sentry, not the caller.
    startDpSequenceOnLead({ leadId: lead.id }).catch(() => {});

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'dp-lead-capture' }, extra: { phase: 'create' },
    });
    return NextResponse.json({ error: 'Could not log this lead. Please try again.' }, { status: 500 });
  }
}
