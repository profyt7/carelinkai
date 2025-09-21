import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { FiMapPin, FiDollarSign, FiClock, FiCheckCircle } from "react-icons/fi";

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
      badges
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
  const caregiver = await getCaregiverById(params.id);

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
                <Image
                  src={caregiver.photoUrl}
                  alt={caregiver.name}
                  width={96}
                  height={96}
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
                  {caregiver.specialties.map((specialty, index) => (
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
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              href="/messages" 
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
        </div>
      </div>
    </div>
  );
}
