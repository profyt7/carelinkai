/**
 * OpenAI Integration for Match Explanations
 * 
 * Generates natural language explanations for why a home matches
 * a family's preferences using GPT-4.
 */

import OpenAI from 'openai';

// Lazy initialize OpenAI client to handle missing API key gracefully
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (openai) return openai;
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn('[OpenAI Explainer] OPENAI_API_KEY not found. Using fallback explanations.');
    return null;
  }
  
  try {
    openai = new OpenAI({ apiKey });
    return openai;
  } catch (error) {
    console.error('[OpenAI Explainer] Failed to initialize OpenAI client:', error);
    return null;
  }
}

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
  try {
    // Get OpenAI client (will return null if API key is missing)
    const client = getOpenAIClient();
    
    // If no client, use fallback immediately
    if (!client) {
      return generateFallbackExplanation(data);
    }
    
    // Build the prompt
    const prompt = buildPrompt(data);
    
    // Call OpenAI API
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a compassionate senior care advisor helping families find the perfect assisted living home. Explain why a home is a good match in a warm, personal, and reassuring tone. Focus on the most important factors and be specific. Keep explanations under 150 words.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 250
    });
    
    const explanation = response.choices[0]?.message?.content || 
      'This home matches your preferences well based on care level, budget, and location.';
    
    return explanation.trim();
    
  } catch (error) {
    console.error('[OpenAI Explainer] Error generating explanation:', error);
    
    // Fallback to template-based explanation if OpenAI fails
    return generateFallbackExplanation(data);
  }
}

/**
 * Build the prompt for OpenAI
 */
function buildPrompt(data: ExplanationData): string {
  const {
    homeName,
    fitScore,
    matchFactors,
    homeDetails,
    familyPreferences
  } = data;
  
  // Identify key match factors
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
  
  // Identify concerns
  const concerns = [];
  
  if (matchFactors.budgetScore < 50) {
    concerns.push('pricing may be outside your preferred range');
  }
  
  if (matchFactors.locationScore < 50) {
    concerns.push('location is further from your preferred area');
  }
  
  const availabilityPercentage = ((homeDetails.capacity - homeDetails.currentOccupancy) / homeDetails.capacity) * 100;
  if (availabilityPercentage < 10) {
    concerns.push('limited availability');
  }
  
  return `
Generate a warm, personal explanation for why "${homeName}" is a ${fitScore}% match.

Key strengths: ${keyFactors.length > 0 ? keyFactors.join(', ') : 'meets basic requirements'}

${concerns.length > 0 ? `Considerations: ${concerns.join(', ')}` : ''}

Home amenities: ${homeDetails.amenities.slice(0, 5).join(', ')}

Be specific and reassuring. Mention the most important factors first.
  `.trim();
}

/**
 * Generate a fallback explanation if OpenAI fails
 */
function generateFallbackExplanation(data: ExplanationData): string {
  const { homeName, fitScore, matchFactors, homeDetails, familyPreferences } = data;
  
  let explanation = `${homeName} is a ${fitScore}% match for your needs. `;
  
  // Add key strengths
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
  
  // Add amenities
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
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < matches.length; i += maxConcurrent) {
    const batch = matches.slice(i, i + maxConcurrent);
    const promises = batch.map(async (match) => {
      const explanation = await generateMatchExplanation(match);
      return { homeName: match.homeName, explanation };
    });
    
    const results = await Promise.all(promises);
    results.forEach(({ homeName, explanation }) => {
      explanations.set(homeName, explanation);
    });
    
    // Small delay between batches to avoid rate limits
    if (i + maxConcurrent < matches.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return explanations;
}
