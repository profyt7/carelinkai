import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { InquiryUrgency } from '@prisma/client';

// Dummy key for build-time initialization when no real key is provided
const DUMMY_OPENAI_KEY = 'sk-dummy-key-for-build-only';

// Check if we're in production
const isProduction = process.env.NODE_ENV === 'production';

// Lazy-load OpenAI client to avoid build-time initialization
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn(
        '\x1b[33m%s\x1b[0m', // Yellow text
        (isProduction
          ? 'WARNING: OPENAI_API_KEY is missing in production build. Initializing OpenAI with a dummy key so the build can proceed. Runtime API calls will fail unless the key is provided at runtime.'
          : 'WARNING: OPENAI_API_KEY is missing. Using dummy key for development. Real OpenAI API calls will fail until a valid key is provided.')
      );
      openaiClient = new OpenAI({
        apiKey: DUMMY_OPENAI_KEY,
      });
    } else {
      openaiClient = new OpenAI({
        apiKey: apiKey,
      });
    }
  }
  return openaiClient;
}

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
  /**
   * Generate AI-powered response to an inquiry
   */
  async generateResponse(
    context: InquiryContext,
    options: ResponseOptions = { type: 'INITIAL' }
  ): Promise<string> {
    const { inquiry, home, matchedHomes } = context;
    
    // Runtime check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        'OPENAI_API_KEY environment variable is not set. AI response generation requires a valid OpenAI API key. ' +
        'Please configure this in your environment variables.'
      );
    }
    
    // Determine tone based on urgency if not specified
    const tone = options.tone || this.getToneFromUrgency(inquiry.urgency);
    
    // Build context prompt
    const prompt = this.buildPrompt(inquiry, home, matchedHomes, options, tone);
    
    // Generate response using OpenAI
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(tone),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });
    
    return response.choices[0].message.content || '';
  }
  
  /**
   * Get system prompt based on tone
   */
  private getSystemPrompt(tone: string): string {
    const basePrompt = `You are a compassionate and knowledgeable senior care advisor for CareLinkAI, 
a platform that helps families find the perfect assisted living and memory care homes for their loved ones.`;
    
    const tonePrompts = {
      PROFESSIONAL: `${basePrompt} Maintain a professional, informative tone while being helpful and clear.`,
      WARM: `${basePrompt} Use a warm, friendly tone that makes families feel supported and understood.`,
      EMPATHETIC: `${basePrompt} Show deep empathy and understanding for the family's situation. 
Acknowledge the emotional difficulty of finding care for a loved one.`,
      URGENT: `${basePrompt} Respond with appropriate urgency while remaining calm and helpful. 
Prioritize immediate next steps and quick solutions.`,
    };
    
    return tonePrompts[tone as keyof typeof tonePrompts] || tonePrompts.PROFESSIONAL;
  }
  
  /**
   * Build detailed prompt for AI
   */
  private buildPrompt(
    inquiry: any,
    home: any,
    matchedHomes: any[],
    options: ResponseOptions,
    tone: string
  ): string {
    let prompt = `Generate a personalized response to the following inquiry:\n\n`;
    
    // Inquiry details
    prompt += `**Inquiry Details:**\n`;
    prompt += `- Contact: ${inquiry.contactName}\n`;
    prompt += `- Care Recipient: ${inquiry.careRecipientName}`;
    if (inquiry.careRecipientAge) {
      prompt += `, Age ${inquiry.careRecipientAge}`;
    }
    prompt += `\n`;
    
    // Care needs
    if (inquiry.careNeeds && inquiry.careNeeds.length > 0) {
      prompt += `- Care Needs: ${inquiry.careNeeds.join(', ')}\n`;
    }
    
    // Additional info
    if (inquiry.additionalInfo) {
      prompt += `- Additional Information: ${inquiry.additionalInfo}\n`;
    }
    
    // Urgency
    prompt += `- Urgency Level: ${inquiry.urgency}\n`;
    
    // Preferred contact method
    prompt += `- Preferred Contact: ${inquiry.preferredContactMethod}\n\n`;
    
    // Specific home inquiry
    if (home && options.includeHomeDetails) {
      prompt += `**Home of Interest:**\n`;
      prompt += `- Name: ${home.name}\n`;
      prompt += `- Location: ${home.city}, ${home.state}\n`;
      if (home.description) {
        prompt += `- Description: ${home.description}\n`;
      }
      prompt += `\n`;
    }
    
    // Matched homes
    if (matchedHomes && matchedHomes.length > 0 && options.includeHomeDetails) {
      prompt += `**Recommended Homes:**\n`;
      matchedHomes.slice(0, 3).forEach((h, i) => {
        prompt += `${i + 1}. ${h.name} - ${h.city}, ${h.state}\n`;
      });
      prompt += `\n`;
    }
    
    // Response type instructions
    prompt += `**Response Type:** ${options.type}\n\n`;
    
    // Specific instructions based on type
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
    prompt += `Generate a complete, professional email response (200-400 words).`;
    
    return prompt;
  }
  
  /**
   * Determine appropriate tone based on urgency
   */
  private getToneFromUrgency(urgency: InquiryUrgency): string {
    switch (urgency) {
      case 'URGENT':
        return 'URGENT';
      case 'HIGH':
        return 'EMPATHETIC';
      case 'MEDIUM':
        return 'WARM';
      case 'LOW':
        return 'PROFESSIONAL';
      default:
        return 'WARM';
    }
  }
  
  /**
   * Generate response with full context from database
   */
  async generateResponseForInquiry(
    inquiryId: string,
    options: ResponseOptions = { type: 'INITIAL' }
  ): Promise<string> {
    // Fetch inquiry with related data
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
    
    // Fetch matched homes if needed
    let matchedHomes = [];
    if (options.includeHomeDetails && !inquiry.homeId) {
      // TODO: Implement home matching logic based on care needs
      matchedHomes = await this.findMatchingHomes(inquiry);
    }
    
    const context: InquiryContext = {
      inquiry,
      home: inquiry.home,
      matchedHomes,
    };
    
    return this.generateResponse(context, options);
  }
  
  /**
   * Find matching homes based on inquiry details
   */
  private async findMatchingHomes(inquiry: any): Promise<any[]> {
    // Simple matching logic - can be enhanced with AI matching
    const homes = await prisma.assistedLivingHome.findMany({
      where: {
        status: 'ACTIVE',
        // Add more sophisticated matching logic here
      },
      take: 5,
    });
    
    return homes;
  }
}

// Export singleton instance
export const inquiryResponseGenerator = new InquiryResponseGenerator();
