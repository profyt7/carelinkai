import { getAnthropicClient, requireAnthropicKey } from '@/lib/ai/claude';
import { prisma } from '@/lib/prisma';
import { InquiryUrgency } from '@prisma/client';

interface InquiryContext {
  inquiry: any;
  home?: any;
  matchedHomes?: any[];
}

interface ResponseOptions {
  type: 'INITIAL' | 'FOLLOW_UP' | 'TOUR_CONFIRMATION' | 'GENERAL';
  tone?: 'PROFESSIONAL' | 'WARM' | 'EMPATHETIC' | 'URGENT';
  includeNextSteps?: boolean;
  includeHomeDetails?: boolean;
}

export class InquiryResponseGenerator {
  async generateResponse(
    context: InquiryContext,
    options: ResponseOptions = { type: 'INITIAL' }
  ): Promise<string> {
    const { inquiry, home, matchedHomes } = context;

    requireAnthropicKey();

    const tone = options.tone || this.getToneFromUrgency(inquiry.urgency);
    const prompt = this.buildPrompt(inquiry, home, matchedHomes || [], options, tone);

    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: this.getSystemPrompt(tone),
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }

  private getSystemPrompt(tone: string): string {
    const base = `You are a compassionate and knowledgeable senior care advisor for CareLinkAI, a platform that helps families find the perfect assisted living and memory care homes for their loved ones.`;

    const toneMap: Record<string, string> = {
      PROFESSIONAL: `${base} Maintain a professional, informative tone while being helpful and clear.`,
      WARM: `${base} Use a warm, friendly tone that makes families feel supported and understood.`,
      EMPATHETIC: `${base} Show deep empathy and understanding for the family's situation. Acknowledge the emotional difficulty of finding care for a loved one.`,
      URGENT: `${base} Respond with appropriate urgency while remaining calm and helpful. Prioritize immediate next steps and quick solutions.`,
    };

    return toneMap[tone] ?? toneMap['PROFESSIONAL']!;
  }

  private buildPrompt(
    inquiry: any,
    home: any,
    matchedHomes: any[],
    options: ResponseOptions,
    tone: string
  ): string {
    let prompt = `Generate a personalized response to the following inquiry:\n\n`;

    prompt += `**Inquiry Details:**\n`;
    prompt += `- Contact: ${inquiry.contactName || 'the family'}\n`;
    prompt += `- Care Recipient: ${inquiry.careRecipientName || 'their loved one'}`;
    if (inquiry.careRecipientAge) {
      prompt += `, Age ${inquiry.careRecipientAge}`;
    }
    prompt += `\n`;

    if (inquiry.careNeeds && inquiry.careNeeds.length > 0) {
      prompt += `- Care Needs: ${inquiry.careNeeds.join(', ')}\n`;
    }

    if (inquiry.additionalInfo) {
      prompt += `- Additional Information: ${inquiry.additionalInfo}\n`;
    }

    prompt += `- Urgency Level: ${inquiry.urgency}\n`;
    prompt += `- Preferred Contact: ${inquiry.preferredContactMethod}\n\n`;

    if (home && options.includeHomeDetails) {
      prompt += `**Home of Interest:**\n`;
      prompt += `- Name: ${home.name}\n`;
      prompt += `- Location: ${home.city}, ${home.state}\n`;
      if (home.description) {
        prompt += `- Description: ${home.description}\n`;
      }
      prompt += `\n`;
    }

    if (matchedHomes && matchedHomes.length > 0 && options.includeHomeDetails) {
      prompt += `**Recommended Homes:**\n`;
      matchedHomes.slice(0, 3).forEach((h, i) => {
        prompt += `${i + 1}. ${h.name} - ${h.city}, ${h.state}\n`;
      });
      prompt += `\n`;
    }

    prompt += `**Response Type:** ${options.type}\n\n`;

    switch (options.type) {
      case 'INITIAL':
        prompt += `This is the initial response to their inquiry. Please:\n`;
        prompt += `1. Thank them for reaching out\n`;
        prompt += `2. Acknowledge their specific situation and care needs\n`;
        prompt += `3. Provide relevant information about how CareLinkAI can help\n`;
        if (options.includeHomeDetails) {
          prompt += `4. Mention the recommended homes or specific home they inquired about\n`;
        }
        if (options.includeNextSteps) {
          prompt += `5. Suggest clear next steps (view profiles, schedule tours, speak with advisor)\n`;
        }
        prompt += `6. Provide contact information for further assistance\n`;
        break;

      case 'FOLLOW_UP':
        prompt += `This is a follow-up to a previous inquiry. Please:\n`;
        prompt += `1. Reference their previous inquiry\n`;
        prompt += `2. Check in on their search progress\n`;
        prompt += `3. Offer additional assistance or information\n`;
        prompt += `4. Suggest next steps if they haven't taken action\n`;
        break;

      case 'TOUR_CONFIRMATION':
        prompt += `This is confirming a scheduled tour. Please:\n`;
        prompt += `1. Confirm the tour details\n`;
        prompt += `2. Provide what to expect during the tour\n`;
        prompt += `3. Offer to answer any questions beforehand\n`;
        prompt += `4. Provide contact information for changes\n`;
        break;

      case 'GENERAL':
        prompt += `This is a general informational response. Please:\n`;
        prompt += `1. Address their specific questions or concerns\n`;
        prompt += `2. Provide helpful, accurate information\n`;
        prompt += `3. Offer additional resources if relevant\n`;
        break;
    }

    prompt += `\n**Tone:** ${tone}\n\n`;
    prompt += `Generate a complete, professional email response (200-400 words). Write in plain text only — do not use markdown formatting, asterisks, pound signs, or bullet dashes. Use simple line breaks to separate paragraphs.`;

    return prompt;
  }

  private getToneFromUrgency(urgency: InquiryUrgency): string {
    switch (urgency) {
      case 'URGENT': return 'URGENT';
      case 'HIGH': return 'EMPATHETIC';
      case 'MEDIUM': return 'WARM';
      case 'LOW': return 'PROFESSIONAL';
      default: return 'WARM';
    }
  }

  async generateResponseForInquiry(
    inquiryId: string,
    options: ResponseOptions = { type: 'INITIAL' }
  ): Promise<string> {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        home: true,
        family: true,
      },
    });

    if (!inquiry) {
      throw new Error('Inquiry not found');
    }

    let matchedHomes: any[] = [];
    if (options.includeHomeDetails && !inquiry.homeId) {
      matchedHomes = await this.findMatchingHomes(inquiry);
    }

    const context: InquiryContext = {
      inquiry,
      home: inquiry.home,
      matchedHomes,
    };

    return this.generateResponse(context, options);
  }

  private async findMatchingHomes(inquiry: any): Promise<any[]> {
    return prisma.assistedLivingHome.findMany({
      where: { status: 'ACTIVE' },
      take: 5,
    });
  }
}

let _instance: InquiryResponseGenerator | null = null;

export function getInquiryResponseGenerator(): InquiryResponseGenerator {
  if (!_instance) {
    _instance = new InquiryResponseGenerator();
  }
  return _instance;
}

// For backward compatibility
export const inquiryResponseGenerator = {
  generateResponse: (context: InquiryContext, options?: ResponseOptions) =>
    getInquiryResponseGenerator().generateResponse(context, options),
  generateResponseForInquiry: (inquiryId: string, options?: ResponseOptions) =>
    getInquiryResponseGenerator().generateResponseForInquiry(inquiryId, options),
};
