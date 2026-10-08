# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

**Green Barter** (repo `greanbarter`; internal/legacy codename **Almadot**, also "The Regenerative Exchange") is a Bangladesh-focused barter marketplace. Users **give** items away or **exchange** them, claim/propose on listings, negotiate via chat, and get in-app notifications. Paid membership tiers raise the per-user listing cap.

The codename `almadot` still appears in package names, the Mongo DB name, the session cookie (`almadot.sid`), and docs — don't rename these casually; user-facing branding is "Green Barter".

## Monorepo layout

| Dir | What | Port |
|-----|------|------|
| `client/` | Public React SPA (Vite 6, React 19, React Router 7, Tailwind 3, JSX only — no TypeScript) | 5173 |
| `admin/` | Separate admin dashboard SPA (same stack + Recharts) | 5174 |
| `server/` | REST API — Node ES modules, Express 5, Mongoose 9, MongoDB | 3000 |

There is no root `package.json`; run commands inside each package directory.

## Commands

```bash
# server/
npm run dev                 # nodemon src/index.js
npm start                   # node src/index.js
npm run seed:reference      # seed:categories + seed:locations (idempotent, upsert by slug)
npm run seed:categories     # from src/seed/categoryTree.data.json
npm run seed:locations      # from src/seed/locationTree.data.json
npm run seed:admin          # create admin user
npm run seed:import-listings

# client/ and admin/
npm run dev | build | preview | lint
```

There is no test suite. Verify changes with `npm run lint` (client/admin) and by running the app. Health check: `GET http://localhost:3000/health`.

## Environment

- `server/.env`: `PORT`, `MONGODB_URI` (**must include the DB name in the path**, e.g. `mongodb://localhost:27017/almadot?retryWrites=false`), `CLIENT_ORIGIN`, `ADMIN_ORIGIN`, `NODE_ENV`, `SESSION_COOKIE_NAME`, `SESSION_TTL_DAYS`, `CSRF_HEADER_NAME`, `UPLOAD_DIR`, `PUBLIC_UPLOAD_PATH`, `MAX_UPLOAD_BYTES`, plus SMTP settings (used for contact form + password-reset OTP email).
- `client/.env`: `VITE_API_URL` (must end in `/api/v1`), `VITE_GOOGLE_MAPS_API_KEY` (optional; pickup map falls back to text). Restart Vite after changing env.
- CORS uses credentials, so origins are pinned (never `*`). In dev any `http://localhost:<port>` is allowed. Use `localhost`, not `127.0.0.1`, or cookies break.

## Documentation (read before larger changes)

- [client/doc/AppDoc.md](client/doc/AppDoc.md) — front-end architecture, routes, contexts, components, file index.
- [server/doc/BackendImplementation.md](server/doc/BackendImplementation.md) — models, every endpoint with request/response shapes and error `code`s.
- [client/doc/Almadot-Database-Schema.mmd](client/doc/Almadot-Database-Schema.mmd) — Mermaid ER diagram of all collections.
- [client/doc/ApplicationFeatureRequirements.md](client/doc/ApplicationFeatureRequirements.md) — original product requirements (DFD §1–§4). **Partly outdated**: it describes a `localStorage` front-end and auto-login after register; the implemented system uses server sessions and register → explicit login. Treat AppDoc/BackendImplementation as the source of truth for current behaviour.

When you change behaviour covered by these docs, update the relevant doc (and its "Last updated" footer) in the same change. The docs reference DFD sections (§1 auth, §2 upload, §3 profile, §4 claims/notifications) — keep that numbering.

## Server architecture

`src/index.js` → `routes/*.routes.js` → `controllers/*.controller.js` → `models/` + `services/`. Mounted under `/api/v1`: `auth`, `users`, `upload`, `categories`, `locations`, `listings`, `claims`, `notifications`, `membership`, `contact`, `admin`. Static uploads served at `/upload`.

Conventions:
- JSON responses: `{ ok, message | code, errors? }`. Errors carry a SCREAMING_SNAKE `code` (e.g. `VALIDATION_ERROR`, `NOT_OWNER`, `LISTING_LIMIT_REACHED`) and a per-field `errors` map for validation. The client relies on these codes — don't change them without updating the client.
- Models expose `toPublicJSON()` which stringifies ObjectIds and renames `_id` → `id`. Never leak `passwordHash` / `codeHash` / `resetToken` (`select: false`).
- PATCH endpoints use an allow-list → `FIELD_NOT_PATCHABLE` / `EMPTY_PATCH`. Status/ownership/claim pointers on listings only change via the claims flow.
- Register static sub-paths (`/me/settings`, `/related-by-price`, `/related-by-category`, `/:id/messages`) **before** `/:id` routes.
- Owner-only actions check `req.userId` and return `403 NOT_OWNER`.

Auth & sessions:
- Server-side sessions in the `sessions` collection (TTL index) + httpOnly cookie `almadot.sid` (SameSite=Lax, Secure in prod). Middleware: `loadSession` (optional) then `requireAuth`.
- Public GETs on listings/users use optional `loadSession` so privacy rules (`users.privacy.*Visibility`: `everyone|logged_in|hidden`) apply per viewer via `utils/userPrivacy.js` (`buildPublicUserResponse`, `buildPartyProfile`).
- Forgot password: emailed 6-digit OTP (`otps`, 10-min TTL, 5 attempts, 60s resend cooldown) → single-use `resetToken` → reset revokes all sessions.
- `csrfToken` is returned on login/me but **not enforced** yet.
- Admins are a **separate** `admins` collection with their own sessions (`adminSession.*`) and RBAC (`config/rbac.js`: `super_admin | admin | moderator`, `resource:action` permissions checked by `requirePermission`). Don't mix admin and end-user auth.

