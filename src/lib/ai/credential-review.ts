import Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient } from "./claude";

export type AiReviewStatus = "APPROVED" | "FLAGGED" | "NEEDS_REVIEW" | "SKIPPED";

export interface AiReviewResult {
  status: AiReviewStatus;
  notes: string;
  autoVerify: boolean;
}

const CREDENTIAL_LABELS: Record<string, string> = {
  BACKGROUND_CHECK: "Background Check",
  DRUG_TEST: "Drug Test",
  CPR_CERT: "CPR / First Aid Certification",
  VEHICLE_INSPECTION: "Vehicle Inspection",
  INSURANCE: "Liability Insurance",
  DRIVERS_LICENSE: "Driver's License",
  NEMT_LICENSE: "NEMT License / Permit",
  OTHER: "Other",
};

function isMockOrUnreachableUrl(url: string): boolean {
  return (
    url.includes("example.com") ||
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.startsWith("/api/dev/")
  );
}

function detectMediaType(url: string): "image" | "pdf" | "unknown" {
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/)) return "image";
  if (lower.match(/\.pdf(\?|$)/)) return "pdf";
  return "unknown";
}

export async function reviewProviderCredential(params: {
  credentialId: string;
  type: string;
  documentUrl: string | null;
  notes: string | null;
  expiresAt: Date | null;
}): Promise<AiReviewResult> {
  const { type, documentUrl, notes, expiresAt } = params;
  const typeLabel = CREDENTIAL_LABELS[type] ?? type;

  const hasRealDocument =
    documentUrl != null && !isMockOrUnreachableUrl(documentUrl);

  const client = getAnthropicClient();
  const now = new Date();
  const expiryInfo = expiresAt
    ? `Expiry date provided: ${expiresAt.toISOString().split("T")[0]} (${
        expiresAt < now ? "ALREADY EXPIRED" : "still valid"
      })`
    : "No expiry date provided";

  const systemPrompt = `You are a compliance reviewer for CareLinkAI, a NEMT and assisted living provider platform.
Your job is to assess whether a submitted credential is plausibly valid based on its type, any attached document, and metadata.
You must be strict about safety credentials (background checks, insurance, driver's license) and more lenient about informational ones.
Respond only in JSON: { "status": "APPROVED" | "FLAGGED" | "NEEDS_REVIEW", "notes": "<1-2 sentences>", "autoVerify": true|false }
- APPROVED + autoVerify:true — document is clearly valid and matches the declared type. Use only when a real document is provided and clearly legible.
- FLAGGED — document is clearly wrong type, expired, or appears fraudulent.
- NEEDS_REVIEW — no document provided, metadata insufficient, or unable to confirm validity. Default for metadata-only submissions.
autoVerify must be false for FLAGGED or NEEDS_REVIEW.`;

  try {
    const contentParts: Anthropic.MessageParam["content"] = [];

    if (hasRealDocument) {
      const mediaType = detectMediaType(documentUrl!);
      if (mediaType === "image") {
        contentParts.push({
          type: "image",
          source: { type: "url", url: documentUrl! } as any,
        });
      } else if (mediaType === "pdf") {
        contentParts.push({
          type: "document",
          source: { type: "url", url: documentUrl! } as any,
        });
      }
    }

    contentParts.push({
      type: "text",
      text: `Credential type declared: ${typeLabel}
${expiryInfo}
Provider notes: ${notes ?? "(none)"}
Document attached: ${hasRealDocument ? "Yes — analyze the attached file" : "No — metadata-only assessment"}

Assess whether this credential submission is valid. Respond in JSON only.`,
    });

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: "user", content: contentParts }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const parsed = JSON.parse(jsonMatch[0]);
    const status: AiReviewStatus =
      parsed.status === "APPROVED" || parsed.status === "FLAGGED" ? parsed.status : "NEEDS_REVIEW";

    return {
      status,
      notes: typeof parsed.notes === "string" ? parsed.notes : "AI review completed.",
      autoVerify: status === "APPROVED" && parsed.autoVerify === true,
    };
  } catch {
    return {
      status: "SKIPPED",
      notes: "AI review could not be completed — manual review required.",
      autoVerify: false,
    };
  }
}
