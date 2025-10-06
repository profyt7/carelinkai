import { env } from "process";

export interface EmbeddingProvider {
  name: string;
  isAvailable(): boolean;
  embed(text: string): Promise<number[]>;
}

// Simple cosine similarity utility
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// Fallback provider that returns a stable pseudo-embedding based on hashing
class FallbackProvider implements EmbeddingProvider {
  name = "fallback";
  isAvailable() {
    return true;
  }
  async embed(text: string): Promise<number[]> {
    // Deterministic hash-based vector (dim 128)
    const dim = 128;
    const out = new Array<number>(dim).fill(0);
    let h1 = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h1 ^= text.charCodeAt(i);
      h1 += (h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24);
      const idx = (h1 >>> 0) % dim;
      out[idx] = (out[idx] ?? 0) + 1;
    }
    // L2 normalize
    const norm = Math.sqrt(out.reduce((s, v) => s + v * v, 0)) || 1;
    return out.map((v) => v / norm);
  }
}

let cachedProvider: EmbeddingProvider | null = null;

export function getEmbeddingProvider(): EmbeddingProvider {
  if (cachedProvider) return cachedProvider;

  const apiKey = env["OPENAI_API_KEY"] || env["NEXT_PUBLIC_OPENAI_API_KEY"];
  if (apiKey) {
    // Lazy import to avoid bundling if not used
    const provider: EmbeddingProvider = {
      name: "openai",
      isAvailable: () => true,
      async embed(text: string) {
        // Use fetch to avoid adding new deps
        const res = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: env["OPENAI_EMBEDDING_MODEL"] || "text-embedding-3-small",
            input: text,
          }),
          // Avoid Next.js fetch caching for server actions
          cache: "no-store",
        });
        if (!res.ok) {
          // Graceful fallback on API errors
          const fb = new FallbackProvider();
          return fb.embed(text);
        }
        const json: any = await res.json();
        const arr: number[] | undefined = json?.data?.[0]?.embedding;
        if (!arr || !Array.isArray(arr)) {
          const fb = new FallbackProvider();
          return fb.embed(text);
        }
        return arr;
      },
    };
    cachedProvider = provider;
    return provider;
  }

  cachedProvider = new FallbackProvider();
  return cachedProvider;
}

export function summarizeResidentProfile(profile: Record<string, any>): string {
  // Convert structured profile into a concise textual summary suitable for embedding
  const parts: string[] = [];
  if (profile["age"]) parts.push(`Age: ${profile["age"]}`);
  if (profile["gender"]) parts.push(`Gender: ${profile["gender"]}`);
  if (profile["careLevelNeeded"]?.length)
    parts.push(`Care Levels: ${profile["careLevelNeeded"].join(", ")}`);
  if (profile["mobilityLevel"]) parts.push(`Mobility: ${profile["mobilityLevel"]/5}`);
  if (profile["memoryImpairment"]) parts.push(`Memory Impairment: ${profile["memoryImpairment"]/5}`);
  if (profile["medicationManagement"]) parts.push("Needs medication management");
  if (profile["incontinenceCare"]) parts.push("Needs incontinence care");
  if (profile["diabetesCare"]) parts.push("Needs diabetes care");
  if (profile["budget"]?.max) parts.push(`Budget up to $${profile["budget"].max}`);
  if (profile["preferredAmenities"]?.length)
    parts.push(`Amenities: ${profile["preferredAmenities"].join(", ")}`);
  if (profile["activityPreferences"]?.length)
    parts.push(`Activities: ${profile["activityPreferences"].join(", ")}`);
  if (profile["dietaryRestrictions"]?.length)
    parts.push(`Diet: ${profile["dietaryRestrictions"].join(", ")}`);
  if (profile["religiousPreferences"]) parts.push(`Religious Pref: ${profile["religiousPreferences"]}`);
  if (profile["preferredRoomType"]) parts.push(`Room: ${profile["preferredRoomType"]}`);
  if (profile["petFriendly"] !== undefined)
    parts.push(`Pet Friendly: ${profile["petFriendly"] ? "Yes" : "No"}`);
  return parts.join("; ");
}

export function summarizeHome(home: Record<string, any>): string {
  const parts: string[] = [];
  if (home["name"]) parts.push(`Name: ${home["name"]}`);
  if (home["description"]) parts.push(home["description"]);
  if (home["careLevel"]?.length) parts.push(`Care: ${home["careLevel"].join(", ")}`);
  if (home["amenities"]?.length) {
    const am = Array.isArray(home["amenities"])
      ? home["amenities"]
      : [];
    parts.push(`Amenities: ${am.map((x: any) => (x?.name ?? x)).join(", ")}`);
  }
  if (home["capacity"]) parts.push(`Capacity: ${home["capacity"]}`);
  if (home["priceMin"] || home["priceMax"]) parts.push(`Price: ${home["priceMin"] ?? "?"}-${home["priceMax"] ?? "?"}`);
  return parts.join("; ");
}
