# Almadot — Backend Implementation Overview

This document describes everything implemented so far in the **`server`** package: stack, layout, configuration, data models, HTTP API, middleware, and how pieces align with the authentication DFD and database schema references used in the project.

---

## 1. Stack

| Piece | Choice |
|--------|--------|
| Runtime | Node.js (ES modules: `"type": "module"`) |
| HTTP framework | Express **5.x** |
| Database | MongoDB via **Mongoose 9.x** |
| Password hashing | **bcrypt** |
| Sessions | MongoDB **`sessions`** collection + **httpOnly** cookie |
| Env loading | **dotenv** |
| Cross-origin | **cors** (explicit origin + credentials for cookies) |
| Cookies | **cookie-parser** |
| Dev reload | **nodemon** (`npm run dev`) |

---

## 2. Project layout (`server/`)

```
server/
├── doc/
│   └── BackendImplementation.md    ← this file
├── nodemon.json                    ← watches src/*.js by default config
├── package.json
├── .env                            ← local secrets & URLs (gitignored)
├── upload/                         ← persisted user uploads (gitignored)
│   └── <UTC YYYY-MM-DD>/
│       ├── profile/<uuid>.webp
│       └── product/<uuid>.webp
├── src/
│   ├── index.js                    ← app bootstrap: DB connect, middleware, routes, static /upload
│   ├── config/
│   │   ├── db.js                   ← mongoose.connect(uri)
│   │   ├── session.js              ← cookie name, TTL, CSRF header name helpers
│   │   └── upload.js               ← UPLOAD_ROOT, kinds, UTC date folder, URL helpers
│   ├── controllers/
│   │   ├── auth.controller.js      ← register, login, getMe, logout
│   │   ├── user.controller.js      ← createUser, listUsers, getUser, getMySettings, patchMySettings, updateUser, removeUser
│   │   ├── upload.controller.js    ← uploadProfileImage, uploadProductImage
│   │   ├── category.controller.js  ← listCategories, getCategory (cascading picker + browse filter tree)
│   │   ├── location.controller.js  ← listLocations, getLocation (Division → City → Area)
│   │   ├── listing.controller.js   ← createListing, getListing, listListings, updateListing, removeListing
│   │   ├── claim.controller.js     ← createClaim, listClaims, getClaim, updateClaim, claim messages (DFD §4)
│   │   └── notification.controller.js ← list, unread count, mark read (DFD §4.4)
│   ├── middleware/
│   │   ├── errorHandler.js         ← 404 + centralized JSON errors
│   │   ├── session.js              ← loadSession, requireAuth
│   │   └── upload.js               ← multer (memory storage) + multerErrorHandler
│   ├── models/
│   │   ├── User.js                 ← users collection (schema-aligned)
│   │   ├── Session.js              ← sessions collection (schema-aligned + TTL)
│   │   ├── ListingCategory.js      ← listing_categories collection (up to 4 levels 0–3; Zakat L3)
│   │   ├── ListingLocation.js      ← listing_locations collection (Division → City → Area)
│   │   ├── Listing.js              ← listings collection (schema-aligned)
│   │   ├── Claim.js                ← claims collection (give + exchange proposals)
│   │   ├── ClaimMessage.js         ← negotiation messages on a claim (replaces counter-offer)
│   │   ├── Notification.js         ← in-app notification fan-out (DFD §4.4)
│   │   └── AuditLog.js             ← polymorphic audit trail
│   ├── routes/
│   │   ├── auth.routes.js          ← mounts auth endpoints under /api/v1/auth
│   │   ├── user.routes.js          ← mounts user endpoints under /api/v1/users
│   │   ├── upload.routes.js        ← mounts upload endpoints under /api/v1/upload
│   │   ├── category.routes.js      ← mounts category endpoints under /api/v1/categories
│   │   ├── location.routes.js      ← mounts location endpoints under /api/v1/locations
│   │   ├── listing.routes.js       ← mounts listing endpoints under /api/v1/listings
│   │   ├── claim.routes.js         ← mounts claim endpoints under /api/v1/claims
│   │   └── notification.routes.js  ← mounts notification endpoints under /api/v1/notifications
│   ├── utils/
│   │   ├── categoryTree.js         ← isListingCategoryLeaf, categoriesWithLeafFlags (hasChildren / isLeaf)
│   │   └── userPrivacy.js          ← privacy normalization, public profile + party card builders
│   ├── seed/
│   │   ├── listingCategories.js    ← idempotent seed for give/exchange category tree
│   │   ├── listingLocations.js     ← idempotent seed for location tree
│   │   ├── locationTree.data.json  ← Bangladesh divisions / cities / areas (source data)
│   │   └── parseLocationDoc.js     ← optional: rebuild JSON from location_list.docx
│   └── services/
│       ├── session.service.js      ← issueSession, findActiveSession, destroySession, destroyAllSessionsForUser
│       ├── imageStorage.service.js ← saveImage (sharp → webp), deleteStoredImage
│       └── claim.service.js        ← submit / review / complete with Mongo transactions
```

**Pattern:** MVC-style separation — **routes** delegate to **controllers**; **models** define Mongoose schemas; **services** hold reusable session logic; **middleware** handles cross-cutting concerns (sessions, errors).

---

## 3. Running the API

```bash
cd server
npm install
npm run dev       # nodemon + watch src/
# or
npm start         # node src/index.js (no watch)
```

Default URL: **`http://localhost:3000`** (override with `PORT` in `.env`).

Health check:

```http
GET /health
```

Returns Mongo connection status and logical database name.

---

## 4. Environment variables

Configured in **`server/.env`** (do not commit real secrets). Typical keys:

| Variable | Purpose |
|----------|---------|
| `PORT` | HTTP listen port (default `3000`) |
| `MONGODB_URI` | Full Mongo connection string; **database name must appear in the path** (e.g. `mongodb://localhost:27017/almadot?retryWrites=false`). For local/standalone MongoDB, include `retryWrites=false` (also set automatically in `connectDatabase`). |
| `CLIENT_ORIGIN` | Allowed browser origin(s) for CORS **when cookies are used** — comma-separated list supported; must not be `*` (default dev: `http://localhost:5173`). In **development** (`NODE_ENV !== production`), any **`http://localhost:<port>`** origin is also accepted so Vite fallback ports work. |
| `NODE_ENV` | When `production`, session cookies use `Secure: true` |
| `SESSION_COOKIE_NAME` | Cookie carrying opaque session id (default `almadot.sid`) |
| `SESSION_TTL_DAYS` | Session lifetime; mirrored on cookie expiry + Mongo TTL index (default `14`) |
| `CSRF_HEADER_NAME` | Header name returned alongside login/me for future CSRF checks (default `x-csrf-token`) |
| `UPLOAD_DIR` | On-disk root for user uploads, relative to `server/` (default `./upload`) |
| `PUBLIC_UPLOAD_PATH` | URL prefix the server serves uploads under and that is saved to Mongo (default `/upload`) |
| `MAX_UPLOAD_BYTES` | Multer file-size limit, in bytes (default `5242880` = 5 MB) |

---

## 5. MongoDB connection

- **`src/config/db.js`** — `connectDatabase(uri)` calls `mongoose.connect(uri)`.
- URI **must** include the database segment (`.../almadot`). No separate `dbName` env fallback is required once the URI carries the path.

---

## 6. Data models (implemented collections)

### 6.1 `users` (`src/models/User.js`)

Aligned with **`client/doc/Almadot-Database-Schema`** **Users** entity:

