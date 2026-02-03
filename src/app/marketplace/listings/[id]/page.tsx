import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { formatDistance } from "date-fns";
import { FiMapPin, FiDollarSign, FiCalendar, FiClock } from "react-icons/fi";
import ListingActions from "./ListingActions";
import RecommendedCaregivers from "@/components/marketplace/RecommendedCaregivers";
import Image from "next/image";
import { cookies } from "next/headers";
import { getMockListingById } from "@/lib/mock/marketplace";

export const dynamic = "force-dynamic";

async function getListingById(id: string) {
  try {
    const listing = await (prisma as any).marketplaceListing.findUnique({
      where: { id },
      include: {
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
        _count: {
          select: {
            applications: true,
            hires: true,
          },
        },
      },
    });
    return listing;
  } catch (error) {
    console.error("Error fetching listing:", error);
    return null;
  }
}

export default async function ListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Check mock mode - support both general mock mode and marketplace-specific mock mode
  const showMock = (() => {
    try {
      // General mock mode
      const c = cookies().get('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
      const generalMockOn = ['1','true','yes','on'].includes(c);
      const generalMockOff = ['0','false','no','off'].includes(c);
      
      // Marketplace-specific mock mode (defaults to TRUE)
      const marketplaceCookie = cookies().get('carelink_marketplace_mock')?.value?.toLowerCase() || '';
      const marketplaceMockEnv = (process.env['SHOW_MARKETPLACE_MOCKS'] ?? '').toLowerCase();
      const marketplaceEnvDisabled = ['0', 'false', 'no', 'off'].includes(marketplaceMockEnv);
      
      // If marketplace mock is explicitly disabled
      if (['0', 'false', 'no', 'off'].includes(marketplaceCookie)) {
        return generalMockOn; // Only use general mock mode
      }
      
      // If marketplace env explicitly disabled and cookie doesn't enable it
      if (marketplaceEnvDisabled && !['1', 'true', 'yes', 'on'].includes(marketplaceCookie)) {
        return generalMockOn; // Only use general mock mode
      }
      
      // Marketplace mock defaults to TRUE
      return true;
    } catch { return true; } // Default to true for marketplace
  })();
  const isMockId = params.id?.startsWith('job_');

  let session = await getServerSession(authOptions);
  let listing: any = null;
  let isMock = false;
  if (showMock && isMockId) {
    const mock = getMockListingById(params.id);
    if (!mock) notFound();
    listing = {
      id: mock.id,
      title: mock.title,
      description: mock.description,
      city: mock.city,
      state: mock.state,
      hourlyRateMin: mock.hourlyRateMin,
      hourlyRateMax: mock.hourlyRateMax,
      createdAt: mock.createdAt,
      status: mock.status || 'OPEN',
      postedBy: { firstName: 'Demo', lastName: 'Family', profileImageUrl: null },
      postedByUserId: 'mock-user',
      _count: { applications: mock.applicationCount ?? 0, hires: mock.hireCount ?? 0 },
      setting: 'in-home',
      careTypes: ['in-home-care'],
      services: ['companionship'],
      specialties: [],
    };
    isMock = true;
  } else {
    const [sess, real] = await Promise.all([
      getServerSession(authOptions),
      getListingById(params.id)
    ]);
    session = sess;
    listing = real;
    if (!listing) notFound();
  }

  // Format the posted date
  const postedDate = formatDistance(
    new Date(listing.createdAt),
    new Date(),
    { addSuffix: true }
  );

  // Get profile image URL if available
  const profileImage = (() => {
    const img = listing.postedBy?.profileImageUrl;
    if (!img) return null;
    if (typeof img === "string") return img;
    return img.medium || img.thumbnail || img.large || null;
  })();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
          {isMock && (
            <div className="mb-2 inline-flex items-center rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200">
              Demo listing (mock mode)
            </div>
          )}
          
          <div className="flex flex-wrap items-center text-sm text-gray-500 gap-4 mb-4">
            {/* Location */}
            {(listing.city || listing.state) && (
              <div className="flex items-center">
                <FiMapPin className="mr-1" />
                <span>
                  {[listing.city, listing.state].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            
            {/* Hourly Rate */}
            {(listing.hourlyRateMin || listing.hourlyRateMax) && (
              <div className="flex items-center">
                <FiDollarSign className="mr-1" />
                <span>
                  {listing.hourlyRateMin && listing.hourlyRateMax
                    ? `$${listing.hourlyRateMin} - $${listing.hourlyRateMax}/hr`
                    : listing.hourlyRateMin
                    ? `From $${listing.hourlyRateMin}/hr`
                    : `Up to $${listing.hourlyRateMax}/hr`}
                </span>
              </div>
            )}
            
            {/* Date Range */}
            {(listing.startTime || listing.endTime) && (
              <div className="flex items-center">
                <FiCalendar className="mr-1" />
                <span>
                  {listing.startTime && listing.endTime
                    ? `${new Date(listing.startTime).toLocaleDateString()} - ${new Date(listing.endTime).toLocaleDateString()}`
                    : listing.startTime
                    ? `From ${new Date(listing.startTime).toLocaleDateString()}`
                    : `Until ${new Date(listing.endTime).toLocaleDateString()}`}
                </span>
              </div>
            )}
            
            {/* Posted Time */}
            <div className="flex items-center">
              <FiClock className="mr-1" />
              <span>Posted {postedDate}</span>
            </div>
          </div>
          
          {/* Posted By */}
          <div className="flex items-center mt-4">
            <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full overflow-hidden relative">
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt={`${listing.postedBy?.firstName} ${listing.postedBy?.lastName}`}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-gray-500">
                  {listing.postedBy?.firstName?.[0] || "U"}
                </div>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">
                {listing.postedBy?.firstName} {listing.postedBy?.lastName}
              </p>
              <p className="text-xs text-gray-500">Listing Owner</p>
            </div>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6">
          {/* Description */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Description</h2>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {listing.description}
            </div>
          </div>
          
          {/* Categories */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Care Setting */}
              {listing.setting && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Care Setting</h3>
                  <p className="mt-1">{listing.setting}</p>
                </div>
              )}
              
              {/* Care Types */}
              {listing.careTypes && listing.careTypes.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Care Types</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {listing.careTypes.map((type: string) => (
                      <span
                        key={type}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Services */}
              {listing.services && listing.services.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Services</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {listing.services.map((service: string) => (
                      <span
                        key={service}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Specialties */}
              {listing.specialties && listing.specialties.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Specialties</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {listing.specialties.map((specialty: string) => (
                      <span
                        key={specialty}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          {!isMock && (
            <>
              <ListingActions 
                listingId={listing.id} 
                postedByUserId={listing.postedByUserId}
                applicationCount={listing._count.applications}
                hireCount={listing._count.hires}
                status={listing.status}
                appliedByMe={await (async () => {
                  try {
                    if (!session?.user?.id) return false;
                    const caregiver = await (prisma as any).caregiver.findUnique({ where: { userId: session.user.id } });
                    if (!caregiver) return false;
                    const app = await (prisma as any).marketplaceApplication.findUnique({
                      where: { listingId_caregiverId: { listingId: listing.id, caregiverId: caregiver.id } },
                      select: { id: true }
                    });
                    return !!app;
                  } catch {
                    return false;
                  }
                })()}
              />
              {/* Recommended caregivers (AI Matching) */}
              <RecommendedCaregivers listingId={listing.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
