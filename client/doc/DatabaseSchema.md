# Almadot — MongoDB Database Schema

This document defines the MongoDB schema for the Almadot platform, derived
sequentially from the four Data Flow Diagrams in `doc/`:

1. `Almadot-DFD-Section1-Auth.png` — Authentication & Account
2. `Almadot-DFD-Section2-Upload.png` — Upload product (Give & Exchange)
3. `Almadot-DFD-Section3-Profile.png` — User profile
4. `Almadot-DFD-Section4-Claim-Exchange.png` — Claim & Exchange lifecycle

Visual reference: see `doc/Almadot-Database-Schema.png` (ER diagram) and the
Mermaid source in `doc/Almadot-Database-Schema.mmd`.

> Persistence model (per DFDs):
> - **D1 — Server session** is cookie-bound (httpOnly + Secure + SameSite).
>   It is stored server-side in the `sessions` collection; the cookie only
>   carries the opaque session id.
> - **D2 — Application database** is MongoDB and owns users, OTPs, listings,
>   categories, claims, notifications, and audit logs.
> - **No client-side storage** of credentials, OTPs, listings, or claims.

---

## 1. Collections overview

| # | Collection           | Purpose                                                          | Source DFD |
|---|----------------------|------------------------------------------------------------------|------------|
| 1 | `users`              | Account identity, contact info, credentials (hashed)             | §1         |
| 2 | `sessions`           | Server-side, cookie-bound sessions (D1)                          | §1, §2, §3 |
| 3 | `otps`               | Forgot-password OTP issuance and verification                    | §1         |
| 4 | `listing_categories` | **Three-level** taxonomy (roots: `give`/`exchange` → children → sub-children) | §2, §3   |
| 5 | `listings`           | Give / Exchange products + lifecycle status                      | §2, §3, §4 |
| 6 | `claims`             | Give claims and exchange proposals                               | §4         |
| 7 | `notifications`      | Per-user notification fan-out for claim/exchange events          | §4         |
| 8 | `audit_logs`         | Polymorphic audit trail of state changes                         | §1–§4      |

All `_id` fields are `ObjectId` unless explicitly typed `String`.
All timestamps are stored as `Date` (UTC).

---

## 2. `users`

Account record. Created by §1 Registration; read by §1 Login, §2 Upload auth
check, §3 Profile, §4 Claim notifications.

| Field             | Type      | Notes                                                                |
|-------------------|-----------|----------------------------------------------------------------------|
| `_id`             | ObjectId  | Primary key.                                                         |
| `email`           | String    | Unique, lowercased, indexed.                                         |
| `passwordHash`    | String    | bcrypt/argon2 hash. **Never** store plaintext.                       |
| `fullName`        | String    | From registration form.                                              |
| `phone`           | String    | From registration form.                                              |
| `address`         | String    | From registration form (textarea).                                   |
| `profileImageUrl` | String    | Server-hosted URL (S3 / GridFS / CDN). Optional.                     |
| `emailVerified`   | Boolean   | Default `false`. Set `true` only after OTP-verified flows if needed. |
| `status`          | String    | Enum: `"active" \| "disabled" \| "deleted"`. Default `"active"`.     |
| `lastLoginAt`     | Date      | Updated by §1 Login.                                                 |
| `createdAt`       | Date      | Server-set on insert.                                                |
| `updatedAt`       | Date      | Server-set on update.                                                |

**Indexes**
- `{ email: 1 }` — unique
- `{ status: 1 }`
- `{ createdAt: -1 }`

---

## 3. `sessions` (D1 — cookie-bound)

Backs the httpOnly session cookie. The cookie value is the opaque `_id` only;
all authoritative claims live server-side here.

| Field            | Type     | Notes                                                          |
|------------------|----------|----------------------------------------------------------------|
| `_id`            | String   | Opaque session id (e.g. 256-bit random, base64url). PK.        |
| `userId`         | ObjectId | FK → `users._id`. Indexed.                                     |
| `csrfToken`      | String   | Random token used for CSRF defense on state-changing requests. |
| `userAgent`      | String   | From request headers at login.                                 |
| `ipAddress`      | String   | From request at login.                                         |
| `expiresAt`      | Date     | Absolute expiration; enforced by TTL index.                    |
| `lastActivityAt` | Date     | Updated on each authenticated request (sliding window).        |
| `createdAt`      | Date     | Server-set on insert.                                          |