| Field | Notes |
|-------|--------|
| `_id` | ObjectId |
| `email` | Unique, lowercased, indexed |
| `passwordHash` | Required; **`select: false`** by default |
| `fullName`, `phone`, `address`, `profileImageUrl` | Profile fields |
| `privacy` | Embedded 1:1 object (not a separate collection): `publicDisplayName` (≤ 60 chars, empty → use `fullName`), `emailVisibility`, `phoneVisibility` — each visibility enum: `"everyone"` \| `"logged_in"` \| `"hidden"` (defaults: hidden for email/phone) |
| `membership` | Embedded 1:1 object: `plan` (`"free"` \| `"earth"` \| `"sky"` \| `"sun"`, default `free`), `status` (`"active"` \| `"pending"` \| `"expired"`, default `active`), `startedAt` (default now), `expiresAt` (default `null`). Drives the per-plan listing cap — see §17 |
| `emailVerified` | Boolean (default `false`) |
| `status` | `"active"` \| `"disabled"` \| `"deleted"` |
| `lastLoginAt` | Updated on successful login |
| `createdAt`, `updatedAt` | Mongoose `timestamps` |

**Password flow:** virtual `password` setter hashes via bcrypt in **`pre("validate")`** so validation sees `passwordHash` before save.

**Public profile helpers** (`src/utils/userPrivacy.js`):

| Helper | Purpose |
|--------|---------|
| `buildPublicUserResponse(user, viewerUserId)` | `GET /users/:id` and list — owner sees full doc + `privacy`; others see resolved display name and contact fields only when visibility allows |
| `buildPartyProfile(user, viewerUserId)` | Listing/claim `owner` / `claimer` cards — `fullName` is the **public display name**; optional `email` / `phone` per privacy |

Listing GET routes use optional **`loadSession`** so anonymous vs logged-in viewers get the correct contact visibility.

### 6.2 `sessions` (`src/models/Session.js`)

Aligned with schema **Sessions**:

| Field | Notes |
|-------|--------|
| `_id` | **String** — opaque hex session id (primary key in Mongo) |
| `userId` | Ref to User |
| `csrfToken` | Random opaque token (for future double-submit / header checks) |
| `userAgent`, `ipAddress` | Captured at login |
| `expiresAt` | TTL index **`expireAfterSeconds: 0`** — Mongo removes expired docs |
| `lastActivityAt`, `createdAt` | Audit-friendly timestamps |

### 6.3 `listing_categories` (`src/models/ListingCategory.js`)

Aligned with schema **listing_categories**. Tree depth up to **4 levels** (0–3):

| Level | Role |
|-------|------|
| 0 | Root (`give` / `exchange`) |
| 1 | Category (e.g. Art, **Zakat**) |
| 2 | Subcategory **leaf** for most branches **or** Zakat BDT range (intermediate) |
| 3 | Zakat asset leaf only (e.g. Cycle, Laptop) |

**Most branches** are L1 → L2 leaf. **Zakat** under **Give** alone uses L1 → L2 range → L3 asset.

Listings reference **dynamic leaves** — any active node with **no active children** (`isListingCategoryLeaf` in **`src/utils/categoryTree.js`**), not a fixed level.

> Depth cap is `MAX_CATEGORY_LEVEL` (currently **`3`**). Slug regex and validators derive from that constant.

| Field | Notes |
|-------|--------|
| `_id` | ObjectId |
| `slug` | String, **unique**, kebab-case segments (e.g. `give/zakat/20000-50000-bdt/cycle`). Namespaced per `give/` or `exchange/` root. |
| `name` | Display name (e.g. `Drawings`, `20,000–50,000 BDT`) |
| `parentId` | Ref to `ListingCategory`; `null` for roots, indexed |
| `level` | `0` \| `1` \| `2` \| `3` (matches `MAX_CATEGORY_LEVEL = 3`) |
| `ancestors` | `[ObjectId]` — root → parent path. Invariant: `ancestors.length === level` |
| `listingType` | `"give"` \| `"exchange"` — inherited from the root, indexed |
| `sortOrder`, `isActive` | UI ordering + soft-delete flag |
| `createdAt`, `updatedAt` | Mongoose `timestamps` |

**Invariants enforced by a `pre("validate")` hook** (so they can't be
bypassed by routine `save()` calls):

- `ancestors.length === level`
- `level === 0`  ⇔  `parentId === null`
- `level > 0`    ⇒  `parentId` is required

**Indexes:**

- `slug` unique
- `parentId`, `level`, `listingType`, `isActive` (single field)
- `(listingType, parentId, sortOrder)` compound — drives the "list children
  of X in display order" query the category picker uses
- `ancestors` — for ancestor-based subtree queries

**Static helpers:**

- `ListingCategory.findLeaves({ listingType })` — returns active categories that have **no active children** (dynamic leaves), sorted by `(listingType, sortOrder)`.

**Tree utilities** (`src/utils/categoryTree.js`):

| Function | Purpose |
|----------|---------|
| `categoryHasActiveChildren(categoryId)` | Whether any active child exists |
| `isListingCategoryLeaf(category)` | Valid listing attachment target |
| `categoriesWithLeafFlags(categories)` | Adds **`hasChildren`** and **`isLeaf`** to each `toPublicJSON()` row for API responses |

**Public JSON shape** (`toPublicJSON`) stringifies `_id`, `parentId`, and
every `ancestors[i]` so the client can compare them directly.

### 6.4 Seed: `give` + `exchange` category tree

Run **`npm run seed:categories`** — `src/seed/listingCategories.js` reads
**`src/seed/categoryTree.data.json`** (sourced from `category_list.docx` + **Zakat** nested branch) and
**upserts by slug**. Re-running is idempotent (`_id`s stable).

**JSON shape per listing type:**

| Value shape | Seed behaviour |
|-------------|----------------|
| `string[]` under an L1 name | Flat L2 names → **leaves at level 2** |
| Nested `object` ( **Zakat** only ) | L2 BDT ranges → L3 asset names as leaves |

**Zakat example (Give):** L1 `Zakat` → L2 ranges (`20,000–50,000 BDT`, …) → L3 assets (`Cycle`, `Laptop`, …). Slugs under `give/zakat/…`.

The seed also deactivates orphan self-named L3 nodes from earlier seed runs when cleaning up the Zakat branch.

### 6.5 `listing_locations` (`src/models/ListingLocation.js`)

Bangladesh-style pickup tree (single global tree, not split by give/exchange):

| Level | Role |
|-------|------|
| 0 | Division (root), `parentId: null` |
| 1 | City / district |
| 2 | Area (leaf) — **required** `latitude` / `longitude` (map center; user may drag pin on upload) |

| Field | Notes |
|-------|--------|
| `_id` | ObjectId |
| `slug` | Unique path, e.g. `dhaka/dhaka-metro/gulshan` |
| `name` | Display label |
| `parentId`, `level`, `ancestors` | Same invariants as categories (`ancestors.length === level`) |
| `latitude`, `longitude` | Required on level-2 leaves only |
| `sortOrder`, `isActive` | UI ordering + soft-disable |

**Seed scripts:**

| Command | Purpose |
|---------|---------|
| `npm run seed:locations` | Upsert from **`locationTree.data.json`** |
| `npm run seed:locations:from-doc` | Regenerate JSON from **`location_list.docx`** via `parseLocationDoc.js`, then seed |

Starter/full tree: **8 divisions**, **64 cities**, **540 areas** (districts without sub-areas get a `{City} (general)` leaf).

**API:** see §9.7.3.

### 6.6 `listings` (`src/models/Listing.js`)

Aligned with the **listings** entity in the schema diagram. The upload DFD
(§2 — Upload product) terminates at "INSERT listing row (status: available,
ownerUserId: req.userId)" — i.e. this collection.

