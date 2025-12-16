/**
 * AI Tour Scheduler Service
 * 
 * Uses OpenAI to intelligently suggest optimal tour times based on:
 * - Home availability
 * - Historical tour data
 * - Conversion rates by time
 * - Operator schedules
 * - Seasonal patterns
 */

import { prisma } from "@/lib/prisma";
import { TourStatus } from "@prisma/client";

interface SuggestedTimeSlot {
  dateTime: Date;
  dayOfWeek: string;
  timeSlot: string;
  score: number;
  reasoning: string;
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Suggest optimal tour times using AI analysis
 */
export async function suggestOptimalTimes(
  homeId: string,
  dateRange: DateRange,
  requestedTimePreferences?: string[]
): Promise<SuggestedTimeSlot[]> {
  try {
    // 1. Fetch home details
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      include: {
        operator: {
          include: {
            user: true,
          },
        },
        tourSlots: {
          where: { isActive: true },
        },
        address: true,
      },
    });

    if (!home) {
      throw new Error("Home not found");
    }

    // 2. Fetch historical tour data for analysis
    const historicalTours = await prisma.tourRequest.findMany({
      where: {
        homeId,
        status: {
          in: [TourStatus.COMPLETED, TourStatus.CONFIRMED],
        },
        confirmedTime: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
      select: {
        confirmedTime: true,
        outcome: true,
        status: true,
      },
    });

    // 3. Get existing scheduled tours in the date range
    const scheduledTours = await prisma.tourRequest.findMany({
      where: {
        homeId,
        status: {
          in: [TourStatus.PENDING, TourStatus.CONFIRMED],
        },
        confirmedTime: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      select: {
        confirmedTime: true,
      },
    });

    // 4. Analyze patterns and generate suggestions
    const analysisData = {
      homeName: home.name,
      homeType: home.careLevel.join(", "),
      availableSlots: home.tourSlots.map((slot) => ({
        day: getDayName(slot.dayOfWeek),
        start: slot.startTime,
        end: slot.endTime,
        capacity: slot.capacity,
      })),
      historicalData: {
        totalTours: historicalTours.length,
        conversionRate: calculateConversionRate(historicalTours),
        popularTimes: analyzePopularTimes(historicalTours),
        bestPerformingDays: analyzeBestDays(historicalTours),
      },
      scheduledConflicts: scheduledTours.map((t) => t.confirmedTime),
      requestedPreferences: requestedTimePreferences || [],
    };

    // 5. Use OpenAI to generate intelligent suggestions
    const suggestions = await generateAISuggestions(analysisData, dateRange);

    // 6. Filter out conflicts and validate
    const validSuggestions = validateAndFilterSuggestions(
      suggestions,
      scheduledTours.map((t) => t.confirmedTime),
      home.tourSlots
    );

    return validSuggestions.slice(0, 5); // Return top 5 suggestions
  } catch (error) {
    console.error("[AI Tour Scheduler] Error:", error);
    // Fallback to simple suggestions if AI fails
    return generateFallbackSuggestions(dateRange);
  }
}

/**
 * Generate AI suggestions using OpenAI
 */
async function generateAISuggestions(
  analysisData: any,
  dateRange: DateRange
): Promise<SuggestedTimeSlot[]> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("[AI Tour Scheduler] OpenAI API key not found. Using fallback suggestions.");
    return generateFallbackSuggestions(dateRange);
  }

  try {
    const prompt = `You are an AI assistant helping to schedule facility tours for ${analysisData.homeName}, a ${analysisData.homeType} senior living home.

Available Tour Slots:
${JSON.stringify(analysisData.availableSlots, null, 2)}

Historical Performance:
- Total tours in last 90 days: ${analysisData.historicalData.totalTours}
- Conversion rate: ${(analysisData.historicalData.conversionRate * 100).toFixed(1)}%
- Popular times: ${analysisData.historicalData.popularTimes.join(", ")}
- Best performing days: ${analysisData.historicalData.bestPerformingDays.join(", ")}

Date Range: ${dateRange.startDate.toDateString()} to ${dateRange.endDate.toDateString()}

Family Preferences: ${analysisData.requestedPreferences.join(", ") || "No specific preferences"}

Please suggest 5-7 optimal tour times within the date range. For each suggestion, provide:
1. Specific date and time
2. Day of week
3. Score (1-100) based on availability, historical performance, and preferences
4. Brief reasoning (1-2 sentences)

Format response as JSON array:
[
  {
    "dateTime": "2025-01-15T10:00:00.000Z",
    "dayOfWeek": "Wednesday",
    "timeSlot": "10:00 AM - 11:00 AM",
    "score": 95,
    "reasoning": "Wednesday mornings have highest conversion rate (85%) and aligns with family preferences."
  }
]`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a senior care facility scheduling expert. Provide specific, actionable tour time suggestions in valid JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in OpenAI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    // Convert to our format
    return suggestions.map((s: any) => ({
      dateTime: new Date(s.dateTime),
      dayOfWeek: s.dayOfWeek,
      timeSlot: s.timeSlot,
      score: s.score,
      reasoning: s.reasoning,
    }));
  } catch (error) {
    console.error("[AI Tour Scheduler] OpenAI error:", error);
    return generateFallbackSuggestions(dateRange);
  }
}

