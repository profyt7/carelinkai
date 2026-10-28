/**
 * Estimate road distance between two addresses using OSM Nominatim geocoding
 * + Haversine straight-line distance × 1.3 road factor.
 * Free — no API key required.
 */

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=us`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CareLinkAI/1.0 (contact@getcarelinkai.com)' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const results = await res.json();
    if (!results?.length) return null;
    return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

/** Returns estimated road miles between two addresses, or null if geocoding fails. */
export async function estimateMiles(pickup: string, dropoff: string): Promise<number | null> {
  const [a, b] = await Promise.all([geocode(pickup), geocode(dropoff)]);
  if (!a || !b) return null;
  const straightLineKm = haversineKm(a.lat, a.lon, b.lat, b.lon);
  const roadKm = straightLineKm * 1.3; // road factor
  return Math.round((roadKm / 1.60934) * 10) / 10; // km → miles, 1 decimal
}

/** Calculate the fare given provider rates and trip details. */
export function calculateFare(opts: {
  rateBaseFare: number;
  ratePerMile: number;
  rateWaitPerHour: number;
  miles: number;
  waitMinutes: number;
  platformFeePercent?: number;
}): { tripFare: number; waitFare: number; platformFee: number; total: number } {
  const feePercent = opts.platformFeePercent ?? 12;
  const tripFare = opts.rateBaseFare + opts.ratePerMile * opts.miles;
  const waitFare = opts.rateWaitPerHour * (opts.waitMinutes / 60);
  const subtotal = tripFare + waitFare;
  const platformFee = Math.round(subtotal * (feePercent / 100) * 100) / 100;
  const total = Math.round((subtotal + platformFee) * 100) / 100;
  return {
    tripFare: Math.round(tripFare * 100) / 100,
    waitFare: Math.round(waitFare * 100) / 100,
    platformFee,
    total,
  };
}
