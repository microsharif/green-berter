# Almadot — Application Features and Requirements Listing

This document lists the required application features and user-flow requirements based on the current Almadot app documentation and expected product behavior.

---

## 1) User Login, Registration, Authentication, Forgot Password (OTP Verification), Reset Password, Logout

### 1.1 Registration
- User can create a new account from `/register`.
- Required fields: full name, email, phone, address, password, confirm password, terms acceptance.
- Optional field: profile image upload.
- System validates:
  - email format and uniqueness,
  - password and confirm password match,
  - required fields are not empty.
- On successful registration:
  - user record is created,
  - session is created automatically,
  - user is redirected to app entry/profile flow.

### 1.2 Login
- User can sign in from `/login` using email + password.
- System shows clear feedback for:
  - unregistered email,
  - incorrect password.
- On successful login:
  - authenticated session is restored,
  - user is redirected to intended page (if came from a protected route) or default page.

### 1.3 Authentication and Session Control
- Protected routes (example: `/upload`) must be accessible only when authenticated.
- On app load, session is restored from browser storage if available.
- Header/navigation must update by auth state:
  - logged out: Login action,
  - logged in: profile access + auth-aware UI.
- Session/user data is persisted in browser storage (`localStorage`) for current implementation scope.

### 1.4 Forgot Password with OTP Verification
- User can start forgot-password flow from login page.
- Step sequence:
  1. Enter registered email.
  2. System generates and sends OTP (email/SMS provider integration in production).
  3. User enters OTP within validity time window.
  4. System verifies OTP and allows reset-password screen.
- Rules:
  - OTP expiry timer,
  - limited retry attempts,
  - resend OTP with cooldown.
- Validation errors:
  - email not registered,
  - invalid/expired OTP,
  - retry limit exceeded.

### 1.5 Reset Password
- After OTP verification, user sets new password.
- Rules:
  - new password strength policy,
  - confirm password must match,
  - new password cannot be same as old password (recommended).
- On success:
  - user receives success confirmation,
  - user is redirected to login (or auto-login, based on final product decision).

### 1.6 Logout
- Logged-in user can logout from profile/navigation controls.
- On logout:
  - session is cleared,
  - protected pages become inaccessible until login,
  - user is redirected to home/login page.

---

## 2) Sequence for Uploading Product for Give and Exchange

### 2.1 Access and Mode Selection
- Upload page `/upload` is protected (login required).
- User can select listing mode:
  - Give,
  - Exchange.
- URL query mode support:
  - `/upload?mode=give`,
  - `/upload?mode=exchange`.

### 2.2 Product Upload Steps
1. User opens upload page.
2. User selects listing type (Give/Exchange).
3. User uploads product photo (required).
4. User enters listing details:
   - title,
   - category,
   - location,
   - story/description.
5. For Exchange mode, user also enters exchange-specific fields:
   - reference price,
   - desired item(s) for exchange.
6. User submits listing.

### 2.3 Validation and Submission Requirements
- Must block submission when required fields are missing.
- Image is mandatory for posting.
- Listing object must be normalized to catalog format.
- On successful submit:
  - product is added to merged catalog,
  - listing ID is attached to current user profile records,
  - user gets success feedback (toast),
  - user is redirected to the product detail page.

### 2.4 Draft and Storage Requirements
- Upload draft state is maintained while user is on upload flow.
- Draft can be reset after successful post.
- Uploaded listings are persisted in local storage for current app architecture.

---

## 3) User Profile Activities

### 3.1 Profile Access and Identity Display
- User can access profile page from authenticated header navigation.
- Profile must display:
  - name,
  - avatar (uploaded photo or default),
  - contact/location data as available.

### 3.2 Profile Functional Actions
- User can initiate:
  - Give Item flow,
  - Start Exchange flow,
  - Logout.
- Give and Exchange actions should deep-link to upload with correct mode query.

### 3.3 Listing Management View
- Profile includes a listings panel showing user-associated products.
- Listings are resolved from stored `listingProductIds` and catalog data.
- Newly uploaded products appear in profile listings after submission.

### 3.4 Additional Profile UX Requirements
- Responsive profile UI across desktop/mobile layouts.
- Placeholder actions (e.g., Edit Profile) should be clearly marked if incomplete.
- User feedback (toasts/loaders) should remain consistent with app-wide UI patterns.

---

## 4) Product Claim Process to Give and Take

### 4.1 Give (Claim) Process
1. Claimer opens product details for a Give listing.
2. Claimer chooses a claim/interest action.
3. System captures claim intent and claimant identity.
4. Owner is notified of incoming claim.
5. Owner reviews and accepts/rejects claim.
6. On acceptance:
   - item status becomes claimed/completed,
   - both users receive confirmation.

### 4.2 Exchange (Take) Process
1. Interested user opens Exchange listing.
2. User submits exchange proposal (offered item/message).
3. Owner reviews proposal details.
4. Owner accepts/rejects/counters (if counter flow is enabled).
5. On mutual acceptance:
   - exchange is marked agreed,
   - listing state updates to closed/completed.

### 4.3 Claim/Exchange State Requirements
- Each listing should expose a lifecycle state, e.g.:
  - available,
  - pending claim/proposal,
  - accepted,
  - completed,
  - rejected/cancelled.
- Claimed/completed items should not be shown as openly available in browse results.

### 4.4 Notifications and Audit Trail
- Users should receive status updates for claim/proposal changes.
- Basic claim/exchange history should be retained per listing and user.
- Timestamp and actor tracking are recommended for dispute resolution and transparency.

### 4.5 Safety and Policy Requirements
- Prevent duplicate acceptance of multiple claimers for the same listing.
- Restrict claim/accept actions to authenticated users only.
- Allow owner-only approval authority for their listing.
- Add abuse/report options for unsafe interactions (recommended for production).

---

## Notes
- Current application architecture is front-end only with `localStorage`; real OTP delivery, secure password reset, and transactional claim/exchange workflows require backend APIs and persistent server-side data.
- This document can be used as the baseline checklist for implementation planning and QA acceptance criteria.
