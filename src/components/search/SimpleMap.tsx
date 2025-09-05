"use client";

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { FiHeart, FiHome, FiMapPin, FiDollarSign } from 'react-icons/fi';
import Link from 'next/link';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Define types
interface HomeAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  // Latest API returns coordinates like { lat, lng }
  latitude?: number;      // legacy support
  longitude?: number;     // legacy support
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface HomeData {
  id: string;
  name: string;
  description: string;
  // Accept either structured object returned from API or simple string fallback
  address: HomeAddress | string;
  careLevel: string[];
  priceRange: {
    min: number | null;
    max: number | null;
    formattedMin?: string;
    formattedMax?: string;
  };
  capacity: number;
  availability: number;
  amenities: string[];
  imageUrl?: string | null;
  // Some callers (e.g. home details page) include coordinates at root level
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface SimpleMapProps {
  homes: HomeData[];
  selectedHome?: string | null;
  onHomeSelect?: (homeId: string) => void;
  onToggleFavorite?: (homeId: string) => void;
  favorites?: string[];
}

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
  const [mounted, setMounted] = useState(false);
  const [domReady, setDomReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const initAttemptRef = useRef(0);
  const maxInitAttempts = 5;

  // Debug log the homes data
  console.log("[SimpleMap] Received homes data:", homes);

  // Helper functions to extract coordinates
  const isValidCoord = (n: unknown) =>
    typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n);

  const getLat = (home: HomeData) => {
    let lat: number | undefined;
    // address may be object or string
    if (typeof home.address !== 'string') {
      lat = home.address.coordinates?.lat ?? home.address.latitude;
    }
    if (lat === undefined) {
      lat = home.coordinates?.lat;
    }
    console.log(`[SimpleMap] Home ${home.id} latitude:`, lat);
    return lat;
  };

  const getLng = (home: HomeData) => {
    let lng: number | undefined;
    if (typeof home.address !== 'string') {
      lng = home.address.coordinates?.lng ?? home.address.longitude;
    }
    if (lng === undefined) {
      lng = home.coordinates?.lng;
    }
    console.log(`[SimpleMap] Home ${home.id} longitude:`, lng);
    return lng;
  };

  // Filter homes with valid coordinates
  const validHomes = homes.filter(
    (h) => h.address && isValidCoord(getLat(h)) && isValidCoord(getLng(h))
  );

  // Debug log the valid homes
  console.log("[SimpleMap] Valid homes with coordinates:", validHomes.length, validHomes);

  // Determine map center
  const FALLBACK_CENTER: [number, number] = [36.7783, -119.4179]; // California

  const getMapCenter = () => {
    if (validHomes.length === 0) {
      console.log("[SimpleMap] No valid homes, using fallback center:", FALLBACK_CENTER);
      return FALLBACK_CENTER;
    }
    
    const centerLat = validHomes.reduce((sum, h) => sum + (getLat(h) as number), 0) / validHomes.length;
    const centerLng = validHomes.reduce((sum, h) => sum + (getLng(h) as number), 0) / validHomes.length;
    
    console.log("[SimpleMap] Calculated map center:", [centerLat, centerLng]);
    return [centerLat, centerLng] as [number, number];
  };

  // Create a custom icon for markers
  const createCustomIcon = (price: number | null, isSelected: boolean = false) => {
    const priceDisplay = price ? `$${Math.floor(price / 1000)}k+` : '$?';
    const color = isSelected ? '#dc2626' : '#3b82f6';
    
    return L.divIcon({
      html: `
        <div style="
          background-color: ${color};
          color: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        ">
          ${priceDisplay}
        </div>
      `,
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  };

  // Create popup content for a home
  const createPopupContent = (home: HomeData) => {
    const isFavorite = favorites.includes(home.id);
    // Support either string or structured address object
    const addressText =
      typeof home.address === 'string'
        ? home.address
        : `${home.address.street}, ${home.address.city}, ${home.address.state}`;
    
    return `
      <div class="w-64 p-2">
        <div class="flex items-start justify-between mb-2">
          <h3 class="font-semibold text-sm">${home.name}</h3>
          <button
            id="fav-btn-${home.id}"
            class="${isFavorite ? 'text-red-500' : 'text-neutral-400'}"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>
        
        <p class="text-xs text-neutral-600 mb-2">
          ${addressText}
        </p>
        
        <div class="flex items-center text-xs text-neutral-500 mb-2">
          <span class="mr-1">$</span>
          ${home.priceRange.formattedMin || '$?'}+/month
        </div>
        
        <div class="flex flex-wrap gap-1 mb-2">
          ${home.careLevel.slice(0, 2).map((level) => `
            <span class="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
              ${level.replace('_', ' ')}
            </span>
          `).join('')}
          ${home.careLevel.length > 2 ? `
            <span class="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">
              +${home.careLevel.length - 2} more
            </span>
          ` : ''}
        </div>
        
        <p class="text-xs text-neutral-600 mb-3 line-clamp-2">
          ${home.description}
        </p>
        
        <a 
          href="/homes/${home.id}"
          class="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white text-xs py-1.5 rounded transition-colors"
        >
          View Details
        </a>
      </div>
    `;
  };

  // Mark component as mounted
  useEffect(() => {
    console.log("[SimpleMap] Component mounting...");
    setMounted(true);
    
    // Set DOM ready after a short delay to ensure React has rendered the container
    const timer = setTimeout(() => {
      setDomReady(true);
      console.log("[SimpleMap] DOM ready");
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Initialize map when DOM is ready
  useEffect(() => {
    if (!mounted || !domReady) return;
    
    const initializeMap = () => {
      console.log("[SimpleMap] Initializing map attempt:", initAttemptRef.current + 1);
      
      if (!mapContainerRef.current) {
        console.error("[SimpleMap] Map container ref is null!");
        
        // Retry logic
        if (initAttemptRef.current < maxInitAttempts) {
          initAttemptRef.current += 1;
          setTimeout(initializeMap, 300);
          return;
        } else {
          setMapError("Failed to initialize map: Container not found after multiple attempts");
          return;
        }
      }
      
      try {
        // Force container to be visible and have dimensions
        const container = mapContainerRef.current;
        container.style.border = "2px solid #cbd5e1";
        container.style.background = "#f8fafc";
        container.style.minHeight = "400px";
        container.style.width = "100%";
        container.style.height = "100%";
        
        // Check container dimensions
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        console.log(`[SimpleMap] Container dimensions: ${containerWidth}x${containerHeight}`);
        
        if (containerWidth === 0 || containerHeight === 0) {
          console.warn("[SimpleMap] Container has zero width or height!");
          
          // Retry logic for zero dimensions
          if (initAttemptRef.current < maxInitAttempts) {
            initAttemptRef.current += 1;
            setTimeout(initializeMap, 300);
            return;
          } else {
            setMapError("Map container has zero dimensions. Please try refreshing the page.");
            return;
          }
        }
        
        // Create map instance
        const mapCenter = getMapCenter();
        console.log("[SimpleMap] Creating map with center:", mapCenter);
        
        const map = L.map(container, {
          center: mapCenter,
          zoom: 7,
          zoomControl: true,
          attributionControl: true
        });
        
        console.log("[SimpleMap] Map instance created:", map);
        
        // Add tile layer
        console.log("[SimpleMap] Adding tile layer...");
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        })
          .on("loading", () => console.log("[SimpleMap] Tiles loading..."))
          .on("load", () => console.log("[SimpleMap] Tiles loaded successfully"))
          .on("tileerror", (e) => {
            console.error("[SimpleMap] Tile load error:", e);
            setMapError("Failed to load map tiles. Please check your internet connection.");
          })
          .addTo(map);

        // Force a resize after a delay to ensure container is properly rendered
        setTimeout(() => {
          console.log("[SimpleMap] Forcing map resize...");
          map.invalidateSize(true);
        }, 500);
        
        // Add markers for each home
        console.log("[SimpleMap] Adding markers for homes...");
        validHomes.forEach(home => {
          const lat = getLat(home) as number;
          const lng = getLng(home) as number;
          
          console.log(`[SimpleMap] Adding marker for home ${home.id} at [${lat}, ${lng}]`);
          
          if (isValidCoord(lat) && isValidCoord(lng)) {
            const marker = L.marker([lat, lng], {
              icon: createCustomIcon(home.priceRange.min, selectedHome === home.id)
            }).addTo(map);
            
            // Add popup
            const popup = L.popup().setContent(createPopupContent(home));
            marker.bindPopup(popup);
            
            // Add click handler
            marker.on('click', () => {
              if (onHomeSelect) {
                onHomeSelect(home.id);
              }
            });
            
            // Store marker reference
            markersRef.current[home.id] = marker;
          } else {
            console.warn(`[SimpleMap] Invalid coordinates for home ${home.id}: [${lat}, ${lng}]`);
          }
        });
        
        // Add event listeners to favorite buttons after popups are opened
        map.on('popupopen', (e) => {
          const popup = e.popup;
          const homeId = Object.keys(markersRef.current).find(id => 
            markersRef.current[id].getPopup() === popup
          );
          
          if (homeId) {
            const favBtn = document.getElementById(`fav-btn-${homeId}`);
            if (favBtn) {
              favBtn.addEventListener('click', () => {
                if (onToggleFavorite) {
                  onToggleFavorite(homeId);
                }
              });
            }
          }
        });
        
        // Store map instance for cleanup
        mapInstanceRef.current = map;
        console.log("[SimpleMap] Map initialization complete");
        
        // Add a window resize handler
        const handleResize = () => {
          if (map) {
            console.log("[SimpleMap] Window resized, invalidating map size");
            map.invalidateSize(true);
          }
        };
        
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (error) {
        console.error("[SimpleMap] Error initializing map:", error);
        setMapError(`Failed to initialize map: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    
    // Start initialization
    initializeMap();
    
    // Cleanup function
    return () => {
      console.log("[SimpleMap] Cleaning up map...");
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
      }
    };
  }, [mounted, domReady]);
  
  // Update markers when homes or selectedHome changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mounted || !domReady) {
      console.log("[SimpleMap] Map not ready for marker updates");
      return;
    }
    
    console.log("[SimpleMap] Updating markers...");
    
    // Remove all existing markers
    Object.values(markersRef.current).forEach(marker => {
      marker.remove();
    });
    markersRef.current = {};
    
    // Add new markers
    validHomes.forEach(home => {
      const lat = getLat(home) as number;
      const lng = getLng(home) as number;
      
      if (isValidCoord(lat) && isValidCoord(lng)) {
        const marker = L.marker([lat, lng], {
          icon: createCustomIcon(home.priceRange.min, selectedHome === home.id)
        }).addTo(map);
        
        // Add popup
        const popup = L.popup().setContent(createPopupContent(home));
        marker.bindPopup(popup);
        
        // Add click handler
        marker.on('click', () => {
          if (onHomeSelect) {
            onHomeSelect(home.id);
          }
        });
        
        // Store marker reference
        markersRef.current[home.id] = marker;
      }
    });
    
    // Update map view if homes change significantly
    if (validHomes.length > 0) {
      const mapCenter = getMapCenter();
      map.setView(mapCenter, map.getZoom());
    }

    // Ensure proper sizing after (re)rendering markers
    console.log("[SimpleMap] Invalidating map size after marker updates");
    map.invalidateSize(true);
  }, [homes, selectedHome, favorites, mounted, domReady]);

  // Display loading state until component mounts
  if (!mounted || !domReady) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-100 rounded-lg border-2 border-neutral-300" style={{ minHeight: "400px" }}>
        <div className="text-center">
          <FiMapPin className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-2 text-neutral-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full" style={{ minHeight: "400px" }}>
      {/* Map container with visible border */}
      <div 
        ref={mapContainerRef} 
        className="h-full w-full rounded-lg border-2 border-neutral-300"
        style={{ minHeight: "400px" }} 
        id="map-container"
      />
      
      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 z-[1000]">
        <div className="text-xs text-neutral-600">
          {validHomes.length} of {homes.length} homes with coordinates
        </div>
      </div>
      
      {/* Error message */}
      {mapError && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-[1000]">
          <p className="text-sm">{mapError}</p>
          <p className="text-xs mt-1">Try refreshing the page or check your internet connection.</p>
        </div>
      )}
    </div>
  );
};

export default SimpleMap;
