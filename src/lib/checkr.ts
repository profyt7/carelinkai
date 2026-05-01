/**
 * Checkr background check integration.
 * When CHECKR_API_KEY is set, real API calls are made.
 * Without it, the system uses a simulated flow for development/demo.
 */

export const CHECKR_PACKAGES = {
  BASIC: {
    checkrName: "basic",
    label: "Basic Background Check",
    price: 0,           // free for caregivers
    description: "SSN trace, national criminal database, sex offender registry, global watchlist",
    includes: [
      "National criminal database",
      "Sex offender registry",
      "Social Security number trace",
      "Global watchlist search",
    ],
    badgeLabel: "Background Checked",
    turnaround: "1–3 business days",
  },
  ENHANCED: {
    checkrName: "professional",
    label: "Enhanced Background Check",
    price: 19.99,
    description: "Everything in Basic plus county criminal records (7 years) and federal criminal search",
    includes: [
      "Everything in Basic",
      "County criminal search (7 years)",
      "Federal criminal search",
      "Multi-state criminal database",
    ],
    badgeLabel: "Enhanced Check",
    turnaround: "2–5 business days",
  },
  MVR: {
    checkrName: "mvr_standard",
    label: "Motor Vehicle Report",
    price: 9.99,
    description: "Full driving history — important for caregivers who transport seniors",
    includes: [
      "License status & class",
      "Moving violations (5 years)",
      "DUI / DWI history",
      "Accident history",
    ],
    badgeLabel: "MVR Checked",
    turnaround: "1–2 business days",
  },
  PREMIUM: {
    checkrName: "premium",
    label: "Premium Background Check",
    price: 39.99,
    description: "The most thorough check — Enhanced + MVR + employment verification",
    includes: [
      "Everything in Enhanced",
      "Motor vehicle report",
      "Employment verification (5 years)",
      "Professional reference check",
    ],
    badgeLabel: "Premium Verified",
    turnaround: "3–7 business days",
  },
} as const;

export type CheckrPackageKey = keyof typeof CHECKR_PACKAGES;

const CHECKR_BASE = "https://api.checkr.com/v1";
const CHECKR_API_KEY = process.env.CHECKR_API_KEY;

function checkrHeaders() {
  const encoded = Buffer.from(`${CHECKR_API_KEY}:`).toString("base64");
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
  };
}

export interface CheckrCandidateInput {
  firstName: string;
  lastName: string;
  email: string;
  dob?: string; // YYYY-MM-DD
  zipcode?: string;
}

export interface CheckrCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CheckrReport {
  id: string;
  status: "pending" | "clear" | "consider" | "suspended" | "dispute";
  package: string;
  candidateId: string;
  completedAt?: string;
  turnaroundTime?: number;
}

// ─── Candidate ───────────────────────────────────────────────────────────────

export async function createCandidate(input: CheckrCandidateInput): Promise<CheckrCandidate> {
  if (!CHECKR_API_KEY) {
    return {
      id: `mock_candidate_${Date.now()}`,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    };
  }

  const res = await fetch(`${CHECKR_BASE}/candidates`, {
    method: "POST",
    headers: checkrHeaders(),
    body: JSON.stringify({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      dob: input.dob,
      zipcode: input.zipcode,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Checkr createCandidate failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
  };
}

// ─── Report ──────────────────────────────────────────────────────────────────

export async function createReport(
  candidateId: string,
  pkg: string = "basic"
): Promise<CheckrReport> {
  if (!CHECKR_API_KEY) {
    return {
      id: `mock_report_${Date.now()}`,
      status: "pending",
      package: pkg,
      candidateId,
    };
  }

  const res = await fetch(`${CHECKR_BASE}/reports`, {
    method: "POST",
    headers: checkrHeaders(),
    body: JSON.stringify({
      package: pkg,
      candidate_id: candidateId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Checkr createReport failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    status: data.status,
    package: data.package,
    candidateId: data.candidate_id,
    completedAt: data.completed_at,
    turnaroundTime: data.turnaround_time,
  };
}

export async function getReport(reportId: string): Promise<CheckrReport> {
  if (!CHECKR_API_KEY) {
    return {
      id: reportId,
      status: "clear",
      package: "basic",
      candidateId: "mock",
    };
  }

  const res = await fetch(`${CHECKR_BASE}/reports/${reportId}`, {
    headers: checkrHeaders(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Checkr getReport failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    status: data.status,
    package: data.package,
    candidateId: data.candidate_id,
    completedAt: data.completed_at,
    turnaroundTime: data.turnaround_time,
  };
}

// ─── Status mapping ───────────────────────────────────────────────────────────

export function mapCheckrStatus(
  checkrStatus: string
): "PENDING" | "CLEAR" | "CONSIDER" | "FAILED" | "EXPIRED" {
  switch (checkrStatus) {
    case "clear":
      return "CLEAR";
    case "consider":
      return "CONSIDER";
    case "suspended":
    case "dispute":
      return "FAILED";
    default:
      return "PENDING";
  }
}

// ─── Webhook signature verification ──────────────────────────────────────────

export function verifyCheckrWebhook(payload: string, signature: string): boolean {
  const secret = process.env.CHECKR_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification in dev

  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `sha256=${expected}` === signature;
}
