export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient } from '@/lib/ai/claude';
import { prisma } from '@/lib/prisma';

const tools = [
  {
    name: 'search_homes',
    description: 'Search assisted living homes by care level, city, or price range',
    input_schema: {
      type: 'object' as const,
      properties: {
        careLevel: { type: 'string', description: 'ASSISTED, MEMORY_CARE, INDEPENDENT, or SKILLED_NURSING' },
        city: { type: 'string', description: 'City name to search near' },
        maxPrice: { type: 'number', description: 'Maximum monthly budget' },
      },
      required: [],
    },
  },
  {
    name: 'get_care_type_info',
    description: 'Get a plain-English explanation of a care type or term families commonly ask about',
    input_schema: {
      type: 'object' as const,
      properties: {
        term: { type: 'string', description: 'e.g. "memory care", "assisted living", "PASSPORT Medicaid", "Aid and Attendance"' },
      },
      required: ['term'],
    },
  },
];

const CARE_INFO: Record<string, string> = {
  'memory care': 'Memory care is a specialized form of assisted living designed for people with Alzheimer\'s disease, dementia, or other memory conditions. Memory care units have secured environments to prevent wandering, higher staff-to-resident ratios (often 1:5), staff trained specifically in dementia, and structured daily programs that reduce agitation and support cognitive engagement.',
  'assisted living': 'Assisted living provides housing, meals, and help with daily activities (bathing, dressing, medications) for seniors who need support but not full medical care. Staff are available 24/7. Residents typically have private or semi-private rooms. It is the most common type of senior care outside the home.',
  'skilled nursing': 'A skilled nursing facility (SNF or nursing home) provides 24-hour medical care for people with serious health conditions requiring ongoing medical attention — wound care, IV medications, physical therapy after surgery or stroke. It is more medically intensive than assisted living.',
  'independent living': 'Independent living communities are for active seniors who want a community lifestyle without the daily care needs. Meals, housekeeping, and social activities are typically included, but there is minimal hands-on care. No medical services are provided.',
  'passport medicaid': 'Ohio\'s PASSPORT Medicaid waiver helps low-income seniors pay for home and community-based services, including some assisted living costs. Eligibility is based on income, assets, and medical need. There are waitlists. Apply as early as possible — benefits do not backdate.',
  'aid and attendance': 'The VA Aid & Attendance pension benefit provides monthly payments to eligible wartime veterans (and surviving spouses) who need help with daily activities. Payments can be $1,400–$2,700/month depending on status. It can be used for assisted living, memory care, or in-home care. Apply through a VA-accredited claims agent.',
  'hospice': 'Hospice is comfort-focused care for people with a terminal illness and a life expectancy of 6 months or less. It focuses on pain management, dignity, and quality of life rather than curative treatment. Hospice can be provided in an assisted living facility, a hospice facility, or at home. Medicare covers hospice care.',
  'medicare': 'Medicare does NOT cover assisted living room and board. It covers short-term skilled nursing stays (up to 100 days after a qualifying hospital stay) and some home health services. Most families are surprised to learn this. Long-term residential care is primarily funded by private pay, long-term care insurance, Medicaid, or VA benefits.',
  'poa': 'A power of attorney (POA) is a legal document that authorizes a family member or other trusted person to make decisions on behalf of someone who cannot. A durable financial POA covers banking and finances; a healthcare POA covers medical decisions. Both must be created while the person still has mental capacity — waiting too long means going through court for guardianship.',
  'dnr': 'A Do Not Resuscitate (DNR) order is a medical order that instructs healthcare providers not to perform CPR if a patient\'s heart stops or they stop breathing. It is part of advance care planning and reflects a person\'s wishes about end-of-life medical intervention. A DNR must be signed by a physician to be valid.',
};

async function runTool(name: string, input: any) {
  if (name === 'search_homes') {
    const where: any = { status: 'ACTIVE' };
    if (input.careLevel) where.careLevel = { has: input.careLevel };
    if (input.maxPrice) where.priceMin = { lte: input.maxPrice };
    if (input.city) {
      where.address = { city: { contains: input.city, mode: 'insensitive' } };
    }
    const homes = await prisma.assistedLivingHome.findMany({
      where,
      select: {
        id: true,
        name: true,
        careLevel: true,
        priceMin: true,
        priceMax: true,
        currentOccupancy: true,
        capacity: true,
        address: { select: { city: true, state: true } },
      },
      take: 5,
      orderBy: { priceMin: 'asc' },
    });
    if (homes.length === 0) return { message: 'No homes found matching those criteria. Try broadening the search.' };
    return homes.map((h) => ({
      name: h.name,
      city: h.address?.city,
      state: h.address?.state,
      careLevel: h.careLevel,
      priceRange: h.priceMin && h.priceMax ? `$${Number(h.priceMin).toLocaleString()}–$${Number(h.priceMax).toLocaleString()}/mo` : 'Contact for pricing',
      availability: h.capacity - h.currentOccupancy > 0 ? `${h.capacity - h.currentOccupancy} spots available` : 'Waitlist',
      url: `/homes/${h.id}`,
    }));
  }

  if (name === 'get_care_type_info') {
    const key = input.term.toLowerCase().trim();
    for (const [k, v] of Object.entries(CARE_INFO)) {
      if (key.includes(k) || k.includes(key)) return { term: input.term, explanation: v };
    }
    return { term: input.term, explanation: 'I don\'t have specific information about that term, but I can help you find a home or answer questions about care types, costs, and the placement process.' };
  }

  return { error: 'Unknown tool' };
}

const SYSTEM = `You are a warm, knowledgeable care advisor for CareLinkAI — a senior care platform serving Cleveland, Ohio and surrounding areas.

You help families who are navigating assisted living placement for a parent or loved one. Many of these families are overwhelmed, grieving, and making decisions under time pressure. Be kind, direct, and honest.

Your job:
- Answer questions about care types, costs, Medicare/Medicaid, memory care, dementia, and the placement process
- Help families understand what to look for in a home and what questions to ask on tours
- Use your search_homes tool when families ask about specific locations, care levels, or budgets
- Use your get_care_type_info tool when families ask about terms they don't understand
- Recommend the CareLinkAI Education Hub (/learn) for deeper reading
- Encourage families to schedule tours through CareLinkAI

Do NOT:
- Give specific medical or legal advice (recommend they speak with a physician or elder law attorney)
- Make up specific home details that aren't in the search results
- Be pushy or sales-oriented

Keep answers conversational and human. You are a trusted advisor, not a chatbot.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const client = getAnthropicClient();
    const history: any[] = messages.map((m: any) => ({ role: m.role, content: m.content }));

    let reply = '';
    let iterations = 0;

    while (iterations < 5) {
      iterations++;
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: SYSTEM,
        tools,
        messages: history,
      });

      if (response.stop_reason === 'end_turn') {
        const block = response.content.find((b: any) => b.type === 'text') as any;
        reply = block?.text ?? 'I\'m here to help. Could you tell me more about what your family is looking for?';
        break;
      }

      if (response.stop_reason === 'tool_use') {
        history.push({ role: 'assistant', content: response.content });
        const results: any[] = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            const result = await runTool(block.name, block.input);
            results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
          }
        }
        history.push({ role: 'user', content: results });
      } else {
        break;
      }
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Care concierge error', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