| Field | Notes |
|-------|--------|
| `_id` | ObjectId |
| `ownerUserId` | Ref to User; indexed |
| `title` | ≤ 200 chars |
| `listingType` | `"give"` \| `"exchange"`; indexed |
| `imageUrl` | Public URL from `POST /upload/product-image` — controller validates with `isOwnedUploadUrl(url, UPLOAD_KINDS.PRODUCT)` so foreign URLs are rejected |
| `gallery` | `[String]` — optional extra product photos, each also validated against the `/upload/<date>/product/` namespace; capped at 12 |
| `categoryId` | Ref to `ListingCategory`; MUST be a **dynamic leaf** (no active children) AND share the listing's `listingType` |
| `categoryName` | Denormalised leaf name (e.g. `"Chairs"`) — saves a join on read |
| `categoryPath` | Breadcrumb: `"Give > Home & Living > Furniture > Chairs"` — built from `category.ancestors` + name at write time |
| `location`, `story` | `location` is a display string built server-side; `story` capped at 5000 chars |
| `areaId` | Ref to `listing_locations` leaf (required on new creates) |
| `divisionName`, `cityName`, `areaName`, `locationPath` | Denormalized at write time |
| `pickupLatitude`, `pickupLongitude` | Draggable map pin (BD bounds validated) |
| `tags` | `[String]`, ≤ 20 entries, each ≤ 40 chars |
| `specs` | Free-form object (e.g. `{ material: "Oak", dimensions: "..." }`) |
| `exchange.referencePrice` | Number ≥ 0, only persisted for `listingType === "exchange"` |
| `exchange.desiredItems` | `[String]` — exchange listings only. **New listings:** one breadcrumb string from **`interestedCategoryId`** (e.g. `["Exchange > Art > Paintings"]`). Legacy rows may contain free-text item names. |
| `status` | `LISTING_STATUSES`: `available` \| `pending` \| `accepted` \| `completed` \| `rejected` \| `cancelled` — defaults to `"available"` per DFD §2 step 4 |
| `claimedByUserId` | Ref to User; set when owner **accepts** a claim |
| `acceptedClaimId` | Ref to Claim; set on accept — partial unique index on claims enforces one accepted claim per listing |
| `relatedIds` | `[ObjectId]` — optional legacy field on the schema; **not** used by upload/create or **You might also like** (related rows are computed via §9.6.5 / §9.6.6) |
| `createdAt`, `updatedAt` | Mongoose `timestamps` |

**Indexes** (match the three query shapes the UI uses):

- `(listingType, status, createdAt: -1)` — main browse page
- `(ownerUserId, createdAt: -1)` — profile "my listings" panel
- `(categoryId, status, createdAt: -1)` — category-filtered browse
- `(areaId)` — location leaf reference (future server-side area filter)
- plus single-field indexes on `ownerUserId`, `listingType`, `categoryId`, `areaId`, `status`

**`toPublicJSON()`** stringifies every ObjectId (`ownerUserId`, `categoryId`, `areaId`,
nullable claim refs, every entry in `relatedIds`) so the client doesn't have
to coerce them. The internal `_id` is renamed to `id` in the output.

---

## 9.6 Listing API (`/api/v1/listings`)

Maps directly onto **DFD §2 — Upload product**: the protected upload flow on
the client ends with a `POST /listings`, then redirects to a product detail
page that loads via `GET /listings/:id`.

### 9.6.1 `POST /api/v1/listings`

**Middleware chain:** `loadSession → requireAuth → createListing`.

**Body** (JSON):

```json
{
  "title": "Sturdy oak dining chair",
  "listingType": "give",
  "imageUrl": "/upload/2026-05-18/product/<uuid>.webp",
  "gallery": ["/upload/2026-05-18/product/<uuid2>.webp"],
  "categoryId": "<ObjectId of a leaf in listing_categories>",
  "areaId": "<ObjectId of a leaf in listing_locations>",
  "pickupLatitude": 23.7925,
  "pickupLongitude": 90.4078,
  "pickupNotes": "near gate 3",
  "story": "Lovingly used for 6 years; still in great shape.",
  "tags": ["wood", "vintage"],
  "specs": { "material": "Oak" },
  "exchange": {
    "referencePrice": 220,
    "interestedCategoryId": "<ObjectId of exchange-tree leaf>"
  }
}
```

`imageUrl` is required. **`areaId`**, **`pickupLatitude`**, and **`pickupLongitude`** are required on create. Optional **`pickupNotes`** is appended to the server-built **`location`** display string.

The `exchange` block is ignored when `listingType !== "exchange"`. For exchange listings, **`interestedCategoryId`** must be a leaf in the **exchange** category tree; the server stores its breadcrumb in **`exchange.desiredItems`**.

**Success:** `201` — `{ ok, message, listing }`. The persisted document
ships back with `status: "available"`, `ownerUserId: req.userId`,
`categoryName`/`categoryPath` denormalised from the chosen leaf, and an
**`owner`** sub-object populated via **`buildPartyProfile`** (public display
name + avatar; email/phone when privacy allows for the viewer).

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `401` | `UNAUTHENTICATED` | No session cookie |
| `400` | `VALIDATION_ERROR` | Missing/invalid fields. `errors` map per field (e.g. `title`, `imageUrl`, `gallery`, `referencePrice`) |
| `400` | `INVALID_CATEGORY` | `categoryId` does not resolve to an active row |
| `400` | `CATEGORY_NOT_LEAF` | Picked a node that still has active children (listings only attach to leaves) |
| `400` | `CATEGORY_TYPE_MISMATCH` | Listing is `give` but the category is in the `exchange` tree (or vice versa) |
| `400` | `INVALID_AREA` / `AREA_NOT_LEAF` | Bad or non-leaf `areaId` |
| `400` | `INVALID_INTERESTED_CATEGORY` / `INTERESTED_CATEGORY_NOT_LEAF` / `INTERESTED_CATEGORY_TYPE_MISMATCH` | Exchange interested-item category invalid |

### 9.6.2 `GET /api/v1/listings/:id`

Public read used by the product detail page. **`loadSession`** (optional) attaches viewer context for owner privacy. Returns `200` with the listing
(including the populated `owner` sub-object) or `404` `LISTING_NOT_FOUND`
for unknown / malformed ids.

### 9.6.3 `GET /api/v1/listings`

Public browse + profile-panel query. All filters are optional:

| Param | Purpose |
|-------|---------|
| `listingType` | `"give"` \| `"exchange"` |
| `ownerUserId` | Profile **“my listings”** panel and **All listings** modal. When set, **no default status filter** — all statuses returned unless `status` is supplied |
| `categoryId` | Category-filtered browse |
| `status` | Exact status filter (`available`, `pending`, …) |
| `search` | Case-insensitive substring match on `title` |
| `limit` | 1–100, default 24 |
| `offset` | ≥ 0, default 0 |

For **browse** (no `ownerUserId`), default status is `{ $in: ["available", "pending"] }` so completed/claimed items stay out of marketplace search.

Sorted newest-first. Each listing carries the same privacy-aware **`owner`**
sub-object as `GET /:id`.

Response: `{ ok, listings: [...], total, limit, offset }`.

### 9.6.4 `PATCH /api/v1/listings/:id`

Owner-only edit. Idempotent in the sense that PATCHing a field to its
current value is a no-op.

**Middleware chain:** `loadSession → requireAuth → updateListing`.

**Body:** any subset of the create payload. Patchable fields:
`title`, `listingType`, `imageUrl`, `gallery`, `categoryId`, `location`,
`story`, `tags`, `specs`, `exchange`. Any other field returns
`400 FIELD_NOT_PATCHABLE`. Status / ownership / claim pointers cannot be
edited via this route — they move through dedicated flows.

The controller re-runs the create-time invariants on any touched field
(image URL must still live under `/upload/.../product/`, category must
still be a leaf in the matching tree, etc.). When `listingType` flips,
the category is re-validated against the new tree; when `imageUrl` is
replaced, the previous file is best-effort deleted from disk so we don't
accumulate orphans.

**Success:** `200` — `{ ok, message, listing }` with the full updated
document (including the populated `owner`).

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `401` | `UNAUTHENTICATED` | No session cookie |
| `403` | `NOT_OWNER` | Caller is not `listing.ownerUserId` |
| `404` | `LISTING_NOT_FOUND` | Unknown / malformed id |
| `400` | `EMPTY_PATCH` | Body had no patchable fields |
| `400` | `FIELD_NOT_PATCHABLE` | Body included a non-allow-listed key (`status`, `ownerUserId`, …) |
| `400` | `VALIDATION_ERROR` | Field-level validation failed — `errors` is a per-field map |

### 9.6.5 `GET /api/v1/listings/related-by-price`

Product detail **Related products** for **exchange** listings. Registered on the router **before** `GET /:id` so `"related-by-price"` is not parsed as an id.

