/**
 * PRICING capture + honest display (OL-111).
 *
 * Pricing opacity in senior care is deliberate — we don't fake precision. We capture
 * "starting around $X" ranges from multiple sources, ALWAYS source-label them, always
 * pair with "Contact for exact quote", and build a family-reported quote moat over
 * time. Pricing is slow-changing + commercially sensitive → never API-synced, never
 * presented as an official/guaranteed quote. No PHI (quote + care level only).
 */

import { prisma } from '@/lib/prisma';
import type { PriceSource, CareLevel } from '@prisma/client';

/** Operator pricing older than this stops earning the "Transparent Pricing" badge. */
export const PRICING_FRESH_DAYS = 180;
const DAY_MS = 86_400_000;
export const MAX_PRICE = 100_000; // guardrail on any monthly-dollar input

/** Minimum verified family reports before we surface a FAMILY_AVG (env-configurable). */
export function familyAvgMinReports(): number {
  const n = parseInt(process.env['FAMILY_QUOTE_MIN_REPORTS'] || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

/** Parse/clamp a monthly-dollar amount to a sane positive int, or null. */
export function normalizePriceInt(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '').replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n <= 0) return null;
  return Math.min(MAX_PRICE, Math.trunc(n));
}

type HomePricing = {
  startingPriceMonthly?: number | null;
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
  priceSource?: PriceSource | null;
  priceUpdatedAt?: Date | string | null;
  // legacy Decimal range (may be Prisma Decimal / string / number)
  priceMin?: unknown;
  priceMax?: unknown;
};

function toInt(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) && !Number.isNaN(n) ? Math.trunc(n) : null;
}

/** Best available monthly price for BUDGET FILTERING (not display). Prefers the
 *  explicit starting price, then the low end of any range, then the legacy priceMin. */
export function bestPriceMonthly(home: HomePricing): number | null {
  return (
    toInt(home.startingPriceMonthly) ??
    toInt(home.priceRangeLow) ??
    toInt(home.priceMin) ??
    null
  );
}

export function isPricingFresh(updatedAt: Date | string | null | undefined, now: number = Date.now()): boolean {
  if (!updatedAt) return false;
  const t = new Date(updatedAt).getTime();
  return !Number.isNaN(t) && now - t <= PRICING_FRESH_DAYS * DAY_MS;
}

const SOURCE_LABEL: Record<PriceSource, string> = {
  OPERATOR: 'operator-provided',
  DP_ESTIMATE: 'estimated',
  PUBLIC: 'estimated',
  FAMILY_AVG: 'families report',
};

export type PricingView = {
  hasPrice: boolean;
  amount: number | null; // the headline "starting around" figure
  low: number | null;
  high: number | null;
  source: PriceSource | null;
  sourceLabel: string; // "operator-provided" / "estimated" / "families report"
  /** Full honest line, e.g. "Starting around $5,500/mo · operator-provided". */
  display: string;
  /** Earns the "Transparent Pricing" badge: operator-provided AND recent. */
  transparent: boolean;
  familyReportCount: number;
};

