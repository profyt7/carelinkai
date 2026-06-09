/**
 * src/lib/profile-generator/enrich-home.ts
 *
 * Canonical "enrich one home from its website" pipeline, shared by the on-claim
 * flow (API route) — and available to batch tooling. Reuses the same primitives
 * the cohort script uses: scrape → AI text extract → (optional) AI photo
 * classify → Cloudinary re-host → write provenance-tagged data.
 *
 * Server-side only. Always writes to the DB (no dry-run here — the cohort
 * script keeps its own dry-run preview).
 */

import { prisma } from '@/lib/prisma';
import {
  scrapeOperatorWebsite,
  prepareHtmlForExtraction,
  ScrapeError,
} from '@/lib/operator-profile-scraper';
import {
  extractProfileFromWebsite,
  classifyFacilityImages,
} from '@/lib/profile-generator/home-profile-generator';
import { downloadAndRehost } from '@/lib/profile-generator/photo-rehost';

export interface EnrichResult {
  status: 'success' | 'sparse';
  fieldsExtracted: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  photosUploaded: number;
  tokensIn: number;
  tokensOut: number;
}

/**
 * Enrich a single home from its `websiteUrl`. Throws on hard failures (no
 * website, scrape blocked, extraction failed) so callers can mark FAILED.
 */
export async function enrichHomeFromWebsite(
  homeId: string,
  opts: { withPhotos?: boolean } = {},
): Promise<EnrichResult> {
  const withPhotos = opts.withPhotos ?? true;

  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: homeId },
    include: { address: true },
  });
  if (!home) throw new Error(`Home ${homeId} not found`);
  if (!home.websiteUrl) throw new Error('Home has no websiteUrl to enrich from');

  // 1. Scrape
  const scraped = await scrapeOperatorWebsite(home.websiteUrl, { useCache: false });
  const preparedHtml = prepareHtmlForExtraction(scraped.html);

  // 2. AI text extraction
  const extracted = await extractProfileFromWebsite(
    {
      name: home.name,
      careLevel: home.careLevel,
      capacity: home.capacity,
      currentOccupancy: home.currentOccupancy,
      amenities: home.amenities,
      address: home.address
        ? { city: home.address.city, state: home.address.state }
        : undefined,
    },
    preparedHtml,
    home.websiteUrl,
  );

  // 3. Build provenance-tagged update (mirrors scripts/autopopulate-cohort.ts)
  const preFilledFields: Record<string, 'AI' | 'SEED'> = {};
  const updateData: Parameters<typeof prisma.assistedLivingHome.update>[0]['data'] = {
    autoPopulatedAt: new Date(),
    autoPopulatedFromUrl: scraped.finalUrl,
    autoPopulatedVersion: (home.autoPopulatedVersion ?? 0) + 1,
    aiPopulationConfidence: extracted.extractionConfidence,
  };

  if (extracted.description) {
    updateData.description = extracted.description;
    preFilledFields['description'] = 'AI';
  }
  if (extracted.amenities.length > 0) {
    updateData.amenities = extracted.amenities;
    preFilledFields['amenities'] = 'AI';
  }
  if (extracted.careLevel.length > 0) {
    updateData.careLevel = extracted.careLevel as any;
    preFilledFields['careLevel'] = 'AI';
  }

  const addr = extracted.address;
  if (addr) {
    if (!home.address?.street && addr.streetAddress) preFilledFields['street'] = 'AI';
    if (!home.address?.zipCode && addr.zip) preFilledFields['zipCode'] = 'AI';
  }
  if (home.name) preFilledFields['name'] = 'SEED';
  if (home.capacity) preFilledFields['capacity'] = 'SEED';
  if (home.address?.city) preFilledFields['city'] = 'SEED';
  if (home.address?.state) preFilledFields['state'] = 'SEED';
  updateData.preFilledFields = preFilledFields;

  await prisma.assistedLivingHome.update({ where: { id: homeId }, data: updateData });

  // Backfill empty address fields from extraction
  if (home.address && addr) {
    const addrUpdate: Record<string, string> = {};
    if (!home.address.street && addr.streetAddress) addrUpdate.street = addr.streetAddress;
    if (!home.address.zipCode && addr.zip) addrUpdate.zipCode = addr.zip;
    if (Object.keys(addrUpdate).length > 0) {
      await prisma.address.update({ where: { id: home.address.id }, data: addrUpdate });
    }
  }

  // 4. Photos (optional)
  let photosUploaded = 0;
  if (withPhotos) {
    try {
      const classification = await classifyFacilityImages(home.name, scraped.imageCandidates);
      if (classification.kept.length > 0) {
        const rehost = await downloadAndRehost(
          homeId,
          classification.kept.map((k) => ({ url: k.url, altText: k.altText })),
        );
        if (rehost.uploaded.length > 0) {
          // Idempotent: clear prior auto-populated photos before writing.
          await prisma.homePhoto.deleteMany({ where: { homeId, autoPopulated: true } });
          const existingCount = await prisma.homePhoto.count({ where: { homeId } });
          let sortOrder = 0;
          for (const p of rehost.uploaded) {
            await prisma.homePhoto.create({
              data: {
                homeId,
                url: p.cloudinaryUrl,
                caption: p.altText ?? null,
                autoPopulated: true,
                sourceUrl: p.sourceUrl,
                sortOrder,
                isPrimary: existingCount === 0 && sortOrder === 0,
              },
            });
            sortOrder += 1;
          }
          photosUploaded = rehost.uploaded.length;
        }
      }
    } catch (e) {
      // Photo failures are non-fatal — text enrichment already succeeded.
      console.error(`[enrich-home] photo pipeline failed for ${homeId}:`, e);
    }
  }

  const fieldsExtracted = [
    extracted.description,
    extracted.services.length > 0,
    extracted.amenities.length > 0,
    extracted.careLevel.length > 0,
    extracted.address?.streetAddress,
    extracted.address?.zip,
    extracted.phone,
    extracted.contactEmail,
    extracted.tagline,
  ].filter(Boolean).length;

  return {
    status: extracted.extractionConfidence === 'LOW' ? 'sparse' : 'success',
    fieldsExtracted,
    confidence: extracted.extractionConfidence,
    photosUploaded,
    tokensIn: extracted.tokensIn,
    tokensOut: extracted.tokensOut,
  };
}

export { ScrapeError };
