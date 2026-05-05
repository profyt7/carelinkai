import React from 'react';
import Image from 'next/image';
import { getBlurDataURL } from '@/lib/imageBlur';
import { FiUser, FiMapPin, FiCheckCircle, FiClock, FiDollarSign, FiHeart, FiShield } from 'react-icons/fi';
import Link from 'next/link';

interface ProviderCardProps {
  provider: {
    id: string;
    userId?: string;
    businessName: string;
    bio: string | null;
    city: string | null;
    state: string | null;
    serviceTypes: string[];
    isVerified: boolean;
    yearsInBusiness: number | null;
    credentialCount?: number;
    verifiedCredentialCount?: number;
    logoUrl?: string | null;
    photoUrl?: string | null;
    ratingAverage?: number | null;
    reviewCount?: number | null;
    hourlyRate?: number | null;
    perMileRate?: number | null;
    distanceMiles?: number;
    badges?: string[];
  };
  serviceTypeOptions?: { value: string; label: string }[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider, serviceTypeOptions = [], isFavorite = false, onToggleFavorite }) => {
  // Format the location (city, state)
  const location = [provider.city, provider.state]
    .filter(Boolean)
    .join(', ');
  
  // Rating helpers ---------------------------------------------------------
  const ratingAvg = provider.ratingAverage ?? 0;
  const reviewCount = provider.reviewCount ?? 0;
  const filledStars = Math.round(ratingAvg); // 0-5
  const renderStars = () =>
    Array.from({ length: 5 }).map((_, idx) => (
      <span
        key={idx}
        className={
          idx < filledStars ? 'text-warning-400' : 'text-neutral-300'
        }
        aria-hidden="true"
      >
        ★
      </span>
    ));
  // ------------------------------------------------------------------------

  // Get verification badge color (matching background check badge style)
  const getVerificationBadgeColor = (isVerified: boolean) => {
    return isVerified
      ? 'bg-success-100 text-success-800'
      : 'bg-amber-100 text-amber-800';
  };
  
  // Format verification status for display
  const formatVerificationStatus = (isVerified: boolean) => {
    return isVerified
      ? 'Verified Provider'
      : 'Verification Pending';
  };
  
  // Get visible service types and count of hidden ones
  const visibleServiceTypes = provider.serviceTypes.slice(0, 3);
  const hiddenServiceTypesCount = Math.max(0, provider.serviceTypes.length - 3);

  // Dynamic badges (gamification / achievements)
  const additionalBadges = provider.badges ?? [];
  const badgeLabels = new Set<string>();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden relative">
      {/* Favorite button */}
      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors"
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <FiHeart
            className={`h-5 w-5 transition-colors ${
              isFavorite ? 'fill-error-500 text-error-500' : 'text-neutral-400 hover:text-error-400'
            }`}
          />
        </button>
      )}
      <div className="p-4">
        {/* Header with photo and name */}
        <div className="flex items-center mb-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-neutral-100 flex-shrink-0">
            {provider.logoUrl || provider.photoUrl ? (
              <Image
                src={provider.logoUrl || provider.photoUrl || ''}
                alt={provider.businessName}
                width={64}
                height={64}
                placeholder="blur"
                blurDataURL={getBlurDataURL(64, 64)}
                sizes="64px"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-neutral-200">
                <FiUser size={32} className="text-neutral-400" />
              </div>
            )}
          </div>
          <div className="ml-3">
            <h3 className="font-medium text-neutral-900">{provider.businessName}</h3>
            {(location || typeof provider.distanceMiles === 'number') && (
              <div className="flex items-center text-sm text-neutral-500">
                <FiMapPin className="mr-1" size={14} />
                <span>
                  {location || 'Location'}
                  {typeof provider.distanceMiles === 'number' && isFinite(provider.distanceMiles) && (
                    <span className="ml-2 text-neutral-500">• {provider.distanceMiles.toFixed(1)} mi</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Rating row */}
        <div className="mb-2 flex items-center text-sm">
          {/* Stars */}
          <span className="mr-2 flex">
            {renderStars()}
          </span>
          {/* Numeric average & count */}
          <span className="text-neutral-600">
            {ratingAvg.toFixed(1)} ({reviewCount})
          </span>
        </div>
        
        {/* Badges row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Verification status */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVerificationBadgeColor(provider.isVerified)}`}>
            <FiCheckCircle className="mr-1" size={12} />
            {formatVerificationStatus(provider.isVerified)}
          </span>
          
          {/* CareLinkAI Certified (3+ verified credentials) */}
          {(provider.verifiedCredentialCount ?? 0) >= 3 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              <FiShield className="mr-1" size={12} />
              CareLinkAI Certified
            </span>
          )}

          {/* Years in business */}
          {provider.yearsInBusiness && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              <FiClock className="mr-1" size={12} />
              {provider.yearsInBusiness} {provider.yearsInBusiness === 1 ? 'Year' : 'Years'} in Business
            </span>
          )}
        </div>

        {/* Dynamic badges (gamification etc.) */}
        {additionalBadges.map((label) => {
          if (badgeLabels.has(label)) return null;
          badgeLabels.add(label);
          return (
            <span
              key={label}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 mr-2 mb-2"
            >
              {label}
            </span>
          );
        })}

        {/* Hourly rate */}
        {provider.hourlyRate && (
          <div className="flex items-center text-lg font-semibold text-neutral-900 mb-3">
            <FiDollarSign className="mr-1" size={18} />
            {provider.hourlyRate.toFixed(2)}/hr
          </div>
        )}
        
        {/* Bio with line clamp */}
        {provider.bio && (
          <div className="mb-4">
            <p className="text-sm text-neutral-600 line-clamp-2">{provider.bio}</p>
          </div>
        )}
        
        {/* Service Types */}
        {provider.serviceTypes.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {visibleServiceTypes.map((serviceType, index) => {
                const serviceLabel = serviceTypeOptions.find(opt => opt.value === serviceType)?.label || serviceType.replace(/-/g, ' ');
                return (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                  >
                    {serviceLabel}
                  </span>
                );
              })}
              
              {/* Show count of additional service types */}
              {hiddenServiceTypesCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                  +{hiddenServiceTypesCount} more
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* CTA buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Link 
            href={`/marketplace/providers/${provider.id}`} 
            className="block bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-center text-sm"
          >
            View Profile
          </Link>
          {provider.userId && (
            <Link 
              href={`/messages?userId=${provider.userId}`}
              className="block bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-medium py-2 px-4 rounded-md transition-colors text-center text-sm border border-neutral-300"
            >
              Message
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