Uploads (two-step):
1. `POST /upload/profile-image` (no auth, for registration) or `/upload/product-image` (auth), multipart field `image`.
2. multer (memory) → sharp → WebP, stored at `upload/<UTC YYYY-MM-DD>/<profile|product>/<uuid>.webp`; returns a **relative** URL.
3. The owning endpoint validates the URL with `isOwnedUploadUrl(url, kind)` before saving. Replaced/deleted images and orphans from failed registration are best-effort removed with `deleteStoredImage`.

Domain rules:
- **Categories** (`listing_categories`): separate `give` / `exchange` trees, levels 0–3 (`MAX_CATEGORY_LEVEL = 3`), invariant `ancestors.length === level`. Listings attach only to **dynamic leaves** (active node with no active children — `isListingCategoryLeaf`), and the category's `listingType` must match the listing's. Most branches are L1 → L2 leaf; **Zakat** (Give only) is L1 → BDT range → L3 asset. API rows include `hasChildren` / `isLeaf`.
- **Locations** (`listing_locations`): Division (0) → City (1) → Area (2, leaf with lat/lng). Listings require a leaf `areaId` plus pickup coordinates (BD bounds).
- **Listings** denormalize `categoryName`, `categoryPath`, `divisionName`/`cityName`/`areaName`/`locationPath`, and build `location` server-side. Exchange listings store `exchange.referencePrice` and convert `interestedCategoryId` → a one-element `exchange.desiredItems` breadcrumb. Status: `available | pending | accepted | completed | rejected | cancelled`. Browse defaults to `available|pending`; `ownerUserId` queries return all statuses.
- **Claims** (`give_claim | exchange_proposal`): status `submitted → pending | accepted | rejected | completed | cancelled`. Submit/accept/reject/complete run in **Mongo transactions** in `services/claim.service.js` and write `notifications` + `audit_logs`. One accepted claim per listing (partial unique index); accept rejects other open claims. No self-claims, no duplicate open claim. Negotiation is via `claim_messages` (≤ 2000 chars) while status is `submitted|pending|accepted` — the old `counter` action is gone.
- **Membership**: `config/membership.js` is the single source of truth — `free` 20 listings, `earth` 200 (500 BDT/yr), `sky` 500 (1000), `sun` unlimited (2000). `POST /listings` enforces the cap → `403 LISTING_LIMIT_REACHED`. Orders are bank-transfer only and stay `pending`; plan activation is out-of-band.
- Transactions require a replica set; for a standalone local Mongo keep `retryWrites=false` in the URI.

## Client architecture

- `src/api/client.js` → `apiFetch(path, opts)` (prefixes `VITE_API_URL`, always `credentials: "include"`, leaves `Content-Type` alone for `FormData`) and `ApiError { status, code, fieldErrors }`. One thin module per resource in `src/api/`. Add new endpoints there, not inline `fetch` calls.
- Provider order (`context/AppProviders.jsx`): `UIProvider` (toasts) → `AuthProvider` → `NotificationProvider` (polls every 45s + on focus) → `CatalogProvider` → `UploadDraftProvider`.
- `AuthContext` bootstraps from `GET /auth/me` and normalizes the API user (`_id` → `id`, `profileImageUrl` → `profileImageDataUrl` resolved via `utils/mediaUrl.js`). Its actions return `{ ok, code, error, fieldErrors }`.
- `CatalogContext` fetches `GET /listings?limit=100`, maps rows through `data/listingAdapter.js` (`apiListingToCatalogProduct` — the single API→UI shape adapter), and merges with the static demo `CATALOG` (ids `"1"`–`"6"`). Category, location and price browse filters run **client-side** on that snapshot. Call `refreshListings()` after any listing create/edit/delete.
- Claims, related listings and API fetches only apply to 24-hex Mongo ids; demo ids show static fallbacks.
- No app data in `localStorage` — the only client persistence is the httpOnly cookie. Upload drafts are in-memory only.
- `ProtectedRoute` waits for `isReady`, then redirects to `/login` with `state.from`. Protected: `/upload`, `/profile`, `/membership/checkout`, `/membership/receipt/:orderId`.
- Relative `/upload/...` image URLs must go through `resolveMediaUrl` before use in `<img>`.
- Modals that must sit above the fixed header or escape `RevealOnScroll` transforms render via `createPortal(..., document.body)`.
- Notification deep links are mapped in `utils/notificationNavigation.js` (e.g. `claim_message` → `/profile?negotiate=<claimId>#claims`). Profile sections are driven by URL hashes through `ProfilePageContext`.
- Styling: Tailwind tokens (`primary`, `surface`, `surface-container-low`, …) from `tailwind.config.js` / `index.css`; icons via the `MaterialIcon` component; fonts Manrope (headings), Inter (body), Poppins (home hero). Mobile-first: center-aligned on mobile, left-aligned from `sm`/`md` up.

## Known gaps (don't assume these exist)

CSRF enforcement; email/push notification delivery (in-app only); server-side browse filtering by `areaId`/category subtree; scheduled orphan-upload cleanup; membership activation/expiry automation; social login (buttons are demo toasts); account-delete UI.

## Repo hygiene

- `.env` files, `node_modules/`, `dist/`, `server/upload/` are gitignored. Never commit secrets.
- Large `*.zip` backups exist in each package (`client/frontend.zip`, `admin/admin.zip`, `server/server.zip`) — leave them alone and don't stage them unless asked.
