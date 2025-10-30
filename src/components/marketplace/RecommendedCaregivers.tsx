import Image from "next/image";
import Link from "next/link";
import { FiUser, FiDollarSign } from "react-icons/fi";
import { headers } from "next/headers";
import InviteCaregiverButton from "@/components/marketplace/InviteCaregiverButton";
import ExplainMatchTrigger from "@/components/marketplace/ExplainMatchTrigger";
import { getOriginFromHeaders } from "@/lib/http";

type RecommendedCaregiver = {
  id: string;
  score: number;
  reasons?: string[];
  data: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      profileImageUrl: string | null;
    };
    hourlyRate: number | null;
    specialties: string[];
    yearsExperience: number | null;
    backgroundCheckStatus: string;
    reviewCount: number;
    averageRating: number | null;
  };
};

export default async function RecommendedCaregivers({ listingId }: { listingId: string }) {
  // Server-side fetch for recommendations
  let items: RecommendedCaregiver[] = [];
  let applicationStatusByCaregiver: Record<string, string> = {};
  
  try {
    const hdrs = headers();
    const cookie = hdrs.get("cookie") ?? "";
    const origin = getOriginFromHeaders(hdrs as any);

    const [recsRes, appsRes] = await Promise.all([
      fetch(
        `${origin}/api/matching/recommendations?target=caregivers&listingId=${listingId}&limit=6`,
        {
          headers: { cookie },
          cache: "no-store",
        }
      ),
      fetch(
        `${origin}/api/marketplace/applications?listingId=${listingId}`,
        {
          headers: { cookie },
          cache: "no-store",
        }
      ),
    ]);
    
    if (!recsRes.ok) {
      // Don't render anything for non-200 responses
      return null;
    }
    
    const data = await recsRes.json();
    items = data.items || [];
    
    // If no items, don't render the section
    if (items.length === 0) {
      return null;
    }

    // If applications fetch failed, we can still render without statuses
    if (appsRes.ok) {
      const appsData = await appsRes.json();
      const apps: Array<{ caregiverId: string; status: string }> = (appsData.data || []).map((a: any) => ({
        caregiverId: a.caregiverId,
        status: a.status,
      }));
      applicationStatusByCaregiver = apps.reduce((acc, a) => {
        acc[a.caregiverId] = a.status;
        return acc;
      }, {} as Record<string, string>);
    }
  } catch (error) {
    // On error, don't render anything
    console.error("Error fetching caregiver recommendations:", error);
    return null;
  }

  // Helper to get first 3 specialties
  const getVisibleSpecialties = (specialties: string[]) => {
    return specialties.slice(0, 3);
  };

  // Helper to get count of hidden specialties
  const getHiddenSpecialtiesCount = (specialties: string[]) => {
    return Math.max(0, specialties.length - 3);
  };

  // Helper to render stars for rating
  const renderStars = (rating: number | null) => {
    const filledStars = Math.round(rating || 0);
    return Array.from({ length: 5 }).map((_, idx) => (
      <span
        key={idx}
        className={idx < filledStars ? "text-yellow-400" : "text-gray-300"}
        aria-hidden="true"
      >
        ★
      </span>
    ));
  };

  return (
    <div className="py-8 border-t border-gray-200 mt-8">
      <h2 className="text-xl font-semibold mb-4">Recommended Caregivers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const caregiver = item.data;
          const fullName = `${caregiver.user.firstName} ${caregiver.user.lastName}`;
          const visibleSpecialties = getVisibleSpecialties(caregiver.specialties);
          const hiddenCount = getHiddenSpecialtiesCount(caregiver.specialties);
          const status = applicationStatusByCaregiver[item.id];
          const hasStatus = Boolean(status);
          const statusLabel = status ? status.charAt(0) + status.slice(1).toLowerCase() : "";
          const statusClass = status === "INVITED"
            ? "bg-yellow-100 text-yellow-800"
            : status === "APPLIED"
            ? "bg-blue-100 text-blue-800"
            : "bg-gray-100 text-gray-800";
          
          return (
            <div key={item.id} className="bg-white border rounded-md p-4 flex flex-col">
              <div className="flex items-start mb-2">
                <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 mr-3">
                  {caregiver.user.profileImageUrl ? (
                    <Image
                      src={caregiver.user.profileImageUrl}
                      alt={fullName}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gray-200">
                      <FiUser size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{fullName}</h3>
                  
                  {/* Rating display */}
                  {caregiver.averageRating !== null && (
                    <div className="flex items-center text-sm">
                      <span className="flex mr-1">
                        {renderStars(caregiver.averageRating)}
                      </span>
                      <span className="text-gray-600">
                        {caregiver.averageRating.toFixed(1)} ({caregiver.reviewCount})
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Hourly rate */}
              {caregiver.hourlyRate && (
                <div className="text-sm text-gray-800 mb-2 flex items-center">
                  <FiDollarSign className="mr-1" size={14} />
                  <span>${caregiver.hourlyRate.toFixed(2)}/hr</span>
                </div>
              )}
              
              {/* Specialties */}
              {caregiver.specialties.length > 0 && (
                <div className="mb-3">
                  <div className="flex flex-wrap gap-2">
                    {visibleSpecialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                      >
                        {specialty.replace(/-/g, " ")}
                      </span>
                    ))}
                    
                    {/* Show count of additional specialties */}
                    {hiddenCount > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        +{hiddenCount} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Match score + reasons */}
              {item.score > 0 && (
                <div className="text-xs text-gray-600 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{item.score}% match</span>
                    <ExplainMatchTrigger
                      title={`${caregiver.user.firstName} ${caregiver.user.lastName}`}
                      score={item.score}
                      reasons={item.reasons}
                      className="text-[11px] px-2 py-1 border rounded-md text-neutral-700 hover:bg-neutral-50"
                    />
                  </div>
                  {item.reasons && item.reasons.length > 0 && (
                    <ul className="mt-1 list-disc pl-5 space-y-0.5">
                      {item.reasons.slice(0, 2).map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              {/* View button placeholder */}
              <div className="mt-auto flex gap-2">
                <Link
                  href={`/marketplace/caregivers/${item.id}`}
                  className="flex-1 text-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  View
                </Link>
                {/* Invite button */}
                <InviteCaregiverButton
                  listingId={listingId}
                  caregiverId={item.id}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
