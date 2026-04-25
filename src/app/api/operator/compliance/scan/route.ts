export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAnthropicClient } from '@/lib/ai/claude';

export type FindingSeverity = 'CRITICAL' | 'WARNING' | 'OK';
export type FindingCategory = 'RATIO' | 'LICENSE' | 'CERTIFICATION' | 'BACKGROUND_CHECK';

export interface ComplianceFinding {
  severity: FindingSeverity;
  category: FindingCategory;
  title: string;
  detail: string;
  actionUrl?: string;
}

export interface ComplianceScanResult {
  findings: ComplianceFinding[];
  summary: string;
  counts: { critical: number; warning: number; ok: number };
  scannedAt: string;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const findings: ComplianceFinding[] = [];
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  // ── 1. Fetch all data in parallel ──────────────────────────────────────────
  const [homes, licenses, caregivers] = await Promise.all([
    prisma.assistedLivingHome.findMany({
      where: { operatorId: op.id },
      select: {
        id: true,
        name: true,
        capacity: true,
        currentOccupancy: true,
        careLevel: true,
        residents: {
          where: { status: 'ACTIVE', archivedAt: null },
          select: { id: true },
        },
      },
    }),
    prisma.license.findMany({
      where: { home: { operatorId: op.id } },
      select: {
        id: true,
        type: true,
        licenseNumber: true,
        expirationDate: true,
        homeId: true,
        home: { select: { name: true } },
      },
    }),
    prisma.caregiver.findMany({
      where: {
        employments: { some: { operatorId: op.id, endDate: null } },
        employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
      },
      select: {
        id: true,
        backgroundCheckStatus: true,
        user: { select: { firstName: true, lastName: true } },
        certifications: {
          select: { certificationType: true, expiryDate: true, status: true },
          orderBy: { expiryDate: 'asc' },
        },
        shifts: {
          where: {
            startTime: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
            status: { in: ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
          },
          select: { homeId: true },
          take: 1,
        },
      },
    }),
  ]);

  // Build a map: homeId → assigned caregiver count (caregivers with a recent shift at that home)
  const caregiversByHome = new Map<string, number>();
  for (const c of caregivers) {
    const homeIds = [...new Set(c.shifts.map((s) => s.homeId))];
    for (const hid of homeIds) {
      caregiversByHome.set(hid, (caregiversByHome.get(hid) ?? 0) + 1);
    }
  }

  // ── 2. Ratio check ─────────────────────────────────────────────────────────
  for (const home of homes) {
    const activeResidents = home.residents.length;
    if (activeResidents === 0) continue;

    const isMemoryCare = (home.careLevel as string[]).includes('MEMORY_CARE');
    const minRatio = isMemoryCare ? 4 : 8; // 1 caregiver per N residents
    const assignedCaregivers = caregiversByHome.get(home.id) ?? 0;
    const requiredCaregivers = Math.ceil(activeResidents / minRatio);

    if (assignedCaregivers === 0) {
      findings.push({
        severity: 'CRITICAL',
        category: 'RATIO',
        title: `${home.name} — No caregivers assigned`,
        detail: `${activeResidents} active resident${activeResidents > 1 ? 's' : ''} with no caregiver coverage in the last 30 days.`,
        actionUrl: `/operator/caregivers`,
      });
    } else if (assignedCaregivers < requiredCaregivers) {
      findings.push({
        severity: 'WARNING',
        category: 'RATIO',
        title: `${home.name} — Caregiver ratio low`,
        detail: `${assignedCaregivers} caregiver${assignedCaregivers > 1 ? 's' : ''} for ${activeResidents} residents. Ohio ${isMemoryCare ? 'memory care' : 'ALF'} minimum requires ${requiredCaregivers}.`,
        actionUrl: `/operator/caregivers`,
      });
    } else {
      findings.push({
        severity: 'OK',
        category: 'RATIO',
        title: `${home.name} — Ratio compliant`,
        detail: `${assignedCaregivers} caregivers for ${activeResidents} residents (minimum ${requiredCaregivers}).`,
      });
    }
  }

  // ── 3. License expiry check ────────────────────────────────────────────────
  for (const lic of licenses) {
    const exp = new Date(lic.expirationDate);
    if (exp < now) {
      findings.push({
        severity: 'CRITICAL',
        category: 'LICENSE',
        title: `${lic.home.name} — License EXPIRED`,
        detail: `${lic.type} license #${lic.licenseNumber} expired ${exp.toLocaleDateString()}.`,
        actionUrl: `/operator/compliance`,
      });
    } else if (exp <= in60) {
      const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      findings.push({
        severity: 'WARNING',
        category: 'LICENSE',
        title: `${lic.home.name} — License expiring soon`,
        detail: `${lic.type} license #${lic.licenseNumber} expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${exp.toLocaleDateString()}).`,
        actionUrl: `/operator/compliance`,
      });
    }
  }

  // ── 4. Caregiver cert + background check ──────────────────────────────────
  for (const c of caregivers) {
    const name = `${c.user.firstName} ${c.user.lastName}`;

    // Background check
    if (c.backgroundCheckStatus !== 'CLEAR') {
      findings.push({
        severity: c.backgroundCheckStatus === 'NOT_STARTED' ? 'CRITICAL' : 'WARNING',
        category: 'BACKGROUND_CHECK',
        title: `${name} — Background check ${c.backgroundCheckStatus.toLowerCase().replace('_', ' ')}`,
        detail: `Caregiver is actively assigned but background check is not cleared.`,
        actionUrl: `/operator/caregivers/${c.id}`,
      });
    }

    // No certifications on file
    if (c.certifications.length === 0) {
      findings.push({
        severity: 'WARNING',
        category: 'CERTIFICATION',
        title: `${name} — No certifications on file`,
        detail: `No certification records found. Ensure CPR, First Aid, and required training docs are uploaded.`,
        actionUrl: `/operator/caregivers/${c.id}?tab=certifications`,
      });
      continue;
    }

    // Expired or expiring certs
    for (const cert of c.certifications) {
      if (!cert.expiryDate) continue;
      const exp = new Date(cert.expiryDate);
      if (exp < now) {
        findings.push({
          severity: 'CRITICAL',
          category: 'CERTIFICATION',
          title: `${name} — ${cert.certificationType} EXPIRED`,
          detail: `Certification expired ${exp.toLocaleDateString()}.`,
          actionUrl: `/operator/caregivers/${c.id}?tab=certifications`,
        });
      } else if (exp <= in30) {
        const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        findings.push({
          severity: 'WARNING',
          category: 'CERTIFICATION',
          title: `${name} — ${cert.certificationType} expiring soon`,
          detail: `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} (${exp.toLocaleDateString()}).`,
          actionUrl: `/operator/caregivers/${c.id}?tab=certifications`,
        });
      }
    }
  }

  // ── 5. Claude AI summary ───────────────────────────────────────────────────
  const critical = findings.filter((f) => f.severity === 'CRITICAL');
  const warnings = findings.filter((f) => f.severity === 'WARNING');

  let summary = 'All compliance checks passed. No issues detected.';

  if (critical.length > 0 || warnings.length > 0) {
    const client = getAnthropicClient();
    const findingText = [...critical, ...warnings]
      .map((f) => `[${f.severity}] ${f.title}: ${f.detail}`)
      .join('\n');

    const aiResponse = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `You are a compliance officer reviewing an assisted living facility's compliance status.
Write a 2-3 sentence executive summary of the following findings. Be direct and action-oriented.
Lead with the most urgent items. Use plain text, no markdown.

Findings:
${findingText}`,
        },
      ],
    });

    if (aiResponse.content[0]?.type === 'text') {
      summary = aiResponse.content[0].text;
    }
  }

  // Sort: CRITICAL first, then WARNING, then OK
  const order: Record<FindingSeverity, number> = { CRITICAL: 0, WARNING: 1, OK: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  const result: ComplianceScanResult = {
    findings,
    summary,
    counts: {
      critical: critical.length,
      warning: warnings.length,
      ok: findings.filter((f) => f.severity === 'OK').length,
    },
    scannedAt: now.toISOString(),
  };

  return NextResponse.json(result);
}