**Indexes**
- `{ userId: 1 }`
- `{ expiresAt: 1 }` — TTL index (`expireAfterSeconds: 0`) for automatic cleanup

**Auth check (used by §2 and §3):** server reads the session cookie, looks up
the document by `_id`, verifies `expiresAt > now`, and resolves `userId`.

---

## 4. `otps`

OTP records for §1.4 Forgot password and §1.5 Reset password. Codes are
stored as **hashes**, never plaintext; metadata enforces expiry, retry caps,
and resend cooldowns.

| Field           | Type     | Notes                                                                  |
|-----------------|----------|------------------------------------------------------------------------|
| `_id`           | ObjectId | Primary key.                                                           |
| `userId`        | ObjectId | FK → `users._id`. Indexed.                                             |
| `email`         | String   | Denormalized for lookup if user record is deleted.                     |
| `codeHash`      | String   | Hash of the 6–8 digit OTP (e.g. bcrypt or HMAC-SHA256 with pepper).    |
| `purpose`       | String   | Enum: `"password_reset"` (extensible: `"email_verify"`, `"login_2fa"`).|
| `channel`       | String   | Enum: `"email" \| "sms"`. Provider sends to user.                      |
| `expiresAt`     | Date     | Typically `createdAt + 10 min`. TTL-indexed for hard cleanup.          |
| `attempts`      | Number   | Verification attempts so far. Default `0`.                             |
| `maxAttempts`   | Number   | Hard cap (e.g. `5`).                                                   |
| `resendCount`   | Number   | Default `0`. Used with `lastResendAt` for cooldown.                    |
| `lastResendAt`  | Date     | Used to enforce resend cooldown window.                                |
| `verifiedAt`    | Date     | Set when user enters correct code; gates the reset screen.             |
| `consumedAt`    | Date     | Set when password is actually reset using this OTP.                    |
| `ipAddress`     | String   | For abuse/audit.                                                       |
| `createdAt`     | Date     | Server-set on insert.                                                  |

**Indexes**
- `{ userId: 1, purpose: 1, createdAt: -1 }`
- `{ email: 1, purpose: 1, createdAt: -1 }`
- `{ expiresAt: 1 }` — TTL index

**Lifecycle rules**
- Reject verification if `expiresAt <= now`, `attempts >= maxAttempts`,
  `consumedAt` is set, or `codeHash` mismatch (increment `attempts`).
- Reset-password endpoint requires `verifiedAt` set and `consumedAt` unset.
- On successful reset → set `consumedAt`, invalidate user's `sessions`.

---

## 5. `listing_categories`

**Three-level** taxonomy used by §2 Upload (cascading dropdowns) and §3
Profile (category badges / breadcrumbs):

```
Level 0 (root)       give                    exchange
                     /  |  \                /   |   \
Level 1 (child)   cate-1 cate-2 cate-3   cate-1 cate-2 cate-3
                  / | \   / | \   / | \    / | \   / | \   / | \
Level 2 (sub)    sc1 sc2 sc3 ... (9 sub-children per root)
```

Modeled as a **self-referential collection** so the tree can grow deeper
later without a schema migration. `parentId` defines structure; `level` and
`ancestors[]` are cached for fast queries and breadcrumbs.

| Field         | Type        | Notes                                                                                                                                       |
|---------------|-------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `_id`         | ObjectId    | Primary key.                                                                                                                                |
| `slug`        | String      | Unique, lowercase, URL-safe. Namespaced top-down (e.g. `"give"`, `"give-cate-1"`, `"give-cate-1-subcate-2"`).                               |
| `name`        | String      | Display label (e.g. `"Give"`, `"cate-1"`, `"sub-cate-2"`).                                                                                  |
| `parentId`    | ObjectId    | FK → `listing_categories._id`. **Null** for root nodes (`give`, `exchange`). Required for non-root nodes.                                   |
| `level`       | Number      | `0` for roots, `1` for children, `2` for sub-children. Cached from the parent chain.                                                        |
| `ancestors`   | [ObjectId]  | Cached chain root → … → immediate parent (empty for roots). Length always equals `level`.                                                   |
| `listingType` | String      | Enum: `"give" \| "exchange"`. On the root it equals its own slug; on descendants it equals the **root's** `listingType`.                    |
| `sortOrder`   | Number      | Optional ordering within siblings. Default `0`.                                                                                             |
| `isActive`    | Boolean     | Soft-disable a category (and its subtree) without deleting. Default `true`.                                                                 |
| `createdAt`   | Date        | Server-set.                                                                                                                                 |
| `updatedAt`   | Date        | Server-set.                                                                                                                                 |