**Query params:**

| Param | Required | Purpose |
|-------|----------|---------|
| `referencePrice` | yes | Anchor price **P** (non-negative number). Matches listings where `exchange.referencePrice` is in **[P ÷ 2, P × 2]** (inclusive) |
| `excludeId` | no | Mongo listing id to omit (typically the current product) |

**Query shape:** `listingType: "exchange"`, `exchange.referencePrice` between `P/2` and `P×2`, `status` in `available` \| `pending`. Sorted newest-first; **limit 6** (fixed in controller).

**Success:** `200` — `{ ok, listings, referencePrice, minPrice, maxPrice, limit: 6 }` with privacy-aware **`owner`** on each row.

**Errors:** `400` `VALIDATION_ERROR` when `referencePrice` is missing or invalid.

### 9.6.6 `GET /api/v1/listings/related-by-category`

Product detail **You might also like** for **give** listings. Registered **before** `GET /:id`.

**Query params:**

| Param | Required | Purpose |
|-------|----------|---------|
| `categoryId` | yes | Leaf `listing_categories` id — exact match on `listings.categoryId` |
| `excludeId` | no | Mongo listing id to omit (typically the current product) |

**Query shape:** `listingType: "give"`, same `categoryId`, `status` in `available` \| `pending`. Sorted newest-first; **limit 6**.

**Success:** `200` — `{ ok, listings, categoryId, limit: 6 }`.

**Errors:** `400` `VALIDATION_ERROR` when `categoryId` is missing or not a valid ObjectId.

### 9.6.7 `DELETE /api/v1/listings/:id`

Owner-only delete. The row is removed and the primary image + every
gallery image are best-effort deleted from disk (fire-and-forget; the
response is not blocked on the cleanup).

**Middleware chain:** `loadSession → requireAuth → removeListing`.

**Success:** `200` — `{ ok, message }`.

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `401` | `UNAUTHENTICATED` | No session cookie |
| `403` | `NOT_OWNER` | Caller is not `listing.ownerUserId` |
| `404` | `LISTING_NOT_FOUND` | Unknown / malformed id (also returned after a successful delete is repeated) |

---

## 9.7 Categories API (`/api/v1/categories`)

The single endpoint drives the **cascading category picker** on the upload
page (`ListingDetailsForm.jsx`) and the **lazy category filter tree** on the
browse page (`CategoryFilterTree.jsx` in `ProductFiltersSidebar.jsx`).

### 9.7.1 `GET /api/v1/categories`

Public read. Returns the **direct children** of a single parent node — the
endpoint deliberately does **not** flatten the whole tree, because the UI
fetches one level at a time.

**Query params:**

| Param | Required | Purpose |
|-------|----------|---------|
| `listingType` | yes | `"give"` \| `"exchange"` — scopes the result to one tree |
| `parentId` | no | `ObjectId` of the parent category. Omit to receive the level-1 nodes for this tree (the listingType toggle already represents the root, so the UI never lists the level-0 node). |

**Success:** `200` — `{ ok, categories: [...] }`, sorted by `(sortOrder, name)`.
Each row is `ListingCategory.toPublicJSON()` plus **`hasChildren`** and **`isLeaf`** (from **`categoriesWithLeafFlags`**):
`{ id, slug, name, parentId, level, ancestors, listingType, sortOrder, isActive, hasChildren, isLeaf, createdAt, updatedAt }`.

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `400` | `INVALID_LISTING_TYPE` | `listingType` missing or not one of the allowed enums |
| `400` | `INVALID_PARENT_ID` | `parentId` is not a valid `ObjectId` |
| `404` | `PARENT_NOT_FOUND` | `parentId` doesn't exist in this `listingType`'s tree |

**Browse filter note:** Listings store only a **leaf** `categoryId`. `GET /listings?categoryId=` matches that leaf exactly. When the client filters by a parent L1/L2/L3 node, it applies client-side logic on each listing's `categoryPath` breadcrumb (see **`client/doc/AppDoc.md` §8.2**). **Zakat** is the only branch where L2 nodes are intermediate (ranges), not listing targets.

### 9.7.2 `GET /api/v1/categories/:id`

Public read. Returns one active node plus a **`breadcrumb`** chain for edit-form rehydration (supports **Zakat** L3 depth).

**Success:** `200` — `{ ok, category, breadcrumb }` where **`category`** includes **`hasChildren`** / **`isLeaf`**, and **`breadcrumb`** is `[{ id, name, level, isLeaf, hasChildren }, …]` for levels ≥ 1 (root excluded).

**Errors:** `404` `CATEGORY_NOT_FOUND`.

---

## 9.7.3 Locations API (`/api/v1/locations`)

Drives the **Division → City → Area** cascade on upload/edit and **`LocationFilterTree`** on browse.

### `GET /api/v1/locations`

Public read. Returns **direct children** of one parent (no full-tree flatten).

| Param | Required | Purpose |
|-------|----------|---------|
| `parentId` | no | ObjectId of parent. **Omit** → level-0 **divisions**. |

**Success:** `200` — `{ ok, locations: [...] }` sorted by `sortOrder`, `name`. Leaf rows include **`latitude`** / **`longitude`** in `toPublicJSON()`.

**Errors:** `400` `INVALID_PARENT_ID`, `404` `PARENT_NOT_FOUND`.

### `GET /api/v1/locations/:id`

Returns `{ ok, location, breadcrumb }` where **`breadcrumb`** is `[{ id, name, level }, …]` root → node (leaf includes coordinates). Used to rehydrate the edit-listing location cascade.

**Errors:** `404` `LOCATION_NOT_FOUND`.

**Browse filter note:** Client filters by division / city / area on the cached catalog using **`locationPath`**, **`areaId`**, and denormalized **`divisionName` / `cityName` / `areaName`** — see **`client/doc/AppDoc.md` §8.2**.

---

## 9.8 Users API (`/api/v1/users`)

CRUD-style routes on the **`users`** collection. Registration for end users remains on **`POST /auth/register`** (which also issues no session); **`POST /users`** is the same validation without login side effects — useful for admin/scripts.

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| `POST` | `/` | none | `createUser` |
| `GET` | `/` | optional session | `listUsers` — privacy-filtered rows |
| `GET` | `/me/settings` | session | `getMySettings` |
| `PATCH` | `/me/settings` | session | `patchMySettings` |
| `GET` | `/:id` | optional session | `getUser` — privacy-filtered profile |
| `PATCH` | `/:id` | session + owner | `updateUser` |
| `DELETE` | `/:id` | session + owner | `removeUser` |

Routes **`/me/settings`** are registered **before** `/:id` so `"me"` is not parsed as an id.

### 9.8.1 `POST /api/v1/users`

**Body:** `{ fullName, email, phone, address, password, profileImageUrl? }` — same rules as `POST /auth/register`.

**Success:** **`201`** — `{ ok, message, user }` (`user` = `toPublicJSON()`, no `passwordHash`).

**Errors:** `400` `VALIDATION_ERROR`, `409` `EMAIL_TAKEN`. Orphan profile upload cleanup on failure matches register.

Does **not** set a session cookie.

### 9.8.2 `GET /api/v1/users`

Public list of **active** users only (`status: "active"`).

**Query:** `limit` (default 24, max 100), `offset` (default 0), optional `email` (exact match, lowercased).

**Success:** **`200`** — `{ ok, users, total, limit, offset }`. Each row is passed through **`buildPublicUserResponse`** (no `passwordHash`).

### 9.8.3 `GET /api/v1/users/:id`

Public profile read for one **active** user. Optional session cookie determines viewer context for privacy.

**Success:** **`200`** — `{ ok, user }` via **`buildPublicUserResponse`**. Owner viewing self receives full profile + `privacy` object; others receive resolved display name and contact fields only when allowed.

**Errors:** `404` `USER_NOT_FOUND` (invalid id or non-active).

### 9.8.4 `GET /api/v1/users/me/settings`

**Middleware:** `loadSession → requireAuth`.

