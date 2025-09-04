-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('FAMILY', 'OPERATOR', 'CAREGIVER', 'ADMIN', 'AFFILIATE', 'STAFF');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('SETTING', 'CARE_TYPE', 'SERVICE', 'SPECIALTY');

-- CreateEnum
CREATE TYPE "MarketplaceListingStatus" AS ENUM ('DRAFT', 'OPEN', 'HIRED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('APPLIED', 'INVITED', 'INTERVIEWING', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "BackgroundCheckStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'CLEAR', 'CONSIDER', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "HomeStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CareLevel" AS ENUM ('INDEPENDENT', 'ASSISTED', 'MEMORY_CARE', 'SKILLED_NURSING');

-- CreateEnum
CREATE TYPE "ResidentStatus" AS ENUM ('INQUIRY', 'PENDING', 'ACTIVE', 'DISCHARGED', 'DECEASED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'TOUR_SCHEDULED', 'TOUR_COMPLETED', 'PLACEMENT_OFFERED', 'PLACEMENT_ACCEPTED', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('DEPOSIT', 'MONTHLY_FEE', 'INCIDENTAL', 'CAREGIVER_PAYMENT', 'AFFILIATE_COMMISSION');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MESSAGE', 'BOOKING', 'PAYMENT', 'COMPLIANCE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('RESIDENT_RECORD', 'MEDICAL_RECORD', 'COMPLIANCE_DOCUMENT', 'CONTRACT', 'INVOICE', 'CREDENTIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'ACCESS_DENIED', 'OTHER');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CARE_EVALUATION', 'FACILITY_TOUR', 'CAREGIVER_SHIFT', 'FAMILY_VISIT', 'CONSULTATION', 'MEDICAL_APPOINTMENT', 'ADMIN_MEETING', 'SOCIAL_EVENT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "ScheduledNotificationStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "FamilyMemberRole" AS ENUM ('OWNER', 'CARE_PROXY', 'MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "FamilyMemberStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "FamilyDocumentType" AS ENUM ('CARE_PLAN', 'MEDICAL_RECORD', 'INSURANCE_DOCUMENT', 'PHOTO', 'VIDEO', 'LEGAL_DOCUMENT', 'PERSONAL_DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('DOCUMENT_UPLOADED', 'DOCUMENT_UPDATED', 'DOCUMENT_DELETED', 'DOCUMENT_COMMENTED', 'NOTE_CREATED', 'NOTE_UPDATED', 'NOTE_DELETED', 'NOTE_COMMENTED', 'GALLERY_CREATED', 'GALLERY_UPDATED', 'PHOTO_UPLOADED', 'MEMBER_INVITED', 'MEMBER_JOINED', 'MEMBER_ROLE_CHANGED', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "profileImageUrl" JSONB,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,
    "backupCodes" JSONB,
    "verificationToken" TEXT,
    "verificationTokenExpiry" TIMESTAMP(3),
    "resetPasswordToken" TEXT,
    "resetPasswordTokenExpiry" TIMESTAMP(3),
    "notificationPrefs" JSONB,
    "preferences" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "taxId" TEXT,
    "businessLicense" TEXT,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caregiver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "yearsExperience" INTEGER,
    "hourlyRate" DECIMAL(10,2),
    "availability" JSONB,
    "backgroundCheckStatus" "BackgroundCheckStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "backgroundCheckProvider" TEXT,
    "backgroundCheckReportUrl" TEXT,
    "specialties" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caregiver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affiliate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "affiliateCode" TEXT NOT NULL,
    "organization" TEXT,
    "commissionRate" DECIMAL(5,2),
    "paymentDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affiliate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistedLivingHome" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "HomeStatus" NOT NULL DEFAULT 'DRAFT',
    "careLevel" "CareLevel"[],
    "capacity" INTEGER NOT NULL,
    "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
    "genderRestriction" TEXT,
    "priceMin" DECIMAL(10,2),
    "priceMax" DECIMAL(10,2),
    "amenities" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistedLivingHome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomePhoto" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "street2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'USA',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "userId" TEXT,
    "homeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resident" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "homeId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "status" "ResidentStatus" NOT NULL DEFAULT 'INQUIRY',
    "careNeeds" JSONB,
    "medicalConditions" TEXT,
    "medications" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "admissionDate" TIMESTAMP(3),
    "dischargeDate" TIMESTAMP(3),

    CONSTRAINT "Resident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareTimelineEvent" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "message" TEXT,
    "tourDate" TIMESTAMP(3),
    "aiMatchScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "inquiryId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "moveInDate" TIMESTAMP(3) NOT NULL,
    "moveOutDate" TIMESTAMP(3),
    "deposit" DECIMAL(10,2),
    "monthlyRate" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "documentUrl" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverEmployment" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "position" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverEmployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverShift" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "caregiverId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "hourlyRate" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeReview" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaregiverReview" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "type" "PaymentType" NOT NULL,
    "description" TEXT,
    "stripePaymentId" TEXT,
    "receiptUrl" TEXT,
    "marketplaceListingId" TEXT,
    "marketplaceHireId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyWallet" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "residentId" TEXT,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "inspectionType" TEXT NOT NULL,
    "inspector" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "findings" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateReferral" (
    "id" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "referredEmail" TEXT NOT NULL,
    "referredUserId" TEXT,
    "status" TEXT NOT NULL,
    "conversionDate" TIMESTAMP(3),
    "commissionAmount" DECIMAL(10,2),
    "commissionPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionedBy" TEXT,
    "action" "AuditAction" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "description" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteHome" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FavoriteHome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMatchingData" (
    "id" TEXT NOT NULL,
    "homeId" TEXT,
    "caregiverId" TEXT,
    "residentId" TEXT,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIMatchingData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIRiskFlag" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "riskType" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL,
    "riskReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIRiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "location" JSONB,
    "homeId" TEXT,
    "residentId" TEXT,
    "createdById" TEXT NOT NULL,
    "recurrence" JSONB,
    "reminders" JSONB,
    "customFields" JSONB,
    "metadata" JSONB,
    "parentAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentParticipant" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole",
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "availableFor" TEXT[],
    "homeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "status" "ScheduledNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "FamilyMemberRole" NOT NULL,
    "status" "FamilyMemberStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT,
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyDocument" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "residentId" TEXT,
    "type" "FamilyDocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isEncrypted" BOOLEAN NOT NULL DEFAULT true,
    "acl" JSONB,
    "tags" TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyNote" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "residentId" TEXT,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "tags" TEXT[],
    "acl" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentComment" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteComment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedGallery" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverPhotoUrl" TEXT,
    "acl" JSONB,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedGallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryPhoto" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "caption" TEXT,
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityFeedItem" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityFeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CategoryType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "postedByUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hourlyRateMin" DECIMAL(10,2),
    "hourlyRateMax" DECIMAL(10,2),
    "setting" TEXT,
    "careTypes" TEXT[],
    "services" TEXT[],
    "specialties" TEXT[],
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceApplication" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'APPLIED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceHire" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "applicationId" TEXT,
    "shiftId" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceHire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_verificationToken_idx" ON "User"("verificationToken");

-- CreateIndex
CREATE INDEX "User_resetPasswordToken_idx" ON "User"("resetPasswordToken");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Session_accessToken_key" ON "Session"("accessToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Family_userId_key" ON "Family"("userId");

-- CreateIndex
CREATE INDEX "Family_userId_idx" ON "Family"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Operator_userId_key" ON "Operator"("userId");

-- CreateIndex
CREATE INDEX "Operator_userId_idx" ON "Operator"("userId");

-- CreateIndex
CREATE INDEX "Operator_companyName_idx" ON "Operator"("companyName");

-- CreateIndex
CREATE UNIQUE INDEX "Caregiver_userId_key" ON "Caregiver"("userId");

-- CreateIndex
CREATE INDEX "Caregiver_userId_idx" ON "Caregiver"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_userId_key" ON "Affiliate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Affiliate_affiliateCode_key" ON "Affiliate"("affiliateCode");

-- CreateIndex
CREATE INDEX "Affiliate_userId_idx" ON "Affiliate"("userId");

-- CreateIndex
CREATE INDEX "Affiliate_affiliateCode_idx" ON "Affiliate"("affiliateCode");

-- CreateIndex
CREATE INDEX "AssistedLivingHome_operatorId_idx" ON "AssistedLivingHome"("operatorId");

-- CreateIndex
CREATE INDEX "AssistedLivingHome_status_idx" ON "AssistedLivingHome"("status");

-- CreateIndex
CREATE INDEX "AssistedLivingHome_priceMin_priceMax_idx" ON "AssistedLivingHome"("priceMin", "priceMax");

-- CreateIndex
CREATE INDEX "AssistedLivingHome_careLevel_idx" ON "AssistedLivingHome"("careLevel");

-- CreateIndex
CREATE INDEX "HomePhoto_homeId_idx" ON "HomePhoto"("homeId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_homeId_key" ON "Address"("homeId");

-- CreateIndex
CREATE INDEX "Address_userId_idx" ON "Address"("userId");

-- CreateIndex
CREATE INDEX "Address_homeId_idx" ON "Address"("homeId");

-- CreateIndex
CREATE INDEX "Address_city_state_idx" ON "Address"("city", "state");

-- CreateIndex
CREATE INDEX "Address_zipCode_idx" ON "Address"("zipCode");

-- CreateIndex
CREATE INDEX "Address_latitude_longitude_idx" ON "Address"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Resident_familyId_idx" ON "Resident"("familyId");

-- CreateIndex
CREATE INDEX "Resident_homeId_idx" ON "Resident"("homeId");

-- CreateIndex
CREATE INDEX "Resident_status_idx" ON "Resident"("status");

-- CreateIndex
CREATE INDEX "CareTimelineEvent_residentId_idx" ON "CareTimelineEvent"("residentId");

-- CreateIndex
CREATE INDEX "CareTimelineEvent_eventType_idx" ON "CareTimelineEvent"("eventType");

-- CreateIndex
CREATE INDEX "CareTimelineEvent_scheduledAt_idx" ON "CareTimelineEvent"("scheduledAt");

-- CreateIndex
CREATE INDEX "Inquiry_familyId_idx" ON "Inquiry"("familyId");

-- CreateIndex
CREATE INDEX "Inquiry_homeId_idx" ON "Inquiry"("homeId");

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Inquiry_tourDate_idx" ON "Inquiry"("tourDate");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_inquiryId_key" ON "Booking"("inquiryId");

-- CreateIndex
CREATE INDEX "Booking_familyId_idx" ON "Booking"("familyId");

-- CreateIndex
CREATE INDEX "Booking_homeId_idx" ON "Booking"("homeId");

-- CreateIndex
CREATE INDEX "Booking_residentId_idx" ON "Booking"("residentId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_moveInDate_idx" ON "Booking"("moveInDate");

-- CreateIndex
CREATE INDEX "Credential_caregiverId_idx" ON "Credential"("caregiverId");

-- CreateIndex
CREATE INDEX "Credential_type_idx" ON "Credential"("type");

-- CreateIndex
CREATE INDEX "Credential_expirationDate_idx" ON "Credential"("expirationDate");

-- CreateIndex
CREATE INDEX "CaregiverEmployment_caregiverId_idx" ON "CaregiverEmployment"("caregiverId");

-- CreateIndex
CREATE INDEX "CaregiverEmployment_operatorId_idx" ON "CaregiverEmployment"("operatorId");

-- CreateIndex
CREATE INDEX "CaregiverEmployment_isActive_idx" ON "CaregiverEmployment"("isActive");

-- CreateIndex
CREATE INDEX "CaregiverShift_homeId_idx" ON "CaregiverShift"("homeId");

-- CreateIndex
CREATE INDEX "CaregiverShift_caregiverId_idx" ON "CaregiverShift"("caregiverId");

-- CreateIndex
CREATE INDEX "CaregiverShift_startTime_idx" ON "CaregiverShift"("startTime");

-- CreateIndex
CREATE INDEX "CaregiverShift_status_idx" ON "CaregiverShift"("status");

-- CreateIndex
CREATE INDEX "HomeReview_homeId_idx" ON "HomeReview"("homeId");

-- CreateIndex
CREATE INDEX "HomeReview_rating_idx" ON "HomeReview"("rating");

-- CreateIndex
CREATE INDEX "CaregiverReview_caregiverId_idx" ON "CaregiverReview"("caregiverId");

-- CreateIndex
CREATE INDEX "CaregiverReview_rating_idx" ON "CaregiverReview"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentId_key" ON "Payment"("stripePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_marketplaceHireId_key" ON "Payment"("marketplaceHireId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_marketplaceListingId_idx" ON "Payment"("marketplaceListingId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyWallet_familyId_key" ON "FamilyWallet"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyWallet_stripeCustomerId_key" ON "FamilyWallet"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "FamilyWallet_familyId_idx" ON "FamilyWallet"("familyId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_receiverId_idx" ON "Message"("receiverId");

-- CreateIndex
CREATE INDEX "Message_status_idx" ON "Message"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Document_residentId_idx" ON "Document"("residentId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE INDEX "License_homeId_idx" ON "License"("homeId");

-- CreateIndex
CREATE INDEX "License_expirationDate_idx" ON "License"("expirationDate");

-- CreateIndex
CREATE INDEX "License_status_idx" ON "License"("status");

-- CreateIndex
CREATE INDEX "Inspection_homeId_idx" ON "Inspection"("homeId");

-- CreateIndex
CREATE INDEX "Inspection_inspectionDate_idx" ON "Inspection"("inspectionDate");

-- CreateIndex
CREATE INDEX "Inspection_result_idx" ON "Inspection"("result");

-- CreateIndex
CREATE INDEX "AffiliateReferral_affiliateId_idx" ON "AffiliateReferral"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliateReferral_referredEmail_idx" ON "AffiliateReferral"("referredEmail");

-- CreateIndex
CREATE INDEX "AffiliateReferral_referredUserId_idx" ON "AffiliateReferral"("referredUserId");

-- CreateIndex
CREATE INDEX "AffiliateReferral_status_idx" ON "AffiliateReferral"("status");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_actionedBy_idx" ON "AuditLog"("actionedBy");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "FavoriteHome_familyId_idx" ON "FavoriteHome"("familyId");

-- CreateIndex
CREATE INDEX "FavoriteHome_homeId_idx" ON "FavoriteHome"("homeId");

-- CreateIndex
CREATE INDEX "FavoriteHome_createdAt_idx" ON "FavoriteHome"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteHome_familyId_homeId_key" ON "FavoriteHome"("familyId", "homeId");

-- CreateIndex
CREATE INDEX "AIMatchingData_homeId_idx" ON "AIMatchingData"("homeId");

-- CreateIndex
CREATE INDEX "AIMatchingData_caregiverId_idx" ON "AIMatchingData"("caregiverId");

-- CreateIndex
CREATE INDEX "AIMatchingData_residentId_idx" ON "AIMatchingData"("residentId");

-- CreateIndex
CREATE INDEX "AIMatchingData_matchScore_idx" ON "AIMatchingData"("matchScore");

-- CreateIndex
CREATE INDEX "AIRiskFlag_entityType_entityId_idx" ON "AIRiskFlag"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AIRiskFlag_riskType_idx" ON "AIRiskFlag"("riskType");

-- CreateIndex
CREATE INDEX "AIRiskFlag_riskScore_idx" ON "AIRiskFlag"("riskScore");

-- CreateIndex
CREATE INDEX "AIRiskFlag_isActive_idx" ON "AIRiskFlag"("isActive");

-- CreateIndex
CREATE INDEX "Appointment_createdById_idx" ON "Appointment"("createdById");

-- CreateIndex
CREATE INDEX "Appointment_homeId_idx" ON "Appointment"("homeId");

-- CreateIndex
CREATE INDEX "Appointment_residentId_idx" ON "Appointment"("residentId");

-- CreateIndex
CREATE INDEX "Appointment_type_idx" ON "Appointment"("type");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_startTime_endTime_idx" ON "Appointment"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "AppointmentParticipant_appointmentId_idx" ON "AppointmentParticipant"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentParticipant_userId_idx" ON "AppointmentParticipant"("userId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_userId_idx" ON "AvailabilitySlot"("userId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_homeId_idx" ON "AvailabilitySlot"("homeId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_startTime_endTime_idx" ON "AvailabilitySlot"("startTime", "endTime");

-- CreateIndex
CREATE INDEX "ScheduledNotification_userId_idx" ON "ScheduledNotification"("userId");

-- CreateIndex
CREATE INDEX "ScheduledNotification_status_idx" ON "ScheduledNotification"("status");

-- CreateIndex
CREATE INDEX "ScheduledNotification_scheduledFor_idx" ON "ScheduledNotification"("scheduledFor");

-- CreateIndex
CREATE INDEX "FamilyMember_familyId_idx" ON "FamilyMember"("familyId");

-- CreateIndex
CREATE INDEX "FamilyMember_userId_idx" ON "FamilyMember"("userId");

-- CreateIndex
CREATE INDEX "FamilyMember_status_idx" ON "FamilyMember"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyMember_familyId_userId_key" ON "FamilyMember"("familyId", "userId");

-- CreateIndex
CREATE INDEX "FamilyDocument_familyId_idx" ON "FamilyDocument"("familyId");

-- CreateIndex
CREATE INDEX "FamilyDocument_uploaderId_idx" ON "FamilyDocument"("uploaderId");

-- CreateIndex
CREATE INDEX "FamilyDocument_residentId_idx" ON "FamilyDocument"("residentId");

-- CreateIndex
CREATE INDEX "FamilyDocument_type_idx" ON "FamilyDocument"("type");

-- CreateIndex
CREATE INDEX "FamilyDocument_tags_idx" ON "FamilyDocument"("tags");

-- CreateIndex
CREATE INDEX "FamilyDocument_createdAt_idx" ON "FamilyDocument"("createdAt");

-- CreateIndex
CREATE INDEX "FamilyNote_familyId_idx" ON "FamilyNote"("familyId");

-- CreateIndex
CREATE INDEX "FamilyNote_authorId_idx" ON "FamilyNote"("authorId");

-- CreateIndex
CREATE INDEX "FamilyNote_residentId_idx" ON "FamilyNote"("residentId");

-- CreateIndex
CREATE INDEX "FamilyNote_tags_idx" ON "FamilyNote"("tags");

-- CreateIndex
CREATE INDEX "FamilyNote_createdAt_idx" ON "FamilyNote"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentComment_documentId_idx" ON "DocumentComment"("documentId");

-- CreateIndex
CREATE INDEX "DocumentComment_authorId_idx" ON "DocumentComment"("authorId");

-- CreateIndex
CREATE INDEX "DocumentComment_parentCommentId_idx" ON "DocumentComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "NoteComment_noteId_idx" ON "NoteComment"("noteId");

-- CreateIndex
CREATE INDEX "NoteComment_authorId_idx" ON "NoteComment"("authorId");

-- CreateIndex
CREATE INDEX "NoteComment_parentCommentId_idx" ON "NoteComment"("parentCommentId");

-- CreateIndex
CREATE INDEX "SharedGallery_familyId_idx" ON "SharedGallery"("familyId");

-- CreateIndex
CREATE INDEX "SharedGallery_creatorId_idx" ON "SharedGallery"("creatorId");

-- CreateIndex
CREATE INDEX "SharedGallery_tags_idx" ON "SharedGallery"("tags");

-- CreateIndex
CREATE INDEX "SharedGallery_createdAt_idx" ON "SharedGallery"("createdAt");

-- CreateIndex
CREATE INDEX "GalleryPhoto_galleryId_idx" ON "GalleryPhoto"("galleryId");

-- CreateIndex
CREATE INDEX "GalleryPhoto_uploaderId_idx" ON "GalleryPhoto"("uploaderId");

-- CreateIndex
CREATE INDEX "GalleryPhoto_createdAt_idx" ON "GalleryPhoto"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityFeedItem_familyId_idx" ON "ActivityFeedItem"("familyId");

-- CreateIndex
CREATE INDEX "ActivityFeedItem_actorId_idx" ON "ActivityFeedItem"("actorId");

-- CreateIndex
CREATE INDEX "ActivityFeedItem_type_idx" ON "ActivityFeedItem"("type");

-- CreateIndex
CREATE INDEX "ActivityFeedItem_createdAt_idx" ON "ActivityFeedItem"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCategory_slug_key" ON "MarketplaceCategory"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceCategory_type_idx" ON "MarketplaceCategory"("type");

-- CreateIndex
CREATE INDEX "MarketplaceCategory_isActive_idx" ON "MarketplaceCategory"("isActive");

-- CreateIndex
CREATE INDEX "MarketplaceListing_postedByUserId_idx" ON "MarketplaceListing"("postedByUserId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_status_idx" ON "MarketplaceListing"("status");

-- CreateIndex
CREATE INDEX "MarketplaceListing_createdAt_idx" ON "MarketplaceListing"("createdAt");

-- CreateIndex
CREATE INDEX "MarketplaceListing_city_state_idx" ON "MarketplaceListing"("city", "state");

-- CreateIndex
CREATE INDEX "MarketplaceListing_zipCode_idx" ON "MarketplaceListing"("zipCode");

-- CreateIndex
CREATE INDEX "MarketplaceApplication_listingId_idx" ON "MarketplaceApplication"("listingId");

-- CreateIndex
CREATE INDEX "MarketplaceApplication_caregiverId_idx" ON "MarketplaceApplication"("caregiverId");

-- CreateIndex
CREATE INDEX "MarketplaceApplication_status_idx" ON "MarketplaceApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceApplication_listingId_caregiverId_key" ON "MarketplaceApplication"("listingId", "caregiverId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceHire_applicationId_key" ON "MarketplaceHire"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceHire_shiftId_key" ON "MarketplaceHire"("shiftId");

-- CreateIndex
CREATE INDEX "MarketplaceHire_listingId_idx" ON "MarketplaceHire"("listingId");

-- CreateIndex
CREATE INDEX "MarketplaceHire_caregiverId_idx" ON "MarketplaceHire"("caregiverId");

-- CreateIndex
CREATE INDEX "MarketplaceHire_applicationId_idx" ON "MarketplaceHire"("applicationId");

-- CreateIndex
CREATE INDEX "MarketplaceHire_shiftId_idx" ON "MarketplaceHire"("shiftId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Operator" ADD CONSTRAINT "Operator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caregiver" ADD CONSTRAINT "Caregiver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affiliate" ADD CONSTRAINT "Affiliate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistedLivingHome" ADD CONSTRAINT "AssistedLivingHome_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomePhoto" ADD CONSTRAINT "HomePhoto_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resident" ADD CONSTRAINT "Resident_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareTimelineEvent" ADD CONSTRAINT "CareTimelineEvent_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverEmployment" ADD CONSTRAINT "CaregiverEmployment_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverEmployment" ADD CONSTRAINT "CaregiverEmployment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverShift" ADD CONSTRAINT "CaregiverShift_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverShift" ADD CONSTRAINT "CaregiverShift_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeReview" ADD CONSTRAINT "HomeReview_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverReview" ADD CONSTRAINT "CaregiverReview_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_marketplaceListingId_fkey" FOREIGN KEY ("marketplaceListingId") REFERENCES "MarketplaceListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_marketplaceHireId_fkey" FOREIGN KEY ("marketplaceHireId") REFERENCES "MarketplaceHire"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyWallet" ADD CONSTRAINT "FamilyWallet_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "FamilyWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateReferral" ADD CONSTRAINT "AffiliateReferral_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actionedBy_fkey" FOREIGN KEY ("actionedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteHome" ADD CONSTRAINT "FavoriteHome_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteHome" ADD CONSTRAINT "FavoriteHome_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_parentAppointmentId_fkey" FOREIGN KEY ("parentAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentParticipant" ADD CONSTRAINT "AppointmentParticipant_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentParticipant" ADD CONSTRAINT "AppointmentParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledNotification" ADD CONSTRAINT "ScheduledNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyDocument" ADD CONSTRAINT "FamilyDocument_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyDocument" ADD CONSTRAINT "FamilyDocument_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyDocument" ADD CONSTRAINT "FamilyDocument_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyNote" ADD CONSTRAINT "FamilyNote_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyNote" ADD CONSTRAINT "FamilyNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyNote" ADD CONSTRAINT "FamilyNote_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "Resident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "FamilyDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentComment" ADD CONSTRAINT "DocumentComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "DocumentComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "FamilyNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "NoteComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedGallery" ADD CONSTRAINT "SharedGallery_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharedGallery" ADD CONSTRAINT "SharedGallery_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "SharedGallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryPhoto" ADD CONSTRAINT "GalleryPhoto_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityFeedItem" ADD CONSTRAINT "ActivityFeedItem_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityFeedItem" ADD CONSTRAINT "ActivityFeedItem_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_postedByUserId_fkey" FOREIGN KEY ("postedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceApplication" ADD CONSTRAINT "MarketplaceApplication_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceApplication" ADD CONSTRAINT "MarketplaceApplication_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceHire" ADD CONSTRAINT "MarketplaceHire_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceHire" ADD CONSTRAINT "MarketplaceHire_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "Caregiver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceHire" ADD CONSTRAINT "MarketplaceHire_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "MarketplaceApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceHire" ADD CONSTRAINT "MarketplaceHire_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CaregiverShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
