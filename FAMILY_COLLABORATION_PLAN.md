# CareLinkAI – Family Collaboration System Plan

## 1. Core Features

### 1.1 Shared Documents & Files
- HIPAA-compliant upload (PDF, DOCX, images, videos)
- Folder hierarchy per resident or topic
- Version history & restore
- Share with specific family members or roles
- Expiration links for external professionals

### 1.2 Family Notes & Journals
- Rich-text collaborative editor (tip-tap / Slate.js)
- Inline @mentions with auto-notify
- Threaded comments & emoji reactions
- Tagging (`#medication`, `#wellness`) for searchability
- Revision timeline & diff view

### 1.3 Photo Galleries & Memory Books
- Drag-and-drop bulk upload
- Automatic image optimization & thumbnails
- Albums per resident, event, or year
- “Memory Book” PDF export (for printing)

### 1.4 Family Communication Hub
- Direct messages & group threads
- Mention notifications (web, email, push)
- Read receipts & typing indicators
- Quick-share documents / photos into chat
- Scheduled announcements (e.g., facility updates)

### 1.5 Permission-Based Access Control
- Roles: Owner, Care Proxy, Member, Guest
- Granular ACL per document / note / album
- Admin override & audit trail
- Link-based sharing with optional password & expiry

---

## 2. Database Schema (Prisma Draft)

| Model | Purpose | Key Fields / Relations |
|-------|---------|------------------------|
| **FamilyMember** | Stores each user’s role in a family group | `id`, `familyId`, `userId`, `role`, `status`, `invitedById` |
| **FamilyDocument** | File metadata & permissions | `id`, `familyId`, `uploaderId`, `residentId?`, `title`, `description`, `fileUrl`, `fileType`, `size`, `version`, `isEncrypted`, `acl` JSON |
| **FamilyNote** | Collaborative note / journal entry | `id`, `familyId`, `authorId`, `residentId?`, `title`, `content` (JSON), `tags` String[], `acl` |
| **DocumentComment** | Comments on documents | `id`, `documentId`, `authorId`, `content`, `parentCommentId?` |
| **NoteComment** | Comments on notes | `id`, `noteId`, `authorId`, `content`, `parentCommentId?` |
| **SharedGallery** | Photo album container | `id`, `familyId`, `creatorId`, `title`, `description`, `coverPhotoUrl`, `acl` |
| **GalleryPhoto** | Individual photos | `id`, `galleryId`, `uploaderId`, `fileUrl`, `thumbnailUrl`, `caption`, `metadata` JSON |
| **ActivityFeedItem** | System/user actions for audit & feed | `id`, `familyId`, `actorId`, `type`, `resourceType`, `resourceId`, `description`, `metadata` JSON |

_Indexes_: combine `familyId` with `createdAt` for fast feeds; full-text search on `title`, `tags`, `content`.

---

## 3. Development Phases

| Phase | Milestone | Deliverables |
|-------|-----------|--------------|
| **1 – Core Document Sharing** | MVP file upload & download | S3 (or Cloudflare R2) storage, `FamilyDocument` APIs, basic UI, ACL enforcement |
| **2 – Collaborative Notes** | Real-time rich-text notes | OT/CRDT editor, `FamilyNote` + comments, presence indicators |
| **3 – Photo Galleries & Memory Books** | Visual media experience | `SharedGallery`, `GalleryPhoto`, album UI, PDF export |
| **4 – Communication Hub** | Messaging & notifications | Chat service, @mentions, push/email, activity feed |
| **5 – Permission & Admin Controls** | Enterprise-grade security | Role management UI, ACL editor, audit logs, admin tooling |

Each phase ends with integration tests, accessibility review, and user feedback session.

---

## 4. Technical Architecture

### 4.1 File Upload & Storage
- Client → presigned URL → object storage
- Virus scan + image optimization Lambda
- Metadata stored in `FamilyDocument`
- Signed URLs served via CDN

### 4.2 Real-Time Collaboration
- WebSocket (Pusher / Ably) or WebRTC DataChannels
- CRDT/OT layer for notes
- Presence & typing indicators streamed to clients

### 4.3 Permission & Access Control
- ACL JSON array `{ subjectType: "user|role", subjectId, rights: ["read","write","share"] }`
- Middleware to enforce at API layer
- Admin override with audit log entry

### 4.4 Activity Tracking & Notifications
- Event bus (Redis Streams) captures create/update/delete
- Writes `ActivityFeedItem`
- Fan-out worker sends notifications (email, push, in-app)

### 4.5 Search & Organization
- Elastic / Typesense index on documents, notes, photos
- Faceted search (tags, resident, type, date)
- Smart folders (saved filter queries)

---

## 📅 Next Steps

1. **Finalize Prisma schema** (add models above; migrate)
2. **Phase 1 sprint** – build API routes & React hooks for document upload
3. Integrate file picker & presigned upload flow
4. Schedule stakeholder demo & feedback

This plan sets a clear roadmap to deliver an engaging, secure, and HIPAA-compliant family collaboration experience for CareLinkAI 🚀