**Success:** **`200`** — `{ ok, privacy: { publicDisplayName, emailVisibility, phoneVisibility } }`.

### 9.8.5 `PATCH /api/v1/users/me/settings`

Updates embedded **`users.privacy`** for the signed-in user.

**Body:** any subset of `publicDisplayName`, `emailVisibility`, `phoneVisibility`.

**Success:** **`200`** — `{ ok, message, privacy, user }` (`user` = full `toPublicJSON()` for client session refresh).

**Errors:** `400` `VALIDATION_ERROR` \| `EMPTY_PATCH`.

### 9.8.6 `PATCH /api/v1/users/:id`

**DFD §3 — Edit profile.** Owner-only (`req.userId` must equal `:id`).

**Middleware:** `loadSession → requireAuth → updateUser`.

**Patchable fields:** `fullName`, `phone`, `address`, `email`, `profileImageUrl`, `password`. Unknown keys → `400` `FIELD_NOT_PATCHABLE`. Empty body → `400` `EMPTY_PATCH`.

- `profileImageUrl` must pass `isOwnedUploadUrl` for the profile kind; swapping images deletes the previous file best-effort.
- `password` is re-hashed via the User model setter (min 8 chars).
- Duplicate `email` → `409` `EMAIL_TAKEN`.

**Success:** **`200`** — `{ ok, message, user }`.

**Errors:** `401` `UNAUTHENTICATED`, `403` `NOT_OWNER` \| `ACCOUNT_NOT_ACTIVE`, `404` `USER_NOT_FOUND`, validation/conflict codes above.

### 9.8.7 `DELETE /api/v1/users/:id`

Owner-only **soft delete**: sets `status: "deleted"`, calls **`destroyAllSessionsForUser(userId)`**, clears the caller's session cookie, best-effort deletes profile image from disk.

**Success:** **`200`** — `{ ok, message: "Account deleted." }`.

**Errors:** `401`, `403` `NOT_OWNER`, `404` `USER_NOT_FOUND`.

---

## 7. Session service (`src/services/session.service.js`)

| Function | Behavior |
|----------|----------|
| `issueSession({ userId, userAgent, ipAddress })` | Inserts `sessions` row; computes `expiresAt` from `SESSION_TTL_MS` |
| `findActiveSession(sessionId)` | Loads by `_id`; deletes row if past `expiresAt` |
| `destroySession(sessionId)` | Deletes session document |
| `destroyAllSessionsForUser(userId)` | `deleteMany` on all `sessions` for that user (account deletion) |

---

## 8. Middleware

### 8.1 Session (`src/middleware/session.js`)

- **`loadSession`** — Reads cookie `SESSION_COOKIE_NAME`; if valid session exists, attaches **`req.session`** and **`req.userId`**.
- **`requireAuth`** — Returns **`401`** JSON `{ ok: false, code: "UNAUTHENTICATED", ... }` if no session.

### 8.2 Errors (`src/middleware/errorHandler.js`)

- **`notFoundHandler`** — **`404`** for unknown routes.
- **`errorHandler`** — **`500`** (and propagatable status from thrown errors); logs server-side failures.

---

## 9. HTTP API (`/api/v1`)

Base URL pattern: **`/api/v1/auth/...`**

All JSON responses follow a loose convention: **`ok`**, **`message`** or **`code`**, optional **`errors`** for validation.

### 9.1 `POST /api/v1/auth/register`

**DFD §1 — Registration:** persist user in application DB.

**Body:** `{ fullName, email, phone, address, password }`

**Success:** **`201`** — `{ ok: true, message, user }` where `user` is sanitized (no `passwordHash`).

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields |
| `409` | `EMAIL_TAKEN` | Duplicate email |

**Note:** Does **not** create a session cookie (user signs in separately).

---

### 9.2 `POST /api/v1/auth/login`

**DFD §2 — Login:** verify credentials + **create server session** + cookie.

**Body:** `{ email, password }`

**Success:** **`200`** — `{ ok: true, message, user, csrfToken, expiresAt }`
Sets **`Set-Cookie`** for `SESSION_COOKIE_NAME` (**httpOnly**, **SameSite=Lax**, **`Secure`** in production).

Side effect: updates **`users.lastLoginAt`**.

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `400` | `VALIDATION_ERROR` | Invalid payload |
| `404` | `EMAIL_NOT_REGISTERED` | Unknown email |
| `403` | `ACCOUNT_NOT_ACTIVE` | User exists but `status !== "active"` |
| `401` | `WRONG_PASSWORD` | Bad password |

---

### 9.3 `GET /api/v1/auth/me`

**DFD §3 — Load profile shell / session restore:** cookie-bound identity.

**Middleware:** `loadSession` → `requireAuth`

**Success:** **`200`** — `{ ok: true, user, csrfToken, expiresAt }`

The **`user`** document supplies the profile UI shell on the client (`fullName`, `email`, `phone`, `address`, `profileImageUrl`). The client normalizes this into React state via **`AuthContext`**; it does **not** embed listing ids — listings are loaded separately (see **`GET /listings?ownerUserId=…`** below).

**Failure:** **`401`** — `UNAUTHENTICATED`

If user row missing or inactive: clears cookie + deletes stale session doc where applicable.

---

### 9.4 `POST /api/v1/auth/logout`

**DFD §3 — Destroy session.**

**Middleware:** `loadSession` (optional cookie)

**Success:** **`200`** — `{ ok: true, message }`; clears session cookie; deletes DB session if present.

Idempotent when already logged out.

---

### 9.4a Forgot-password (OTP) — DFD §1.4–§1.5

Three public endpoints implement the **forgot → verify → reset** flow. The
one-time code is **always delivered by email** (channel `"email"`) using the
same SMTP transport as the contact form (`src/services/mail.service.js`).

Backed by the **`otps`** collection (`src/models/Otp.js`): `userId`, `email`,
`codeHash` (bcrypt, `select: false`), `purpose` (`password_reset`), `channel`,
`expiresAt` (**TTL index** — auto-removed after 10 min), `attempts` /
`maxAttempts` (5), `verifiedAt`, `consumedAt`, `resetToken`
(`select: false`), `ipAddress`.

#### `POST /api/v1/auth/forgot-password`

**Body:** `{ email }`. Looks up the **active** user, deletes any prior
outstanding reset codes, issues a fresh 6-digit code (hashed), and emails it.
A 60s resend cooldown guards against spam.

**Success:** `200` — `{ ok, message, expiresInMinutes }`.

| Status | `code` | When |
|--------|--------|------|
| `400` | `VALIDATION_ERROR` | Missing / invalid email |
| `404` | `EMAIL_NOT_REGISTERED` | No active account for that email |
| `429` | `OTP_RESEND_TOO_SOON` | A code was issued < 60s ago (`retryInSeconds`) |
| `503` | `EMAIL_NOT_CONFIGURED` | SMTP not configured (the stored code is rolled back) |

#### `POST /api/v1/auth/verify-reset-otp`

**Body:** `{ email, code }`. Verifies the latest unconsumed code (expiry +
per-code attempt cap). On success mints a single-use **`resetToken`** so the
raw code is never resubmitted.

**Success:** `200` — `{ ok, message, resetToken }`.

| Status | `code` | When |
|--------|--------|------|
| `400` | `VALIDATION_ERROR` | Missing email / code |
| `400` | `OTP_EXPIRED` | No active code / past `expiresAt` |
| `400` | `OTP_INVALID` | Wrong code (`attemptsRemaining` returned) |
| `429` | `OTP_MAX_ATTEMPTS` | Attempt cap reached — code invalidated |

#### `POST /api/v1/auth/reset-password`

**Body:** `{ email, resetToken, password }` (password ≥ 8 chars). Exchanges a
verified `resetToken` for a new bcrypt password hash, deletes the consumed
code, and **revokes every existing session** for the user
(`destroyAllSessionsForUser`).

**Success:** `200` — `{ ok, message }`.

| Status | `code` | When |
|--------|--------|------|
| `400` | `VALIDATION_ERROR` | Missing fields / weak password |
| `400` | `RESET_TOKEN_INVALID` | Unknown / unverified / expired token |

