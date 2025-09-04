import { notFound } from "next/navigation";
import { getServerSession } from "next-auth/next";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import EditListingForm from "./EditListingForm";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const listingId = params.id;
  
  // Fetch the listing with all editable fields
  const listing = await (prisma as any).marketplaceListing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      title: true, 
      description: true,
      setting: true,
      careTypes: true,
      services: true,
      specialties: true,
      city: true,
      state: true,
      zipCode: true,
      hourlyRateMin: true,
      hourlyRateMax: true,
      startTime: true,
      endTime: true,
      status: true,
      postedByUserId: true,
      createdAt: true
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
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600 text-center mb-4">
              You don't have permission to edit this listing.
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
  
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
            <Link
              href={`/marketplace/listings/${listingId}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FiArrowLeft className="mr-2" />
              Back to Listing
            </Link>
          </div>
          
          <p className="text-gray-600">
            Update your listing information below.
          </p>
        </div>
        
        {/* Form */}
        <div className="p-6">
          <EditListingForm listing={listing} />
        </div>
      </div>
    </div>
  );
}
