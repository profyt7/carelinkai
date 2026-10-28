# Phase 1 – Search Enhancements  
_CareLinkAI – July 2025_

---

## 1. Database Improvements

### 1.1 FavoriteHome Table  
* **Model:** `prisma/schema.prisma`  
  ```prisma
  model FavoriteHome {
    id        String   @id @default(cuid())
    familyId  String
    homeId    String
    notes     String?
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    @@unique([familyId, homeId])
  }
  ```  
* **Relations added**
  * `Family.favorites`
  * `AssistedLivingHome.favorites`
* **Migration:** `prisma/migrations/20250124_add_favorites/`
* **Indexes / FK:** unique composite index `(familyId, homeId)` + standard FK with `ON DELETE CASCADE`.

### 1.2 Sample Data Seeding  
* `prisma/seed.ts`
  * Generates 5 families, 3 operators, 10 caregivers, 2 affiliates, etc.
  * Inserts realistic **FavoriteHome** rows via `family.favorites` to validate queries.
  * Passwords hashed with `bcryptjs` (removed obsolete `hashPassword`).

---

## 2. API Enhancements

### 2.1 Favorites Endpoint (`src/app/api/favorites/route.ts`)
| Method | Path                | Description                           |
|--------|---------------------|---------------------------------------|
| GET    | `/api/favorites`    | List current family’s favorites       |
| POST   | `/api/favorites`    | Add home to favorites (idempotent)    |
| DELETE | `/api/favorites`    | Remove favorite via `?homeId=` query  |

* Authentication via `next-auth` session.
* Returns enriched home details (primary photo, operator contact).

### 2.2 Search Endpoint Upgrades (`src/app/api/search/route.ts`)
New query parameters  
```
radius        Number (mi)  – filter by distance *(placeholder until GPS)*
sortBy        relevance | price_low | price_high | distance | rating
availability  Number       – minimum open beds (supersedes bool flag)
verified      true|false   – require active license
```

Additional logic:
* Calculates `isFavorited` per result (using session family favorites).
* Post-filtering by numeric availability.
* Enhanced sorting branch.
* Placeholder verified filter uses ACTIVE license presence.

---

## 3. Front-End Improvements

### 3.1 Tailwind-based SearchFilters (`src/components/search/SearchFilters.tsx`)
* Responsive grid (mobile ➜ desktop).
* Supports all new params:
  * Care-level checkboxes (`@prisma/client CareLevel`)
  * Min / Max budget fields
  * Location + radius slider
  * Gender, availability, verified toggle
  * Amenities multi-select
  * Sort-by dropdown
* Active-filter chips with remove buttons (accessible, no MUI).

### 3.2 Favorites Service (`src/lib/favoritesService.ts`)
* `getFavorites`, `addFavorite`, `removeFavorite`, `toggleFavorite`, `isHomeFavorited`
* Typed interfaces (`FavoriteHome`, `HomeDetails`…)
* Custom `FavoritesError`.

### 3.3 Search Service Upgrades (`src/lib/searchService.ts`)
* `SearchParams` expanded for new fields.
* Client-side validation & popular suggestions.
* NLP parsing extracts radius, sort, verified, numeric availability.

---

## 4. New Features Delivered

| Feature | Location | Notes |
|---------|----------|-------|
| Favorites system | DB + API + Service | Allows families to save/unsave homes; status returned with search results. |
| Advanced filters | API + Filters UI | Radius, numeric availability, verified-only, price sorting. |
| Tailwind UI | SearchFilters | Removed MUI dependency, lightweight responsive design. |
| NLP parsing improvements | `parseNaturalLanguageQuery` | Detects radius, sort intents, verified requirement, min availability. |
| Validation / suggestions | Search service & UI | Prevents invalid ranges, suggests common searches. |

---

## 5. Next Steps – Phase 2 Roadmap

1. **Geospatial Search**
   * Add lat/lng to user query via browser geolocation.
   * Implement PostGIS `ST_DWithin` for true radius filtering.
2. **Ratings & Reviews Sorting**
   * Aggregate `HomeReview` averages in query; enable `sortBy=rating`.
3. **Distance Sorting**
   * After geospatial calc, support `sortBy=distance`.
4. **Favorites UI Integration**
   * Heart-icon toggle on `HomeCard`, favorites page under Dashboard.
5. **Elastic / Vector Search**
   * Offload heavy NLP scoring to Elasticsearch + embeddings.
6. **Performance**
   * Pagination cursor-based, SQL indexes for new columns, Redis caching.
7. **Analytics**
   * Track filter usage & favorites actions for recommendation engine.

---

### Implementation Notes

* Prisma client regeneration on Windows required `npx prisma db push` due to DLL rename issue.
* Tailwind classes co-exist with existing global styles; purge-css paths updated automatically by Next.js.
* All new endpoints follow the same `NextRequest/NextResponse` pattern and disconnect Prisma in `finally` blocks.

---
_Created automatically by Factory assistant. For questions contact @dev-team._
