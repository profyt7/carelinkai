"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import { 
  FiFile, FiFileText, FiImage, FiUsers, FiActivity, 
  FiPlus, FiUpload, FiEdit, FiUserPlus, FiClock,
  FiDownload, FiShare2, FiTrash2, FiMessageSquare,
  FiFilter, FiRefreshCw
} from "react-icons/fi";
import toast from "react-hot-toast";

import DashboardLayout from "@/components/layout/DashboardLayout";
import DocumentUploadModal from "@/components/family/DocumentUploadModal";
import { useDocuments } from "@/hooks/useDocuments";
import { 
  FamilyMemberWithUser,
  FamilyDocumentWithDetails,
  FamilyNoteWithDetails,
  SharedGalleryWithDetails,
  ActivityFeedItemWithActor,
  ActivityType,
  FamilyDocumentUpload
} from "@/lib/types/family";

// Placeholder for family service functions
// Will be replaced with actual service calls
const mockFamilyData = {
  // Using a valid UUID to satisfy backend validation
  id: "",
  name: "Johnson Family",
  stats: {
    documents: 24,
    notes: 15,
    photos: 87,
    members: 6
  }
};

export default function FamilyCollaborationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"documents" | "notes" | "photos" | "members" | "activity">("documents");
  const [isLoading, setIsLoading] = useState(true);
  const [familyData, setFamilyData] = useState(mockFamilyData);
  const [familyId, setFamilyId] = useState<string>(""); // NEW
  // Debug: track familyId state changes
  console.log("[Family Page] familyId state:", familyId);
  
  /**
   * Fetch the logged-in user's family ID once session is available.
   * This hit assumes an API route `/api/user/family` that returns `{ familyId }`.
   * In dev/mock mode the backend (or this route) should return a deterministic
   * mock ID so foreign-key constraints are satisfied.
   */
  useEffect(() => {
    console.log(
      "[Family Page] fetchFamilyId useEffect triggered, session?.user:",
      !!session?.user
    );
    if (!session?.user) return;

    const fetchFamilyId = async () => {
      try {
        console.log(
          "[Family Page] Fetching family ID from /api/user/family..."
        );
        const res = await fetch("/api/user/family");
        console.log(
          "[Family Page] /api/user/family response status:",
          res.status
        );
        const data = await res.json();
        console.log("[Family Page] /api/user/family response data:", data);

        if (data?.familyId) {
          console.log("[Family Page] Setting familyId:", data.familyId);
          setFamilyId(data.familyId);
          setFamilyData(prev => ({ ...prev, id: data.familyId }));
        } else {
          // Fallback to deterministic mock id based on user id
          const tmpId = `mock-family-${session.user.id}`;
          console.log("[Family Page] Using fallback familyId:", tmpId);
          setFamilyId(tmpId);
          setFamilyData(prev => ({ ...prev, id: tmpId }));
        }
      } catch (error) {
        console.error("[Family Page] Failed to fetch family ID:", error);
        const tmpId = `mock-family-${session.user.id}`;
        console.log("[Family Page] Using error fallback familyId:", tmpId);
        setFamilyId(tmpId);
        setFamilyData(prev => ({ ...prev, id: tmpId }));
      }
    };

    fetchFamilyId();
  }, [session]);

  // Document management with hook
  console.log(
    "[Family Page] About to initialize useDocuments with familyId:",
    familyId,
    "autoFetch:",
    !!familyId
  );
  const { 
    documents, 
    pagination, 
    loading: documentsLoading, 
    errors: documentsErrors, 
    uploadDocuments,
    fetchDocuments,
    filters,
    setFilters,
    resetFilters
  } = useDocuments({
    familyId,
    autoFetch: !!familyId
  });
  
  // State for content
  const [notes, setNotes] = useState<FamilyNoteWithDetails[]>([]);
  const [galleries, setGalleries] = useState<SharedGalleryWithDetails[]>([]);
  const [members, setMembers] = useState<FamilyMemberWithUser[]>([]);
  const [activities, setActivities] = useState<ActivityFeedItemWithActor[]>([]);
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false);
  const [showAddPhotosModal, setShowAddPhotosModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Refresh key for forcing re-renders
  const [refreshKey, setRefreshKey] = useState(0);

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated") {
      fetchFamilyData();
    }
  }, [status, router]);

  // Fetch family data
  const fetchFamilyData = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API calls
      // const response = await fetch(`/api/family/${session?.user?.family?.id}`);
      // const data = await response.json();
      // setFamilyData(data);
      
      // Simulate API delay
      setTimeout(() => {
        // Mock data for development - only for notes, galleries, members, activities
        // Documents are handled by the useDocuments hook
        setNotes([
          {
            id: "note1",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            authorId: "user1",
            title: "Daily Care Notes - August 1",
            content: {
              type: "doc",
              content: { type: "doc", content: [] },
              plainText: "Mom had a good day today. Took all medications on schedule and ate well."
            },
            tags: ["daily-care", "medication"],
            createdAt: new Date(2023, 7, 1),
            updatedAt: new Date(2023, 7, 1),
            author: {
              id: "user1",
              firstName: "John",
              lastName: "Johnson",
              profileImageUrl: { thumbnail: "/mock/avatar1.jpg" }
            },
            commentCount: 2
          },
          {
            id: "note2",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            authorId: "user3",
            title: "Doctor Appointment Summary",
            content: {
              type: "doc",
              content: { type: "doc", content: [] },
              plainText: "Summary of the appointment with Dr. Smith. New medication prescribed."
            },
            tags: ["medical", "appointments"],
            createdAt: new Date(2023, 7, 5),
            updatedAt: new Date(2023, 7, 5),
            author: {
              id: "user3",
              firstName: "Michael",
              lastName: "Johnson",
              profileImageUrl: { thumbnail: "/mock/avatar3.jpg" }
            },
            commentCount: 4
          }
        ]);
        
        setGalleries([
          {
            id: "gallery1",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            creatorId: "user2",
            title: "Summer Family Reunion 2023",
            description: "Photos from our annual reunion at Lake Tahoe",
            coverPhotoUrl: "/mock/reunion-cover.jpg",
            tags: ["reunion", "summer", "memories"],
            createdAt: new Date(2023, 6, 20),
            updatedAt: new Date(2023, 6, 25),
            creator: {
              id: "user2",
              firstName: "Sarah",
              lastName: "Johnson",
              profileImageUrl: { thumbnail: "/mock/avatar2.jpg" }
            },
            photoCount: 45
          },
          {
            id: "gallery2",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            creatorId: "user4",
            title: "Mom's Birthday Celebration",
            description: "Mom's 75th birthday party",
            coverPhotoUrl: "/mock/birthday-cover.jpg",
            tags: ["birthday", "celebration"],
            createdAt: new Date(2023, 5, 12),
            updatedAt: new Date(2023, 5, 12),
            creator: {
              id: "user4",
              firstName: "Emily",
              lastName: "Johnson",
              profileImageUrl: { thumbnail: "/mock/avatar4.jpg" }
            },
            photoCount: 28
          }
        ]);
        
        setMembers([
          {
            id: "member1",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            userId: "user1",
            role: "OWNER",
            status: "ACTIVE",
            joinedAt: new Date(2022, 1, 15),
            createdAt: new Date(2022, 1, 15),
            updatedAt: new Date(2022, 1, 15),
            user: {
              id: "user1",
              firstName: "John",
              lastName: "Johnson",
              email: "john@example.com",
              profileImageUrl: { thumbnail: "/mock/avatar1.jpg", medium: "/mock/avatar1.jpg", large: "/mock/avatar1.jpg" }
            }
          },
          {
            id: "member2",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            userId: "user2",
            role: "CARE_PROXY",
            status: "ACTIVE",
            joinedAt: new Date(2022, 1, 16),
            createdAt: new Date(2022, 1, 16),
            updatedAt: new Date(2022, 1, 16),
            user: {
              id: "user2",
              firstName: "Sarah",
              lastName: "Johnson",
              email: "sarah@example.com",
              profileImageUrl: { thumbnail: "/mock/avatar2.jpg", medium: "/mock/avatar2.jpg", large: "/mock/avatar2.jpg" }
            }
          },
          {
            id: "member3",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            userId: "user3",
            role: "MEMBER",
            status: "ACTIVE",
            joinedAt: new Date(2022, 2, 5),
            createdAt: new Date(2022, 2, 5),
            updatedAt: new Date(2022, 2, 5),
            user: {
              id: "user3",
              firstName: "Michael",
              lastName: "Johnson",
              email: "michael@example.com",
              profileImageUrl: { thumbnail: "/mock/avatar3.jpg", medium: "/mock/avatar3.jpg", large: "/mock/avatar3.jpg" }
            }
          },
          {
            id: "member4",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            userId: "user4",
            role: "MEMBER",
            status: "ACTIVE",
            joinedAt: new Date(2022, 3, 10),
            createdAt: new Date(2022, 3, 10),
            updatedAt: new Date(2022, 3, 10),
            user: {
              id: "user4",
              firstName: "Emily",
              lastName: "Johnson",
              email: "emily@example.com",
              profileImageUrl: { thumbnail: "/mock/avatar4.jpg", medium: "/mock/avatar4.jpg", large: "/mock/avatar4.jpg" }
            }
          }
        ]);
        
        setActivities([
          {
            id: "activity1",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            actorId: "user1",
            type: "DOCUMENT_UPLOADED",
            resourceType: "document",
            resourceId: "doc1",
            description: "John uploaded a new document: Care Plan for Mom",
            createdAt: new Date(2023, 6, 15),
            actor: {
              id: "user1",
              firstName: "John",
              lastName: "Johnson",
              profileImageUrl: { thumbnail: "/mock/avatar1.jpg" }
            }
          },
          {
            id: "activity2",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            actorId: "user2",
            type: "GALLERY_CREATED",
            resourceType: "gallery",
            resourceId: "gallery1",
            description: "Sarah created a new photo gallery: Summer Family Reunion 2023",
            createdAt: new Date(2023, 6, 20),
            actor: {
              id: "user2",
              firstName: "Sarah",
              lastName: "Johnson",
              profileImageUrl: { thumbnail: "/mock/avatar2.jpg" }
            }
          },
          {
            id: "activity3",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            actorId: "user3",
            type: "NOTE_CREATED",
            resourceType: "note",
            resourceId: "note2",
            description: "Michael created a new note: Doctor Appointment Summary",
            createdAt: new Date(2023, 7, 5),
            actor: {
              id: "user3",
              firstName: "Michael",
              lastName: "Johnson",
              profileImageUrl: { thumbnail: "/mock/avatar3.jpg" }
            }
          },
          {
            id: "activity4",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            actorId: "user2",
            type: "DOCUMENT_COMMENTED",
            resourceType: "document",
            resourceId: "doc1",
            description: "Sarah commented on a document: Care Plan for Mom",
            createdAt: new Date(2023, 7, 6),
            actor: {
              id: "user2",
              firstName: "Sarah",
              lastName: "Johnson",
              profileImageUrl: { thumbnail: "/mock/avatar2.jpg" }
            }
          },
          {
            id: "activity5",
            familyId: "550e8400-e29b-41d4-a716-446655440000",
            actorId: "user1",
            type: "DOCUMENT_UPLOADED",
            resourceType: "document",
            resourceId: "doc2",
            description: "John uploaded a new document: Insurance Documents",
            createdAt: new Date(2023, 7, 10),
            actor: {
              id: "user1",
              firstName: "John",
              lastName: "Johnson",
              profileImageUrl: { thumbnail: "/mock/avatar1.jpg" }
            }
          }
        ]);
        
        // Update family stats
        setFamilyData(prev => ({
          ...prev,
          stats: {
            ...prev.stats,
            documents: documents.length || prev.stats.documents,
            notes: notes.length || prev.stats.notes,
            photos: galleries.reduce((total, gallery) => total + gallery.photoCount, 0) || prev.stats.photos,
            members: members.length || prev.stats.members
          }
        }));
        
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error("Failed to fetch family data:", error);
      setIsLoading(false);
    }
  };

  // Update stats when documents change
  useEffect(() => {
    if (documents.length > 0) {
      setFamilyData(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          documents: documents.length
        }
      }));
    }
  }, [documents]);

  // Handle document upload
  const handleUploadDocument = () => {
    setShowUploadModal(true);
  };
  
  // Handle document upload completion
  const handleDocumentUpload = async (documents: FamilyDocumentUpload[]) => {
    try {
      await uploadDocuments(documents);
      // Refresh documents list after upload
      // Guard: ensure we always pass a valid familyId to avoid the

      /* ------------------------------------------------------------
       * Add a Recent-Activity entry for every successfully-uploaded
       * document so the feed updates instantly.
       * ---------------------------------------------------------- */
      if (session?.user) {
        const newActivities: ActivityFeedItemWithActor[] = documents.map(
          (doc, index) => ({
            id: `activity-${Date.now()}-${index}`,
            familyId,
            actorId: session.user.id,
            type: "DOCUMENT_UPLOADED",
            resourceType: "document",
            resourceId: `doc-${Date.now()}-${index}`,
            description: `${session.user.firstName ?? "User"} uploaded a new document: ${doc.title}`,
            createdAt: new Date(),
            actor: {
              id: session.user.id,
              firstName: session.user.firstName ?? "Unknown",
              lastName: session.user.lastName ?? "",
              profileImageUrl: session.user.profileImageUrl
            }
          })
        );
        // Prepend newest items
        setActivities(prev => [...newActivities, ...prev]);
      }
      // empty `familyId=` requests that were causing 400 errors.
      if (familyId) {
        fetchDocuments();
      }
      // Force refresh of activity feed
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Error uploading documents:", error);
    }
  };
  
  // Refresh documents
  const handleRefreshDocuments = () => {
    console.log("[Family Page] Refresh button clicked, familyId:", familyId);
    if (familyId) {
      console.log("[Family Page] Calling fetchDocuments for refresh...");
      fetchDocuments();
    } else {
      console.log("[Family Page] No familyId available, skipping refresh");
    }
  };

  /* ------------------------------------------------------------------
   * Document Actions
   * ------------------------------------------------------------------ */
  const handleDownloadDocument = (doc: FamilyDocumentWithDetails) => {
    if (doc.fileUrl) {
      const link = document.createElement("a");
      link.href = doc.fileUrl;
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloading ${doc.fileName}…`);
    } else {
      toast.error("File not available for download");
    }
  };

  const handleCopyToClipboard = (doc: FamilyDocumentWithDetails) => {
    if (!doc.fileUrl) {
      toast.error("No shareable link available");
      return;
    }
    navigator.clipboard
      .writeText(doc.fileUrl)
      .then(() => toast.success("Document link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link"));
  };

  const handleShareDocument = (doc: FamilyDocumentWithDetails) => {
    if (navigator.share && doc.fileUrl) {
      navigator
        .share({
          title: doc.title,
          text: doc.description || `Shared document: ${doc.title}`,
          url: doc.fileUrl
        })
        .then(() => toast.success("Document shared successfully!"))
        .catch(err => {
          console.error("Share error:", err);
          handleCopyToClipboard(doc);
        });
    } else {
      handleCopyToClipboard(doc);
    }
  };

  const handleCreateNote = () => {
    setShowCreateNoteModal(true);
  };

  const handleAddPhotos = () => {
    setShowAddPhotosModal(true);
  };

  const handleInviteMember = () => {
    setShowInviteModal(true);
  };

  // Get activity icon based on type
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "DOCUMENT_UPLOADED":
      case "DOCUMENT_UPDATED":
      case "DOCUMENT_DELETED":
        return <FiFile className="text-blue-500" />;
      case "DOCUMENT_COMMENTED":
      case "NOTE_COMMENTED":
        return <FiMessageSquare className="text-purple-500" />;
      case "NOTE_CREATED":
      case "NOTE_UPDATED":
      case "NOTE_DELETED":
        return <FiFileText className="text-green-500" />;
      case "GALLERY_CREATED":
      case "GALLERY_UPDATED":
      case "PHOTO_UPLOADED":
        return <FiImage className="text-amber-500" />;
      case "MEMBER_INVITED":
      case "MEMBER_JOINED":
      case "MEMBER_ROLE_CHANGED":
        return <FiUsers className="text-indigo-500" />;
      default:
        return <FiActivity className="text-gray-500" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Family Collaboration">
        <div className="flex h-96 items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-b-2 border-t-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Family Collaboration">
      {/* Header Section */}
      <div className="mb-8 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 p-6 text-white shadow-md">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{familyData.name}</h1>
            <p className="mt-1 text-primary-100">
              Securely share and collaborate on important family information
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleUploadDocument}
              className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              <FiUpload className="mr-2" /> Upload Document
            </button>
            <button
              onClick={handleCreateNote}
              className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              <FiEdit className="mr-2" /> Create Note
            </button>
            <button
              onClick={handleAddPhotos}
              className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              <FiImage className="mr-2" /> Add Photos
            </button>
            <button
              onClick={handleInviteMember}
              className="flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              <FiUserPlus className="mr-2" /> Invite Member
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-white/20 p-3 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="rounded-full bg-white/30 p-2">
                <FiFile className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-white/80">Documents</p>
                <p className="text-xl font-bold">{familyData.stats.documents}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white/20 p-3 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="rounded-full bg-white/30 p-2">
                <FiFileText className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-white/80">Notes</p>
                <p className="text-xl font-bold">{familyData.stats.notes}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white/20 p-3 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="rounded-full bg-white/30 p-2">
                <FiImage className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-white/80">Photos</p>
                <p className="text-xl font-bold">{familyData.stats.photos}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white/20 p-3 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="rounded-full bg-white/30 p-2">
                <FiUsers className="h-5 w-5" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-white/80">Members</p>
                <p className="text-xl font-bold">{familyData.stats.members}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center border-b-2 px-1 pb-4 pt-2 text-sm font-medium ${
              activeTab === "documents"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <FiFile className="mr-2 h-5 w-5" />
            Documents
          </button>
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex items-center border-b-2 px-1 pb-4 pt-2 text-sm font-medium ${
              activeTab === "notes"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <FiFileText className="mr-2 h-5 w-5" />
            Notes
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`flex items-center border-b-2 px-1 pb-4 pt-2 text-sm font-medium ${
              activeTab === "photos"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <FiImage className="mr-2 h-5 w-5" />
            Photos
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center border-b-2 px-1 pb-4 pt-2 text-sm font-medium ${
              activeTab === "members"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <FiUsers className="mr-2 h-5 w-5" />
            Members
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center border-b-2 px-1 pb-4 pt-2 text-sm font-medium ${
              activeTab === "activity"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            <FiActivity className="mr-2 h-5 w-5" />
            Activity
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="mb-8">
        {/* Documents Tab */}
        {activeTab === "documents" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <h2 className="text-xl font-bold">Documents</h2>
                {documentsLoading.isFetching && (
                  <div className="ml-3 h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-primary-600"></div>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleRefreshDocuments}
                  className="flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  disabled={documentsLoading.isFetching}
                >
                  <FiRefreshCw className={`mr-2 ${documentsLoading.isFetching ? 'animate-spin' : ''}`} /> Refresh
                </button>
                <button
                  onClick={() => {
                    const nextSort =
                      filters.sortBy === "createdAt"
                        ? "title"
                        : filters.sortBy === "title"
                        ? "fileSize"
                        : "createdAt";
                    const nextOrder =
                      filters.sortBy === nextSort
                        ? filters.sortOrder === "desc"
                          ? "asc"
                          : "desc"
                        : "desc";
                    setFilters({ sortBy: nextSort, sortOrder: nextOrder });
                  }}
                  className="flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  title={`Sort by ${filters.sortBy} (${filters.sortOrder})`}
                >
                  <FiFilter className="mr-2" /> Sort:{" "}
                  {filters.sortBy === "createdAt"
                    ? "Date"
                    : filters.sortBy === "title"
                    ? "Name"
                    : "Size"}{" "}
                  {filters.sortOrder === "desc" ? "↓" : "↑"}
                </button>
                <button
                  onClick={handleUploadDocument}
                  className="flex items-center rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600"
                >
                  <FiPlus className="mr-2" /> Add Document
                </button>
              </div>
            </div>
            
            {/* Error message */}
            {documentsErrors.fetchError && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiMessageSquare className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading documents</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{documentsErrors.fetchError}</p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleRefreshDocuments}
                        className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!documentsErrors.fetchError && documents.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="rounded-lg bg-blue-100 p-2 text-blue-600">
                          <FiFile className="h-6 w-6" />
                        </div>
                        <div className="ml-3">
                          <h3 className="font-medium text-gray-900">{doc.title}</h3>
                          <p className="text-xs text-gray-500">{doc.fileName}</p>
                        </div>
                      </div>
                    </div>
                    
                    {doc.description && (
                      <p className="mb-3 text-sm text-gray-600 line-clamp-2">{doc.description}</p>
                    )}
                    
                    <div className="mb-3 flex flex-wrap gap-1">
                      {doc.tags?.map((tag) => (
                        <span key={tag} className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="mb-3 text-xs text-gray-500">
                      <p>Size: {formatFileSize(doc.fileSize)}</p>
                      <p>Uploaded: {format(new Date(doc.createdAt), "MMM d, yyyy")}</p>
                      <p>By: {doc.uploader?.firstName} {doc.uploader?.lastName}</p>
                    </div>
                    
                    <div className="flex justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center text-xs text-gray-500">
                        <FiMessageSquare className="mr-1" />
                        {doc.commentCount} comments
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="Download document"
                        >
                          <FiDownload className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleShareDocument(doc)}
                          className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                          title="Share document"
                        >
                          <FiShare2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !documentsErrors.fetchError && !documentsLoading.isFetching ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <FiFile className="mb-2 h-10 w-10 text-gray-400" />
                <p className="text-gray-500">No documents yet</p>
                <button
                  onClick={handleUploadDocument}
                  className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Upload your first document
                </button>
              </div>
            ) : null}
            
            {/* Pagination controls */}
            {documents.length > 0 && pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => pagination.hasPreviousPage && setFilters({ page: pagination.page - 1 })}
                    disabled={!pagination.hasPreviousPage}
                    className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                      pagination.hasPreviousPage 
                        ? 'text-gray-700 hover:bg-gray-50' 
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => pagination.hasNextPage && setFilters({ page: pagination.page + 1 })}
                    disabled={!pagination.hasNextPage}
                    className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${
                      pagination.hasNextPage 
                        ? 'text-gray-700 hover:bg-gray-50' 
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.totalCount}</span> documents
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => pagination.hasPreviousPage && setFilters({ page: pagination.page - 1 })}
                        disabled={!pagination.hasPreviousPage}
                        className={`relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium ${
                          pagination.hasPreviousPage 
                            ? 'text-gray-500 hover:bg-gray-50' 
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        &larr;
                      </button>
                      {/* Page numbers */}
                      {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setFilters({ page })}
                          className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium ${
                            page === pagination.page
                              ? 'z-10 border-primary-500 bg-primary-50 text-primary-600'
                              : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => pagination.hasNextPage && setFilters({ page: pagination.page + 1 })}
                        disabled={!pagination.hasNextPage}
                        className={`relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium ${
                          pagination.hasNextPage 
                            ? 'text-gray-500 hover:bg-gray-50' 
                            : 'text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        &rarr;
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Family Notes</h2>
              <button
                onClick={handleCreateNote}
                className="flex items-center rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                <FiPlus className="mr-2" /> Create Note
              </button>
            </div>
            
            {notes.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {notes.map((note) => (
                  <div key={note.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="rounded-lg bg-green-100 p-2 text-green-600">
                          <FiFileText className="h-6 w-6" />
                        </div>
                        <div className="ml-3">
                          <h3 className="font-medium text-gray-900">{note.title}</h3>
                          <p className="text-xs text-gray-500">
                            By {note.author.firstName} {note.author.lastName}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <p className="mb-3 text-sm text-gray-600 line-clamp-3">
                      {note.content.plainText}
                    </p>
                    
                    <div className="mb-3 flex flex-wrap gap-1">
                      {note.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center text-xs text-gray-500">
                        <FiClock className="mr-1" />
                        {format(new Date(note.createdAt), "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <FiMessageSquare className="mr-1" />
                        {note.commentCount} comments
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <FiFileText className="mb-2 h-10 w-10 text-gray-400" />
                <p className="text-gray-500">No notes yet</p>
                <button
                  onClick={handleCreateNote}
                  className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Create your first note
                </button>
              </div>
            )}
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === "photos" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Photo Galleries</h2>
              <button
                onClick={handleAddPhotos}
                className="flex items-center rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                <FiPlus className="mr-2" /> Create Gallery
              </button>
            </div>
            
            {galleries.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {galleries.map((gallery) => (
                  <div key={gallery.id} className="rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                    <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
                      {gallery.coverPhotoUrl ? (
                        <div className="h-full w-full bg-gray-200">
                          <div className="relative h-full w-full">
                            {/* Replace with actual Image component when images are available */}
                            <div 
                              className="h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${gallery.coverPhotoUrl})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-amber-100">
                          <FiImage className="h-12 w-12 text-amber-400" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        <h3 className="font-medium">{gallery.title}</h3>
                        <p className="text-xs opacity-90">{gallery.photoCount} photos</p>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      {gallery.description && (
                        <p className="mb-3 text-sm text-gray-600 line-clamp-2">{gallery.description}</p>
                      )}
                      
                      <div className="mb-3 flex flex-wrap gap-1">
                        {gallery.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <div className="flex items-center">
                          <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
                            {gallery.creator.profileImageUrl?.thumbnail && (
                              <div 
                                className="h-full w-full bg-cover bg-center"
                                style={{ backgroundImage: `url(${gallery.creator.profileImageUrl.thumbnail})` }}
                              />
                            )}
                          </div>
                          <span className="ml-2 text-xs text-gray-600">
                            {gallery.creator.firstName} {gallery.creator.lastName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(gallery.createdAt), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <FiImage className="mb-2 h-10 w-10 text-gray-400" />
                <p className="text-gray-500">No photo galleries yet</p>
                <button
                  onClick={handleAddPhotos}
                  className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Create your first gallery
                </button>
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === "members" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Family Members</h2>
              <button
                onClick={handleInviteMember}
                className="flex items-center rounded-md bg-primary-500 px-3 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                <FiUserPlus className="mr-2" /> Invite Member
              </button>
            </div>
            
            {members.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {members.map((member) => (
                  <div key={member.id} className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md">
                    <div className="mx-auto mb-3 h-20 w-20 overflow-hidden rounded-full bg-gray-200">
                      {member.user.profileImageUrl?.medium ? (
                        <div 
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${member.user.profileImageUrl.medium})` }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary-100 text-primary-600">
                          <span className="text-xl font-bold">
                            {member.user.firstName[0]}{member.user.lastName[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-gray-900">
                      {member.user.firstName} {member.user.lastName}
                    </h3>
                    
                    <p className="mb-2 text-sm text-gray-500">{member.user.email}</p>
                    
                    <div className="mb-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium
                        ${member.role === "OWNER" ? "bg-purple-100 text-purple-800" : ""}
                        ${member.role === "CARE_PROXY" ? "bg-blue-100 text-blue-800" : ""}
                        ${member.role === "MEMBER" ? "bg-green-100 text-green-800" : ""}
                        ${member.role === "GUEST" ? "bg-gray-100 text-gray-800" : ""}
                      `}>
                        {member.role.replace("_", " ")}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {member.joinedAt ? (
                        <p>Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}</p>
                      ) : (
                        <p>Invited - Pending</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <FiUsers className="mb-2 h-10 w-10 text-gray-400" />
                <p className="text-gray-500">No family members yet</p>
                <button
                  onClick={handleInviteMember}
                  className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Invite your first family member
                </button>
              </div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-bold">Recent Activity</h2>
            </div>
            
            {activities.length > 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <ul className="divide-y divide-gray-200">
                  {activities.map((activity) => (
                    <li key={activity.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="rounded-full bg-gray-100 p-2">
                            {getActivityIcon(activity.type)}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <div className="mt-1 flex items-center">
                            <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200">
                              {activity.actor.profileImageUrl?.thumbnail && (
                                <div 
                                  className="h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url(${activity.actor.profileImageUrl.thumbnail})` }}
                                />
                              )}
                            </div>
                            <span className="ml-2 text-xs text-gray-500">
                              {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                <FiActivity className="mb-2 h-10 w-10 text-gray-400" />
                <p className="text-gray-500">No activity yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  Activity will appear here as family members collaborate
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity Section (always visible) */}
      {activeTab !== "activity" && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent Activity</h2>
            <button
              onClick={() => setActiveTab("activity")}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View All
            </button>
          </div>
          
          {activities.length > 0 ? (
            <ul className="space-y-3">
              {activities.slice(0, 3).map((activity) => (
                <li key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="rounded-full bg-gray-100 p-1.5">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-3 text-center text-sm text-gray-500">
              No recent activity
            </p>
          )}
        </div>
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleDocumentUpload}
        familyId={familyData.id}
      />

      {/* Create Note Modal - Placeholder */}
      {showCreateNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Create Note</h2>
            <p className="mb-4 text-gray-600">
              This is a placeholder for the note creation modal.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCreateNoteModal(false)}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateNoteModal(false)}
                className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Photos Modal - Placeholder */}
      {showAddPhotosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Add Photos</h2>
            <p className="mb-4 text-gray-600">
              This is a placeholder for the photo upload modal.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowAddPhotosModal(false)}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddPhotosModal(false)}
                className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal - Placeholder */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Invite Family Member</h2>
            <p className="mb-4 text-gray-600">
              This is a placeholder for the member invitation modal.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowInviteModal(false)}
                className="rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
