# The Regenerative Exchange — Application Documentation

This document describes the **almadot** front-end: stack, structure, features, auth, catalog and uploads, **claims & negotiation (DFD §4)**, **in-app notifications**, routing, and browser persistence. The app uses **React + Vite** for UI and talks to the **Almadot REST API** (`server`) for **authentication** (registration, login, session), **user profiles** (read / update), **image uploads** (profile + product photos), **categories** (upload cascade + browse filter tree), **locations** (Division → City → Area cascade, browse filter tree, Google Maps pickup pin), **listings** (create / read / update / delete), **claims / exchange proposals**, **negotiation messages**, and **notifications**. The previous `localStorage`-based catalog and per-user listing shims have been removed — the only client-side persistence left is the **httpOnly session cookie** (managed by the browser, not the app).

When you clone the monorepo, front-end paths below are relative to the **`client/`** directory (install and run commands are issued from `client/`).

---

## 1. Tech stack

| Layer | Choice |
|--------|--------|
| Build | [Vite](https://vitejs.dev/) 6.x |
| UI | [React](https://react.dev/) 19, JSX only (no TypeScript) |
| Routing | [React Router](https://reactrouter.com/) 7.x |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 3.x, custom theme in `tailwind.config.js` (primary greens, material-style palette) |
| Icons | [Material Symbols](https://fonts.google.com/icons) via `MaterialIcon` component |
| Auth / account | **REST API** — `fetch` with `credentials: "include"` and **httpOnly session cookie** set by the backend (no passwords or session JSON in `localStorage`) |
| Catalog & listings | **REST API** — `GET /api/v1/listings` on mount, refreshed after post / edit / delete. No browser persistence. |
| Categories | **REST API** — `GET /api/v1/categories?listingType=…&parentId=…` for listing + interested-item cascades and the browse category tree |
| Locations | **REST API** — `GET /api/v1/locations?parentId=…` for upload/edit pickup cascade and browse location tree; **Google Maps** (`@vis.gl/react-google-maps`) for draggable pickup pin when `VITE_GOOGLE_MAPS_API_KEY` is set |
| Drafts | In-memory React state (`UploadDraftContext`) — the upload page is auth-gated and the form is short, so the draft is intentionally not persisted across reloads |

**Fonts (typical usage):** Manrope (headings), Inter (body) — as referenced in components / Tailwind.

**Environment:** `client/.env` defines **`VITE_API_URL`** (default `http://localhost:3000/api/v1`) and **`VITE_GOOGLE_MAPS_API_KEY`** (optional; required for the pickup map on upload/edit). Vite exposes only vars prefixed with `VITE_`. Copy `.env.example` when setting up a new machine.

---

## 2. Running the app

From **`client/`**:

```bash
npm install
npm run dev      # local dev server (e.g. http://localhost:5173)
npm run build    # production build to dist/
npm run preview  # serve production build
```

The API must be running separately (see **`server/`**). For local development, typical pairing is:

- Front-end: `http://localhost:5173`
- API: `http://localhost:3000`

Ensure **`server/.env`** sets **`CLIENT_ORIGIN=http://localhost:5173`** so the browser may send cookies cross-origin.

**Environment files:** Copy **`.env.example`** → **`.env`** in **`client/`** and adjust **`VITE_API_URL`** if your API base path differs. Restart **`npm run dev`** after changing env vars — Vite reads them only at startup.

### 2.1 Troubleshooting (API + cookies)

| Symptom | Likely fix |
|---------|------------|
| Login succeeds on server but UI stays logged out | **`credentials: "include"`** is already set in **`api/client.js`** — ensure **`CLIENT_ORIGIN`** in **`server/.env`** matches the exact origin you open (e.g. `http://localhost:5173`, not `127.0.0.1`). |
| CORS errors mentioning credentials | Never use **`*`** with **`Access-Control-Allow-Credentials`** — the API pins **`CLIENT_ORIGIN`**. In **development**, the server also allows any **`http://localhost:<port>`** origin so Vite fallback ports (e.g. **5174**) work without editing **`CLIENT_ORIGIN`**. |
| `NETWORK_ERROR` / fetch fails | Start **`server`** (`npm run dev` in **`server/`**), confirm **`VITE_API_URL`** (must include **`/api/v1`** suffix used by **`apiFetch`** paths). |
| Env changes ignored | Restart the Vite dev server. |

---


## 3. Root directory layout (high level)

Relative to **`client/`**:

```
client/
├── doc/                    # This documentation
│   └── AppDoc.md
├── public/                 # Static assets (served as-is)
│   └── images/
│       └── default-avatar.svg
├── design-template/        # Design references (not runtime-imported)
├── .env                    # VITE_API_URL (gitignored if secrets added)
├── .env.example            # Template for VITE_API_URL
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── src/
    ├── main.jsx            # React root
    ├── App.jsx             # Router + provider shell
    ├── index.css
    ├── api/                # Thin REST helpers — client, auth, users, uploads, categories, locations, listings, claims, notifications
    ├── data/               # Demo catalog seed + API → catalog-shape adapter
    ├── context/            # Global React contexts
    ├── pages/              # Route-level pages
    ├── components/         # UI by area (auth, home, products, profile, etc.)
    └── utils/              # Small helpers (e.g. auth delay, media URL resolver)
```

---

## 4. Backend API integration (front-end side)

All authenticated calls use **`src/api/client.js`**:

- **`apiFetch(path, options)`** — prefixes **`VITE_API_URL`**, sends **`credentials: "include"`**, JSON body when provided.
- **`ApiError`** — carries **`status`**, **`code`**, **`fieldErrors`** from non-2xx responses.

**`src/api/auth.js`** wraps auth endpoints:

| Function | HTTP | Purpose |
|----------|------|---------|
| `registerUser(...)` | `POST /auth/register` | Create account on server (accepts optional `profileImageUrl`) |
| `loginUser(...)` | `POST /auth/login` | Verify credentials; receive **`Set-Cookie`** session |
| `getCurrentUser()` | `GET /auth/me` | Restore session from cookie on app load |
| `logoutUser()` | `POST /auth/logout` | Destroy server session + clear cookie |
| `requestPasswordReset({ email })` | `POST /auth/forgot-password` | Email a one-time reset code (OTP) |
| `verifyPasswordResetOtp({ email, code })` | `POST /auth/verify-reset-otp` | Verify code → single-use `resetToken` |
| `resetPassword({ email, resetToken, password })` | `POST /auth/reset-password` | Set new password; revokes all sessions |

**`src/api/uploads.js`** wraps image upload endpoints (multipart):

| Function | HTTP | Purpose |
|----------|------|---------|
| `uploadProfileImage(file)` | `POST /upload/profile-image` | Persist a profile photo, returns `{ url, bytes }` |
| `uploadProductImage(file)` | `POST /upload/product-image` | Persist a listing photo (requires auth); resulting URL is server-tracked as belonging to the **product** folder, distinct from profile uploads |

**`src/api/categories.js`** drives the cascading category picker:

| Function | HTTP | Purpose |
|----------|------|---------|
| `fetchCategoryChildren({ listingType, parentId })` | `GET /categories?listingType=…&parentId=…` | Returns direct children of `parentId`. Omit `parentId` for level-1 nodes of the tree. Each row includes **`hasChildren`** and **`isLeaf`** (dynamic — a node is a leaf when it has no active children). |
| `fetchCategoryById(id)` | `GET /categories/:id` | Single node + **`breadcrumb`** array (edit-form rehydration for Zakat depth and edit listing). |

**`src/api/locations.js`** drives Division → City → Area pickers and the browse location tree:

| Function | HTTP | Purpose |
|----------|------|---------|
| `fetchLocationChildren({ parentId })` | `GET /locations?parentId=…` | Direct children of `parentId`. Omit `parentId` for level-0 **divisions**. |
| `fetchLocationById(id)` | `GET /locations/:id` | Single node + `breadcrumb` array (edit-form rehydration). |

**`src/api/users.js`** wraps the users resource (profile management + privacy):

| Function | HTTP | Purpose |
|----------|------|---------|
| `fetchUser(userId)` | `GET /users/:id` | Public profile read (respects privacy settings; optional session for viewer context) |
| `updateUser(userId, patch)` | `PATCH /users/:id` | Owner-only profile update (used by **Edit profile** modal) |
| `getMySettings()` | `GET /users/me/settings` | Privacy settings for the signed-in user |
| `updateMySettings(patch)` | `PATCH /users/me/settings` | Update `publicDisplayName`, `emailVisibility`, `phoneVisibility` |

**`src/api/listings.js`** wraps the full listing CRUD:

| Function | HTTP | Purpose |
|----------|------|---------|
| `createListing(payload)` | `POST /listings` | Create a listing (DFD §2 steps 3–4). Auth required. |
| `fetchListing(id)` | `GET /listings/:id` | Single listing for the detail page, with populated owner |
| `fetchListings(params)` | `GET /listings` | Filter by `listingType`, `ownerUserId`, `categoryId`, `status`, `search`, plus pagination |
| `fetchRelatedListingsByPrice({ referencePrice, excludeId })` | `GET /listings/related-by-price` | Up to 6 exchange listings whose `referencePrice` falls in **[referencePrice ÷ 2, referencePrice × 2]** (product detail **Related products**) |
| `fetchRelatedListingsByCategory({ categoryId, excludeId })` | `GET /listings/related-by-category` | Up to 6 give listings in the same leaf `categoryId` (product detail **Related products**) |
| `updateListing(id, patch)` | `PATCH /listings/:id` | Owner-only edit (used by **Edit listing** modal on profile) |
| `deleteListing(id)` | `DELETE /listings/:id` | Owner-only delete |

**`src/api/claims.js`** — give claims and exchange proposals (DFD §4):

| Function | HTTP | Purpose |
|----------|------|---------|
| `createClaim(payload)` | `POST /claims` | Submit a give claim or exchange proposal on a listing |
| `fetchClaims(params)` | `GET /claims` | List claims — by `listingId`, `role=owner\|claimer`, filters below |
| `fetchClaim(id)` | `GET /claims/:id` | Single claim (owner or claimer) |
| `updateClaim(id, body)` | `PATCH /claims/:id` | Owner: `accept` / `reject`; either party: `complete`; claimer: `cancel` |

`fetchClaims` query params used by the UI:

| Param | Purpose |
|-------|---------|
| `listingId` | Claims on one listing (owner sees all; claimer sees own) |
| `role` | `"owner"` \| `"claimer"` — profile inbox scopes |
| `status` | Exact claim status filter |
| `pendingReview` | When `true`, only `submitted` + `pending` (owner review queue) |
| `receivedFrom`, `receivedTo` | `YYYY-MM-DD` filter on claim `createdAt` (claims table modals) |
| `claimType` | `"give_claim"` \| `"exchange_proposal"` (or shorthand `give` / `exchange`) |
| `search` | Case-insensitive match on related listing title (server-side) |
| `limit`, `offset` | Server pagination |

**`src/api/claimMessages.js`** — negotiation thread on a claim:

| Function | HTTP | Purpose |
|----------|------|---------|
| `fetchClaimMessages(claimId)` | `GET /claims/:id/messages` | Load chat history (owner or claimer) |
| `sendClaimMessage(claimId, body)` | `POST /claims/:id/messages` | Send a message; notifies the other party |

**`src/api/membership.js`** — membership plans + direct bank-transfer purchases:

| Function | HTTP | Purpose |
|----------|------|---------|
| `fetchMembershipPlans()` | `GET /membership/plans` | Public plan catalog (key, label, price, listing cap) |
| `createMembershipOrder(payload)` | `POST /membership/orders` | Record a pending bank-transfer purchase for a paid plan |
| `fetchMyMembershipOrders()` | `GET /membership/orders` | Current user's purchase requests (profile pending banner) |
| `fetchMembershipOrder(id)` | `GET /membership/orders/:id` | Single order for the receipt page |

**`src/api/notifications.js`** — in-app notification bell (DFD §4.4):

| Function | HTTP | Purpose |
|----------|------|---------|
| `fetchUnreadNotificationCount()` | `GET /notifications/unread-count` | Badge count in header |
| `fetchNotifications(params)` | `GET /notifications` | Dropdown list (`limit`, `offset`, `unreadOnly`) |
| `markNotificationRead(id)` | `PATCH /notifications/:id/read` | Mark one read |
| `markAllNotificationsRead()` | `PATCH /notifications/read-all` | Clear all unread |

`apiFetch` detects `FormData` bodies and leaves the `Content-Type` for the
browser to set (with its boundary). `client.js` also exports **`API_ORIGIN`**
— the origin half of `VITE_API_URL` — used by `utils/mediaUrl.js` to turn
relative `/upload/...` URLs from the API into absolute URLs the `<img>` tag
can load cross-origin in dev.

See **`server/doc/BackendImplementation.md`** for full request/response shapes and server-side behavior.

### 4.1 Auth API `code` values (what the UI surfaces)

All endpoints return JSON on errors; **`src/api/client.js`** lifts **`code`**, **`message`**, and **`errors`** into **`ApiError`**. **`AuthContext`** builds the toast string from **the first value in `fieldErrors`** when present, otherwise **`message`**.

**`POST /auth/register`** — typical **`code`** values:

| `code` | Meaning |
|--------|---------|
| `VALIDATION_ERROR` | Missing or invalid fields (`errors` map per field) |
| `EMAIL_TAKEN` | Email already registered |
| `NETWORK_ERROR` | Browser could not reach the API (offline / wrong URL) |

**`POST /auth/login`** — typical **`code`** values:

| `code` | Meaning |
|--------|---------|
| `VALIDATION_ERROR` | Invalid payload |
| `EMAIL_NOT_REGISTERED` | No user with that email |
| `WRONG_PASSWORD` | Password does not match |
| `ACCOUNT_NOT_ACTIVE` | User exists but **`status`** is not **`active`** |
| `NETWORK_ERROR` | Browser could not reach the API |

**`GET /auth/me`** — **`401`** with **`UNAUTHENTICATED`** when there is no valid session cookie (handled silently on bootstrap — user stays logged out).

### 4.2 CSRF token (reserved)

Successful **`login`** and **`me`** responses include **`csrfToken`** in JSON and **`expiresAt`**. When the backend adds CSRF checks on mutating routes, the front-end should send that token on **`POST`/`PATCH`/`DELETE`** via the header named in **`server/.env`** (**`CSRF_HEADER_NAME`**, default **`x-csrf-token`**). No auth mutation besides **`logout`** requires it yet.

---

## 5. App entry and providers

- **`src/main.jsx`** — mounts `<App />` (with `StrictMode`).
- **`src/App.jsx`** — `BrowserRouter` → **`AppProviders`** → routes + `ToastHost`.
- **`src/context/AppProviders.jsx`** — wraps children in this order:
  1. `UIProvider` — toasts
  2. `AuthProvider` — user identity from API session + helpers (`login`, `register`, `logout`, `updateProfile`, `updatePrivacySettings`)
  3. `NotificationProvider` — unread count + notification list (polls API when signed in)
  4. `CatalogProvider` — merged product catalog
  5. `UploadDraftProvider` — upload form draft state

Global **toast** UI is in `src/components/ui/ToastHost.jsx` (fixed **top-right**, variants: success / error / info).

---

## 6. Routes

| Path | Layout | Description |
|------|--------|-------------|
| `/` | `MainLayout` | Home |
| `/products` | `MainLayout` | Browse (filtered catalog) |
| `/products/:productId` | `MainLayout` | Product detail |
| `/upload` | `MainLayout` + **`ProtectedRoute`** | List an item (give / exchange) |
| `/contact` | `MainLayout` | Contact |
| `/privacy-policy` | `MainLayout` | Privacy policy (legal content + illustration) |
| `/terms-conditions` | `MainLayout` | Terms & conditions (legal content + illustration) |
| `/faq` | `MainLayout` | FAQ (accordion sections) |
| `/profile` | *standalone* + **`ProtectedRoute`** (no `MainLayout`) | User profile (EcoLoop-style shell; DFD §3) — includes **Claims & proposals** (`#claims`) and **Membership** (`#account`) |
| `/membership` | `MainLayout` | Membership plans (Free / Earth / Sky / Sun); highlights current plan |
| `/membership/checkout` | `MainLayout` + **`ProtectedRoute`** | Direct bank-transfer checkout for a paid plan (`?plan=earth\|sky\|sun`) |
| `/membership/receipt/:orderId` | `MainLayout` + **`ProtectedRoute`** | Purchase receipt — "we'll verify your transfer", pending status |
| `/login` | standalone | Sign in |
| `/register` | standalone | Create account |
| `/forgot-password` | standalone | Reset password via emailed OTP (3-step: email → code → new password) |

**Product detail query params** (Mongo listing ids only):

| Param | Purpose |
|-------|---------|
| `?claims=owner` | Highlights owner aside; scrolls to incoming-claims block |
| `?claims=status` | Highlights claimer status card |
| `?negotiate=<claimId>` | Used on **`/profile`** (not listing detail) to auto-open negotiation chat on the matching claim card |

**Profile deep links** — `?negotiate=<claimId>#claims` opens negotiation chat after **`claim_message`** notifications. **`ScrollToTop`** skips resetting scroll when this combo is present so the card can scroll into view centered.

**MainLayout** — `AppHeader` + `Outlet` + `AppFooter`.

**`ProtectedRoute`** (`src/components/auth/ProtectedRoute.jsx`):

- Waits for auth **`isReady`** — **`true`** only after **`GET /auth/me`** completes on mount (success → user loaded, failure → anonymous).
- If not authenticated, redirects to **`/login`** with `state: { from: location }` so the user can return to the original URL after login.
- Used for **`/upload`** and **`/profile`**.

**Upload deep links** — `?mode=exchange` sets exchange mode via `UploadDraftContext.applyQueryMode`; `?mode=give` or no param gives **Give**. Give-related links in the app use `?mode=give` so the **Give** tab is selected even after a prior **Exchange** session in memory.

---

## 7. Authentication

### 7.1 Behavior (current)

- **Register** and **Login** are **separate pages** (`/register`, `/login`) with a shared design language (hero + form column; back link to home).
- **Account data and passwords live on the server.** The browser holds an **httpOnly** session cookie (`almadot.sid` by default on the API) — **not** readable from JavaScript.
- **Register** (`RegisterFormPanel`) — `POST /auth/register`. On success, shows a toast and **`navigate("/login", { state: { email } })`** so the user signs in explicitly (registration does not auto-issue a session).
- **Login** (`LoginFormPanel`) — **`await login(email, password)`** → `POST /auth/login`; `AuthContext` stores normalized **`user`** from the response body.
- After successful login/register flows, the UI may still use a **short delay** + loader (`utils/delay.js`, `AUTH_COMPLETION_DELAY_MS`, `AuthFlowLoader`).
- **Logout** — clears client **`user`** immediately, then **`POST /auth/logout`** (best-effort).

### 7.2 `AuthContext` (`src/context/AuthContext.jsx`)

- **Bootstrap** — on mount, **`getCurrentUser()`** (`GET /auth/me`). If **`401`**, user stays logged out.
- **Session shape in React (`user`)** — normalized for existing UI (maps API → props components already expect):

  | React field | Source |
  |-------------|--------|
  | `id` | API `user._id` |
  | `email`, `fullName`, `phone`, `address` | API user document |
  | `createdAt`, `updatedAt`, `lastLoginAt`, `emailVerified`, `status` | Account info / membership UI |
  | `privacy` | `{ publicDisplayName, emailVisibility, phoneVisibility }` — settings + server-side public profile rules |
  | `membership` | `{ plan, status, startedAt, expiresAt }` — drives the profile membership card and the `/membership` current-plan highlight |
  | `profileImageDataUrl` | API `profileImageUrl` (a relative `/upload/...` URL) resolved to absolute via `resolveMediaUrl` so `<img>` can fetch it from the API origin in dev |

- **API surface:**
  - **`login(email, password)`** — async; maps **`ApiError`** to **`EMAIL_NOT_REGISTERED`**, **`WRONG_PASSWORD`**, **`ACCOUNT_NOT_ACTIVE`**, **`VALIDATION_ERROR`**, **`NETWORK_ERROR`** for toasts.
  - **`register({ fullName, email, password, address, phone, profileImageUrl })`** — async; no local session write.
  - **`updateProfile(patch)`** — `PATCH /users/:id` for the signed-in user; refreshes React **`user`** from the response (used by **Edit profile**).
  - **`updatePrivacySettings(patch)`** — `PATCH /users/me/settings`; refreshes **`user`** from the response (used by **Privacy settings**).
  - **`logout()`** — async-safe for callers that don’t await (state clears first).

**Listing ownership** is not tracked in `AuthContext`. The profile **listings panel** fetches rows directly from **`GET /listings?ownerUserId=<session user id>`** when the panel mounts (DFD §3 — database rows only, no client-side catalog cache or `localStorage`). Browse/detail pages still use `CatalogContext`.

**Legacy localStorage keys** `regenerative_exchange_users`,
`regenerative_exchange_session`, `regenerative_catalog_uploads`, and
`almadot_user_listings_v1:*` are **no longer read or written** by the app
and can be safely cleared from DevTools.

### 7.3 Registration form

`RegisterFormPanel` — full name, email, **phone**, **address** (textarea), **optional profile photo**, passwords + terms, **Join** CTA, link to **Sign in**.

**Submit flow (two-step, when a photo is attached):**

1. `await uploadProfileImage(file)` → `POST /upload/profile-image` → `{ url }`.
2. `await register({ ..., profileImageUrl: url })` → `POST /auth/register`.
3. On success, navigate to `/login` so the user signs in explicitly.

If step 1 fails (oversize / wrong mime / network) a toast surfaces the
specific error and step 2 is skipped — the user can fix the image and
re-submit. If step 2 fails after step 1 succeeded, the server deletes the
orphan file from disk before responding.

### 7.4 Login form

`LoginFormPanel` — email/password, **“Forgot?”** (navigates to **`/forgot-password`**, carrying the typed email as router state), sign-in (**async** `login`), link to **Create an account**.

### 7.4a Forgot password (OTP) — DFD §1.4–§1.5

`/forgot-password` (`ForgotPasswordPage` + `ForgotPasswordFormPanel`) is a standalone three-step flow that shares the auth hero layout. The verification code is delivered to the account **email** (not SMS):

1. **Email** — submit the account email → `requestPasswordReset` (`POST /auth/forgot-password`) emails a 6-digit code.
2. **Code** — enter the code → `verifyPasswordResetOtp` (`POST /auth/verify-reset-otp`) returns a single-use `resetToken`. Includes a 60s **Resend** cooldown and **Use a different email**.
3. **New password** — set + confirm → `resetPassword` (`POST /auth/reset-password`) updates the hash and revokes all sessions, then redirects to `/login` (email prefilled).

`AuthContext` exposes `requestPasswordReset(email)`, `verifyPasswordResetOtp(email, code)`, and `resetPassword({ email, resetToken, password })`, each returning the standard `{ ok, code, error, fieldErrors }` shape. Toasts surface server `code`s such as `EMAIL_NOT_REGISTERED`, `OTP_RESEND_TOO_SOON`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_MAX_ATTEMPTS`, and `RESET_TOKEN_INVALID`.

### 7.5 Header, mobile menu, and profile chrome

- **`AppHeader`** (main site): desktop nav links (Home, Browse, Give/Exchange, Contact). On **mobile** (`md:hidden`), primary links move into **`AppMobileMenu`** (hamburger drawer portaled to `document.body` with body scroll lock). When **logged in**, **`NotificationBell`** stays **outside** the hamburger on mobile so alerts remain one tap away; desktop shows bell + profile link. When **logged out**, mobile drawer shows **Log in** / **Register**; desktop shows **Login**.
- **`AppMobileMenu`** — drawer links: Home, Browse, Give/Exchange, Contact, plus Login/Register or Profile/Log out when authenticated.
- **Profile** pages use **`ProfileTopNav`** / **`ProfileSideNav`** with the same mobile pattern (**`AppMobileMenu`** + bell outside hamburger). Auth-aware name, default avatar when no photo, and **Log out** where appropriate.

---

## 8. Product catalog and marketplace

### 8.1 Source data

- **`src/data/catalog.js`** — exports a static **`CATALOG`** array of 6 demo products kept around so design reviews always have content; **`FEATURED_ON_HOME`** is an id subset used by the home strip.
- **`PROFILE_USER`** — legacy static demo object in `catalog.js`; **no longer imported** by profile UI (page is auth-gated).
- **`DEMO_PROFILE_AVATAR_URL`** — `/images/default-avatar.svg` (green placeholder avatar).
- **`src/data/listingAdapter.js`** — `apiListingToCatalogProduct(listing)` maps API rows into the legacy catalog-product shape (`seller`, `specs`, `tags`, `exchange`, `gallery`, `postedAgo`, plus **`categoryId` / `categoryPath`**, **`areaId` / `locationPath` / `divisionName` / `cityName` / `areaName`**, **`pickupLatitude` / `pickupLongitude`** for browse filters and edit rehydration). Single impedance-match layer.

### 8.2 `CatalogContext` (`src/context/CatalogContext.jsx`)

- On mount, fetches `GET /listings?limit=100` and maps each row through the adapter. The merged `products` list is `CATALOG` ⊕ API listings (API wins on id collisions, though the two id spaces don't overlap — demo uses `"1"–"6"`, API uses 24-hex Mongo ObjectIds).
- Exposes: `products`, `filteredProducts`, `featuredProducts`, `getProductById`, `getListingsByOwner(ownerUserId)`, `refreshListings()`, `loading`, `loadError`, and browse helpers. **`getListingsByOwner`** remains for potential reuse but the profile page does **not** call it — see §9.3.
- **`refreshListings()`** is called after a successful listing post, after **Edit listing** save, and anywhere else that needs a fresh catalog snapshot.

**Browse filters** (`browseFilters` + setters):

| Field | Purpose |
|-------|---------|
| `query` | Quick search string (title, location, short description) |
| `action` | `"all"` \| `"give"` \| `"exchange"` |
| `selectedCategory` | `{ id, name, level }` or `null` — category filter for the products grid |
| `selectedLocation` | `{ id, name, level }` or `null` — Division / City / Area filter |
| `maxPrice` | Maximum reference price for exchange items (`0`–`100`; `100` = **100+**, no cap). Default `100`. |

| Setter | Purpose |
|--------|---------|
| `setBrowseQuery` | Update search text |
| `setBrowseAction` | Give / Exchange / show all — clears **`selectedCategory`** (not location) |
| `setBrowseCategory(category)` | Select a category node for filtering, or `null` for **All categories** |
| `setBrowseLocation(location)` | Select a location node for filtering, or `null` for **All locations** |
| `setBrowseMaxPrice(n)` | Update price cap (`BROWSE_PRICE_MAX` = 100) |

**Category filter logic** (client-side on the merged catalog; leaf = node with **`isLeaf: true`** / no active children — usually **level 2**, **Zakat assets at level 3**):

- **Leaf:** `product.categoryId === selectedCategory.id`
- **Level 1–3 (parent nodes):** breadcrumb segment at the matching depth matches `selectedCategory.name` (e.g. all under “Zakat” or a specific BDT range)
- Demo seed products in **`catalog.js`** lack `categoryPath` / `categoryId` — they disappear when any category filter is active (expected).

**Leaf detection** — **`src/constants/categoryLevels.js`**: `MAX_CATEGORY_LEVEL = 3`; **`isCategoryLeaf(category)`** prefers API **`isLeaf`** / **`hasChildren`**, with level-based fallbacks for browse trees.

**Location filter logic** (client-side; leaf = **level 2** area):

- **Area (level 2):** `product.areaId === selectedLocation.id`
- **City (level 1):** `locationPath` segment 2 or `product.cityName`
- **Division (level 0):** `locationPath` segment 1 or `product.divisionName`
- Demo seed rows lack structured location — they only appear when **All locations** is selected.

**Price filter logic** (client-side on the merged catalog; constant `BROWSE_PRICE_MAX` = 100):

- Shown in the sidebar when action is **not** Give (i.e. **Exchange** or **Show all listings**).
- **Give** listings are always excluded when `maxPrice < 100` (price applies only to exchange reference values).
- **Exchange** listings: included when `referencePrice <= maxPrice` (via **`getReferencePrice`** in `productUtils.js`). Listings with no reference price are hidden while the cap is below 100; at **100+** they are included.
- Uses **`exchange.referencePrice`** from API listings or parses **`exchange.estimateLabel`** (e.g. `Est. $145`) on demo seed rows.

### 8.3 Product detail and navigation after upload

- **`ProductDetailPage`** resolves the current listing in three steps:
  1. `getProductById(productId)` from the merged catalog snapshot, **or**
  2. `location.state.product` when the id matches (e.g. immediately after **Post listing**), **or**
  3. `fetchListing(productId)` from the API as a last resort (handles deep links / page refresh on a listing that hasn't been re-fetched into the catalog yet). Only triggered for ids that look like a Mongo ObjectId.
- After **Post listing**, `ListingSubmitBar` calls `refreshListings()` and then `navigate(\`/products/\${listing.id}\`)`. The freshly cached catalog plus the navigation handoff make the detail page resolve without a network round-trip.

**Related products** — **`ProductRelatedSection`** (`src/components/productDetail/ProductRelatedSection.jsx`):

| Listing type | API | Match rule | Limit |
|--------------|-----|------------|-------|
| **Exchange** | `fetchRelatedListingsByPrice` | `exchange.referencePrice` within **[P ÷ 2, P × 2]** where **P** is the current item’s reference price | 6 |
| **Give** | `fetchRelatedListingsByCategory` | Same leaf **`categoryId`** as the current item | 6 |

- Does **not** use `relatedIds` on the listing document; related rows are computed at read time on the server.
- Optional query **`excludeId`** (Mongo listing id) omits the current product from results.
- Exchange subtitle uses **`relatedExchangePriceRangeLabel`** (e.g. `Est. BDT 150 – Est. BDT 600`); give subtitle uses category name when available.
- Section is hidden when the current product has no reference price (exchange) or no `categoryId` (give). Demo seed rows without those fields will not show the block until they are real API listings with full metadata.
- Cards use **`ProductCardRelated`** (bento-style bordered cards with hover lift).

**Product detail layout** (`ProductDetailPage` + stitch-aligned components):

| Area | Components / behaviour |
|------|-------------------------|
| Breadcrumbs | Chevron trail: Home → Browse → listing title |
| Hero grid | **7 / 5** column split — gallery left; price, title, location, exchange/claim aside right (sticky on large screens) |
| Gallery | 4:3 hero image, listing-type badge, optional thumbnail strip |
| Exchange aside | **`ProductExchangeAside`** — exchange value, interested item, **Propose Exchange** / claim CTA, **Contact Owner** (scrolls to owner block) |
| About this item | **`ProductDetailNarrative`** — tabbed card: **Item details** (condition / posted / type + category / section) and **Description** (story) |
| About the owner | **`ProductSellerCard`** — full-width horizontal row: avatar + name + **View Owner Profile** |
| Pickup | **`ProductLocationMap`** — full-width card with map (grayscale → color on hover when map key set) |
| Modals | **`ProductClaimSubmitModal`** and **`OwnerPortfolioModal`** render via **`createPortal(..., document.body)`** so they sit above the fixed header (avoids sticky-sidebar stacking issues) |

### 8.4 Browse UI

- **`ProductsPage`** + **`ProductCatalogGrid`** + filters in **`ProductFiltersSidebar`** and **`ProductListHero`** use `filteredProducts` from `CatalogContext`.

**`ProductFiltersSidebar`** (`src/components/products/ProductFiltersSidebar.jsx`):

| Section | Behavior |
|---------|----------|
| **Quick Search** | Bound to `browseFilters.query` |
| **Action Type** | **Give**, **Exchange**, or **Show all listings** — drives listing type and which category tree loads |
| **Location** | Always shown. **`LocationFilterTree`** lazy-loads Division → City → Area from `GET /locations`. Expand chevrons; click any row to filter. **All locations** clears the selection. |
| **Categories** | Shown only when Give or Exchange is selected. **`CategoryFilterTree`** lazy-loads L1 → L2 → (optional L3 for **Zakat** under Give) from the API. Uses **`isCategoryLeaf`** / API **`hasChildren`** to decide expand vs select. Chevron expands parents; clicking any row **selects** that node for filtering. **All categories** clears the selection. Shows **Filtering: …** when active. |
| **Price (Credits)** | Shown when action is **Exchange** or **Show all** (hidden for **Give**). Slider `0`–`100` (`100` = **100+**); bound to `browseFilters.maxPrice` / `setBrowseMaxPrice`. Filters exchange listings by **`referencePrice`** client-side (see §8.2). |

**`LocationFilterTree`** (`src/components/products/LocationFilterTree.jsx`) — browse sidebar location tree via `fetchLocationChildren`.

**`CategoryFilterTree`** (`src/components/products/CategoryFilterTree.jsx`) — browse sidebar category tree via `fetchCategoryChildren`.

**`ProductCatalogGrid`** — shows loading spinner, API **`loadError`** banner, or filtered grid. **`CatalogErrorBoundary`** (`components/ui/CatalogErrorBoundary.jsx`) wraps **`CatalogProvider`** in **`AppProviders`** and surfaces render errors on the page (not only in the console).

- **Home** — **`HomeAnnouncementBanner`** + viewport-fitted **`HomeHero`** (Poppins hero title styling, green price headline), then **`HomeFeatureGrid`**, **`HomeFeaturedCategories`**, **`HomeFeaturedProducts`**, **`HomeTestimonial`**. Sections use alternating **`bg-background`** / **`bg-surface-container-low`** bands so the hero gradient separates cleanly from content below. **`HomeFeatureGrid`** and **`HomeFeaturedCategories`** center section headers and card content on mobile (`text-center` / `items-center`), left-aligned from **`md`** / **`sm`** up. **`HomeHowItWorks`** is not mounted on the home page (component file retained). CTA links use `/upload?mode=give` and exchange mode as designed.

### 8.5 Product cards and utilities

- Listing cards, featured cards, related cards, **productUtils** in `src/components/products/`:
  - **`isGive`**, **`badgeLabelForListing`**, **`badgeVariantForListing`**
  - **`getReferencePrice(product)`** — numeric reference price for exchange listings (browse price filter + related-by-price range)
  - **`getRelatedPriceRange(referencePrice)`** — `{ min: P/2, max: P×2 }` for related exchange listings
  - **`relatedExchangePriceRangeLabel(referencePrice)`** — subtitle label for related exchange strip
  - **`getProductCategoryId(product)`** — leaf `categoryId` for related-by-category on give listings
  - **`exchangePriceLabel(product)`** — returns e.g. `Est. BDT 220` on exchange cards (profile grid, browse grid, featured, related); omitted for give listings
- **Product detail** subcomponents: gallery, header, tabbed narrative, owner card (**View Owner Profile** → `OwnerPortfolioModal`), exchange aside, location map, related section, etc.

---

## 9. Upload, give, and exchange

### 9.1 Upload page (`/upload`, protected)

- **`ListingTypeToggle`** — **Give** vs **Exchange** (synced with URL `?mode=`). On mobile, both options stay in **one row** (`grid-cols-2`). Toggling clears the cascading category picker and the exchange-only fields so the draft can't accidentally point a "give" listing at an "exchange" category.
- **`PhotoUploadDropzone`** — file input (hidden) + "Select Files". Each pick triggers `uploadProductImage(file)`. The returned server URL is stored in the draft as **`imageUrl`** (a `/upload/<date>/product/<uuid>.webp` path). The preview `<img>` resolves the URL to absolute via `resolveMediaUrl`. Errors (oversize, wrong mime, network) surface inline beneath the button.
- **`ListingDetailsForm`** — single-column layout: **Item Title** → cascading **Category → Subcategory** (→ **Asset** for **Zakat** under Give) → **Division → City → Area** → **Google Map** (draggable pin) + optional pickup notes → **Story & Description** → exchange-only block. Categories fetch `GET /categories?listingType=…&parentId=…`; the cascade continues until a node with **`isLeaf: true`** is selected (most branches stop at L2; **Zakat** uses L1 → BDT range → asset at L3). Locations fetch `GET /locations?parentId=…`. Map requires `VITE_GOOGLE_MAPS_API_KEY` in `client/.env`.
- **`ListingSubmitBar`** — validates the draft (title, image, leaf category, location, story), POSTs to `/listings` via `createListing(payload)`, calls `refreshListings()`, then navigates to the new product. Submit button is disabled while in flight; field-level API errors surface as toasts.
- **Draft** lives in `UploadDraftContext`:
  - `imageUrl` — server URL (replaces the old `imageDataUrl` base64).
  - `categoryPath: [{ id, name, level, isLeaf?, hasChildren? }, …]` — listing category cascade; leaf is the last node with **`isCategoryLeaf`** (level **2** for most categories, level **3** for Zakat assets).
  - `locationPath: [{ id, name, level, latitude?, longitude? }, …]` — Division → City → Area; selecting an area seeds `pickupLatitude` / `pickupLongitude`.
  - `pickupNotes` — optional; appended to the server-built `location` display string.
  - `interestedCategoryPath` — exchange-only; leaf drives **`exchange.interestedCategoryId`** on submit.
  - `story` — matches the server field name (was `description`).
  - Draft is **not** persisted across reloads (page is auth-gated, form is short).

### 9.2 Wire format for `POST /listings`

`ListingSubmitBar` builds this payload from the draft:

```js
{
  title,
  listingType: "give" | "exchange",
  imageUrl,             // from uploadProductImage(); must be in /upload/.../product/...
  categoryId,           // leaf id (node with no active children), validated server-side against listingType
  areaId,               // leaf area in listing_locations
  pickupLatitude,
  pickupLongitude,
  pickupNotes,          // optional; appended to server-built location string
  story,
  exchange: {           // only included when listingType === "exchange"
    referencePrice,     // Number or null
    interestedCategoryId, // leaf id in exchange listing_categories tree
  },
}
```

The server resolves **`interestedCategoryId`** to a category breadcrumb and stores it in **`exchange.desiredItems`** as a one-element array (e.g. `["Exchange > Electronics > Phones"]`). Legacy listings may still have free-text strings in **`desiredItems`**.

**Exchange details UI** — full-width **Reference Price ($)** and **Interested Item** (category cascade from the **exchange** tree, not free text). Shared components: **`CategoryFields.jsx`** (`CategoryCascade`), **`LocationFields.jsx`**, **`PickupLocationMap.jsx`**.

### 9.3 User profile (DFD §3)

**Access** — `/profile` is wrapped in **`ProtectedRoute`**. On load, **`GET /auth/me`** (via `AuthContext` bootstrap) restores the session; unauthenticated visitors are redirected to `/login` with `state.from` preserved.

**Profile shell (session payload)** — `ProfileHero`, `ProfileSideNav`, `ProfileTopNav`, and `ProfileMobileDock` render identity from the normalized **`user`** object only:

| UI field | Source |
|----------|--------|
| Name | `user.fullName` (sidebar / hero); public display name elsewhere follows `user.privacy.publicDisplayName` when set |
| Avatar | `user.profileImageDataUrl` (resolved API `profileImageUrl`) or `DEMO_PROFILE_AVATAR_URL` |
| Address, phone, email | `user.address`, `user.phone`, `user.email` |

**Dashboard analytics** — `ProfileHero` (`#profile-dashboard`) shows two stat cards on the right:

| Card | API |
|------|-----|
| Total Listings | `GET /listings?ownerUserId=<id>&limit=1` → `total` |
| Pending Listings | `GET /listings?ownerUserId=<id>&status=pending&limit=1` → `total` |

Counts refresh when the **Dashboard** section is active.

No demo **`PROFILE_USER`** fallback on the profile page.

**Profile actions** — `ProfileHero`: **Give Item** → `/upload?mode=give`; **Start Exchange** → `/upload?mode=exchange`. **Log out** in `ProfileTopNav` → `POST /auth/logout` then redirect home.

**Listings panel (database only)** — `ProfileListingsPanel` calls **`fetchListings({ ownerUserId: user.id, limit: 6 })`** for the **Active Listings** tab preview (newest six). **`See All listing`** opens **`AllListingsTableModal`**: server-paginated table (`PAGE_SIZE = 20`), search by title, type/status filters, delete with confirmation, and **Edit** via a right slide panel (`EditListingForm`). Card-grid edits still use **`EditListingModal`**. On save/delete, the panel re-fetches and **`CatalogContext.refreshListings()`** runs so browse stays in sync. No `localStorage`.

**Account info** — **`ProfileAccountInfoSection`** (`#profile-account`): membership, contact, security summary, **Edit profile** button. The **Membership** card shows the current plan (from `user.membership`), plan status, **listings used / cap** (via `GET /listings?ownerUserId=…&limit=1`), and an **Upgrade / Manage** link to `/membership`. When `GET /membership/orders` returns a pending order, a banner links to its receipt.

**Membership** — plans page (`/membership`) lists Free / Earth / Sky / Sun (display data in `src/data/membershipPlans.js`). Paid plans deep-link to `/membership/checkout?plan=…` (protected), which records a pending **direct bank transfer** order (`createMembershipOrder`) and redirects to `/membership/receipt/:orderId`. Plan upgrades activate out-of-band after transfer verification, so the user keeps their current plan until then. Posting beyond the plan cap returns `LISTING_LIMIT_REACHED`, which the upload submit bar surfaces as a toast + redirect to `/membership`.

**Privacy settings** — **`ProfileSettingsSection`** (`#profile-settings`): public display name (full name or custom alias), email/phone visibility radios; saves via **`updatePrivacySettings`** → `PATCH /users/me/settings`.

**Claims panel (DFD §4)** — **`ProfileClaimsPanel`** on **`UserProfilePage`** (see §9.5). Sidebar **Claims** → `#profile-claims`.

**Edit profile** — **`ProfileHero`** / **Account info** **Edit Profile** opens **`EditProfileModal`**: full name, email, phone, address, optional photo change (`POST /upload/profile-image` then `PATCH /users/:id`), optional password change. Success updates **`AuthContext`** via **`updateProfile`** and shows a toast.

**Edit listing** — **`EditListingModal`** (rendered via **`createPortal(..., document.body)`** so it is not clipped by ancestor transforms such as **`RevealOnScroll`**) + **`EditListingForm`**: title, **`CategoryCascade`** (supports Zakat L3 via **`fetchCategoryById`** breadcrumb rehydration), Division → City → Area + map pin, story, photo, exchange fields when applicable. Location is pre-loaded from existing `areaId`; **`areaId` / pickup coordinates / `pickupNotes`** are sent on **`PATCH`** only when the user changed location (avoids wiping unchanged pickup notes). Saves via **`updateListing`** (`PATCH /listings/:id`). Modal is mounted outside **`RevealOnScroll`** in **`ProfileListingsPanel`** for the card-grid path.

**In-page navigation** — `ProfilePageProvider` (`context/ProfilePageContext.jsx`) coordinates sidebar / tab scrolling via URL hashes:

| Sidebar / action | Hash | Scroll target | Tab / content |
|------------------|------|---------------|---------------|
| Dashboard | `#dashboard` | `#profile-dashboard` | Profile hero + analytics |
| My Listings | `#listings` | `#profile-listings` | Active Listings |
| Claims | `#claims` | `#profile-claims` | Claims & proposals (DFD §4) |
| Swaps | `#history` | `#profile-listings` | Swap History |
| Impact | `#impact` | `#profile-listings` | My Impact |
| Community | `#community` | `#profile-impact` | Community Impact section |
| Settings | `#settings` | `#profile-settings` | Privacy settings |
| Account Info | `#account` | `#profile-account` | Account details |

Sections use **`scroll-mt-24`** so scroll positions sit below the fixed `ProfileTopNav`. Content tabs in `ProfileListingsPanel` stay in sync with **`activeSection`** where applicable. **`ProfileSideNav`** uses a hover-reveal custom scrollbar (`.profile-sidebar-scroll` in `index.css`).

### 9.4 Profile actions

- **`ProfileHero`** — **Give Item** → `/upload?mode=give`; **Start Exchange** → `/upload?mode=exchange`; **Edit Profile** → modal (see §9.3).

### 9.5 Claims, negotiation & notifications (DFD §4)

End-to-end claim / exchange flows are wired for **Mongo listing ids** (`/products/:id` where `id` is a 24-hex ObjectId). Demo catalog ids (`"1"`–`"6"`) show a static “claims unavailable” aside.

#### Shared helpers — `claimUtils.js`

| Helper | Purpose |
|--------|---------|
| `pendingOwnerReview(claims)` | Owner inbox: `submitted` + `pending` rows |
| `latestIncomingClaimsPreview` / `latestClaimerClaimsPreview` | **5 most recent** cards in inline lists (`INCOMING_CLAIMS_PREVIEW_LIMIT`) |
| `NEGOTIABLE_CLAIM_STATUSES` | `submitted`, `pending`, `accepted` — chat enabled |
| `negotiationStatusLabel(role, hints)` | Table/banner copy: “Ongoing negotiation”, “Awaiting claimer reply”, etc. |
| `claimRowDomId` / `scrollClaimCardIntoViewDeferred` | Deep-link scroll from notifications |

#### Product detail — owner portfolio

- **`ProductSellerCard`** — **About the owner** section (green left-border heading). **View Owner Profile** opens **`OwnerPortfolioModal`** (portal to `document.body`; does not navigate away).
- Modal loads **`GET /users/:ownerId`** when `seller.ownerId` is present; shows display name, member since, and contact fields only when the owner’s privacy settings allow for the current viewer.
- Fallback: card-level name/avatar from the listing’s embedded `owner` sub-object.
- **`ProductExchangeAside`** includes **Contact Owner**, which scrolls to `#about-seller`.

#### Product detail — `ProductDetailPage` + `ProductExchangeAside`

- **`useProductClaims(listingId)`** loads `GET /claims?listingId=…` when the viewer is signed in.
- **Claimer (not owner):** **`ProductClaimSubmitModal`** (portal; give or exchange proposal) + **`ProductClaimStatusCard`** — status, withdraw, mark complete. **No negotiation chat on the listing page**; claimers negotiate from **`/profile#claims`** only.
- **Owner:** inline preview of pending claims via **`ProductClaimOwnerInbox`** (newest **5**). **Accept / Reject / Negotiate** on each card. **“View all incoming claims”** or **“Incoming claims (N)”** opens **`IncomingClaimsTableModal`** scoped with `listingId={product.id}`.
- Owner can **Mark handoff complete** when a claim is `accepted`.
- **`?claims=owner`** / **`?claims=status`** highlight the aside (from notifications or manual links).

#### Profile — `ProfileClaimsPanel` (`#profile-claims`, sidebar **Claims**)

Two sections:

1. **Incoming on your listings** — **`ProductClaimOwnerInbox`** (preview of up to **5** pending claims) + **View all incoming claims** → modal.
2. **Your claims & proposals** — **`ProfileClaimerClaimCard`** rows with inline negotiation chat.

Data: parallel `fetchClaims({ role: "owner" })` and `fetchClaims({ role: "claimer" })`. Actions call **`load({ silent: true })`** so open chat panels are not torn down by a loading spinner.

**URL `?negotiate=<claimId>`** — after load, opens owner or claimer chat on the matching card and scrolls it into view (`scrollClaimCardIntoViewDeferred`).

#### Incoming / your claims modals — `IncomingClaimsTableModal.jsx`

Reusable full-screen portal table (two instances on the profile claims panel):

| Instance | Scope | Title |
|----------|-------|-------|
| Owner | `role=owner`, optional `listingId` on product detail | Incoming claims / listing-scoped |
| Claimer | `role=claimer` | Your claims & proposals — **Withdraw** action |

| Feature | Behavior |
|---------|----------|
| Data source | **`fetchClaims`** from API |
| Filter | Owner: `pendingReview=true` when reviewing inbox; **Received from / to** date filter only |
| Pagination | Server `limit` / `offset`; **`SkeuomorphicPagination`**; default **`PAGE_SIZE = 20`** |
| Columns | Claimer/owner, type, status, **Negotiation**, message, received, listing title, **Actions** |
| Actions | Accept, Reject, Negotiate (owner); Withdraw (claimer) |
| Negotiate | Side **`ProductClaimNegotiationChat`** (`variant="panel"`) |

#### All listings modal — `AllListingsTableModal.jsx`

Profile **See All listing** — owner’s full listing table:

| Feature | Behavior |
|---------|----------|
| Pagination | Server-side; **`PAGE_SIZE = 20`** |
| Filters | Search by title, listing type, status — all server-side (`search`, `listingType`, `status`) |
| Edit | Right slide panel with **`EditListingForm`** (shared with **`EditListingModal`**) |
| Delete | Confirmation panel → **`DELETE /listings/:id`** |

#### Incoming claims modal (product detail)

Same **`IncomingClaimsTableModal`** component scoped with `listingId={product.id}` on the product detail owner aside.

#### Negotiation chat — `ProductClaimNegotiationChat.jsx`

Replaces the earlier **counter-offer** PATCH flow. Owner and claimer exchange messages while the claim is negotiable (`submitted` / `pending` / `accepted`).

- **`variant="slide"`** — expands claim card on profile / product preview (fixed **380px** height when open).
- **`variant="panel"`** — fixed side column inside the claims table modal.
- Loads / sends via **`claimMessages.js`**; **`useClaimNegotiationHint`** derives banner/table negotiation status from message senders + unread `claim_message` notifications.

#### Notifications — `NotificationContext` + `NotificationBell`

- **Mobile:** full-screen overlay + portaled panel (`md:hidden`), close button, body scroll lock while open.
- **Desktop:** dropdown under the bell (`hidden md:block`), unchanged behaviour.
- Polls **`GET /notifications`** + unread count every **45s** (and on window focus) when authenticated.
- **`notificationNavigation.js`** maps types to routes:
  - **`claim_message`** → `/profile?negotiate=<claimId>#claims` (opens chat for owner or claimer)
  - **`claim_submitted`** → `/profile#claims`
  - Claimer lifecycle updates → `/products/<listingId>?claims=status`
- Opening negotiate from a notification marks the related row read when possible.

---

## 10. Client-side persistence

The app keeps **no** application data in `localStorage` any more. Persistence comes entirely from:

1. The **httpOnly session cookie** (`almadot.sid`) the API sets on login. The browser handles it; JS cannot read it.
2. **Server state** queried on demand via the REST API.

The following keys were used by earlier iterations and are **no longer read or written** — clearing them in DevTools has no effect on app behavior:

| Removed key | What it used to hold |
|-------------|----------------------|
| `regenerative_exchange_users` | Pre-API demo users store |
| `regenerative_exchange_session` | Pre-API demo session JSON |
| `regenerative_catalog_uploads` | User-uploaded listings (now in `listings` Mongo collection) |
| `almadot_user_listings_v1:*` | Per-user listing id cache (now derived from `GET /listings?ownerUserId=…`) |

---

## 11. Notable UI / UX details

- **Toasts** — top-right; `UIContext` (`showToast`, `dismissToast`).
- **Notifications** — **`NotificationBell`** in `AppHeader` / `ProfileTopNav`; live unread badge. **Mobile:** full-screen portaled overlay; **desktop:** dropdown. See §9.5.
- **Auth loaders** — `AuthFlowLoader` on login/register while the completion delay runs.
- **Styling** — project uses design tokens in Tailwind (`primary`, `surface`, etc. from `tailwind.config.js` and `index.css`). Home hero uses **Poppins** (`.hero-title`); headings elsewhere typically **Manrope**. Shared utilities: **`.detail-section-heading`** (green left border), **`.bento-card`** (related product hover). **`SkeuomorphicPagination`** reuses primary green + surface tokens for the claims modal footer.
- **Footer** — **`AppFooter`** four-column dark layout (brand, How to Exchange Fast, Information, Help & Support) with links to **`/privacy-policy`**, **`/terms-conditions`**, **`/faq`**, and back-to-top control. On mobile, all footer columns, brand block, social icons, and copyright are **center-aligned** (`text-center sm:text-left`). **`ProfileFooter`** uses the same mobile centering pattern (`text-center md:text-left`).

---

## 12. Limitations (current)

- **Auth** — Real API + bcrypt + cookie sessions; **forgot-password / OTP** is fully wired (email-delivered code → verify → reset; see §7.4a). Social buttons remain **demo** toasts.
- **Catalog & listings** — Post, browse (with filters), detail, profile my-listings (6-card preview + full table modal), owner edit/delete via API.
- **Browse category filter** — Client-side on the cached catalog (`limit=100`); no server subtree query when a parent category is selected. **`GET /listings?categoryId=`** only matches an exact leaf on the server. **Give → Zakat** is the only branch with a third picker level (BDT range → asset); exchange tree remains L1 → L2 leaves.
- **Browse location filter** — Client-side on the same catalog snapshot; Division / City / Area via **`locationPath`** and denormalized names. No **`GET /listings?areaId=`** yet.
- **Pickup map** — Requires **`VITE_GOOGLE_MAPS_API_KEY`**; without it, upload/edit still work with coordinates shown as text fallback.
- **Related listings** — Exchange rows match by **reference price range** (half to double of the current item); give rows match by leaf **`categoryId`**. Section hidden when metadata is missing; demo seed catalog rows often lack `categoryId` / API price fields.
- **Profile / listing delete** — Listing delete is exposed in **`AllListingsTableModal`**. Account soft-delete (`DELETE /users/:id`) exists on the API; no profile UI button yet.
- **Claims modal pagination** — Default **`PAGE_SIZE = 20`** on claims and listings table modals.
- **Negotiation** — Chat is on **profile** (and owner modal) only; listing detail shows claim **status** for claimers, not the thread.
- **Notifications** — In-app only; email / push channels exist on the server model but are not sent yet.

---

## 13. File index (quick reference)

| Area | Files |
|------|-------|
| App shell | `App.jsx`, `main.jsx`, `context/AppProviders.jsx` (+ `CatalogErrorBoundary`) |
| API | `api/client.js`, `api/auth.js`, `api/users.js`, `api/uploads.js`, `api/categories.js`, `api/locations.js`, `api/listings.js`, `api/claims.js`, `api/claimMessages.js`, `api/notifications.js` |
| Media | `utils/mediaUrl.js` (resolves `/upload/...` against API origin) |
| Auth | `AuthContext.jsx`, `ProtectedRoute.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `ForgotPasswordPage.jsx`, `LoginFormPanel.jsx`, `RegisterFormPanel.jsx`, `ForgotPasswordFormPanel.jsx`, `AuthHeroPanel.jsx`, `AuthPageFooter.jsx`, `SocialAuthButtons.jsx`, `AuthFlowLoader.jsx` |
| Notifications | `NotificationContext.jsx`, `components/notifications/NotificationBell.jsx`, `utils/notificationNavigation.js` |
| Catalog | `CatalogContext.jsx`, `data/catalog.js`, `data/listingAdapter.js` |
| Upload | `UploadPage.jsx`, `UploadDraftContext.jsx`, `PhotoUploadDropzone.jsx`, `ListingTypeToggle.jsx`, `ListingDetailsForm.jsx`, `CategoryFields.jsx`, `LocationFields.jsx`, `PickupLocationMap.jsx`, `ListingSubmitBar.jsx` |
| Claims (DFD §4) | `hooks/useProductClaims.js`, `hooks/useClaimNegotiationHint.js`, `components/productDetail/claimUtils.js`, `ProductClaimSubmitModal.jsx`, `ProductClaimStatusCard.jsx`, `ProductClaimOwnerInbox.jsx`, `ProductClaimNegotiationChat.jsx`, `ClaimNegotiationBanner.jsx`, `ProductExchangeAside.jsx`, `ProductSellerCard.jsx`, `OwnerPortfolioModal.jsx`, `ProfileClaimsPanel.jsx`, `ProfileClaimerClaimCard.jsx`, `IncomingClaimsTableModal.jsx` |
| UI | `ToastHost.jsx`, `MaterialIcon.jsx`, `SkeuomorphicPagination.jsx`, `AppHeader.jsx`, `AppMobileMenu.jsx`, `MainLayout.jsx`, `AppFooter.jsx`, `ProfileFooter.jsx`, `BrandLogo.jsx`, `layout/ScrollToTop.jsx` |
| Category depth | `constants/categoryLevels.js` (`MAX_CATEGORY_LEVEL`, `isCategoryLeaf`) |
| Legal / FAQ | `PrivacyPolicyPage.jsx`, `TermsConditionsPage.jsx`, `FaqPage.jsx`, `components/legal/*`, `components/faq/*` |
| Profile | `UserProfilePage.jsx`, `context/ProfilePageContext.jsx`, `ProfileHero.jsx`, `ProfileAccountInfoSection.jsx`, `ProfileSettingsSection.jsx`, `EditProfileModal.jsx`, `ProfileListingsPanel.jsx`, `AllListingsTableModal.jsx`, `EditListingModal.jsx`, `EditListingForm.jsx`, `EditListingCategoryFields.jsx`, `ProfileSideNav.jsx`, `ProfileTopNav.jsx`, `ProfileImpactSection.jsx`, `ProfileMobileDock.jsx`, … |
| Products | `ProductsPage.jsx`, `ProductDetailPage.jsx`, `ProductCatalogGrid.jsx`, `ProductFiltersSidebar.jsx`, `CategoryFilterTree.jsx`, `LocationFilterTree.jsx`, `ProductCardProfile.jsx`, `ProductRelatedSection.jsx`, `ProductCardRelated.jsx`, `ProductDetailGallery.jsx`, `ProductDetailHeader.jsx`, `ProductDetailNarrative.jsx`, `ProductExchangeAside.jsx`, `ProductSellerCard.jsx`, `ProductLocationMap.jsx`, `productUtils.js` |
| Home / Contact | `HomePage.jsx`, `HomeHero.jsx`, `HomeAnnouncementBanner.jsx`, `HomeFeatureGrid.jsx`, `HomeFeaturedCategories.jsx`, `HomeFeaturedProducts.jsx`, `HomeTestimonial.jsx`, `HomeHowItWorks.jsx` (not on home route), `ContactPage.jsx`, … |
| Utils | `utils/delay.js`, `utils/mediaUrl.js`, `utils/privacy.js`, `utils/notificationNavigation.js` |

---

## 14. Related documentation

| Topic | Path |
|--------|------|
| REST API, models, seeds | [`server/doc/BackendImplementation.md`](../../server/doc/BackendImplementation.md) |
| MongoDB ER diagram (Mermaid) | [`client/doc/Almadot-Database-Schema.mmd`](Almadot-Database-Schema.mmd) |

---

*Last updated: 2026-06-01 — Membership tiers (Free/Earth/Sky/Sun): `/membership` plans page, protected checkout + receipt, `api/membership.js`, `data/membershipPlans.js`, `user.membership` in `AuthContext`, profile membership card (plan + listings used + pending order), and `LISTING_LIMIT_REACHED` upgrade toast on upload. Previously: Zakat 3-level category cascade (Give only); dynamic `isLeaf`/`hasChildren`; `GET /categories/:id`; mobile hamburger menu; responsive notification panel; edit-listing modal portal + location patch; home/footer mobile center alignment.*
