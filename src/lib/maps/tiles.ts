/**
 * Map tile source for the Leaflet maps (OL-173 → OL-178).
 *
 * MapTiler "streets-v2", 256px tiles with a Leaflet {r} retina suffix ("@2x"
 * on high-DPI screens), keyed by NEXT_PUBLIC_MAPTILER_KEY (build-time —
 * NEXT_PUBLIC_ vars are inlined by Next; set it in Render). OpenStreetMap's
 * own tile servers answered 403 "Access blocked" in production — their usage
 * policy blocks heavy/app use and requests without a referrer — and CARTO's
 * basemaps answer "API KEY REQUIRED", so neither is used anywhere.
 *
 * MapTiler's terms: show "© MapTiler © OpenStreetMap contributors" (both
 * linked) and, on the free plan, the MapTiler logo linked to maptiler.com.
 * Tiles are requested with a strict-origin-when-cross-origin referrer, so a
 * key restricted to getcarelinkai.com works and no page path ever leaks.
 *
 * No key → `null`: callers render a static placeholder (address + directions
 * stay), never a broken map, and log one warning.
 */

export const MAPTILER_TILE_URL_PREFIX = 'https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}{r}.png?key=';
export const MAPTILER_ATTRIBUTION =
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>';
export const MAPTILER_LOGO = { href: 'https://www.maptiler.com/', src: 'https://api.maptiler.com/resources/logo.svg', alt: 'MapTiler logo' } as const;
export const TILE_REFERRER_POLICY = 'strict-origin-when-cross-origin' as const;
export const MAP_TILES_MISSING_WARNING = '[maps] NEXT_PUBLIC_MAPTILER_KEY is not set — showing the static map placeholder';

export type MapTileConfig = {
  url: string;
  attribution: string;
  maxZoom: number;
  referrerPolicy: typeof TILE_REFERRER_POLICY;
  logo: typeof MAPTILER_LOGO;
};

/** Pure: the MapTiler config for a key, or null when the key is missing. */
export function resolveMapTileConfig(key?: string | null): MapTileConfig | null {
  const k = (key ?? '').trim();
  if (!k) return null;
  return {
    url: `${MAPTILER_TILE_URL_PREFIX}${encodeURIComponent(k)}`,
    attribution: MAPTILER_ATTRIBUTION,
    maxZoom: 19,
    referrerPolicy: TILE_REFERRER_POLICY,
    logo: MAPTILER_LOGO,
  };
}

let warned = false;

/** The tile config for this build (literal env read so Next inlines it). Warns once when unset. */
export function getMapTileConfig(): MapTileConfig | null {
  const config = resolveMapTileConfig(process.env.NEXT_PUBLIC_MAPTILER_KEY);
  if (!config && !warned) {
    warned = true;
    console.warn(MAP_TILES_MISSING_WARNING);
  }
  return config;
}
