/**
 * Map tile source for the Leaflet maps (OL-173).
 *
 * Default: OpenStreetMap standard tiles — no API key. (CARTO's basemaps now
 * answer "API KEY REQUIRED", which is what broke the listing-page map.)
 * OSM's tile policy requires the "© OpenStreetMap contributors" attribution,
 * linked to the copyright page, wherever the tiles are shown.
 *
 * Override (optional, build-time — NEXT_PUBLIC_ vars are inlined by Next):
 *   NEXT_PUBLIC_MAP_TILE_URL          e.g. a keyed provider's {z}/{x}/{y} template
 *   NEXT_PUBLIC_MAP_TILE_ATTRIBUTION  HTML attribution that provider requires
 * A custom URL without its own attribution keeps the OSM attribution (most
 * hosted providers serve OSM data, and showing it is never wrong).
 */

export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export type MapTileConfig = {
  url: string;
  attribution: string;
  /** Leaflet `subdomains` for the {s} placeholder. */
  subdomains: string;
  maxZoom: number;
};

/** Pure: resolve the tile config from (possibly empty) override values. */
export function resolveMapTileConfig(
  overrideUrl?: string | null,
  overrideAttribution?: string | null,
): MapTileConfig {
  const url = (overrideUrl ?? '').trim();
  const attribution = (overrideAttribution ?? '').trim();
  const isCustom = url.length > 0 && /^https:\/\//i.test(url) && url.includes('{z}');
  return {
    url: isCustom ? url : OSM_TILE_URL,
    attribution: isCustom && attribution ? attribution : OSM_ATTRIBUTION,
    subdomains: 'abc',
    maxZoom: 19,
  };
}

/** The tile config for this build. Literal `process.env.NEXT_PUBLIC_*` reads so Next inlines them. */
export function getMapTileConfig(): MapTileConfig {
  return resolveMapTileConfig(
    process.env.NEXT_PUBLIC_MAP_TILE_URL,
    process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION,
  );
}