---

## 9.5 Upload API (`/api/v1/upload`)

Image uploads are handled as a **two-step flow**:

1. Client POSTs the file to `/api/v1/upload/<kind>-image` (multipart/form-data, field name **`image`**).
2. Server replies with a **public URL** (e.g. `/upload/2026-05-18/profile/<uuid>.webp`).
3. Client passes that URL along with the JSON payload that actually owns it
   (e.g. `POST /auth/register` for a profile image). The owning controller
   validates the URL is one we minted (`isOwnedUploadUrl`) before persisting
   it.

**Why two steps?** Keeps the auth/listing endpoints JSON-only; isolates file
handling concerns; and lets a single multer + sharp pipeline serve both kinds.

### 9.5.1 Storage rules

- **Storage root:** `UPLOAD_DIR` (default `server/upload/`). gitignored.
- **Layout:** `<UPLOAD_ROOT>/<UTC YYYY-MM-DD>/<kind>/<uuid>.webp`.
- **Date:** taken via `new Date().toISOString().slice(0,10)` so all instances of
  the API land in the same folder regardless of host timezone.
- **Kinds:** `profile`, `product` (listing upload uses `product`; profile uses `profile`).
- **Re-encoding:** `sharp` rotates by EXIF, fits the image into a 1600×1600 box
  (no upscaling), strips metadata, and writes WebP at quality 82. The original
  bytes never touch disk.
- **Filename:** `crypto.randomUUID()` only — no user id, no original filename.
- **Public access:** Express `static` is mounted at `PUBLIC_UPLOAD_PATH`
  (default `/upload`) with a 7-day immutable cache header. URLs stored in
  Mongo are **relative** so the prefix can be swapped later (e.g. for S3).

### 9.5.2 `POST /api/v1/upload/profile-image`

**Auth:** **none** (must be callable from the registration page where no
session exists yet).

**Middleware chain:** `singleImage("image")` → `multerErrorHandler` →
`uploadProfileImage`.

**Body:** `multipart/form-data` with single field `image` (JPG / PNG / WebP /
GIF, ≤ `MAX_UPLOAD_BYTES`).

**Success:** **`201`** — `{ ok: true, url, bytes }`.

**Errors:**

| Status | `code` | When |
|--------|--------|------|
| `400` | `NO_FILE` | No `image` field on the body |
| `400` | `UNEXPECTED_FILE` | More than one file attached |
| `413` | `FILE_TOO_LARGE` | Body exceeds `MAX_UPLOAD_BYTES` |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Mime type outside the allow-list |

### 9.5.3 `POST /api/v1/upload/product-image`

**Auth:** **`requireAuth`** — product listings are owner-scoped.

Same body, response shape, and error codes as `/profile-image`, but stores
the file under `<date>/product/<uuid>.webp`. Used by the upload and **edit
listing** flows before `POST` / `PATCH /listings`.

### 9.5.4 Register integration

`POST /auth/register` now accepts an **optional** `profileImageUrl` string.
Behavior:

- Empty / missing → user is created with no avatar (existing behavior).
- Present → must be a URL the server minted from `/upload/profile-image`
  (validated by `isOwnedUploadUrl`, which checks the prefix, the date shape,
  the kind segment, and rejects path-traversal characters). A foreign URL
  produces `VALIDATION_ERROR` with `errors.profileImageUrl`.
- If registration fails after the upload succeeded (validation, duplicate
  email, Mongo error), the orphaned image is deleted from disk via
  `deleteStoredImage`. Cleanup is best-effort and never blocks the error
  response.

---

## 10. Application bootstrap (`src/index.js`)

- Loads **`dotenv/config`** first.
- **`trust proxy`** — `1` hop (correct `req.ip` behind reverse proxy).
- **CORS** — **`CLIENT_ORIGIN`** (comma-separated origins allowed) + **`credentials: true`**. In **development**, any **`http://localhost:<port>`** origin is permitted so Vite dev-server port fallback does not break cookie auth.
- **`cookieParser()`**, **`express.json({ limit: "1mb" })`**.
- **Static `PUBLIC_UPLOAD_PATH`** — serves `UPLOAD_ROOT` with `maxAge: "7d"` + `immutable`, `fallthrough: false`.
- Routes mounted at **`/api/v1/auth`**, **`/api/v1/users`**, **`/api/v1/upload`**, **`/api/v1/categories`**, **`/api/v1/locations`**, **`/api/v1/listings`**, **`/api/v1/claims`**, **`/api/v1/notifications`**.
- Global **404** then **error** middleware after routes.

---

## 11. Frontend integration notes

Browsers only send cookies cross-origin when:

1. Server responds with **`Access-Control-Allow-Credentials: true`** (handled by `cors`).
2. **`Access-Control-Allow-Origin`** reflects the requesting origin when allowed — not `*` — matching **`CLIENT_ORIGIN`** (plus localhost ports in dev).
3. Client `fetch` uses **`credentials: "include"`** (implemented in **`client/src/api/client.js`**).

The **`csrfToken`** returned by login/me is reserved for future **state-changing** routes (POST/PUT/PATCH/DELETE) — not yet enforced globally on this API.

### 11.1 Profile page (DFD §3 — client wiring)

The **`client`** profile route (`/profile`) is auth-gated. It maps onto these API endpoints:

| DFD process | Client behavior | API |
|-------------|-----------------|-----|
| Load profile shell | `AuthContext` bootstrap on app load + protected route | `GET /auth/me` |
| Edit profile | `EditProfileModal` → `AuthContext.updateProfile` | `PATCH /users/:id` (+ optional `POST /upload/profile-image`) |
| Privacy settings | `ProfileSettingsSection` → `AuthContext.updatePrivacySettings` | `GET/PATCH /users/me/settings` |
| Dashboard analytics | `ProfileHero` listing stat cards | `GET /listings?ownerUserId=…&limit=1` (+ `status=pending` for pending count) |
| Profile actions (Give / Exchange / Logout) | Deep-links to `/upload?mode=…`; logout button | `POST /auth/logout` (session destroy) |
| Listings preview | `ProfileListingsPanel` active tab (6 newest) | `GET /listings?ownerUserId=<user.id>&limit=6` |
| All listings table | `AllListingsTableModal` | `GET /listings?ownerUserId=…&search=…&status=…&limit=20&offset=…` |
| Edit / delete listing | Card modal or table slide panel | `PATCH /listings/:id`, `DELETE /listings/:id` (+ optional product image upload) |
| Owner portfolio modal | `OwnerPortfolioModal` on product detail | `GET /users/:ownerId` |

**Notes:**

- Profile identity fields come from the session-backed **`user`** payload (`GET /auth/me` / login / successful **`PATCH /users/:id`** or **`PATCH /users/me/settings`**). No demo profile fallback on `/profile`.
- Owner listing queries omit the browse default status filter so the profile panel and table modal can show all listing statuses.
- Give / Exchange actions reuse the upload flow (`POST /listings` after product image upload). **Edit listing** reuses listing category, **location cascade + map pin**, and exchange **Interested Item** category fields.

See **`client/doc/AppDoc.md` §9.3** for sidebar in-page navigation (`#dashboard`, `#listings`, `#claims`, `#settings`, `#account`, …).

### 11.2 Browse page (filters)

| UI | API / behavior |
|----|----------------|
| Location tree | `GET /locations` + `parentId` — lazy Division → City → Area; filter client-side |
| Category tree (Give / Exchange) | `GET /categories?listingType=give\|exchange&parentId=…` — lazy L1 → L2 → (optional L3 for **Zakat**); rows include **`isLeaf`** / **`hasChildren`** |
| Edit listing category rehydration | `GET /categories/:id` → `{ category, breadcrumb }` |
| Parent / leaf category filter | Client-side on catalog snapshot (`categoryPath` + `categoryId`); see AppDoc §8 |
| Parent / leaf location filter | Client-side (`locationPath`, `areaId`, division/city/area names); see AppDoc §8 |
| Price (Credits) slider | Client-side cap on `referencePrice` (`0`–`100`, `100` = no cap); give rows hidden when cap &lt; 100 |
| Exchange cards | Display `referencePrice` as “Est. $…” via `exchangePriceLabel` |