**Indexes**
- `{ slug: 1 }` — unique
- `{ parentId: 1, sortOrder: 1 }` — render children of a given node
- `{ ancestors: 1 }` — fetch entire subtree under any node in one query
- `{ listingType: 1, level: 1 }` — quickly fetch all leaves for a mode

**Seed data (initial rows, will be renamed during implementation)**

Per root: 1 root + 3 children + 9 sub-children = 13 docs. Two roots = **26 docs total**.
Below is the **Give branch** (the Exchange branch is identical structure, swap `give` for `exchange`).

| slug                       | name        | parentId             | level | listingType | ancestors                  |
|----------------------------|-------------|----------------------|-------|-------------|----------------------------|
| `give`                     | Give        | `null`               | 0     | `give`      | `[]`                       |
| `give-cate-1`              | cate-1      | `_id(give)`          | 1     | `give`      | `[give]`                   |
| `give-cate-2`              | cate-2      | `_id(give)`          | 1     | `give`      | `[give]`                   |
| `give-cate-3`              | cate-3      | `_id(give)`          | 1     | `give`      | `[give]`                   |
| `give-cate-1-subcate-1`    | sub-cate-1  | `_id(give-cate-1)`   | 2     | `give`      | `[give, give-cate-1]`      |
| `give-cate-1-subcate-2`    | sub-cate-2  | `_id(give-cate-1)`   | 2     | `give`      | `[give, give-cate-1]`      |
| `give-cate-1-subcate-3`    | sub-cate-3  | `_id(give-cate-1)`   | 2     | `give`      | `[give, give-cate-1]`      |
| `give-cate-2-subcate-1`    | sub-cate-1  | `_id(give-cate-2)`   | 2     | `give`      | `[give, give-cate-2]`      |
| `give-cate-2-subcate-2`    | sub-cate-2  | `_id(give-cate-2)`   | 2     | `give`      | `[give, give-cate-2]`      |
| `give-cate-2-subcate-3`    | sub-cate-3  | `_id(give-cate-2)`   | 2     | `give`      | `[give, give-cate-2]`      |
| `give-cate-3-subcate-1`    | sub-cate-1  | `_id(give-cate-3)`   | 2     | `give`      | `[give, give-cate-3]`      |
| `give-cate-3-subcate-2`    | sub-cate-2  | `_id(give-cate-3)`   | 2     | `give`      | `[give, give-cate-3]`      |
| `give-cate-3-subcate-3`    | sub-cate-3  | `_id(give-cate-3)`   | 2     | `give`      | `[give, give-cate-3]`      |

**Integrity rules**
- Root nodes (`level = 0`) → `parentId = null`, `ancestors = []`.
- Child nodes (`level = 1`) → `parentId` has `level = 0`; `ancestors = [rootId]`.
- Sub-children (`level = 2`) → `parentId` has `level = 1`; `ancestors = [rootId, childId]`.
- `ancestors.length` must always equal `level`. `ancestors[0]` must be a root.
- A descendant's `listingType` must equal its root's `listingType` (enforced
  at the service layer, optionally via a JSON Schema validator on the
  collection).
