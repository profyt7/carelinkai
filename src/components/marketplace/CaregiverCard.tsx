import React from 'react';
import Image from 'next/image';
import { getBlurDataURL } from '@/lib/imageBlur';
import { FiUser, FiMapPin, FiCheckCircle, FiClock, FiDollarSign } from 'react-icons/fi';
import Link from 'next/link';

interface CaregiverCardProps {
  caregiver: {
    id: string;
    userId?: string;
    name: string;
    city: string | null;
    state: string | null;
    hourlyRate: number | null;
    yearsExperience: number | null;
    specialties: string[];
    bio: string | null;
    photoUrl: string | null;
    backgroundCheckStatus: string;
    ratingAverage?: number | null;
    reviewCount?: number | null;
    badges?: string[];
    distanceMiles?: number;
  };
}

const CaregiverCard: React.FC<CaregiverCardProps> = ({ caregiver }) => {
  // Format the location (city, state)
  const location = [caregiver.city, caregiver.state]
    .filter(Boolean)
    .join(', ');
  
  // Rating helpers ---------------------------------------------------------
  const ratingAvg = caregiver.ratingAverage ?? 0;
  const reviewCount = caregiver.reviewCount ?? 0;
  const filledStars = Math.round(ratingAvg); // 0-5
  const renderStars = () =>
    Array.from({ length: 5 }).map((_, idx) => (
      <span
        key={idx}
        className={
          idx < filledStars ? 'text-yellow-400' : 'text-gray-300'
        }
        aria-hidden="true"
      >
        ★
      </span>
    ));
  // ------------------------------------------------------------------------

  // Get background check badge color
  const getBackgroundCheckBadgeColor = (status: string) => {
    switch (status) {
      case 'CLEAR':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'CONSIDER':
        return 'bg-orange-100 text-orange-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Format background check status for display
  const formatBackgroundCheckStatus = (status: string) => {
    switch (status) {
      case 'CLEAR':
        return 'Background Check Clear';
      case 'PENDING':
        return 'Background Check Pending';
      case 'CONSIDER':
        return 'Background Check Review';
      case 'FAILED':
        return 'Background Check Failed';
      case 'EXPIRED':
        return 'Background Check Expired';
      case 'NOT_STARTED':
        return 'No Background Check';
      default:
        return status.replace('_', ' ').toLowerCase();
    }
  };
  
  // Get visible specialties and count of hidden ones
  const visibleSpecialties = caregiver.specialties.slice(0, 3);
  const hiddenSpecialtiesCount = Math.max(0, caregiver.specialties.length - 3);

  // Combine default + dynamic badges (dedup by label)
  const additionalBadges = caregiver.badges ?? [];
  const experienceLabel =
    caregiver.yearsExperience &&
    `${caregiver.yearsExperience} ${caregiver.yearsExperience === 1 ? 'Year' : 'Years'} Experience`;
  const badgeLabels = new Set<string>();
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        {/* Header with photo and name */}
        <div className="flex items-center mb-4">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
            {caregiver.photoUrl ? (
              <Image
                src={caregiver.photoUrl}
                alt={caregiver.name}
                width={64}
                height={64}
                placeholder="blur"
                blurDataURL={getBlurDataURL(64, 64)}
                sizes="64px"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-200">
                <FiUser size={32} className="text-gray-400" />
              </div>
            )}
          </div>
          <div className="ml-3">
            <h3 className="font-medium text-gray-900">{caregiver.name}</h3>
            {(location || typeof caregiver.distanceMiles === 'number') && (
              <div className="flex items-center text-sm text-gray-500">
                <FiMapPin className="mr-1" size={14} />
                <span>
                  {location || 'Location'}
                  {typeof caregiver.distanceMiles === 'number' && isFinite(caregiver.distanceMiles) && (
                    <span className="ml-2 text-gray-500">• {caregiver.distanceMiles.toFixed(1)} mi</span>
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
          <span className="text-gray-600">
            {ratingAvg.toFixed(1)} ({reviewCount})
          </span>
        </div>
        
        {/* Badges row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Background check status */}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBackgroundCheckBadgeColor(caregiver.backgroundCheckStatus)}`}>
            <FiCheckCircle className="mr-1" size={12} />
            {formatBackgroundCheckStatus(caregiver.backgroundCheckStatus)}
          </span>
          
          {/* Years of experience */}
          {caregiver.yearsExperience && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <FiClock className="mr-1" size={12} />
              {caregiver.yearsExperience} {caregiver.yearsExperience === 1 ? 'Year' : 'Years'} Experience
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
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2 mb-2"
            >
              {label}
            </span>
          );
        })}

        {/* Hourly rate */}
        {caregiver.hourlyRate && (
          <div className="flex items-center text-lg font-semibold text-gray-900 mb-3">
            <FiDollarSign className="mr-1" size={18} />
            {caregiver.hourlyRate.toFixed(2)}/hr
          </div>
        )}
        
        {/* Bio with line clamp */}
        {caregiver.bio && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 line-clamp-2">{caregiver.bio}</p>
          </div>
        )}
        
        {/* Specialties */}
        {caregiver.specialties.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {visibleSpecialties.map((specialty, index) => (
                <span 
                  key={index} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                >
                  {specialty.replace(/-/g, ' ')}
                </span>
              ))}
              
              {/* Show count of additional specialties */}
              {hiddenSpecialtiesCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  +{hiddenSpecialtiesCount} more
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* CTA buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Link 
            href={`/marketplace/caregivers/${caregiver.id}`} 
            className="block bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-center text-sm"
          >
            View Profile
          </Link>
          {caregiver.userId && (
            <Link 
              href={`/messages?userId=${caregiver.userId}`}
              className="block bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors text-center text-sm border border-gray-300"
            >
              Message
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaregiverCard;
