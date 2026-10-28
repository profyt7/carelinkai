#!/usr/bin/env npx tsx
/**
 * scripts/audit-home-coordinates.ts
 *
 * INCIDENT (B): some directory homes have wrong map coordinates from seed-time geocoding —
 * e.g. East Park Memory Care (Brook Park OH 44142) stored lat 40.4206, lng -82.8409, which
 * is the central-Ohio area, not Brook Park (~41.40, -81.81). Likely systemic.
 *
 * This audits every ACTIVE home's stored Address.latitude/longitude against the Greater-
 * Cleveland metro bounding box. Any home whose coords are missing OR fall OUTSIDE the box
 * (which includes the central-OH centroid cluster) is flagged. With --force, each flagged
 * home is re-geocoded from its full street address via Google Places (location field), and
 * the coords are updated ONLY when the geocode lands back inside the metro box (so a bad
 * geocode can never write an out-of-area point).
 *
 * NE-Ohio / Greater-Cleveland 6-county box (generous): lat 40.90–42.05, lng -82.60 to -80.70.
 *
 * SAFETY:
 *   - Dry-run by default — lists flagged homes (stored coords + reason), no writes, no API calls.
 *   - --force re-geocodes flagged homes (Google Places) and updates only sane (in-box) results.
 *   - Requires GOOGLE_PLACES_API_KEY (same key the seed/enrich pipeline uses).
 *
 * Usage:
 *   npx tsx scripts/audit-home-coordinates.ts                 # DRY RUN — list flagged
 *   npx tsx scripts/audit-home-coordinates.ts --force         # re-geocode + fix flagged
 *   npx tsx scripts/audit-home-coordinates.ts --force --limit 5
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

// Greater-Cleveland metro bounding box (generous): Lorain↔Ashtabula, Lake↔Medina/Akron.
const BOX = { latMin: 40.9, latMax: 42.05, lngMin: -82.6, lngMax: -80.7 };
const inBox = (lat: number, lng: number) =>
  lat >= BOX.latMin && lat <= BOX.latMax && lng >= BOX.lngMin && lng <= BOX.lngMax;

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function geocode(query: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.location,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1, regionCode: 'US' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { places?: { location?: { latitude?: number; longitude?: number } }[] };
    const loc = data.places?.[0]?.location;
    if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
      return { lat: loc.latitude, lng: loc.longitude };
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const isForce = process.argv.includes('--force');
  const dryRun = !isForce;
  const limitRaw = argValue('--limit');
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

  console.log(dryRun ? '=== DRY RUN — no writes / no geocode calls ===' : '=== LIVE — re-geocoding flagged homes ===');

  const homes = await prisma.assistedLivingHome.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      address: { select: { id: true, street: true, city: true, state: true, zipCode: true, latitude: true, longitude: true } },
    },
    orderBy: { name: 'asc' },
  });

  const flagged = homes.filter((h) => {
    const a = h.address;
    if (!a || a.latitude == null || a.longitude == null) return true;
    return !inBox(a.latitude, a.longitude);
  });

  console.log(`ACTIVE homes: ${homes.length}  ·  coords OK (in metro box): ${homes.length - flagged.length}  ·  FLAGGED: ${flagged.length}\n`);
  for (const h of flagged) {
    const a = h.address;
    const coord = a?.latitude != null && a?.longitude != null ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}` : 'none';
    console.log(`  ⚠ "${h.name}"  [${a?.city ?? '?'} ${a?.state ?? ''}]  stored: ${coord}`);
  }

  if (dryRun) {
    console.log('\nDRY RUN complete. Re-run with --force to re-geocode + fix the flagged homes.');
    return;
  }

  const apiKey = process.env['GOOGLE_PLACES_API_KEY'];
  if (!apiKey) { console.error('\n⛔ GOOGLE_PLACES_API_KEY not set — cannot re-geocode. Aborting.'); process.exit(1); }

  const targets = limit ? flagged.slice(0, limit) : flagged;
  let fixed = 0, skipped = 0;
  for (const h of targets) {
    const a = h.address;
    if (!a) { skipped++; continue; }
    const query = [a.street, a.city, a.state, a.zipCode].filter(Boolean).join(', ');
    const geo = await geocode(query, apiKey);
    if (!geo) { console.log(`  ✗ ${h.name} — geocode failed for "${query}" (left as-is)`); skipped++; continue; }
    if (!inBox(geo.lat, geo.lng)) {
      console.log(`  ✗ ${h.name} — geocode ${geo.lat.toFixed(4)},${geo.lng.toFixed(4)} still outside metro box (left as-is, verify address)`);
      skipped++;
      continue;
    }
    await prisma.address.update({ where: { id: a.id }, data: { latitude: geo.lat, longitude: geo.lng } });
    console.log(`  ✓ ${h.name} — ${a.latitude ?? 'none'},${a.longitude ?? 'none'} → ${geo.lat.toFixed(4)},${geo.lng.toFixed(4)}`);
    fixed++;
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`Re-geocoded + fixed: ${fixed}  ·  skipped (failed/out-of-box): ${skipped}`);
  console.log('─────────────────────────────────────────────');
  if (skipped) console.log('Skipped homes kept their old coords — re-check their street address.');
}

main()
  .catch((e) => { console.error('FATAL:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