- `listings.categoryId` must reference a **leaf** node (a row whose `_id`
  appears in no other row's `parentId`). With the current 3-level seed,
  leaves are exactly the `level = 2` rows.
- `slug` is immutable once referenced by a `listings.categoryId`.
- A category cannot be deleted while it has descendants or listings;
  soft-disable via `isActive = false` instead.

**Why `ancestors`?** It collapses subtree queries from N hops into one:

```js
// All listings anywhere under "cate-1" (sub-categories included)
db.listings.aggregate([
  { $lookup: { from: "listing_categories",
               localField: "categoryId", foreignField: "_id", as: "cat" } },
  { $match: { "cat.ancestors": ObjectId("<cate-1 _id>") } }
])
```

---

## 6. `listings` (products)

Created by §2 Upload (server-only persistence — no localStorage). Read by §3
Profile listings panel. Mutated by §4 lifecycle transitions.

| Field                       | Type     | Notes                                                                                                                          |
|-----------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------|
| `_id`                       | ObjectId | Primary key.                                                                                                                   |
| `ownerUserId`               | ObjectId | **FK → `users._id`. Indexed. Required.** Implements *User 1 ──< Listings N* (one user owns many listings).                     |
| `title`                     | String   | Required.                                                                                                                      |
| `listingType`               | String   | Enum: `"give" \| "exchange"`. Required. Must match `categoryId.listingType`.                                                   |
| `imageUrl`                  | String   | Primary image URL (server-hosted). Required.                                                                                   |
| `gallery`                   | [String] | Additional image URLs.                                                                                                         |
| `categoryId`                | ObjectId | **FK → `listing_categories._id`. Indexed. Required.** Must reference a **leaf** node (no children). With the current 3-level seed, leaves are `level = 2` rows. |
| `categoryName`              | String   | Denormalized copy of the leaf category's `name` at the time of listing creation. Refreshed on category rename.                 |
| `categoryPath`              | String   | Denormalized breadcrumb (e.g. `"Give › cate-1 › sub-cate-2"`). Rebuilt from `listing_categories.ancestors` on insert / rename. |
| `location`                  | String   | Display string built from division/city/area (+ optional notes).                                                               |
| `areaId`                    | ObjectId | FK → `listing_locations` leaf. Required on new uploads.                                                                        |
| `divisionName`, `cityName`, `areaName` | String | Denormalized labels.                                                                                          |
| `locationPath`              | String   | Breadcrumb, e.g. `"Dhaka > Dhaka Metro > Gulshan"`.                                                                            |
| `pickupLatitude`, `pickupLongitude` | Number | Map pin coordinates.                                                                                              |
| `story`                     | String   | Long-form description.                                                                                                         |
| `tags`                      | [String] | Optional taxonomy.                                                                                                             |
| `specs`                     | Object   | Free-form key/value specs.                                                                                                     |
| `exchange.referencePrice`   | Number   | Required when `listingType = "exchange"`.                                                                                      |
| `exchange.desiredItems`     | [String] | Required when `listingType = "exchange"`.                                                                                      |
| `status`                    | String   | Enum: `"available" \| "pending" \| "accepted" \| "completed" \| "rejected" \| "cancelled"`. Default `"available"`.             |
| `claimedByUserId`           | ObjectId | FK → `users._id`. Set when an `accepted` claim exists. Nullable.                                                               |
| `acceptedClaimId`           | ObjectId | FK → `claims._id`. The single winning claim. Nullable.                                                                         |
| `relatedIds`                | [ObjectId] | Editorial/related listing references.                                                                                        |
| `createdAt`                 | Date     | Server-set.                                                                                                                    |
| `updatedAt`                 | Date     | Server-set.                                                                                                                    |

**Indexes**
- `{ ownerUserId: 1, createdAt: -1 }` — Profile listings panel (User 1 ──< Listings N)
- `{ status: 1, listingType: 1, createdAt: -1 }` — Browse filters
- `{ categoryId: 1, status: 1, createdAt: -1 }` — Browse by category
- `{ title: "text", story: "text", tags: "text" }` — Search
- `{ location: 1 }`

**Status invariants (enforced by §4)**
- `available` → only state where listing appears in open browse results.
- `pending` → at least one open (non-terminal) claim exists.
- `accepted` → exactly one `claims` doc with `status = "accepted"`; its `_id`
  is mirrored in `acceptedClaimId`, and `claimedByUserId` is set.
- `completed` → terminal success state; no further claims allowed.
- `rejected` / `cancelled` → terminal; listing hidden from active browse.

---

## 7. `claims`

A unified record for §4.1 Give claims and §4.2 Exchange proposals.

| Field                  | Type     | Notes                                                                                                                                  |
|------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------|
| `_id`                  | ObjectId | Primary key.                                                                                                                           |
| `listingId`            | ObjectId | FK → `listings._id`. Indexed. Required.                                                                                                |
| `ownerUserId`          | ObjectId | FK → `users._id`. Denormalized owner of the listing (for fast notification queries).                                                   |
| `claimerUserId`        | ObjectId | FK → `users._id`. The party initiating the claim/proposal.                                                                             |
| `type`                 | String   | Enum: `"give_claim" \| "exchange_proposal"`. Must match listing's `listingType`.                                                       |
| `message`              | String   | Free-form note from the claimer.                                                                                                       |
| `offeredItem.title`    | String   | Required when `type = "exchange_proposal"`.                                                                                            |
| `offeredItem.imageUrl` | String   | Optional photo of offered item.                                                                                                        |
| `offeredItem.notes`    | String   | Optional context.                                                                                                                      |
| `status`               | String   | Enum: `"submitted" \| "pending" \| "accepted" \| "rejected" \| "counter" \| "completed" \| "cancelled"`. Default `"submitted"`.        |
| `counterOf`            | ObjectId | FK → `claims._id`. Set when this claim is a counter-offer to a previous one. Nullable.                                                 |
| `ownerDecisionAt`      | Date     | Set when owner accepts / rejects / counters.                                                                                           |
| `completedAt`          | Date     | Set when handoff/exchange is confirmed complete.                                                                                       |
| `createdAt`            | Date     | Server-set.                                                                                                                            |
| `updatedAt`            | Date     | Server-set.                                                                                                                            |

**Indexes**
- `{ listingId: 1, status: 1, createdAt: -1 }`
- `{ ownerUserId: 1, status: 1, createdAt: -1 }` — Owner inbox
- `{ claimerUserId: 1, status: 1, createdAt: -1 }` — Claimer's activity
- Partial unique index to enforce one accepted claim per listing:
  `{ listingId: 1 }` where `{ status: "accepted" }`

**Safety rules (per §4.5)**
- Only authenticated users can submit claims.
- Only the listing's `ownerUserId` can change a claim from `submitted`/`pending`
  to `accepted` / `rejected` / `counter`.
- Accepting one claim must atomically reject all other open claims on the
  same listing and transition the listing to `accepted` (write-transaction).

---

## 8. `notifications`

Per-user fan-out for §4.4. Both claimer and owner get rows when state
changes occur (submit, accept, reject, counter, complete).

| Field              | Type     | Notes                                                            |
|--------------------|----------|------------------------------------------------------------------|
| `_id`              | ObjectId | Primary key.                                                     |
| `userId`           | ObjectId | FK → `users._id`. The recipient. Indexed.                        |
| `type`             | String   | Enum: `"claim_submitted" \| "claim_accepted" \| "claim_rejected" \| "claim_countered" \| "claim_completed" \| "listing_updated"`. |
| `title`            | String   | Short headline.                                                  |
| `body`             | String   | Notification body.                                               |
| `relatedListingId` | ObjectId | FK → `listings._id`. Nullable.                                   |
| `relatedClaimId`   | ObjectId | FK → `claims._id`. Nullable.                                     |
| `channel`          | String   | Enum: `"in_app" \| "email" \| "push"`. Default `"in_app"`.       |
| `deliveredAt`      | Date     | Set when external channel confirms delivery (email/push).        |
| `read`             | Boolean  | Default `false`.                                                 |
| `readAt`           | Date     | Set when user opens the notification.                            |
| `createdAt`        | Date     | Server-set.                                                      |

**Indexes**
- `{ userId: 1, read: 1, createdAt: -1 }` — Notification bell + unread count
- `{ userId: 1, createdAt: -1 }`
- `{ relatedClaimId: 1 }`

---

## 9. `audit_logs`

Polymorphic audit trail (§4 explicitly: "every status change READ and WRITE
goes through the database … audit / notification log rows stored in same
database"). Covers all four sections.

| Field           | Type     | Notes                                                                                       |
|-----------------|----------|---------------------------------------------------------------------------------------------|
| `_id`           | ObjectId | Primary key.                                                                                |
| `entityType`    | String   | Enum: `"user" \| "session" \| "otp" \| "listing_category" \| "listing" \| "claim"`.        |
| `entityId`      | ObjectId | The `_id` of the affected document.                                    |
| `action`        | String   | e.g. `"create"`, `"update"`, `"status_change"`, `"login"`, `"logout"`, `"otp_issued"`, `"password_reset"`. |
| `actorUserId`   | ObjectId | FK → `users._id`. The user who initiated the action. Nullable for system actions. |
| `previousState` | Object   | Snapshot of changed fields before the action.                          |
| `newState`      | Object   | Snapshot of changed fields after the action.                           |
| `ipAddress`     | String   | From request, when applicable.                                         |
| `userAgent`     | String   | From request, when applicable.                                         |
| `metadata`      | Object   | Extra context (e.g. OTP purpose, claim type).                          |
| `createdAt`     | Date     | Server-set.                                                            |

**Indexes**
- `{ entityType: 1, entityId: 1, createdAt: -1 }`
- `{ actorUserId: 1, createdAt: -1 }`
- `{ action: 1, createdAt: -1 }`

---

## 10. Relationships (summary)

```
users              (1) ──< sessions          (N)   owner of authenticated sessions
users              (1) ──< otps              (N)   issued OTPs for the account
users              (1) ──< listings          (N)   listings.ownerUserId       ← "a user has many listings"
users              (1) ──< claims            (N)   claims.claimerUserId
users              (1) ──< claims            (N)   claims.ownerUserId         (denormalized)
users              (1) ──< notifications     (N)   notifications.userId       (recipient)

listing_categories (1) ──< listing_categories (N)  parent → children (self-ref via parentId)
listing_categories (1) ──< listings          (N)   listings.categoryId

listings           (1) ──< claims            (N)   claims.listingId
listings           (1) ──< notifications     (N)   notifications.relatedListingId
claims             (1) ──< notifications     (N)   notifications.relatedClaimId
claims             (1) ──< claims            (N)   claims.counterOf

users/sessions/otps/listing_categories/listings/claims ──< audit_logs (polymorphic entityType+entityId)
```

---

## 11. Mapping back to the DFDs

| DFD step                              | Collections touched                              |
|---------------------------------------|--------------------------------------------------|
| §1.1 Registration                     | INSERT `users`; INSERT `sessions`; `audit_logs`  |
| §1.2 Login                            | READ `users`; INSERT `sessions`; `audit_logs`    |
| §1.3 Session / protected routes       | READ `sessions`                                  |
| §1.4 Forgot password (OTP)            | READ `users`; INSERT/UPDATE `otps`               |
| §1.5 Reset password                   | UPDATE `users.passwordHash`; mark `otps.consumedAt`; DELETE `sessions` for user |
| §1.6 Logout                           | DELETE `sessions._id`                            |
| §2 Upload (mode selection)            | READ `listing_categories` WHERE `parentId = <root._id>` to populate the **level-1** dropdown (children) |
| §2 Upload (child picked)              | READ `listing_categories` WHERE `parentId = <child._id>` to populate the **level-2** dropdown (sub-children) |
| §2 Upload (submit)                    | READ `sessions` (auth); READ `listing_categories` to validate that `categoryId` is a leaf in the chosen root's subtree; compute `categoryPath` from `ancestors`; INSERT `listings` |
| §3 Load profile shell                 | READ `sessions` → READ `users`                   |
| §3 Listings panel                     | READ `listings` WHERE `ownerUserId = currentUser` (User 1 ──< Listings N) |
| §4.1 Submit claim/proposal            | INSERT `claims`; UPDATE `listings.status = pending`; INSERT `notifications` (owner) |
| §4.2 Owner review                     | UPDATE `claims.status` (+ `ownerDecisionAt`); INSERT `notifications` (claimer) |
| §4.3 Lifecycle / completion           | UPDATE `claims.status`, `listings.status`, set `acceptedClaimId`, `claimedByUserId`, `completedAt`; INSERT `audit_logs` |
| §4.4 Notifications fan-out            | INSERT `notifications` rows for both parties; optional email/push |

---

## 12. Data integrity & transactions

- Use **MongoDB transactions** for cross-document writes:
  - Accepting a claim must atomically: set winning claim to `accepted`,
    reject all other open claims for the listing, update `listings.status`,
    set `acceptedClaimId` / `claimedByUserId`, and write `notifications` +
    `audit_logs`.
  - Password reset must atomically: update `users.passwordHash`, mark
    `otps.consumedAt`, delete that user's `sessions`, write `audit_logs`.
- Use the **partial unique index** on `claims` to make duplicate acceptance
  impossible at the storage layer (defense in depth).
- All write paths emit an `audit_logs` row — never bypass.

---

*Schema derived from the four DFDs and the application feature requirements.
Aligns with the documented direction of moving persistence off the browser
and into the server (D2), with sessions in D1 (cookie-bound).*
