# Family Collaboration – Feature Status (August 2025)

This document tracks what is **implemented**, **partially implemented**, and **planned** for the Family Collaboration area.

---

## 1. Document Management

| Capability | Status | Notes |
|------------|--------|-------|
| Upload | **✅ Complete** | Multi-file drag & drop modal with metadata form, tags, encryption flag, progress bars, optimistic UI, error handling. |
| Download | **✅ Complete** | Direct browser download via signed/relative URL – toast confirmation on click. |
| Share | **✅ Complete (MVP)** | Uses `navigator.share()` when available; falls back to copying link to clipboard. |
| Sort | **⚠️ Partial** | UI cycles through **Date / Name / Size** with asc/desc indicators. Server supports `createdAt`, `title`, `fileSize`. Sorting persists via API query. Improvement: add `updatedAt`, secondary sorts. |
| Refresh | **⚠️ Investigating** | Core fetch loop fixed; rare stuck-spinner cases still under observation. |

---

## 2. Encryption Feature

* Current upload form includes **“Encrypt this file”** (checked by default).  
* The value is saved to DB (`isEncrypted` boolean) **but actual encryption at rest & key management are **NOT** implemented yet**.  
* Road-map: integrate server-side AES envelope encryption using per-family KMS keys, transparent de-encryption on download and role-based key access.

---

## 3. Comment System

* Each document entity stores a **commentCount** (currently always `0` on new upload; real counts returned from DB).  
* **No UI to create, read, update or delete comments yet**.  
* Planned: real-time threaded comments, mentions, notifications.

---

## 4. Recent Activity Feed

* **✅ Fully operational** – each upload/update/delete automatically pushes an `ActivityFeedItem` row.  
* Feed displays immediately after mutation and persists across navigation.  
* Supports pagination and basic icons.

---

## 5. Loading & Spinner States

| Action | Previous Issue | Current Status |
|--------|----------------|----------------|
| Initial fetch | Infinite spinner | **Fixed** – loading flag clears in `finally` block. |
| Refresh | Spinner never stopped | **Mostly fixed** – now tied to `isFetching`; edge case only if multiple rapid clicks. |
| Upload | Progress stuck at 0 % | **Fixed** – per-file and overall progress update correctly, resets after 2 s. |

---

## 6. Future Features & Road-map

| Feature | Priority | Notes |
|---------|----------|-------|
| Rich-text Notes Editor | High | Collaborative TipTap editor with live presence & version history. |
| Photo Galleries | High | Drag-and-drop, EXIF parsing, albums, lightbox, bulk actions. |
| Commenting on Documents & Notes | High | Inline comments & notifications. |
| End-to-End Encryption | Medium | KMS integration, encrypted blobs, per-member key escrow. |
| Member Invitations/Permissions | Medium | Email invites, role selection, two-factor onboarding. |
| Universal Search | Medium | Elastic / PGroonga hybrid search across docs, notes, photos. |
| Mobile Offline Mode | Low | Service-worker caching of recent docs/photos. |

---

## Summary

The **core document workflow is usable in production** (upload → download/share → activity feed) with reliable state management.  
Remaining near-term focus:

1. Resolve lingering refresh spinner edge case.  
2. Ship functional commenting.  
3. Implement actual encryption logic.  
4. Expand sort/filter controls.

Stay tuned! 🚀
