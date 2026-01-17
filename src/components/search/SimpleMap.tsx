"use client";

import React, { useEffect, useRef, useState, useMemo, memo } from 'react';
import L from 'leaflet';
import { FiMapPin } from 'react-icons/fi';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// GLOBAL singleton to prevent ANY re-initialization across component remounts
let GLOBAL_MAP_INIT_COUNT = 0;
const GLOBAL_MAX_INIT = 10;

// Define types
interface HomeAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
  coordinates?: { lat: number; lng: number };
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
}

// Helper functions outside component to avoid recreating
const isValidCoord = (n: unknown) => typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n);

const getLat = (home: HomeData) => {
  if (typeof home.address !== 'string') {
    return home.address.coordinates?.lat ?? home.address.latitude;
  }
  return home.coordinates?.lat;
};

const getLng = (home: HomeData) => {
  if (typeof home.address !== 'string') {
    return home.address.coordinates?.lng ?? home.address.longitude;
  }
  return home.coordinates?.lng;
};

const createCustomIcon = (price: number | null, isSelected: boolean = false) => {
  const priceDisplay = price ? `$${Math.floor(price / 1000)}k+` : '$?';
  const color = isSelected ? '#dc2626' : '#3b82f6';
  return L.divIcon({
    html: `<div style="background-color:${color};color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;box-shadow:0 2px 5px rgba(0,0,0,0.2)">${priceDisplay}</div>`,
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
  favorites = []
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const isInitializedRef = useRef(false);
  const isInitializingRef = useRef(false);
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
    return homes
      .filter((h) => h.address && isValidCoord(getLat(h)) && isValidCoord(getLng(h)))
      .map(h => `${h.id}:${getLat(h)}:${getLng(h)}:${h.priceRange.min}`)
      .join('|');
  }, [homes]);

  const validHomes = useMemo(
    () => homes.filter((h) => h.address && isValidCoord(getLat(h)) && isValidCoord(getLng(h))),
    [homes]
  );

  // ONE-TIME map initialization with empty deps
  useEffect(() => {
    // Guard 1: Already initialized this instance
    if (isInitializedRef.current) {
      return;
    }
    
    // Guard 2: Currently initializing
    if (isInitializingRef.current) {
      return;
    }
    
    // Guard 3: Global limit reached
    if (GLOBAL_MAP_INIT_COUNT >= GLOBAL_MAX_INIT) {
      console.log(`[SimpleMap] GLOBAL limit reached (${GLOBAL_MAP_INIT_COUNT}/${GLOBAL_MAX_INIT}), showing fallback`);
      setMapError('Map failed to load. Please refresh the page.');
      return;
    }

    isInitializingRef.current = true;
    GLOBAL_MAP_INIT_COUNT++;

    const initMap = () => {
      const container = mapContainerRef.current;
      if (!container) {
        setTimeout(initMap, 200);
        return;
      }

      if (container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(initMap, 200);
        return;
      }

      try {
        const map = L.map(container, {
          center: [36.7783, -119.4179],
          zoom: 7,
          zoomControl: true
        });

        L.tileLayer('https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Tissot_mercator.png/400px-Tissot_mercator.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;
        isInitializedRef.current = true;
        isInitializingRef.current = false;
        setIsReady(true);
        
        setTimeout(() => map.invalidateSize(true), 100);
        console.log('[SimpleMap] ✅ Map initialized successfully');
      } catch (error) {
        console.error('[SimpleMap] ❌ Init error:', error);
        isInitializingRef.current = false;
        setMapError('Failed to initialize map');
      }
    };

    setTimeout(initMap, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = {};
      isInitializedRef.current = false;
      isInitializingRef.current = false;
    };
  }, []); // EMPTY DEPS - runs once only

  // Update markers when data changes - STABLE dependencies only
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isReady) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    // Add new markers
    validHomes.forEach(home => {
      const lat = getLat(home) as number;
      const lng = getLng(home) as number;
      if (isValidCoord(lat) && isValidCoord(lng)) {
        const marker = L.marker([lat, lng], {
          icon: createCustomIcon(home.priceRange.min, selectedHome === home.id)
        }).addTo(map);
        
        // Create popup content inline using current favorites ref
        const createPopupContent = () => {
          const isFavorite = favoritesRef.current.includes(home.id);
          const addressText = typeof home.address === 'string' ? home.address : `${home.address.street}, ${home.address.city}, ${home.address.state}`;
          return `
            <div class="w-64 p-2">
              <div class="flex items-start justify-between mb-2">
                <h3 class="font-semibold text-sm">${home.name}</h3>
                <button id="fav-btn-${home.id}" class="${isFavorite ? 'text-red-500' : 'text-neutral-400'}">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </button>
              </div>
              <p class="text-xs text-neutral-600 mb-2">${addressText}</p>
              <div class="flex items-center text-xs text-neutral-500 mb-2"><span class="mr-1">$</span>${home.priceRange.formattedMin || '$?'}+/month</div>
              <a href="/homes/${home.id}" class="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white text-xs py-1.5 rounded transition-colors">View Details</a>
            </div>
          `;
        };
        
        marker.bindPopup(L.popup().setContent(createPopupContent()));
        marker.on('click', () => onHomeSelectRef.current?.(home.id));
        markersRef.current[home.id] = marker;
      }
    });

    // Fit bounds if we have homes
    if (validHomes.length > 0) {
      const centerLat = validHomes.reduce((sum, h) => sum + (getLat(h) as number), 0) / validHomes.length;
      const centerLng = validHomes.reduce((sum, h) => sum + (getLng(h) as number), 0) / validHomes.length;
      map.setView([centerLat, centerLng], 8);
    }
  }, [isReady, homeIdsKey, selectedHome, validHomes]); // Stable deps: primitive values only

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
      <div className="flex h-full items-center justify-center bg-red-50 rounded-lg border-2 border-red-200" style={{ minHeight: "400px" }}>
        <div className="text-center p-4">
          <FiMapPin className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-2 text-red-600 font-medium">{mapError}</p>
          <p className="text-sm text-red-500">Please refresh the page to try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" style={{ minHeight: "400px" }}>
      <div ref={mapContainerRef} className="h-full w-full rounded-lg border-2 border-neutral-300" style={{ minHeight: "400px" }} id="map-container" />
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 z-[1000]">
        <div className="text-xs text-neutral-600">{validHomes.length} of {homes.length} homes</div>
      </div>
    </div>
  );
};

// Memoize with custom comparison to prevent unnecessary re-renders
export default memo(SimpleMap, (prevProps, nextProps) => {
  // Only re-render if these change
  if (prevProps.selectedHome !== nextProps.selectedHome) return false;
  if (prevProps.homes.length !== nextProps.homes.length) return false;
  
  // Compare home IDs
  const prevIds = prevProps.homes.map(h => h.id).sort().join(',');
  const nextIds = nextProps.homes.map(h => h.id).sort().join(',');
  if (prevIds !== nextIds) return false;
  
  return true; // Props are equal, don't re-render
});
