import { prisma } from "@/lib/prisma";
import { calculateAIMatchScore } from "@/lib/ai-matching";
import type { ResidentProfile } from "@/lib/ai-matching";
import {
  getEmbeddingProvider,
  summarizeHome,
  summarizeResidentProfile,
  cosineSimilarity,
} from "@/lib/ai/provider";

export type ResidentMatchResult = {
  home: any;
  scores: {
    structured: number; // 0-100
    semantic?: number; // 0-100
    combined: number; // 0-100
  };
};

export async function matchHomesForResident(
  profile: ResidentProfile,
  opts: { limit?: number; minScore?: number; semanticWeight?: number } = {}
): Promise<ResidentMatchResult[]> {
  const limit = opts.limit ?? 10;
  const minScore = opts.minScore ?? 60;
  const semanticWeight = Math.min(Math.max(opts.semanticWeight ?? 0.3, 0), 0.9);

  // Fetch candidate homes
  const homes = await prisma.assistedLivingHome.findMany({
    where: { status: "ACTIVE" },
    include: {
      address: true,
      photos: { where: { isPrimary: true }, take: 1 },
    },
    take: limit * 4,
  });

  const provider = getEmbeddingProvider();
  const useSemantic = provider.name !== "fallback";

  // Precompute resident embedding if semantic available
  let residentEmbedding: number[] | null = null;
  if (useSemantic) {
    const residentText = summarizeResidentProfile(profile as any);
    residentEmbedding = await provider.embed(residentText);
  }

  const results = await Promise.all(
    homes.map(async (home) => {
      const structured = await calculateAIMatchScore(home, profile);
      let semantic: number | undefined;
      if (residentEmbedding) {
        const homeText = summarizeHome(home);
        const homeEmb = await provider.embed(homeText);
        const sim = cosineSimilarity(residentEmbedding!, homeEmb); // -1..1
        // Map similarity [-1,1] -> [0,100]
        semantic = Math.round(((sim + 1) / 2) * 100);
      }
      const combined = Math.round(
        semantic !== undefined
          ? structured * (1 - semanticWeight) + semantic * semanticWeight
          : structured
      );
      return { home, scores: { structured, semantic, combined } } as ResidentMatchResult;
    })
  );

  return results
    .filter((r) => r.scores.combined >= minScore)
    .sort((a, b) => b.scores.combined - a.scores.combined)
    .slice(0, limit);
}
