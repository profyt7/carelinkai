import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getMockCaregiverDetail } from "@/lib/mock/marketplace";
import { isMockModeEnabledFromCookies } from "@/lib/mockMode";
import Link from "next/link";
import { FiMapPin, FiDollarSign, FiClock, FiCheckCircle, FiCalendar } from "react-icons/fi";
import RequestShiftForm from "@/components/marketplace/RequestShiftForm";
import CaregiverReviewForm from "@/components/marketplace/CaregiverReviewForm";
import CaregiverReviewsList from "@/components/marketplace/CaregiverReviewsList";
import RequestCareButton from "@/components/marketplace/RequestCareButton";
import { getCloudinaryAvatar, isCloudinaryUrl } from "@/lib/cloudinaryUrl";

export const dynamic = "force-dynamic";

async function getCaregiverById(id: string) {
  try {
    const caregiver = await prisma.caregiver.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
            addresses: {
              take: 1,
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        },
        credentials: {
          where: {
            isVerified: true,
            expirationDate: {
              gte: new Date() // Only show non-expired credentials
            }
          },
          orderBy: {
            expirationDate: 'desc'
          }
        }
      }
    });

    if (!caregiver) {
      return null;
    }

    // Get reviews and ratings
    const reviewStats = await prisma.caregiverReview.aggregate({
      where: { caregiverId: id },
      _avg: { rating: true },
      _count: { _all: true }
    });
    
    // Get availability slots for the next 7 days
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const availabilitySlots = await prisma.availabilitySlot.findMany({
      where: {
        userId: caregiver.userId,
        startTime: {
          gte: today,
          lte: nextWeek
        },
        isAvailable: true
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Resolve profile image URL
    let photoUrl = null;
    if (caregiver.user.profileImageUrl) {
      if (typeof caregiver.user.profileImageUrl === 'string') {
        photoUrl = caregiver.user.profileImageUrl as string;
      } else {
        const p: any = caregiver.user.profileImageUrl as any;
        if (p?.medium) photoUrl = p.medium as string;
        else if (p?.thumbnail) photoUrl = p.thumbnail as string;
        else if (p?.large) photoUrl = p.large as string;
      }
    }

    // Get location from address if available
    const address = caregiver.user.addresses && caregiver.user.addresses.length > 0
      ? caregiver.user.addresses[0]
      : null;

    // Generate badges
    const badges: string[] = [];
    if (caregiver.backgroundCheckStatus === 'CLEAR') {
      badges.push('Background Check Clear');
    }
    if (caregiver.yearsExperience && caregiver.yearsExperience >= 5) {
      badges.push('Experienced');
    }
    if (reviewStats._count._all >= 5 && reviewStats._avg.rating && reviewStats._avg.rating >= 4.5) {
      badges.push('Top Rated');
    }

    return {
      id: caregiver.id,
      userId: caregiver.userId,
      name: `${caregiver.user.firstName} ${caregiver.user.lastName}`,
      city: address?.city || null,
      state: address?.state || null,
      hourlyRate: caregiver.hourlyRate ? parseFloat(caregiver.hourlyRate.toString()) : null,
      yearsExperience: caregiver.yearsExperience,
      specialties: caregiver.specialties || [],
      bio: caregiver.bio || null,
      backgroundCheckStatus: caregiver.backgroundCheckStatus,
      photoUrl,
      ratingAverage: reviewStats._avg.rating ? Number(reviewStats._avg.rating.toFixed(1)) : 0,
      reviewCount: reviewStats._count._all,
      badges,
      credentials: caregiver.credentials.map(cred => ({
        id: cred.id,
        type: cred.type,
        issueDate: cred.issueDate.toISOString(),
        expirationDate: cred.expirationDate.toISOString(),
        isVerified: cred.isVerified,
      })),
      availabilitySlots: availabilitySlots.map(slot => ({
        id: slot.id,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Error fetching caregiver:", error);
    return null;
  }
}

export default async function CaregiverDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Check mock mode - support both general mock mode and marketplace-specific mock mode
  const cookieStore = cookies();
  const generalMockMode = isMockModeEnabledFromCookies(cookieStore);
  
  // Check marketplace-specific mock mode (defaults to true since we don't have real caregivers yet)
  const marketplaceCookieValue = cookieStore.get('carelink_marketplace_mock')?.value?.toLowerCase() || '';
  const marketplaceMockEnv = (process.env['SHOW_MARKETPLACE_MOCKS'] ?? '').toLowerCase();
  const marketplaceEnvDisabled = ['0', 'false', 'no', 'off'].includes(marketplaceMockEnv);
  
  // Marketplace mock mode defaults to TRUE unless explicitly disabled
  let showMarketplace = true;
  if (['0', 'false', 'no', 'off'].includes(marketplaceCookieValue)) {
    showMarketplace = false;
  } else if (marketplaceEnvDisabled && !['1', 'true', 'yes', 'on'].includes(marketplaceCookieValue)) {
    showMarketplace = false;
  }
  
  // Check if this is a mock caregiver ID (starts with cg_)
  const isMockCaregiverId = params.id?.startsWith('cg_');
  
  let caregiver;
  
  if ((generalMockMode || showMarketplace) && isMockCaregiverId) {
    // Use mock data for testing/demo
    caregiver = getMockCaregiverDetail(params.id);
  } else {
    // Use real database data
    caregiver = await getCaregiverById(params.id);
  }

  if (!caregiver) {
    notFound();
  }

  // Format location
  const location = [caregiver.city, caregiver.state]
    .filter(Boolean)
    .join(", ");

  // Rating helpers
  const ratingAvg = caregiver.ratingAverage || 0;
  const reviewCount = caregiver.reviewCount || 0;
  const filledStars = Math.round(ratingAvg); // 0-5
  const renderStars = () =>
    Array.from({ length: 5 }).map((_, idx) => (
      <span
        key={idx}
        className={
          idx < filledStars ? "text-yellow-400" : "text-gray-300"
        }
        aria-hidden="true"
      >
        ★
      </span>
    ));

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              {caregiver.photoUrl ? (
                <img
                  src={isCloudinaryUrl(caregiver.photoUrl) ? getCloudinaryAvatar(caregiver.photoUrl) : caregiver.photoUrl}
                  alt={caregiver.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-400 text-4xl">
                  {caregiver.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{caregiver.name}</h1>
              
              {location && (
                <div className="flex items-center text-gray-500 mb-2">
                  <FiMapPin className="mr-1" />
                  <span>{location}</span>
                </div>
              )}
              
              <div className="flex items-center mb-2">
                <span className="mr-2 flex">
                  {renderStars()}
                </span>
                <span className="text-gray-600">
                  {ratingAvg.toFixed(1)} ({reviewCount} reviews)
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3">
                {caregiver.badges.map((badge, index) => (
                  <span 
                    key={index} 
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      badge === 'Background Check Clear' 
                        ? 'bg-green-100 text-green-800' 
                        : badge === 'Top Rated'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {badge === 'Background Check Clear' && <FiCheckCircle className="mr-1" size={12} />}
                    {badge === 'Experienced' && <FiClock className="mr-1" size={12} />}
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {/* Request Care CTA - Prominent placement */}
          <div className="mb-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Interested in hiring {caregiver.name}?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Submit a care inquiry to connect with this caregiver and discuss your needs.
            </p>
            <RequestCareButton
              targetType="AIDE"
              targetId={caregiver.id}
              targetName={caregiver.name}
            />
          </div>

          {/* Details section */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Hourly Rate */}
              {caregiver.hourlyRate && (
                <div className="flex items-center">
                  <FiDollarSign className="mr-2 text-gray-500" size={20} />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Hourly Rate</h3>
                    <p className="mt-1 text-lg font-semibold">${caregiver.hourlyRate.toFixed(2)}/hr</p>
                  </div>
                </div>
              )}
              
              {/* Years Experience */}
              {caregiver.yearsExperience && (
                <div className="flex items-center">
                  <FiClock className="mr-2 text-gray-500" size={20} />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Experience</h3>
                    <p className="mt-1 text-lg font-semibold">
                      {caregiver.yearsExperience} {caregiver.yearsExperience === 1 ? 'Year' : 'Years'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Bio */}
            {caregiver.bio && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">About</h2>
                <div className="prose max-w-none text-gray-700">
                  {caregiver.bio}
                </div>
              </div>
            )}
            
            {/* Specialties */}
            {caregiver.specialties.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Specialties</h2>
                <div className="flex flex-wrap gap-2">
                  {caregiver.specialties.map((specialty: string, index: number) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                    >
                      {specialty.replace(/-/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Credentials & Certifications */}
            {caregiver.credentials && caregiver.credentials.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Credentials & Certifications</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    {caregiver.credentials.map((credential: any) => (
                      <div key={credential.id} className="flex items-start justify-between">
                        <div className="flex items-start">
                          <FiCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" size={16} />
                          <div>
                            <p className="font-medium text-gray-900">{credential.type}</p>
                            <p className="text-sm text-gray-500">
                              Expires: {new Date(credential.expirationDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {credential.isVerified && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Availability Calendar */}
            {caregiver.availabilitySlots && caregiver.availabilitySlots.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-2">Availability (Next 7 Days)</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-2">
                    {caregiver.availabilitySlots.map((slot: any) => {
                      const startDate = new Date(slot.startTime);
                      const endDate = new Date(slot.endTime);
                      const isSameDay = startDate.toDateString() === endDate.toDateString();
                      
                      return (
                        <div key={slot.id} className="flex items-center justify-between bg-white rounded p-3 border border-gray-200">
                          <div className="flex items-center">
                            <FiCalendar className="text-primary-600 mr-3 flex-shrink-0" size={18} />
                            <div>
                              <p className="font-medium text-gray-900">
                                {startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </p>
                              <p className="text-sm text-gray-500">
                                {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Available
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Contact the caregiver to schedule a time or request additional availability.
                </p>
              </div>
            )}
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href={`/messages?userId=${caregiver.userId}`}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-center"
            >
              Message
            </Link>
            <Link 
              href={`/dashboard/inquiries?caregiverId=${caregiver.id}`}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors text-center"
            >
              Request interview/shift
            </Link>
          </div>

          {/* Per-diem shift booking */}
          <section className="mt-10">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Book a per-diem shift
            </h2>
            <RequestShiftForm
              caregiverUserId={caregiver.userId}
              caregiverId={caregiver.id}
            />
          </section>

          {/* Reviews */}
          <section className="mt-10">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Reviews</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CaregiverReviewsList caregiverId={caregiver.id} />
              <CaregiverReviewForm caregiverId={caregiver.id} />
            </div>
          </section>

          {/* Reviews */}
          <section className="mt-10">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Reviews</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CaregiverReviewsList caregiverId={caregiver.id} />
              <CaregiverReviewForm caregiverId={caregiver.id} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
