"use client";

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import Link from 'next/link';
import Image from 'next/image';
import { FiHeart, FiHome, FiMapPin, FiDollarSign } from 'react-icons/fi';

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
  address: HomeAddress;
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
  imageUrl: string | null;
}

interface InteractiveMapProps {
  homes: HomeData[];
  selectedHome?: string | null;
  onHomeSelect?: (homeId: string) => void;
  onToggleFavorite?: (homeId: string) => void;
  favorites?: string[];
}

// Custom marker icon
const createCustomIcon = (price: number | null, isSelected: boolean = false) => {
  const priceDisplay = price ? `$${Math.floor(price / 1000)}k+` : '$?';
  const color = isSelected ? '#dc2626' : '#3b82f6';
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C8.954 0 0 8.954 0 20c0 20 20 30 20 30s20-10 20-30C40 8.954 31.046 0 20 0z" fill="${color}"/>
        <circle cx="20" cy="20" r="12" fill="white"/>
        <text x="20" y="16" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="${color}">${priceDisplay}</text>
      </svg>
    `)}`,
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -50]
  });
};

const InteractiveMap: React.FC<InteractiveMapProps> = ({ 
  homes, 
  selectedHome, 
  onHomeSelect, 
  onToggleFavorite,
  favorites = []
}) => {
  const [mounted, setMounted] = useState(false);
  
  // Only render after component mounts (prevents SSR issues)
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-100 rounded-lg">
        <div className="text-center">
          <FiMapPin className="mx-auto h-12 w-12 text-neutral-400" />
          <p className="mt-2 text-neutral-600">Loading map...</p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------*/
  const isValidCoord = (n: unknown) =>
    typeof n === 'number' && !Number.isNaN(n) && Number.isFinite(n);

  // Extract latitude / longitude regardless of schema version
  const getLat = (home: HomeData) =>
    home.address.coordinates?.lat ??
    home.address.latitude;

  const getLng = (home: HomeData) =>
    home.address.coordinates?.lng ??
    home.address.longitude;

  /* ------------------------------------------------------------------
   * Filter out homes that do not have proper coordinates
   * ------------------------------------------------------------------*/
  const validHomes = homes.filter(
    (h) => isValidCoord(getLat(h)) && isValidCoord(getLng(h))
  );

  /* ------------------------------------------------------------------
   * Determine map center
   * ------------------------------------------------------------------*/
  const FALLBACK_CENTER: [number, number] = [36.7783, -119.4179]; // California

  const centerLat =
    validHomes.length > 0
      ? validHomes.reduce((sum, h) => sum + (getLat(h) as number), 0) /
        validHomes.length
      : FALLBACK_CENTER[0];

  const centerLng =
    validHomes.length > 0
      ? validHomes.reduce((sum, h) => sum + (getLng(h) as number), 0) /
        validHomes.length
      : FALLBACK_CENTER[1];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={7}
        className="h-full w-full rounded-lg"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {validHomes.map((home) => (
          <Marker
            key={home.id}
            position={[getLat(home) as number, getLng(home) as number]}
            icon={createCustomIcon(home.priceRange.min, selectedHome === home.id)}
            eventHandlers={{
              click: () => onHomeSelect?.(home.id)
            }}
          >
            <Popup>
              <div className="w-64 p-2">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm">{home.name}</h3>
                  <button
                    onClick={() => onToggleFavorite?.(home.id)}
                    className={`ml-2 ${
                      favorites.includes(home.id) 
                        ? 'text-red-500' 
                        : 'text-neutral-400 hover:text-red-500'
                    }`}
                  >
                    <FiHeart className="h-4 w-4" fill={favorites.includes(home.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
                
                <p className="text-xs text-neutral-600 mb-2">
                  {home.address.street}, {home.address.city}, {home.address.state}
                </p>
                
                <div className="flex items-center text-xs text-neutral-500 mb-2">
                  <FiDollarSign className="h-3 w-3 mr-1" />
                  {home.priceRange.formattedMin || '$?'}+/month
                </div>
                
                <div className="flex flex-wrap gap-1 mb-2">
                  {home.careLevel.slice(0, 2).map((level) => (
                    <span key={level} className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                      {level.replace('_', ' ')}
                    </span>
                  ))}
                  {home.careLevel.length > 2 && (
                    <span className="px-1.5 py-0.5 bg-neutral-100 text-neutral-600 text-xs rounded">
                      +{home.careLevel.length - 2} more
                    </span>
                  )}
                </div>
                
                <p className="text-xs text-neutral-600 mb-3 line-clamp-2">
                  {home.description}
                </p>
                
                <Link 
                  href={`/homes/${home.id}`}
                  className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white text-xs py-1.5 rounded transition-colors"
                >
                  View Details
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map controls overlay */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2">
        <div className="text-xs text-neutral-600">
          {homes.length} homes found
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;
