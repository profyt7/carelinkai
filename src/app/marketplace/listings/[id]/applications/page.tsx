import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDistance } from "date-fns";
import { 
  FiArrowLeft, 
  FiUsers, 
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle
} from "react-icons/fi";
import ApplicationActions from "./ApplicationActions";
import Image from "next/image";

export const dynamic = "force-dynamic";

export default async function ApplicationsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const listingId = params.id;
  
  // Fetch the listing to verify ownership
  const listing = await (prisma as any).marketplaceListing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true,
      postedByUserId: true,
      status: true,
      _count: {
        select: {
          applications: true,
          hires: true
        }
      }
    }
  });
  
  // If listing doesn't exist, show 404
  if (!listing) {
    notFound();
  }
  
  // Check if user is authenticated and is the listing owner
  if (!session?.user || session.user.id !== listing.postedByUserId) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center h-64 flex-col">
            <FiAlertCircle className="text-red-500 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 text-center mb-4">
              You don't have permission to view applications for this listing.
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
  
  // Fetch applications for this listing
  const applications = await (prisma as any).marketplaceApplication.findMany({
    where: {
      listingId: listingId
    },
    include: {
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
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
  
  // Count applications by status
  const statusCounts = applications.reduce((acc: Record<string, number>, app: any) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});
  
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
  
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            <Link
              href={`/marketplace/listings/${listingId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FiArrowLeft className="mr-2" />
              Back to Listing
            </Link>
          </div>
          
          <p className="text-gray-600 mb-4">
            Viewing applications for: <span className="font-medium">{listing.title}</span>
          </p>
          
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center">
                <FiUsers className="text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-500">Total</span>
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">{applications.length}</div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex items-center">
                <FiClock className="text-blue-400 mr-2" />
                <span className="text-sm font-medium text-blue-500">New</span>
              </div>
              <div className="mt-1 text-2xl font-semibold text-blue-900">{statusCounts['APPLIED'] || 0}</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-md">
              <div className="flex items-center">
                <FiCheckCircle className="text-green-400 mr-2" />
                <span className="text-sm font-medium text-green-500">Accepted</span>
              </div>
              <div className="mt-1 text-2xl font-semibold text-green-900">{statusCounts['ACCEPTED'] || 0}</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex items-center">
                <FiXCircle className="text-red-400 mr-2" />
                <span className="text-sm font-medium text-red-500">Rejected</span>
              </div>
              <div className="mt-1 text-2xl font-semibold text-red-900">{statusCounts['REJECTED'] || 0}</div>
            </div>
          </div>
        </div>
        
        {/* Applications list */}
        <div className="p-6">
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No applications have been submitted yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {applications.map((application: any) => (
                <div
                  key={application.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full overflow-hidden relative">
                        {getProfileImage(application.caregiver.user.profileImageUrl) ? (
                          <Image
                            src={getProfileImage(application.caregiver.user.profileImageUrl)}
                            alt={`${application.caregiver.user.firstName} ${application.caregiver.user.lastName}`}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-500 font-medium">
                            {application.caregiver.user.firstName?.[0] || ""}
                            {application.caregiver.user.lastName?.[0] || ""}
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          {application.caregiver.user.firstName} {application.caregiver.user.lastName}
                        </h3>
                        <p className="text-xs text-gray-500">{application.caregiver.user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {getStatusBadge(application.status)}
                      {getBackgroundCheckBadge(application.caregiver.backgroundCheckStatus)}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {application.note ? (
                      <div className="mb-3">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Note</h4>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap line-clamp-3">{application.note}</p>
                      </div>
                    ) : null}
                    
                    <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
                      <span>
                        Applied {formatDistance(new Date(application.createdAt), new Date(), { addSuffix: true })}
                      </span>
                      
                      <Link
                        href={`/marketplace/listings/${listingId}/applications/${application.id}`}
                        className="text-primary-600 hover:text-primary-500 font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>

                  {/* Owner action controls */}
                  <div className="border-t border-gray-200 p-4 bg-white">
                    <ApplicationActions applicationId={application.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
