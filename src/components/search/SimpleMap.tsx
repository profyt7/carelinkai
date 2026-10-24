"use client";

import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import L from 'leaflet';
import { FiMapPin } from 'react-icons/fi';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

import { getMapTileConfig } from '@/lib/maps/tiles';

// Default view when no home has coordinates: Greater Cleveland (the directory's market).
const DEFAULT_CENTER: [number, number] = [41.4993, -81.6944];
const DEFAULT_ZOOM = 9;

// Define types
interface HomeAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  coordinates?: { lat: number; lng: number } | null;
  /** True when coordinates are a city/state centroid, not a geocoded address. */
  coordinatesApproximate?: boolean;
}

interface HomeData {
  id: string;
  name: string;
  description: string;
  address: HomeAddress | string;
  careLevel: string[];
  priceRange: { min: number | null; max: number | null; formattedMin?: string; formattedMax?: string };
  capacity: number;
  availability: number;
  amenities: string[] | { category: string; items: string[] }[];
  imageUrl?: string | null;
  coordinates?: { lat: number; lng: number };
}

interface SimpleMapProps {
  homes: HomeData[];
  selectedHome?: string | null;
  onHomeSelect?: (homeId: string) => void;
  onToggleFavorite?: (homeId: string) => void;
  favorites?: string[];
  /** Zoom used when exactly one home is shown (listing page). Default 14. */
  singleHomeZoom?: number;
  /** Show the "N of M homes" badge (search page). Default true. */
  showCount?: boolean;
}

// Helper functions outside component to avoid recreating
const isValidCoord = (n: unknown): n is number => {
  if (typeof n === 'number') return !Number.isNaN(n) && Number.isFinite(n);
  // Also handle string numbers that might come from API
  if (typeof n === 'string') {
    const parsed = parseFloat(n);
    return !Number.isNaN(parsed) && Number.isFinite(parsed);
  }
  return false;
};

