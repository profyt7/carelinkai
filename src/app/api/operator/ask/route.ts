export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAnthropicClient } from '@/lib/ai/claude';

// Tool definitions for Claude
const tools = [
  {
    name: 'get_dashboard_stats',
    description: 'Get high-level operator dashboard statistics: homes, residents, occupancy, inquiries',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'search_residents',
    description: 'Search or list residents by status, care needs, or home',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status: ACTIVE, INQUIRY, PENDING, DISCHARGED' },
        homeId: { type: 'string', description: 'Filter by home ID' },
        query: { type: 'string', description: 'Search by name or care needs' },
      },
      required: [],
    },
  },
  {
    name: 'search_caregivers',
    description: 'Search or list caregivers by reliability, specialties, or status',
    input_schema: {
      type: 'object' as const,
      properties: {
        minReliability: { type: 'number', description: 'Minimum reliability score (0-100)' },
        maxReliability: { type: 'number', description: 'Maximum reliability score (0-100)' },
        employmentStatus: { type: 'string', description: 'Filter: ACTIVE, ON_LEAVE, TERMINATED' },
        specialty: { type: 'string', description: 'Filter by specialty keyword' },
      },
      required: [],
    },
  },
  {
    name: 'get_shift_summary',
    description: 'Get upcoming and recent shift coverage information',
    input_schema: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter shifts: OPEN, ASSIGNED, COMPLETED, CANCELLED' },
      },
      required: [],
    },
  },
];

async function runTool(toolName: string, input: any, operatorId: string) {
  switch (toolName) {
    case 'get_dashboard_stats': {
      const [homes, residents, inquiries, shifts] = await Promise.all([
        prisma.assistedLivingHome.count({ where: { operatorId } }),
        prisma.resident.count({
          where: { home: { operatorId }, status: 'ACTIVE' },
        }),
        prisma.inquiry.count({
          where: { home: { operatorId }, status: { notIn: ['CLOSED_LOST', 'CONVERTED'] } },
        }),
        prisma.caregiverShift.count({
          where: { home: { operatorId }, status: 'OPEN' },
        }),
      ]);
      const capacity = await prisma.assistedLivingHome.aggregate({
        where: { operatorId },
        _sum: { capacity: true },
      });
      const totalCap = capacity._sum.capacity ?? 0;
      const occupancyRate = totalCap > 0 ? Math.round((residents / totalCap) * 100) : 0;
      return { homes, activeResidents: residents, openInquiries: inquiries, openShifts: shifts, occupancyRate: `${occupancyRate}%`, totalCapacity: totalCap };
    }

    case 'search_residents': {
      const where: any = { home: { operatorId } };
      if (input.status) where.status = input.status;
      if (input.homeId) where.homeId = input.homeId;
      const residents = await prisma.resident.findMany({
        where,
        select: {
          firstName: true, lastName: true, status: true,
          home: { select: { name: true } },
          medicalConditions: true, medications: true,
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      if (input.query) {
        const q = input.query.toLowerCase();
        return residents.filter(
          (r) =>
            `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
            (r.medicalConditions ?? '').toLowerCase().includes(q),
        );
      }
      return residents;
    }

    case 'search_caregivers': {
      const where: any = { employments: { some: { operatorId, endDate: null } } };
      if (input.employmentStatus) where.employmentStatus = input.employmentStatus;
      if (input.minReliability !== undefined) {
        where.reliabilityScore = { ...where.reliabilityScore, gte: input.minReliability };
      }
      if (input.maxReliability !== undefined) {
        where.reliabilityScore = { ...where.reliabilityScore, lte: input.maxReliability };
      }
      if (input.specialty) {
        where.specialties = { has: input.specialty };
      }
      return prisma.caregiver.findMany({
        where,
        select: {
          reliabilityScore: true, specialties: true, employmentStatus: true,
          user: { select: { firstName: true, lastName: true } },
        },
        take: 20,
        orderBy: { reliabilityScore: 'desc' },
      });
    }

    case 'get_shift_summary': {
      const where: any = { home: { operatorId } };
      if (input.status) where.status = input.status;
      const shifts = await prisma.caregiverShift.findMany({
        where,
        select: {
          startTime: true, endTime: true, status: true, hourlyRate: true,
          home: { select: { name: true } },
          caregiver: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        take: 15,
        orderBy: { startTime: 'asc' },
      });
      return shifts.map((s) => ({
        home: s.home.name,
        start: s.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        status: s.status,
        caregiver: s.caregiver ? `${s.caregiver.user.firstName} ${s.caregiver.user.lastName}` : 'Unassigned',
        rate: `$${Number(s.hourlyRate).toFixed(2)}/hr`,
      }));
    }

    default:
      return { error: 'Unknown tool' };
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const op = await prisma.operator.findUnique({ where: { userId: session.user.id } });
  if (!op) return NextResponse.json({ error: 'Operator only' }, { status: 403 });

  const { question } = await req.json();
  if (!question?.trim()) return NextResponse.json({ error: 'question required' }, { status: 400 });

  const client = getAnthropicClient();

  const messages: any[] = [{ role: 'user', content: question }];

  const systemPrompt = `You are an AI assistant for a CareLinkAI operator dashboard.
Answer questions about their residents, caregivers, homes, shifts, and occupancy.
Use the available tools to fetch real data. Be concise and helpful.
When you have the data, summarize it clearly in plain text.`;

  let answer = '';
  let iterations = 0;

  while (iterations < 5) {
    iterations++;
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b: any) => b.type === 'text') as any;
      answer = textBlock?.text ?? 'I could not find an answer to that.';
      break;
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });
      const toolResults: any[] = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await runTool(block.name, block.input, op.id);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    } else {
      break;
    }
  }

  return NextResponse.json({ answer });
}