### 11.2.1 Product detail — related listings

| Listing type | API | Match rule (server) | Client helper |
|--------------|-----|----------------------|---------------|
| Exchange | `GET /listings/related-by-price?referencePrice=…&excludeId=…` | `referencePrice` in **[P÷2, P×2]** | `fetchRelatedListingsByPrice` |
| Give | `GET /listings/related-by-category?categoryId=…&excludeId=…` | Same leaf `categoryId` | `fetchRelatedListingsByCategory` |

See **`client/doc/AppDoc.md` §8.3** (`ProductRelatedSection`). Does not read or write `relatedIds`.

### 11.3 Claims & notifications (client wiring)

| UI | API |
|----|-----|
| Submit give / exchange | `POST /claims` from product detail modal |
| Owner review (profile + modal) | `GET /claims?role=owner&pendingReview=true&…` + `PATCH /claims/:id` |
| Your claims modal (claimer) | `GET /claims?role=claimer&…` + `PATCH` cancel |
| Listing-scoped owner modal | `GET /claims?listingId=…&pendingReview=true&…` |
| Negotiation chat | `GET/POST /claims/:id/messages` |
| Notification bell | `GET /notifications`, `GET /notifications/unread-count`, mark read |
| Deep link after message | Client navigates to `/profile?negotiate=<claimId>#claims` |

See **`client/doc/AppDoc.md` §9.5** for component-level behaviour (preview limits, modal pagination, chat variants).

---

## 12. Not implemented yet (backend)

These appear in schema / DFD docs but have **no** routes or models wired in **`server`** yet:

- **Audit logs** writes on auth events (claim flows may write audit rows; general auth audit not wired).
- **Email / push** delivery for notifications — rows are created with `channel: "in_app"` only.
- **CSRF middleware** enforcing `CSRF_HEADER_NAME` on mutating endpoints.
- **Admin write API** for categories or locations — read-only `GET` endpoints only; mutations via seed scripts.
- **Server-side browse filter** by `areaId` or location subtree — client filters the `limit=100` catalog snapshot today.
- **Periodic cleanup** for orphaned uploads (failed registrations and abandoned listing drafts) — current cleanup runs only on the synchronous register / PATCH / DELETE failure paths.
- **Membership activation / expiry** — `POST /membership/orders` only records a `pending` order; flipping `users.membership.plan` to the purchased tier (and confirming the order) is done out-of-band (DB / script). No payment gateway, no admin approval UI, and no scheduled job downgrades plans when `membership.expiresAt` passes — see §17.

---

## 13. Dependency summary (`package.json`)

| Package | Role |
|---------|------|
| `express` | HTTP server |
| `mongoose` | MongoDB ODM |
| `bcrypt` | Password hashing |
| `cookie-parser` | Parse `Cookie` header |
| `cors` | CORS policy |
| `dotenv` | Load `.env` |
| `multer` | Parse `multipart/form-data` uploads (memory storage) |
| `sharp` | Image re-encoding to WebP + EXIF strip + resize |
| `nodemon` (dev) | Restart on file changes |

---

## 14. Changelog-style summary

| Area | Implemented |
|------|-------------|
| MERN backend skeleton | Express + Mongoose + env-based Mongo URI |
| Health endpoint | `GET /health` |
| User registration | `POST /api/v1/auth/register` + `users` model |
| User login | `POST /api/v1/auth/login` + bcrypt verify + `sessions` model |
| Cookie session | httpOnly session id cookie + TTL-backed `sessions` docs |
| Session restore | `GET /api/v1/auth/me` |
| Logout | `POST /api/v1/auth/logout` |
| MVC structure | routes → controllers → models/services |
| Error handling | Central JSON errors + validation/conflict responses |
| Image uploads | `POST /api/v1/upload/profile-image` + `/product-image` — multer + sharp → WebP, `<date>/<kind>/<uuid>.webp` |
| Static uploads | `app.use("/upload", express.static(UPLOAD_ROOT))` |
| Register integration | `profileImageUrl` accepted on `/auth/register`, validated via `isOwnedUploadUrl`, orphan cleanup on failure |
| Listing categories | `listing_categories` model (`MAX_CATEGORY_LEVEL = 3`) + seed from `categoryTree.data.json` including **Zakat** nested branch (`npm run seed:categories`) |
| Category tree utils | `src/utils/categoryTree.js` — dynamic leaf detection; API **`hasChildren`** / **`isLeaf`** |
| Categories API | `GET /api/v1/categories?listingType=…&parentId=…` + `GET /api/v1/categories/:id` — upload, interested-item, browse trees, edit rehydration |
| Listing locations | `listing_locations` model + seed from `locationTree.data.json` (`npm run seed:locations`, `seed:locations:from-doc`) |
| Locations API | `GET /api/v1/locations`, `GET /api/v1/locations/:id` — upload/edit + browse `LocationFilterTree` |
| Listings | Structured pickup (`areaId`, `locationPath`, `pickupLatitude`/`pickupLongitude`); exchange `interestedCategoryId` → `desiredItems` breadcrumb |
| Listings CRUD | `POST` / `GET` / `PATCH` / `DELETE /api/v1/listings` — fulfils DFD §2 upload flow |
| Owner edit / delete | `PATCH /api/v1/listings/:id` and `DELETE /api/v1/listings/:id` (owner-gated); image cleanup on image-swap + delete |
| Listing reads carry owner | `GET /listings` and `GET /listings/:id` embed privacy-aware `owner` via `buildPartyProfile` |
| Users API | `POST/GET /users`, `GET/PATCH/DELETE /users/:id`, `GET/PATCH /users/me/settings` — profile read/update, privacy, soft delete |
| Profile page integration (DFD §3) | Dashboard analytics, 6-card preview, all-listings modal, account info, privacy settings, owner portfolio modal |
| Browse filters (client) | Lazy category tree; parent L1/L2 via `categoryPath`; price slider filters exchange `referencePrice` client-side |
| Related listings API | `GET /listings/related-by-price` (exchange: price range P÷2…P×2) + `GET /listings/related-by-category` (give: same leaf category; 6 results each; product detail) |
| Claims & exchange (DFD §4) | `Claim` / `ClaimMessage` / `Notification` / `AuditLog` models; `POST/GET/PATCH /api/v1/claims`; negotiation messages; notification read API |
| Claim UI (client) | Profile claims panel (owner + claimer modals), product detail submit/status/portfolio — see **`client/doc/AppDoc.md` §9.5** |

---

## 15. Claims & exchange API (`/api/v1/claims`) — DFD §4

All routes require **`loadSession` + `requireAuth`**.

Route order in **`claim.routes.js`**: `GET /:id/messages` and `POST /:id/messages` are registered **before** `GET /:id` so `"messages"` is not parsed as an id.

### 15.1 Data models (claims)

**`claims`** (`src/models/Claim.js`) — unified give claims and exchange proposals:

| Field | Notes |
|-------|--------|
| `listingId`, `ownerUserId`, `claimerUserId` | Indexed; owner id denormalised for inbox queries |
| `type` | `give_claim` \| `exchange_proposal` |
| `message`, `offeredItem` | Optional note; exchange offers `{ title, imageUrl?, notes? }` |
| `status` | `submitted` → `pending` / `accepted` / `rejected` / `completed` / `cancelled` |
| `ownerDecisionAt`, `completedAt` | Set by review / complete flows |

**`NEGOTIABLE_CLAIM_STATUSES`:** `submitted`, `pending`, `accepted` — negotiation chat allowed.

**`claim_messages`** (`src/models/ClaimMessage.js`) — threaded negotiation (replaces the earlier **`counter`** PATCH action):

| Field | Notes |
|-------|--------|
| `claimId`, `senderUserId` | Required |
| `body` | ≤ 2000 chars |
| `createdAt` | Ascending sort for chat UI |

