import { getAnthropicClient } from './claude';
import { prisma } from '@/lib/prisma';

export interface ShiftAutoFillRequest {
  homeId: string;
  operatorId: string;
  description: string; // free-text: "Need an overnight memory care aide this Friday 10pm-6am"
  date?: string;       // ISO date string
}

export interface CaregiverMatch {
  caregiverId: string;
  userId: string;
  name: string;
  hourlyRate: number | null;
  yearsExperience: number | null;
  specialties: string[];
  reliabilityScore: number | null;
  backgroundCheckStatus: string;
  matchReason: string;
  rank: number;
}

export interface ShiftAutoFillResult {
  matches: CaregiverMatch[];
  summary: string;
}

/**
 * Uses Claude to match available caregivers to a described shift need.
 * Returns ranked matches with explanations.
 */
export async function findCaregiverMatchesForShift(
  req: ShiftAutoFillRequest
): Promise<ShiftAutoFillResult> {
  // Pull available caregivers for this operator's homes
  const caregivers = await prisma.caregiver.findMany({
    where: {
      isVisibleInMarketplace: true,
      employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
      OR: [
        { employments: { some: { operatorId: req.operatorId, endDate: null } } },
        { employments: { none: {} } },
      ],
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
    take: 50,
    orderBy: { yearsExperience: 'desc' },
  });

  if (caregivers.length === 0) {
    return {
      matches: [],
      summary: 'No available caregivers found in the marketplace for this home.',
    };
  }

  const client = getAnthropicClient();

  const caregiverList = caregivers
    .map(
      (c, i) =>
        `[${i + 1}] ${c.user.firstName} ${c.user.lastName} | ` +
        `Experience: ${c.yearsExperience ?? 'N/A'} yrs | ` +
        `Rate: $${c.hourlyRate ?? 'open'}/hr | ` +
        `Specialties: ${c.specialties.join(', ') || 'general'} | ` +
        `Care types: ${c.careTypes.join(', ') || 'general'} | ` +
        `BG check: ${c.backgroundCheckStatus} | ` +
        `Reliability: ${c.reliabilityScore != null ? c.reliabilityScore.toFixed(0) + '/100' : 'N/A'}`
    )
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: `You are a staffing coordinator for CareLinkAI, an assisted living platform.
Given a shift description and a list of available caregivers, select the top 5 best matches.
Respond ONLY with valid JSON in this exact format:
{
  "matches": [
    { "index": 1, "reason": "one sentence why this person is a good fit" },
    ...
  ],
  "summary": "one sentence summarizing the staffing situation"
}
Rank by: care type match, specialties, experience, background check status (CLEARED > PENDING > NOT_STARTED), reliability score.`,
    messages: [
      {
        role: 'user',
        content: `Shift need: ${req.description}${req.date ? ` on ${req.date}` : ''}\n\nAvailable caregivers:\n${caregiverList}`,
      },
    ],
  });

  let parsed: { matches: { index: number; reason: string }[]; summary: string } = {
    matches: [],
    summary: '',
  };

  try {
    const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      matches: caregivers.slice(0, 5).map((c, i) => ({
        caregiverId: c.id,
        userId: c.userId,
        name: `${c.user.firstName} ${c.user.lastName}`,
        hourlyRate: c.hourlyRate ? Number(c.hourlyRate) : null,
        yearsExperience: c.yearsExperience,
        specialties: c.specialties,
        reliabilityScore: c.reliabilityScore,
        backgroundCheckStatus: c.backgroundCheckStatus,
        matchReason: 'Good availability match',
        rank: i + 1,
      })),
      summary: 'Showing top available caregivers.',
    };
  }

  const matches: CaregiverMatch[] = parsed.matches
    .slice(0, 5)
    .map((m, rank) => {
      const caregiver = caregivers[m.index - 1];
      if (!caregiver) return null;
      return {
        caregiverId: caregiver.id,
        userId: caregiver.userId,
        name: `${caregiver.user.firstName} ${caregiver.user.lastName}`,
        hourlyRate: caregiver.hourlyRate ? Number(caregiver.hourlyRate) : null,
        yearsExperience: caregiver.yearsExperience,
        specialties: caregiver.specialties,
        reliabilityScore: caregiver.reliabilityScore,
        backgroundCheckStatus: caregiver.backgroundCheckStatus,
        matchReason: m.reason,
        rank: rank + 1,
      };
    })
    .filter(Boolean) as CaregiverMatch[];

  return { matches, summary: parsed.summary };
}
