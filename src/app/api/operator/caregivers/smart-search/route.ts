export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAnthropicClient } from '@/lib/ai/claude';

interface ParsedFilters {
  specialties?: string[];
  careTypes?: string[];
  gender?: string;
  minExperience?: number;
  maxRate?: number;
  backgroundCheck?: string;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const { query } = await req.json();
  if (!query?.trim()) return NextResponse.json({ error: 'query required' }, { status: 400 });

  const client = getAnthropicClient();

  // Step 1: Claude parses the natural language query into structured filters
  const parseResponse = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: `Parse a caregiver search query into structured JSON filters.
Return ONLY valid JSON with these optional fields:
{
  "specialties": ["string"],  // e.g. ["dementia", "memory care", "wound care"]
  "careTypes": ["string"],    // e.g. ["MEMORY_CARE", "SKILLED_NURSING"]
  "gender": "string",         // "FEMALE" or "MALE" if specified
  "minExperience": number,    // years
  "maxRate": number,          // max hourly rate in dollars
  "backgroundCheck": "string" // "CLEAR" if they want cleared only
}
Only include fields that are explicitly implied by the query.`,
    messages: [{ role: 'user', content: query }],
  });

  let filters: ParsedFilters = {};
  try {
    const text = parseResponse.content[0]?.type === 'text' ? parseResponse.content[0].text : '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) filters = JSON.parse(jsonMatch[0]);
  } catch {
    // use empty filters — fetch all and let Claude rank
  }

  // Step 2: Query caregivers with filters
  const where: any = {
    isVisibleInMarketplace: true,
    employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
  };

  if (filters.backgroundCheck === 'CLEAR') {
    where.backgroundCheckStatus = 'CLEAR';
  }
  if (filters.minExperience !== undefined) {
    where.yearsExperience = { gte: filters.minExperience };
  }
  if (filters.maxRate !== undefined) {
    where.hourlyRate = { lte: filters.maxRate };
  }

  const caregivers = await prisma.caregiver.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    take: 40,
    orderBy: [{ reliabilityScore: 'desc' }, { yearsExperience: 'desc' }],
  });

  // Step 3: Claude ranks from the fetched pool
  if (caregivers.length === 0) {
    return NextResponse.json({ results: [], summary: 'No caregivers matched your search.', filters });
  }

  const caregiverList = caregivers
    .map(
      (c, i) =>
        `[${i + 1}] ${c.user.firstName} ${c.user.lastName} | ` +
        `${c.yearsExperience ?? '?'} yrs exp | ` +
        `$${c.hourlyRate ?? '?'}/hr | ` +
        `Specialties: ${c.specialties.join(', ') || 'general'} | ` +
        `Care types: ${c.careTypes.join(', ') || 'general'} | ` +
        `BG: ${c.backgroundCheckStatus} | ` +
        `Reliability: ${c.reliabilityScore?.toFixed(0) ?? 'N/A'}/100`,
    )
    .join('\n');

  const rankResponse = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: `You are a staffing coordinator. Rank the top 8 caregivers from the list for the given search query.
Return ONLY valid JSON:
{ "matches": [{ "index": 1, "reason": "one sentence" }], "summary": "one sentence" }`,
    messages: [
      { role: 'user', content: `Search: "${query}"\n\nCaregivers:\n${caregiverList}` },
    ],
  });

  let ranked: { matches: { index: number; reason: string }[]; summary: string } = {
    matches: [],
    summary: '',
  };
  try {
    const text = rankResponse.content[0]?.type === 'text' ? rankResponse.content[0].text : '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) ranked = JSON.parse(jsonMatch[0]);
  } catch {
    ranked.matches = caregivers.slice(0, 8).map((_, i) => ({ index: i + 1, reason: 'Matches your criteria' }));
    ranked.summary = 'Showing best matches.';
  }

  const results = ranked.matches
    .map((m) => {
      const c = caregivers[m.index - 1];
      if (!c) return null;
      return {
        id: c.id,
        name: `${c.user.firstName} ${c.user.lastName}`,
        yearsExperience: c.yearsExperience,
        hourlyRate: c.hourlyRate ? Number(c.hourlyRate) : null,
        specialties: c.specialties,
        careTypes: c.careTypes,
        backgroundCheckStatus: c.backgroundCheckStatus,
        reliabilityScore: c.reliabilityScore,
        matchReason: m.reason,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ results, summary: ranked.summary, filters });
}
