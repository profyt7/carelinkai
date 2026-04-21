/**
 * AI Match Explanation Service
 *
 * Generates natural language explanations for why a home matches
 * a family's preferences.
 */

import { getAnthropicClient } from '@/lib/ai/claude';

export interface ExplanationData {
  homeName: string;
  fitScore: number;
  matchFactors: {
    budgetScore: number;
    conditionScore: number;
    careLevelScore: number;
    locationScore: number;
    amenitiesScore: number;
  };
  homeDetails: {
    careLevel: string[];
    priceRange: string;
    location: string;
    amenities: string[];
    capacity: number;
    currentOccupancy: number;
  };
  familyPreferences: {
    budgetRange: string;
    careLevel: string;
    medicalConditions: string[];
    location: string;
    preferences: string[];
  };
}

/**
 * Generate an AI-powered explanation for why a home matches family preferences
 */
export async function generateMatchExplanation(
  data: ExplanationData
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return generateFallbackExplanation(data);
  }

  try {
    const client = getAnthropicClient();
    const prompt = buildPrompt(data);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 250,
      system: 'You are a compassionate senior care advisor helping families find the perfect assisted living home. Explain why a home is a good match in a warm, personal, and reassuring tone. Focus on the most important factors and be specific. Keep explanations under 150 words.',
      messages: [{ role: 'user', content: prompt }],
    });

    const block = response.content[0];
    const text = block.type === 'text' ? block.text.trim() : '';
    return text || generateFallbackExplanation(data);
  } catch (error) {
    console.error('[Match Explainer] Error generating explanation:', error);
    return generateFallbackExplanation(data);
  }
}

function buildPrompt(data: ExplanationData): string {
  const { homeName, fitScore, matchFactors, homeDetails, familyPreferences } = data;

  const keyFactors = [];

  if (matchFactors.budgetScore >= 70) {
    keyFactors.push(`budget-friendly (${homeDetails.priceRange} fits your ${familyPreferences.budgetRange} budget)`);
  }

  if (matchFactors.conditionScore >= 70) {
    const conditions = familyPreferences.medicalConditions.join(', ');
    keyFactors.push(`specialized in ${conditions} care`);
  }

  if (matchFactors.careLevelScore >= 90) {
    keyFactors.push(`offers exactly the ${familyPreferences.careLevel.replace(/_/g, ' ').toLowerCase()} you need`);
  }

  if (matchFactors.locationScore >= 70) {
    keyFactors.push(`conveniently located in ${homeDetails.location}`);
  }

  if (matchFactors.amenitiesScore >= 70) {
    keyFactors.push(`matches your lifestyle preferences`);
  }

  const concerns = [];

  if (matchFactors.budgetScore < 50) {
    concerns.push('pricing may be outside your preferred range');
  }

  if (matchFactors.locationScore < 50) {
    concerns.push('location is further from your preferred area');
  }

  const availabilityPct = ((homeDetails.capacity - homeDetails.currentOccupancy) / homeDetails.capacity) * 100;
  if (availabilityPct < 10) {
    concerns.push('limited availability');
  }

  return `Generate a warm, personal explanation for why "${homeName}" is a ${fitScore}% match.

Key strengths: ${keyFactors.length > 0 ? keyFactors.join(', ') : 'meets basic requirements'}

${concerns.length > 0 ? `Considerations: ${concerns.join(', ')}` : ''}

Home amenities: ${homeDetails.amenities.slice(0, 5).join(', ')}

Be specific and reassuring. Mention the most important factors first.`.trim();
}

function generateFallbackExplanation(data: ExplanationData): string {
  const { homeName, fitScore, matchFactors, homeDetails, familyPreferences } = data;

  let explanation = `${homeName} is a ${fitScore}% match for your needs. `;

  if (matchFactors.careLevelScore >= 90) {
    explanation += `They specialize in ${familyPreferences.careLevel.replace(/_/g, ' ').toLowerCase()} `;
  }

  if (matchFactors.conditionScore >= 70 && familyPreferences.medicalConditions.length > 0) {
    explanation += `and have experience with ${familyPreferences.medicalConditions[0]} care. `;
  }

  if (matchFactors.budgetScore >= 70) {
    explanation += `Their pricing (${homeDetails.priceRange}) aligns well with your budget. `;
  }

  if (matchFactors.locationScore >= 70) {
    explanation += `Located in ${homeDetails.location}, making it convenient for family visits. `;
  }

  if (homeDetails.amenities.length > 0) {
    explanation += `Amenities include ${homeDetails.amenities.slice(0, 3).join(', ')}.`;
  }

  return explanation.trim();
}

/**
 * Generate explanations for multiple matches in parallel
 */
export async function generateBatchExplanations(
  matches: ExplanationData[],
  maxConcurrent: number = 3
): Promise<Map<string, string>> {
  const explanations = new Map<string, string>();

  for (let i = 0; i < matches.length; i += maxConcurrent) {
    const batch = matches.slice(i, i + maxConcurrent);
    const results = await Promise.all(
      batch.map(async (match) => ({
        homeName: match.homeName,
        explanation: await generateMatchExplanation(match),
      }))
    );
    results.forEach(({ homeName, explanation }) => {
      explanations.set(homeName, explanation);
    });

    if (i + maxConcurrent < matches.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return explanations;
}