/**
 * Generate fallback suggestions when AI is unavailable
 */
function generateFallbackSuggestions(dateRange: DateRange): SuggestedTimeSlot[] {
  const suggestions: SuggestedTimeSlot[] = [];
  const currentDate = new Date(dateRange.startDate);
  const preferredTimes = ["10:00", "11:00", "14:00", "15:00"];
  const preferredDays = [2, 3, 4]; // Tuesday, Wednesday, Thursday

  while (suggestions.length < 5 && currentDate <= dateRange.endDate) {
    const dayOfWeek = currentDate.getDay();

    if (preferredDays.includes(dayOfWeek)) {
      preferredTimes.forEach((time) => {
        const [hours, minutes] = time.split(":").map(Number);
        const dateTime = new Date(currentDate);
        dateTime.setHours(hours, minutes, 0, 0);

        if (dateTime > new Date() && suggestions.length < 5) {
          suggestions.push({
            dateTime,
            dayOfWeek: getDayName(dayOfWeek),
            timeSlot: `${formatTime(time)} - ${formatTime(addHour(time))}`,
            score: 80,
            reasoning:
              "Mid-week mornings and early afternoons are traditionally optimal for facility tours.",
          });
        }
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return suggestions;
}

/**
 * Validate and filter suggestions
 */
function validateAndFilterSuggestions(
  suggestions: SuggestedTimeSlot[],
  conflicts: (Date | null)[],
  availableSlots: any[]
): SuggestedTimeSlot[] {
  return suggestions.filter((suggestion) => {
    // Check for conflicts
    const hasConflict = conflicts.some((conflict) => {
      if (!conflict) return false;
      const diff = Math.abs(conflict.getTime() - suggestion.dateTime.getTime());
      return diff < 60 * 60 * 1000; // Within 1 hour
    });

    if (hasConflict) return false;

    // Check if time is in the future
    if (suggestion.dateTime <= new Date()) return false;

    // Check if matches available slots (if defined)
    if (availableSlots.length > 0) {
      const dayOfWeek = suggestion.dateTime.getDay();
      const timeStr = `${suggestion.dateTime.getHours()}:${suggestion.dateTime.getMinutes().toString().padStart(2, "0")}`;

      const matchesSlot = availableSlots.some(
        (slot) => slot.dayOfWeek === dayOfWeek && slot.isActive
      );

      if (!matchesSlot) return false;
    }

    return true;
  });
}

/**
 * Calculate conversion rate from historical data
 */
function calculateConversionRate(tours: any[]): number {
  if (tours.length === 0) return 0;

  const converted = tours.filter(
    (t) => t.outcome === "CONVERTED" || t.outcome === "SHOWED_UP"
  ).length;

  return converted / tours.length;
}

/**
 * Analyze popular times from historical data
 */
function analyzePopularTimes(tours: any[]): string[] {
  const timeCount: Record<string, number> = {};

  tours.forEach((tour) => {
    if (tour.confirmedTime) {
      const hour = new Date(tour.confirmedTime).getHours();
      const timeSlot = `${hour}:00`;
      timeCount[timeSlot] = (timeCount[timeSlot] || 0) + 1;
    }
  });

  return Object.entries(timeCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([time]) => formatTime(time));
}

/**
 * Analyze best performing days
 */
function analyzeBestDays(tours: any[]): string[] {
  const dayCount: Record<number, { total: number; converted: number }> = {};

  tours.forEach((tour) => {
    if (tour.confirmedTime) {
      const day = new Date(tour.confirmedTime).getDay();
      if (!dayCount[day]) {
        dayCount[day] = { total: 0, converted: 0 };
      }
      dayCount[day].total++;
      if (tour.outcome === "CONVERTED") {
        dayCount[day].converted++;
      }
    }
  });

  return Object.entries(dayCount)
    .map(([day, stats]) => ({
      day: parseInt(day),
      rate: stats.total > 0 ? stats.converted / stats.total : 0,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
    .map((item) => getDayName(item.day));
}

/**
 * Helper functions
 */
function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day] || "Unknown";
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map((n) => parseInt(n) || 0);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function addHour(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${hours + 1}:${minutes.toString().padStart(2, "0")}`;
}