### 15.2 `POST /api/v1/claims`

Submit a **Give claim** or **Exchange proposal** (DFD process 1).

**Body**

| Field | Required | Notes |
|-------|----------|-------|
| `listingId` | yes | Target listing (must be `available` or `pending`) |
| `message` | no | Free-form note |
| `offeredItem.title` | yes for exchange | Offered item title |
| `offeredItem.imageUrl` | no | Must be a server-minted product upload URL |
| `offeredItem.notes` | no | Extra context |

**Success:** `201` — `{ ok, message, claim }` (includes `owner` / `claimer` summaries).

**Side effects (transaction):** INSERT `claims`; if listing was `available` → `pending`; INSERT `notifications` for owner (`claim_submitted`); INSERT `audit_logs`.

**Errors:** `403 SELF_CLAIM_FORBIDDEN`, `409 LISTING_NOT_CLAIMABLE`, `409 DUPLICATE_OPEN_CLAIM`, `404 LISTING_NOT_FOUND`.

### 15.3 `GET /api/v1/claims`

**Query:**

| Param | Purpose |
|-------|---------|
| `listingId` | **or** `role=owner\|claimer` (required scope) |
| `role` | Owner inbox across all listings, or claimer's own rows |
| `status` | Exact status filter |
| `claimType` | `"give_claim"` \| `"exchange_proposal"` (aliases `give`, `exchange`) |
| `search` | Case-insensitive match on related listing title |
| `pendingReview` | `"true"` → `{ status: { $in: ["submitted", "pending"] } }` (owner review queue) |
| `receivedFrom`, `receivedTo` | `YYYY-MM-DD` — filters `createdAt` (UTC day bounds) |
| `limit`, `offset` | Pagination (default limit 24, max 100) |

- `?listingId=…` — owner sees all claims on the listing; other users see only their own.
- `?role=owner` — inbox for listings you own.
- `?role=claimer` — claims you submitted.

Sorted **`createdAt` descending**. Response: `{ ok, claims, total, limit, offset }`. Each claim includes **`listingTitle`** (when resolved) and privacy-aware **`owner`** / **`claimer`** party objects.

### 15.4 `GET /api/v1/claims/:id`

Single claim; caller must be owner or claimer. Includes populated party summaries.

### 15.5 `GET /api/v1/claims/:id/messages`

Negotiation thread for the claim. Caller must be owner or claimer.

**Success:** `200` — `{ ok, messages: [...] }` (oldest first).

**Errors:** `403 FORBIDDEN`, `404 CLAIM_NOT_FOUND`.

### 15.6 `POST /api/v1/claims/:id/messages`

**Body:** `{ body: string }` (required, ≤ 2000 chars).

**Success:** `201` — `{ ok, message }` (the created row).

**Side effects:** INSERT `claim_messages`; INSERT in-app **`claim_message`** notification for the other party with `navigateSearch` deep-link (`?claims=owner|status&negotiate=<claimId>`).

**Errors:** `403 FORBIDDEN`, `404 CLAIM_NOT_FOUND`, `409 CLAIM_NOT_NEGOTIABLE` (terminal / rejected claim).

### 15.7 `PATCH /api/v1/claims/:id`

**Body:** `{ action, message? }`

| `action` | Who | DFD |
|----------|-----|-----|
| `accept` | listing owner | §4.2 — sets claim + listing `accepted`, rejects other open claims, sets `claimedByUserId` / `acceptedClaimId`, notifies claimer |
| `reject` | listing owner | §4.2 — rejects claim; listing may revert to `available` if no open claims remain |
| `complete` | owner or claimer | §4.3 — terminal `completed` on claim + listing |
| `cancel` | claimer | withdraw open claim before decision |

> **Note:** The earlier **`counter`** owner action was removed in favour of **`POST /:id/messages`** negotiation chat.

**Success:** `200` — `{ ok, message, claim, listing }`.

Accept uses a **MongoDB transaction** (partial unique index: one `accepted` claim per listing).

---

## 16. Notifications API (`/api/v1/notifications`) — DFD §4.4

All routes require **`loadSession` + `requireAuth`**.

Rows are written during claim submit, accept/reject/complete, and negotiation messages. Types: `claim_submitted`, `claim_accepted`, `claim_rejected`, `claim_message`, `claim_completed`, `listing_updated`.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/unread-count` | `{ ok, unreadCount }` for header badge |
| `GET` | `/` | List for signed-in user — `limit` (default 30, max 50), `offset`, optional `unreadOnly=true` |
| `PATCH` | `/:id/read` | Mark one notification read (owner-scoped) |
| `PATCH` | `/read-all` | Mark all read for user |

Each notification may include `relatedListingId`, `relatedClaimId`, and **`navigateSearch`** (query string for client deep links). The client maps these in **`utils/notificationNavigation.js`** — e.g. `claim_message` → `/profile?negotiate=<claimId>#claims`.

---

## 17. Membership API (`/api/v1/membership`)

Tiered membership: every user defaults to **Free** and can request a paid plan (**Earth** / **Sky** / **Sun**) via **direct bank transfer**. There is no payment gateway or admin UI yet, so a purchase only records a **pending order** — the user's plan is activated later out-of-band (DB / script).

### 17.1 Plan catalog (`src/config/membership.js`)

Single source of truth for plan keys, prices, and the listing cap enforced on `POST /listings`:

| Plan | Price (BDT) | Listing cap |
|------|-------------|-------------|
| `free` | 0 | 20 |
| `earth` | 500 / yr | 200 |
| `sky` | 1,000 / yr | 500 |
| `sun` | 2,000 / yr | unlimited (`null`) |

Helpers: `isValidPlan`, `isPaidPlan`, `getPlanListingLimit` (null = unlimited), `getPlanPriceBdt`.

### 17.2 Data model changes

- **`users.membership`** (embedded, `src/models/User.js`): `plan` (enum, default `free`), `status` (`active`/`pending`/`expired`, default `active`), `startedAt`, `expiresAt` (default null). Normalised in `toPublicJSON()` so `/auth/me` always returns it.
- **`membership_orders`** (`src/models/MembershipOrder.js`): `userId`, `plan`, `amountBdt`, `paymentMethod: "bank_transfer"`, `bankTransfer { accountName, senderReference, transferDate, note }`, `status` (`pending`/`confirmed`/`rejected`, default `pending`), timestamps.

### 17.3 Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/plans` | none | Public plan catalog for the membership page + checkout |
| `POST` | `/orders` | session | Record a pending bank-transfer purchase for a paid plan. Validates `plan` is paid; sets `amountBdt` from the catalog; does **not** change `users.membership` |
| `GET` | `/orders` | session | Current user's orders, newest first (profile pending banner) |
| `GET` | `/orders/:id` | session + owner | Single order for the receipt page |

**`POST /orders` errors:** `400 VALIDATION_ERROR` (bad/free `plan`, missing `accountName` / `senderReference`, invalid `transferDate`).
**`GET /orders/:id` errors:** `404 ORDER_NOT_FOUND`, `403 NOT_OWNER`.

### 17.4 Listing cap enforcement (`createListing`)

`POST /listings` loads the owner's `membership.plan`, resolves the cap via `getPlanListingLimit`, and counts the user's existing listings (`countDocuments({ ownerUserId })`). When the cap is reached it returns **`403 LISTING_LIMIT_REACHED`** with `details { plan, limit, current }`. Deleting a listing frees a slot; the Sun plan (`null` limit) skips the check.

---

*Last updated: 2026-06-01 — Membership tiers (Free/Earth/Sky/Sun): embedded `users.membership`, `membership_orders` collection, `/api/v1/membership` plans + bank-transfer orders, and per-plan listing cap on `POST /listings` (`LISTING_LIMIT_REACHED`). Previously: `MAX_CATEGORY_LEVEL = 3`; Zakat nested seed (L1 → BDT range → asset); dynamic leaf validation via `isListingCategoryLeaf`; category API `hasChildren`/`isLeaf`; `GET /categories/:id` breadcrumb endpoint.*