const toNumber = (n: unknown): number | undefined => {
  if (typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n)) return n;
  if (typeof n === 'string') {
    const parsed = parseFloat(n);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const getLat = (home: HomeData): number | undefined => {
  if (typeof home.address !== 'string' && home.address) {
    // Check coordinates object first (most common from API)
    const coordLat = home.address.coordinates?.lat;
    if (coordLat !== undefined) return toNumber(coordLat);
    // Then check legacy latitude field
    const legacyLat = home.address.latitude;
    if (legacyLat !== undefined) return toNumber(legacyLat);
  }
  // Check home-level coordinates as fallback
  return toNumber(home.coordinates?.lat);
};

const getLng = (home: HomeData): number | undefined => {
  if (typeof home.address !== 'string' && home.address) {
    // Check coordinates object first (most common from API)
    const coordLng = home.address.coordinates?.lng;
    if (coordLng !== undefined) return toNumber(coordLng);
    // Then check legacy longitude field
    const legacyLng = home.address.longitude;
    if (legacyLng !== undefined) return toNumber(legacyLng);
  }
  // Check home-level coordinates as fallback
  return toNumber(home.coordinates?.lng);
};

const createCustomIcon = (price: number | null, isSelected: boolean = false, name?: string) => {
  const color = isSelected ? '#dc2626' : '#3b82f6';
  const hasPrice = typeof price === 'number' && price > 0;
  // When price is unknown (unclaimed listings have no price), show the facility's
  // initial instead of a confusing "$?" price bubble.
  const initial = (name ?? '').replace(/[^A-Za-z0-9]/g, '').charAt(0).toUpperCase() || '•';
  const label = hasPrice ? `$${Math.floor(price / 1000)}k+` : initial;
  const fontSize = hasPrice ? 12 : 18;
  return L.divIcon({
    html: `<div style="background-color:${color};color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:${fontSize}px;box-shadow:0 2px 5px rgba(0,0,0,0.2)">${label}</div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

const SimpleMap: React.FC<SimpleMapProps> = ({
  homes,
  selectedHome,
  onHomeSelect,
  onToggleFavorite,
  favorites = [],
  singleHomeZoom = 14,
  showCount = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const [mapError, setMapError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Store callbacks in refs to avoid dependency changes
  const onHomeSelectRef = useRef(onHomeSelect);
  const onToggleFavoriteRef = useRef(onToggleFavorite);
  const favoritesRef = useRef(favorites);
  
  // Update refs when props change (no re-render triggered)
  useEffect(() => {
    onHomeSelectRef.current = onHomeSelect;
    onToggleFavoriteRef.current = onToggleFavorite;
    favoritesRef.current = favorites;
  });

  // Create stable home ID string for dependency comparison
  const homeIdsKey = useMemo(() => {
    const valid = homes.filter((h) => {
      const lat = getLat(h);
      const lng = getLng(h);
      return h.address && lat !== undefined && lng !== undefined;
    });
    return valid.map(h => `${h.id}:${getLat(h)}:${getLng(h)}:${h.priceRange.min}`).join('|');
  }, [homes]);

  const validHomes = useMemo(() => {
    const filtered = homes.filter((h) => {
      const lat = getLat(h);
      const lng = getLng(h);
      const hasValidCoords = h.address && lat !== undefined && lng !== undefined;
      return hasValidCoords;
    });
    // Debug log for troubleshooting
    if (typeof window !== 'undefined') {
      console.log(`[SimpleMap] Homes with valid coords: ${filtered.length}/${homes.length}`);
      if (filtered.length === 0 && homes.length > 0) {
        console.log('[SimpleMap] Sample home address:', homes[0]?.address);
      }
    }
    return filtered;
  }, [homes]);

  // ONE-TIME map initialization.
  //
  // OL-173 root cause of "Failed to initialize map": the old effect scheduled
  // L.map() in a setTimeout it never cleared. Under React StrictMode (dev) — and
  // on any fast unmount/remount — the effect runs twice, so TWO timers fired and
  // the second L.map() on the same container threw "Map container is already
  // initialized", which the catch turned into the error panel. A module-level
  // GLOBAL_MAP_INIT_COUNT (never decremented) also hard-failed the map after ten
  // mounts in one SPA session. Now: every pending timer is cleared on cleanup,
  // a cancelled flag stops late callbacks, and we re-check the instance first.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const initMap = () => {
      timer = null;
      if (cancelled || mapInstanceRef.current) return;
      const container = mapContainerRef.current;
      // Not laid out yet (hidden tab, still hydrating) — try again shortly.
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        timer = setTimeout(initMap, 200);
        return;
      }

      try {
        const tiles = getMapTileConfig();
        const map = L.map(container, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, zoomControl: true });
        L.tileLayer(tiles.url, {
          attribution: tiles.attribution,
          maxZoom: tiles.maxZoom,
          subdomains: tiles.subdomains,
        }).addTo(map);

        mapInstanceRef.current = map;
        setIsReady(true);
        timer = setTimeout(() => {
          timer = null;
          if (!cancelled) map.invalidateSize(true);
        }, 100);
      } catch (error) {
        console.error('[SimpleMap] Init error:', error);
        setMapError('Failed to initialize map');
      }
    };

    timer = setTimeout(initMap, 0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = {};
      setIsReady(false);
    };
  }, []);

  // Update markers when data changes - STABLE dependencies only
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isReady) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    // Add new markers
    validHomes.forEach(home => {
      const lat = getLat(home);
      const lng = getLng(home);
      if (lat !== undefined && lng !== undefined) {
        const marker = L.marker([lat, lng], {
          icon: createCustomIcon(home.priceRange.min, selectedHome === home.id, home.name)
        }).addTo(map);
        
        // Create popup content inline using current favorites ref
        const createPopupContent = () => {
          const isFavorite = favoritesRef.current.includes(home.id);
          const addressText = typeof home.address === 'string' ? home.address : `${home.address.street}, ${home.address.city}, ${home.address.state}`;
          return `
            <div class="w-64 p-2">
              <div class="flex items-start justify-between mb-2">
                <h3 class="font-semibold text-sm">${home.name}</h3>
                <button id="fav-btn-${home.id}" class="${isFavorite ? 'text-error-500' : 'text-neutral-400'}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
              </div>
              <p class="text-xs text-neutral-600 mb-2">${addressText}</p>
              <div class="flex items-center text-xs text-neutral-500 mb-2">${home.priceRange.formattedMin ? `<span class="mr-1">$</span>${home.priceRange.formattedMin}+/month` : 'Price on request'}</div>
              <a href="/homes/${home.id}" class="block w-full text-center bg-primary-500 hover:bg-primary-600 text-white text-xs py-1.5 rounded transition-colors">View Details</a>
            </div>
          `;
        };
        
        marker.bindPopup(L.popup().setContent(createPopupContent()));
        marker.on('click', () => onHomeSelectRef.current?.(home.id));
        markersRef.current[home.id] = marker;
      }
    });

    // Fit the view to the homes
    if (validHomes.length === 1) {
      const only = validHomes[0]!;
      const approx = typeof only.address !== 'string' && only.address?.coordinatesApproximate;
      // A city/state centroid is not the building — don't zoom to street level on it.
      map.setView([getLat(only)!, getLng(only)!], approx ? Math.min(singleHomeZoom, 11) : singleHomeZoom);
    } else if (validHomes.length > 1) {
      const bounds = L.latLngBounds(validHomes.map((h) => [getLat(h)!, getLng(h)!] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [isReady, homeIdsKey, selectedHome, validHomes, singleHomeZoom]); // Stable deps: primitive values only

  // Handle popup favorite button - separate effect with stable deps
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isReady) return;

    const handlePopupOpen = (e: L.PopupEvent) => {
      const homeId = Object.keys(markersRef.current).find(id => markersRef.current[id]?.getPopup() === e.popup);
      if (homeId) {
        const btn = document.getElementById(`fav-btn-${homeId}`);
        btn?.addEventListener('click', () => onToggleFavoriteRef.current?.(homeId));
      }
    };

    map.on('popupopen', handlePopupOpen);
    return () => { map.off('popupopen', handlePopupOpen); };
  }, [isReady]); // Only depends on isReady - callbacks accessed via ref

  if (mapError) {
    return (
      <div className="flex h-full items-center justify-center bg-error-50 rounded-lg border-2 border-error-200" style={{ minHeight: "400px" }}>
        <div className="text-center p-4">
          <FiMapPin className="mx-auto h-12 w-12 text-error-400" />
          <p className="mt-2 text-error-600 font-medium">{mapError}</p>
          <p className="text-sm text-error-500">Please refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  const singleApprox =
    !showCount &&
    validHomes.length === 1 &&
    typeof validHomes[0]!.address !== 'string' &&
    Boolean(validHomes[0]!.address?.coordinatesApproximate);

  return (
    <div className="relative h-full w-full" style={{ minHeight: "320px" }} data-testid="simple-map">
      <div ref={mapContainerRef} className="h-full w-full rounded-lg border-2 border-neutral-300" style={{ minHeight: "320px" }} id="map-container" />
      {showCount && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 z-[1000]">
          <div className="text-xs text-neutral-600">{validHomes.length} of {homes.length} homes</div>
        </div>
      )}
      {singleApprox && (
        <div className="absolute top-3 right-3 z-[1000] rounded-md bg-white/95 px-2 py-1 text-xs text-neutral-600 shadow" data-testid="map-approximate-note">
          Approximate area — see the address below
        </div>
      )}
    </div>
  );
};

// Memoize with custom comparison to prevent unnecessary re-renders
export default memo(SimpleMap, (prevProps, nextProps) => {
  // Only re-render if these change
  if (prevProps.selectedHome !== nextProps.selectedHome) return false;
  if (prevProps.singleHomeZoom !== nextProps.singleHomeZoom || prevProps.showCount !== nextProps.showCount) return false;
  if (prevProps.homes.length !== nextProps.homes.length) return false;
  
  // Compare home IDs
  const prevIds = prevProps.homes.map(h => h.id).sort().join(',');
  const nextIds = nextProps.homes.map(h => h.id).sort().join(',');
  if (prevIds !== nextIds) return false;
  
  return true; // Props are equal, don't re-render
});