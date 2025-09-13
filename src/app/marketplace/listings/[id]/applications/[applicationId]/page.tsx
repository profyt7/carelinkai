import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { 
  FiArrowLeft, 
  FiUser, 
  FiMail, 
  FiCalendar,
  FiFileText,
  FiAlertCircle
} from "react-icons/fi";
import ApplicationActions from "../ApplicationActions";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({ 
  params 
}: { 
  params: { id: string; applicationId: string } 
}) {
  const session = await getServerSession(authOptions);
  const { id: listingId, applicationId } = params;
  
  // Fetch the application with all related data
  const application = await (prisma as any).marketplaceApplication.findUnique({
    where: { id: applicationId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          postedByUserId: true
        }
      },
      caregiver: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true
            }
          }
        }
      }
    }
  });
  
  // If application doesn't exist, show 404
  if (!application) {
    notFound();
  }
  
  // Check if user is authenticated and is the listing owner
  if (!session?.user || session.user.id !== application.listing.postedByUserId) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center h-64 flex-col">
            <FiAlertCircle className="text-red-500 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 text-center mb-4">
              You don't have permission to view this application.
            </p>
            <Link
              href={`/marketplace/listings/${listingId}`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FiArrowLeft className="mr-2" />
              Back to Listing
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPLIED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Applied</span>;
      case 'INVITED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Invited</span>;
      case 'INTERVIEWING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">Interviewing</span>;
      case 'OFFERED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Offered</span>;
      case 'ACCEPTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Accepted</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      case 'WITHDRAWN':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Withdrawn</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };
  
  // Helper function to get background check status badge
  const getBackgroundCheckBadge = (status: string) => {
    switch (status) {
      case 'CLEAR':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Background Clear</span>;
      case 'PENDING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Background Pending</span>;
      case 'CONSIDER':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Background Consider</span>;
      case 'FAILED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Background Failed</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Background Expired</span>;
      case 'NOT_STARTED':
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">No Background Check</span>;
    }
  };
  
  // Get profile image URL helper
  const getProfileImage = (profileImageUrl: any) => {
    if (!profileImageUrl) return null;
    if (typeof profileImageUrl === "string") return profileImageUrl;
    return profileImageUrl.medium || profileImageUrl.thumbnail || profileImageUrl.large || null;
  };
  
  // Format application date
  const appliedDate = formatDistance(
    new Date(application.createdAt),
    new Date(),
    { addSuffix: true }
  );
  
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
            <Link
              href={`/marketplace/listings/${listingId}/applications`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FiArrowLeft className="mr-2" />
              Back to Applications
            </Link>
          </div>
          
          <p className="text-gray-600 mb-4">
            Application for: <span className="font-medium">{application.listing.title}</span>
          </p>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {getStatusBadge(application.status)}
            {getBackgroundCheckBadge(application.caregiver.backgroundCheckStatus)}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 md:flex md:gap-6">
          {/* Main content */}
          <div className="md:flex-1">
            {/* Caregiver card */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Caregiver Information</h2>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 h-16 w-16 bg-gray-200 rounded-full overflow-hidden relative">
                  {getProfileImage(application.caregiver.user.profileImageUrl) ? (
                    <Image
                      src={getProfileImage(application.caregiver.user.profileImageUrl)}
                      alt={`${application.caregiver.user.firstName} ${application.caregiver.user.lastName}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium text-xl">
                      {application.caregiver.user.firstName?.[0] || ""}
                      {application.caregiver.user.lastName?.[0] || ""}
                    </div>
                  )}
                </div>
                
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {application.caregiver.user.firstName} {application.caregiver.user.lastName}
                  </h3>
                  
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <FiMail className="mr-2" />
                      <span>{application.caregiver.user.email}</span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <FiCalendar className="mr-2" />
                      <span>Applied {appliedDate}</span>
                    </div>
                    
                    {application.caregiver.yearsExperience && (
                      <div className="flex items-center text-gray-600">
                        <FiUser className="mr-2" />
                        <span>{application.caregiver.yearsExperience} years experience</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Application note */}
            {application.note && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                <h2 className="flex items-center text-lg font-medium text-gray-900 mb-3">
                  <FiFileText className="mr-2" />
                  Application Note
                </h2>
                <p className="text-gray-700 whitespace-pre-wrap">{application.note}</p>
              </div>
            )}
          </div>
          
          {/* Sidebar with actions */}
          <div className="md:w-80 mt-6 md:mt-0">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Actions</h2>
            <ApplicationActions 
              applicationId={application.id} 
              onActionComplete={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
