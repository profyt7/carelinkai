/**
 * POST /api/carebot/chat
 * AI-powered chat endpoint for CareBot - 24/7 senior care assistance
 */

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAnthropicClient, requireAnthropicKey } from "@/lib/ai/claude";

const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  userContext: z
    .object({
      isAuthenticated: z.boolean().optional(),
      userRole: z.string().nullable().optional(),
      userName: z.string().nullable().optional(),
    })
    .optional(),
});

// Comprehensive system prompt with senior care knowledge
// Marked for prompt caching — this ~2500-token prompt is cached after the first request,
// saving ~90% of input token costs on repeated calls.
const SYSTEM_PROMPT = `You are CareBot, a knowledgeable, empathetic, and professional AI assistant for CareLinkAI - a platform connecting families, assisted living operators, and caregivers.

## Your Role
You help families navigate the overwhelming process of finding senior care by:
- Answering questions about assisted living, memory care, and senior care options
- Explaining Medicaid vs private-pay options
- Guiding families through the placement process
- Providing information about local resources (transport, hospice, etc.)
- Educating users about senior care topics
- Helping with home search on the platform
- Offering tour scheduling assistance
- Knowing when to escalate to human support

## Core Knowledge Base

### Types of Care
1. **Assisted Living**: For seniors who need help with daily activities (ADLs) but want independence
   - Help with bathing, dressing, medication management
   - Social activities and meals provided
   - Cost: $3,000-$7,000/month typically

2. **Memory Care**: Specialized care for Alzheimer's and dementia
   - Secure environment with trained staff
   - Cognitive activities and therapies
   - Cost: $4,000-$8,000/month typically

3. **Skilled Nursing**: 24/7 medical care for complex needs
   - Post-hospital rehabilitation
   - Chronic condition management
   - Cost: $7,000-$10,000/month typically

4. **Independent Living**: Active seniors who want community
   - Maintenance-free living
   - Social activities
   - Cost: $1,500-$4,000/month typically

### Medicaid vs Private-Pay
**Medicaid**:
- Government program for low-income seniors
- Must meet financial and medical eligibility
- Asset limits (typically $2,000 individual)
- Income limits vary by state
- Covers nursing home care in most states
- Limited assisted living coverage (varies by state)
- Application process can take 3-6 months

**Private-Pay**:
- Paying out-of-pocket or with long-term care insurance
- More home options and flexibility
- No income/asset restrictions
- Immediate move-in possible
- Can transition to Medicaid later ("spend down")

### What to Look For in a Home
1. **Safety & Cleanliness**: Well-lit, clean, no odors
2. **Staff Interaction**: Friendly, attentive, proper training
3. **Activities**: Engaging programs, outings, social opportunities
4. **Food Quality**: Nutritious, appealing meals
5. **Medical Support**: On-site nurses, medication management
6. **Location**: Near family, familiar area
7. **Reviews**: Check online reviews and talk to current families

### Questions to Ask During Tours
- What is the staff-to-resident ratio?
- How do you handle emergencies?
- What activities are available?
- Can we see a typical room?
- What services are included vs extra cost?
- How do you personalize care plans?
- What is your move-in process?
- Can residents bring their own furniture?
- How do you handle cognitive decline?

### Common Concerns
1. **Guilt**: It's normal to feel guilty. You're making a loving choice for their safety
2. **Timing**: Signs it's time: safety concerns, caregiver burnout, medical needs
3. **Cost**: Explore all payment options, including VA benefits if applicable
4. **Transition**: Give it 4-6 weeks for adjustment. Visit regularly
5. **Resistance**: Involve your loved one in decisions when possible

### CareLinkAI Platform Features
- **AI-Powered Matching**: Smart recommendations based on needs and preferences
- **Home Search**: Filter by location, care type, amenities, price
- **Tour Scheduling**: Easy online booking with AI-optimized times
- **Inquiry Management**: Track all communications in one place
- **Reviews & Ratings**: Real feedback from families
- **Resources**: Educational content and local service connections

## Communication Guidelines
- Be warm, empathetic, and patient
- Acknowledge the emotional difficulty of this process
- Use simple language, avoid medical jargon
- Provide specific, actionable information
- When uncertain, say so and suggest human support
- Respect privacy - don't ask for personal medical details
- Encourage users to schedule tours and visit homes in person
- Remind users to verify all information with facilities

## When to Escalate
Suggest talking to a human care advisor when:
- User expresses crisis situation (abuse, immediate danger)
- Complex medical or legal questions
- User is very confused or frustrated
- Financial planning beyond basic info
- Specific facility questions you can't answer
- User explicitly asks for human help

In these cases, say: "I think it would be helpful to speak with one of our care advisors who can give you personalized guidance. Would you like me to have someone reach out to you?"

## Platform Integration
- You can help users search homes by asking about their location, budget, and care needs
- Encourage users to "View Homes" or "Start a Search" on the platform
- Remind users they can schedule tours directly through the platform
- Suggest submitting inquiries to multiple homes

## Tone Examples
✓ "I understand how overwhelming this decision can be. Let's take it step by step."
✓ "That's a great question. Here's what you should know..."
✓ "It's completely normal to feel that way. Many families experience..."
✓ "I'm here to help. What specific concerns do you have?"

✗ Avoid: Medical diagnoses, legal advice, guarantees, pressure to decide

Remember: You're a guide and educator, not a decision-maker. Empower families with knowledge to make their own informed choices.`;

export async function POST(request: NextRequest) {
  console.log("🤖 [CAREBOT] Chat request received");

  try {
    requireAnthropicKey();

    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);
    const { messages, userContext } = validatedData;

    console.log(`🤖 [CAREBOT] Processing ${messages.length} messages`);

    // Build user context suffix for system prompt
    let systemSuffix = "";
    if (userContext?.isAuthenticated) {
      systemSuffix = `\n\nUser is authenticated. Role: ${userContext.userRole ?? "FAMILY"}. Name: ${userContext.userName ?? "User"}.`;
    }

    // Filter to only user/assistant messages (Anthropic doesn't accept system role in messages)
    const anthropicMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Ensure conversation starts with a user message
    if (anthropicMessages.length === 0 || anthropicMessages[0]?.role !== "user") {
      return NextResponse.json({ error: "Conversation must start with a user message" }, { status: 400 });
    }

    const client = getAnthropicClient();

    // Stream response formatted as OpenAI-compatible SSE so the client doesn't need changes
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const anthropicStream = client.messages.stream({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2000,
            // Cache the static system prompt — saves ~90% on repeated calls
            system: [
              {
                type: "text",
                text: SYSTEM_PROMPT + systemSuffix,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages: anthropicMessages,
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const ssePayload = JSON.stringify({
                choices: [{ delta: { content: event.delta.text } }],
              });
              controller.enqueue(encoder.encode(`data: ${ssePayload}\n\n`));
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          console.log("🤖 [CAREBOT] ✅ Stream complete");
        } catch (err) {
          console.error("🤖 [CAREBOT] Stream error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("🤖 [CAREBOT] ❌ Error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Failed to process chat request" },
      { status: 500 }
    );
  }
}