function money(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

/**
 * Honest, source-labeled pricing view. Priority: a strong FAMILY_AVG (>= threshold)
 * wins (it's the moat + real quotes); else the operator's starting price; else any
 * estimated range. Always meant to be paired with "Contact for exact quote" in the UI.
 */
export function pricingView(
  home: HomePricing,
  family?: { avg: number | null; count: number },
  now: number = Date.now(),
): PricingView {
  const starting = toInt(home.startingPriceMonthly);
  const low = toInt(home.priceRangeLow) ?? toInt(home.priceMin);
  const high = toInt(home.priceRangeHigh) ?? toInt(home.priceMax);
  const transparent = home.priceSource === 'OPERATOR' && !!starting && isPricingFresh(home.priceUpdatedAt, now);
  const familyCount = family?.count ?? 0;
  const familyAvg = family?.avg ?? null;

  // 1) Family-reported average (only when it clears the threshold).
  if (familyAvg && familyCount >= familyAvgMinReports()) {
    return {
      hasPrice: true, amount: familyAvg, low, high, source: 'FAMILY_AVG', sourceLabel: SOURCE_LABEL.FAMILY_AVG,
      display: `Families report ~${money(familyAvg)}/mo (avg of ${familyCount})`,
      transparent, familyReportCount: familyCount,
    };
  }
  // 2) Operator-provided starting price.
  if (starting) {
    return {
      hasPrice: true, amount: starting, low, high, source: home.priceSource ?? 'OPERATOR', sourceLabel: SOURCE_LABEL[home.priceSource ?? 'OPERATOR'],
      display: `Starting around ${money(starting)}/mo · ${SOURCE_LABEL[home.priceSource ?? 'OPERATOR']}`,
      transparent, familyReportCount: familyCount,
    };
  }
  // 3) An estimated range (DP or public).
  if (low) {
    const src = home.priceSource ?? 'PUBLIC';
    const range = high && high > low ? `${money(low)}–${money(high)}` : `${money(low)}+`;
    return {
      hasPrice: true, amount: low, low, high, source: src, sourceLabel: SOURCE_LABEL[src],
      display: `Starting around ${range}/mo · ${SOURCE_LABEL[src]}`,
      transparent, familyReportCount: familyCount,
    };
  }
  return { hasPrice: false, amount: null, low: null, high: null, source: null, sourceLabel: '', display: 'Contact for pricing', transparent: false, familyReportCount: familyCount };
}

/** Average of VERIFIED family quote reports (base + care add-on) for a home. */
export async function computeFamilyAvg(homeId: string): Promise<{ avg: number | null; count: number }> {
  const reports = await prisma.facilityQuoteReport.findMany({
    where: { homeId, verified: true },
    select: { quotedMonthlyBase: true, careAddOn: true },
  });
  if (!reports.length) return { avg: null, count: 0 };
  const total = reports.reduce((s, r) => s + r.quotedMonthlyBase + (r.careAddOn ?? 0), 0);
  return { avg: Math.round(total / reports.length), count: reports.length };
}

/**
 * THE single write path for source-tagged pricing (operator / DP / public). Sets the
 * fields provided, stamps priceUpdatedAt=now, records the source. Auth is the CALLER's
 * responsibility. Ints are clamped. Returns the fresh view.
 */
export async function setHomePricing(params: {
  homeId: string;
  source: PriceSource;
  startingPriceMonthly?: number | null;
  priceRangeLow?: number | null;
  priceRangeHigh?: number | null;
}): Promise<PricingView> {
  const data: Record<string, unknown> = { priceSource: params.source, priceUpdatedAt: new Date() };
  if ('startingPriceMonthly' in params) data.startingPriceMonthly = params.startingPriceMonthly == null ? null : normalizePriceInt(params.startingPriceMonthly);
  if ('priceRangeLow' in params) data.priceRangeLow = params.priceRangeLow == null ? null : normalizePriceInt(params.priceRangeLow);
  if ('priceRangeHigh' in params) data.priceRangeHigh = params.priceRangeHigh == null ? null : normalizePriceInt(params.priceRangeHigh);
  const home = await prisma.assistedLivingHome.update({
    where: { id: params.homeId },
    data,
    select: { startingPriceMonthly: true, priceRangeLow: true, priceRangeHigh: true, priceSource: true, priceUpdatedAt: true, priceMin: true, priceMax: true },
  });
  const family = await computeFamilyAvg(params.homeId);
  return pricingView(home, family);
}

/** Care levels a family can pick in the quote survey (reuses the home CareLevel enum). */
export const QUOTE_CARE_LEVELS: CareLevel[] = ['INDEPENDENT', 'ASSISTED', 'MEMORY_CARE', 'SKILLED_NURSING'];
