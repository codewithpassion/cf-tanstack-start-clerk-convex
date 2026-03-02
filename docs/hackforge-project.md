# hackforge

# HackForge — AI Hackathon Platform
**Product One Pager · v0.3 · March 2026**

---

## What is it?

HackForge is a platform for running structured hackathons. Organisers create and manage events, companies or individuals submit real-world problems to be solved, participants form teams and build solutions, and curators keep the quality bar high — then judges determine the winners.

It handles the full lifecycle: event setup → problem submissions → team formation → solution submissions → judging → results.

---

## Core Roles

| Role | What they do |
|---|---|
| **Organiser / Owner** | Creates the hackathon, sets all event details, manages access and roles |
| **Admin** | Full control over the hackathon — everything the owner can do, except transfer ownership |
| **Curator** | Reviews, approves, hides/unhides problems and solutions. Can publish results |
| **Judge** | Ranks submissions within assigned categories. No content management access |
| **Problem Proposer** | A company or individual that submits a challenge for teams to tackle |
| **Participant** | Signs up, forms or joins a team, asks questions, submits solutions |

---

## Hackathon Setup

When creating a hackathon, the organiser defines:

- Name, theme, and description
- Start date, end date, and submission cutoff
- About pages (sponsors, prizes, rules, eligibility)
- Categories (e.g. High School, Voice AI, Best Use of LLMs, Most Creative)
- Moderation mode (see below)
- Additional admins, curators, and judges

### Submission Cutoff

The organiser sets a hard cutoff date and time for solution submissions. Once the cutoff passes, the submission form closes and no new submissions or edits are accepted. The event end date (e.g. demo night) is separate from the submission cutoff.

### Moderation Modes

The organiser can independently toggle:

- **Open** — problems and solutions go live immediately
- **Curated problems** — problem submissions require curator approval before going live
- **Curated solutions** — solution submissions require curator approval before going live

Curators can hide or unhide problems and solutions at any time without deleting them.

---

## Categories

The organiser defines a set of categories for the hackathon. Categories can represent participant tracks (e.g. High School, Open), technology focus areas (e.g. Voice AI, Computer Vision), or any other grouping the organiser wants to recognise with prizes.

- A team can submit solutions to multiple categories
- A solution can belong to multiple categories
- Winners are determined per category, plus an overall winner
- A team can win a category and the overall — there are no restrictions on multiple wins

---

## Problem Submissions

Companies or individuals propose real challenges. Each submission includes a title, description, and background context.

Participants can ask questions directly on a problem. Answers are visible to all teams.

In curated mode, problems are hidden from participants until a curator approves them.

---

## Teams and Solutions

- Any registered participant can create or join a team
- A team can be a single person
- Teams select the problem(s) they are working on
- A team can submit multiple solutions (e.g. one per category they enter)
- All submissions must be in before the submission cutoff

### Solution Submission

| Field | Required? | Notes |
|---|---|---|
| Demo video | Required | Uploaded via server, stored in Cloudflare R2 |
| Presentation / slide deck | Required | PDF or PPTX, stored in R2 |
| Written description | Required | In-platform rich text |
| GitHub repo link | Optional | |
| Live demo link | Optional | Lovable, Bolt, Replit, or any URL |
| Categories | Required | Select one or more from the hackathon's defined categories |

In curated mode, submitted solutions are hidden from public view until a curator approves them.

---

## Judging and Scoring

Judges and curators are separate roles. Curators manage content quality. Judges determine the winners.

### Scoring Model: Ranked Choice

Each judge ranks submissions within their assigned category — 1st, 2nd, 3rd (and optionally further). Rankings from all judges are combined using a simple points tally:

| Rank | Points |
|---|---|
| 1st | 3 pts |
| 2nd | 2 pts |
| 3rd | 1 pt |
| Unranked | 0 pts |

The submission with the most total points wins the category. Ties are broken by number of 1st-place votes, then 2nd-place votes.

For the overall winner, judges do a separate ranking round across all approved submissions regardless of category.

### Results and Leaderboard

- Judges cannot see each other's rankings until the judging period closes
- The leaderboard is private until a curator explicitly publishes it
- The organiser or admin can override any result before publishing
- Results are never auto-published

---

## Access Management

Role assignments are per-hackathon. The same user can hold different roles across different events.

- **Owner** — full control, can transfer ownership
- **Admin** — full control except ownership transfer
- **Curator** — can approve/hide problems and solutions, and publish the leaderboard
- **Judge** — can rank submissions within assigned categories; no content management access

---

## Infrastructure Notes

The platform runs on Cloudflare Workers with Cloudflare R2 for all file storage. All uploads (videos, decks) are proxied through the Worker before being stored in R2.

---

## Out of Scope (v1)

- Payment processing for entry fees or prizes
- Native mobile app
- AI-assisted team matching or problem recommendations

--- 

### platform

this will be built on a boilerplate application that brings
- typescript
- tanstack-start
- cloudflare workers
- convex
- clerk

**Version:** 1.0.0
**Status:** active
**Exported:** 3/2/2026

## Project Brief

{
  "epics": [
    {
      "title": "Authentication & User Management",
      "description": "User registration, authentication via Clerk, profile management, notification preferences (email/in-app), and role-based access control foundation across hackathons.",
      "userStories": [
        {
          "id": "US-001",
          "title": "User Registration via Clerk",
          "description": "As a new user, I want to create an account on HackForge using Clerk authentication so that I can access the platform and participate in hackathons.",
          "acceptanceCriteria": "- User can register using email/password or supported OAuth providers (Google, GitHub)\n- Clerk handles all authentication flows including email verification\n- Upon successful registration, a user profile is automatically created in Convex database\n- User is redirected to profile completion page after first login\n- Registration errors display inline validation messages for form fields\n- System errors show toast notifications with actionable messages\n- Duplicate email addresses are rejected with clear error messaging\n- All registration actions are logged in the audit trail with timestamps",
          "techNotes": "**Implementation Approach:**\n\nLeverage Clerk's React components (`<SignUp />`) with TanStack Start's file-based routing. Create a `/sign-up` route using Clerk's pre-built UI to handle OAuth (Google, GitHub) and email/password flows.\n\n**Convex Integration:**\n\nImplement a Clerk webhook handler as a Convex HTTP action to listen for `user.created` events. This webhook creates the user profile document in Convex with fields: `clerkId`, `email`, `createdAt`, `profileComplete: false`. Use Clerk's `publicMetadata` to store the Convex user ID for quick lookups.\n\n**Post-Registration Flow:**\n\nIn the TanStack Start router, add a middleware check using Clerk's `useUser()` hook. If `profileComplete` is false, redirect to `/onboarding`. Store this flag in both Clerk metadata and Convex for redundancy.\n\n**Error Handling:**\n\nClerk handles most validation (email format, password strength). For duplicate emails, Clerk returns specific error codes—map these to user-friendly messages. Wrap Clerk components with an error boundary for unexpected failures, displaying toast notifications via a context provider.\n\n**Audit Logging:**\n\nCreate a Convex mutation `logAuditEvent` called from the webhook handler. Schema: `{ userId, action: 'USER_REGISTERED', timestamp, metadata: { provider, ip } }`. Index on `userId` and `timestamp` for efficient querying.\n\n**Security Considerations:**\n\nValidate webhook signatures using Clerk's `svix` library. Rate limiting is handled by Clerk. Ensure Convex functions use proper authentication context.",
          "testCases": "[{\"description\":\"Successful registration with email and password\",\"given\":\"A new user is on the registration page with no existing account\",\"when\":\"The user enters a valid email, a password meeting strength requirements, and submits the form\",\"then\":\"Clerk creates the account, sends verification email, webhook creates Convex profile with profileComplete=false, and user sees verification prompt\"},{\"description\":\"Successful registration via GitHub OAuth\",\"given\":\"A new user is on the registration page and has a GitHub account not linked to HackForge\",\"when\":\"The user clicks 'Continue with GitHub' and authorizes the application\",\"then\":\"Clerk creates the account, webhook creates Convex profile, audit log records 'USER_REGISTERED' with provider='github', and user is redirected to onboarding\"},{\"description\":\"Registration rejected for duplicate email\",\"given\":\"A user with email 'existing@example.com' already exists in the system\",\"when\":\"A new user attempts to register with 'existing@example.com'\",\"then\":\"Registration fails with inline error message 'An account with this email already exists', no duplicate profile is created, and sign-in option is suggested\"},{\"description\":\"Registration fails with weak password\",\"given\":\"A new user is on the registration page\",\"when\":\"The user enters a valid email but a password that does not meet Clerk's strength requirements (e.g., '123')\",\"then\":\"Form displays inline validation error on password field specifying requirements, submit button remains disabled until corrected\"},{\"description\":\"Webhook failure creates orphaned Clerk account gracefully\",\"given\":\"A new user completes Clerk registration but the Convex webhook handler fails due to database unavailability\",\"when\":\"The webhook returns an error status\",\"then\":\"Clerk retries the webhook per retry policy, user can still access Clerk auth, and on next login the system attempts profile creation recovery\"}]"
        },
        {
          "id": "US-002",
          "title": "User Login and Session Management",
          "description": "As a returning user, I want to securely log into HackForge so that I can access my hackathons, teams, and submissions.",
          "acceptanceCriteria": "- User can log in using email/password or previously linked OAuth providers\n- Clerk manages session tokens and refresh automatically\n- User is redirected to their dashboard or intended destination after login\n- Failed login attempts show appropriate error messages via inline validation\n- Session persists across browser tabs and reasonable time periods\n- User can log out from any page, clearing session completely\n- Login/logout actions are recorded in audit log with timestamps\n- Rate limiting applied to login endpoint to prevent brute force attacks",
          "techNotes": "**Implementation Approach:**\n\nLeverage Clerk's pre-built `<SignIn />` component with TanStack Start for seamless SSR integration. Configure Clerk middleware in the Cloudflare Worker entry point to handle session validation on every request.\n\n**Architecture Considerations:**\n\n1. **Session Management**: Use Clerk's `getAuth()` helper in server functions to extract user context. Sessions are JWT-based with automatic refresh handled client-side by Clerk's SDK.\n\n2. **Redirect Logic**: Store intended destination in URL params (`redirect_url`) before auth redirect. Post-login, use TanStack Router's `navigate()` to honor this or default to `/dashboard`.\n\n3. **Audit Logging**: Create a Convex mutation `logAuthEvent` triggered via Clerk webhooks (user.signed_in, user.signed_out). Store in an `auditLogs` table with userId, action, timestamp, IP, and userAgent.\n\n4. **Rate Limiting**: Implement at Cloudflare Worker level using `cf.cacheKey` with sliding window counter in KV. Suggest 5 attempts per minute per IP/email combination. Return 429 with Retry-After header.\n\n**Security Considerations:**\n- Enable Clerk's bot protection and CAPTCHA for suspicious patterns\n- Ensure logout clears Clerk session AND any app-specific cookies\n- Sanitize redirect URLs to prevent open redirect vulnerabilities\n\n**Dependencies:** US-001 (Registration) must exist for OAuth provider linking. Clerk webhook endpoints require Convex HTTP actions.",
          "testCases": "[{\"description\":\"Successful login with email and password\",\"given\":\"A registered user with email 'alex@example.com' and valid password exists\",\"when\":\"User enters correct credentials and submits login form\",\"then\":\"User is authenticated, redirected to dashboard, and session cookie is set with valid JWT\"},{\"description\":\"Login with OAuth provider redirects correctly\",\"given\":\"User previously registered via GitHub OAuth\",\"when\":\"User clicks 'Continue with GitHub' and completes OAuth flow\",\"then\":\"User is authenticated and redirected to original intended page stored in redirect_url param\"},{\"description\":\"Failed login shows inline validation error\",\"given\":\"A registered user exists with email 'alex@example.com'\",\"when\":\"User enters correct email but incorrect password\",\"then\":\"Form displays inline error 'Invalid email or password' without page reload and password field is cleared\"},{\"description\":\"Rate limiting blocks brute force attempts\",\"given\":\"An IP address has made 5 failed login attempts in the last minute\",\"when\":\"A 6th login attempt is made from the same IP\",\"then\":\"Server returns HTTP 429 with 'Retry-After' header and user sees 'Too many attempts, please try again later' message\"},{\"description\":\"Logout clears session completely across contexts\",\"given\":\"User is logged in with active session in two browser tabs\",\"when\":\"User clicks logout button in one tab\",\"then\":\"Session is invalidated, both tabs redirect to login page on next interaction, and audit log records logout event with timestamp\"}]"
        },
        {
          "id": "US-003",
          "title": "User Profile Management",
          "description": "As a registered user, I want to create and manage my profile so that other participants and organisers can identify me within hackathons.",
          "acceptanceCriteria": "- User can set display name, bio, and profile picture\n- Profile picture uploads are stored in Cloudflare R2\n- User can add optional fields: location, skills/interests, social links (GitHub, LinkedIn, portfolio)\n- All profile fields validate appropriately with inline error messages\n- Profile changes are saved and reflected immediately across the platform\n- User can view their own profile as others see it\n- Profile updates are logged in audit trail\n- Display name is required; other fields are optional",
          "techNotes": "**Implementation Approach:**\n\nCreate a profile management system leveraging Clerk's user metadata combined with Convex for extended profile data. Store basic identity in Clerk (display name synced to publicMetadata) while keeping rich profile data (bio, skills, social links) in a Convex `userProfiles` table linked by Clerk userId.\n\n**Architecture Considerations:**\n\n- **Profile Picture Upload:** Implement a presigned URL flow via Cloudflare R2. Create a Convex action that generates a presigned PUT URL, client uploads directly to R2, then stores the resulting URL in the profile. Use a dedicated `hackforge-avatars` bucket with public read access.\n- **Validation Strategy:** Use Zod schemas shared between client and server. Display name: 2-50 chars, required. Bio: max 500 chars. Social links: URL validation with domain allowlists (github.com, linkedin.com). Skills: array of strings, max 20 items.\n- **Real-time Updates:** Leverage Convex's reactive queries so profile changes propagate instantly across all connected clients viewing that profile.\n- **Audit Trail:** Create a `profileAuditLog` table capturing userId, timestamp, changedFields (as JSON diff), and IP address from request headers.\n\n**Security Considerations:**\n\n- Validate image uploads: check Content-Type (image/*), enforce max size (2MB)\n- Sanitize bio field to prevent XSS\n- Rate limit profile updates (max 10/minute)\n- Ensure users can only modify their own profiles via Clerk session validation\n\n**Dependencies:** Requires Clerk integration (US-001) and R2 bucket configuration.",
          "testCases": "[{\"description\":\"Successfully update display name and bio\",\"given\":\"An authenticated user with an existing profile\",\"when\":\"The user updates their display name to 'Alex Chen' and bio to 'Full-stack developer passionate about AI'\",\"then\":\"The profile is saved successfully, changes appear immediately on their profile page, and an audit log entry is created with the changed fields\"},{\"description\":\"Upload profile picture to R2 storage\",\"given\":\"An authenticated user on the profile edit page\",\"when\":\"The user selects a valid JPEG image (500KB) and clicks upload\",\"then\":\"The image is uploaded to Cloudflare R2, the profile picture URL is stored in the user profile, and the new avatar displays across the platform\"},{\"description\":\"Reject invalid profile picture upload\",\"given\":\"An authenticated user attempting to upload a profile picture\",\"when\":\"The user selects a file that is 5MB in size or has a non-image MIME type\",\"then\":\"The upload is rejected with an inline error message stating 'Profile picture must be an image under 2MB' and no changes are saved\"},{\"description\":\"Validate social links format\",\"given\":\"An authenticated user editing their social links\",\"when\":\"The user enters 'not-a-valid-url' in the GitHub field and 'https://linkedin.com/in/alexchen' in the LinkedIn field\",\"then\":\"An inline validation error appears under the GitHub field stating 'Please enter a valid GitHub URL', the LinkedIn field shows valid, and the save button remains disabled\"},{\"description\":\"Require display name field\",\"given\":\"An authenticated user editing their profile\",\"when\":\"The user clears the display name field and attempts to save\",\"then\":\"An inline error message 'Display name is required' appears, the form is not submitted, and focus moves to the display name field\"}]"
        },
        {
          "id": "US-004",
          "title": "Notification Preferences Configuration",
          "description": "As a user, I want to configure my notification preferences so that I receive relevant updates through my preferred channels without being overwhelmed.",
          "acceptanceCriteria": "- User can toggle email notifications on/off for each notification type\n- User can toggle in-app notifications on/off for each notification type\n- Notification types include: deadline reminders, approval notifications, result announcements, team invitations, Q&A updates\n- Default preferences are set to receive all notifications via both channels\n- Preferences are saved immediately with toast confirmation\n- User can use 'enable all' or 'disable all' shortcuts for each channel\n- Preference changes are logged in audit trail\n- Email notifications respect user's verified email from Clerk",
          "techNotes": "**Implementation Approach:**\n\nCreate a `userNotificationPreferences` table in Convex with a document per user, storing a map of notification types to channel preferences. Use Convex's reactive queries to sync preferences to the UI in real-time.\n\n**Schema Design:**\n```typescript\nnotificationPreferences: defineTable({\n  userId: v.string(), // Clerk user ID\n  preferences: v.object({\n    deadlineReminders: v.object({ email: v.boolean(), inApp: v.boolean() }),\n    approvalNotifications: v.object({ email: v.boolean(), inApp: v.boolean() }),\n    resultAnnouncements: v.object({ email: v.boolean(), inApp: v.boolean() }),\n    teamInvitations: v.object({ email: v.boolean(), inApp: v.boolean() }),\n    qnaUpdates: v.object({ email: v.boolean(), inApp: v.boolean() })\n  }),\n  updatedAt: v.number()\n}).index('by_user', ['userId'])\n```\n\n**Architecture Considerations:**\n- Use Convex mutations with optimistic updates for instant UI feedback\n- Implement audit logging via a separate `auditLog` table, triggered within the same mutation for atomicity\n- Fetch verified email status from Clerk's `useUser()` hook; disable email toggles if unverified\n- Create reusable `NotificationToggleGroup` component with bulk action buttons\n- Use Sonner (via TanStack Start) for toast confirmations\n\n**Security:**\n- Mutations must validate `ctx.auth` matches the preference document owner\n- Rate limit preference updates to prevent abuse (Convex action with rate limiting helper)\n\n**Dependencies:** Requires US-001 (user registration) and US-002 (email verification) to be complete.",
          "testCases": "[{\"description\":\"User successfully toggles individual notification preference\",\"given\":\"A logged-in user with default notification preferences (all enabled) is on the notification settings page\",\"when\":\"The user toggles off email notifications for deadline reminders and the mutation completes\",\"then\":\"The toggle reflects the off state, a success toast appears saying 'Preferences saved', and the database shows deadlineReminders.email as false while all other preferences remain true\"},{\"description\":\"User applies enable all shortcut for a channel\",\"given\":\"A logged-in user has previously disabled email notifications for 3 of 5 notification types\",\"when\":\"The user clicks the 'Enable all' button in the email notifications column\",\"then\":\"All 5 email notification toggles switch to enabled state, a single success toast confirms the bulk update, and the database reflects all email preferences as true\"},{\"description\":\"Email toggles disabled when email not verified\",\"given\":\"A logged-in user whose Clerk account has no verified email address navigates to notification preferences\",\"when\":\"The notification preferences page loads\",\"then\":\"All email notification toggles are visually disabled with a tooltip explaining 'Verify your email to enable email notifications', and clicking them does not trigger any mutation\"},{\"description\":\"Preference change is recorded in audit trail\",\"given\":\"A logged-in user with userId 'user_abc123' has inApp notifications for teamInvitations currently enabled\",\"when\":\"The user toggles off inApp notifications for team invitations\",\"then\":\"An audit log entry is created with action 'notification_preference_updated', userId 'user_abc123', details containing the changed field and old/new values, and a timestamp within 1 second of the request\"},{\"description\":\"New user receives default preferences on first access\",\"given\":\"A newly registered user who has never accessed notification settings\",\"when\":\"The user navigates to the notification preferences page for the first time\",\"then\":\"A preferences document is created with all notification types set to true for both email and inApp channels, and the UI displays all toggles in the enabled state\"}]"
        },
        {
          "id": "US-005",
          "title": "Account Linking and OAuth Management",
          "description": "As a user, I want to link multiple authentication providers to my account so that I can log in using my preferred method.",
          "acceptanceCriteria": "- User can link additional OAuth providers (Google, GitHub) from account settings\n- User can unlink OAuth providers as long as at least one login method remains\n- Attempting to link an already-used OAuth account shows clear error message\n- Linked accounts display in account settings with option to remove\n- Linking/unlinking actions require re-authentication for security\n- All account linking changes are logged in audit trail\n- Toast notifications confirm successful link/unlink actions",
          "techNotes": "**Implementation Approach:**\n\nLeverage Clerk's built-in OAuth account linking capabilities through their `externalAccounts` API. Clerk handles the OAuth flow complexity, but we need custom UI and validation logic.\n\n**Architecture Considerations:**\n\n1. **Account Settings Page**: Create `/settings/security` route using TanStack Start with sections for linked accounts and security options.\n\n2. **Clerk Integration**: Use `user.createExternalAccount()` for linking and `externalAccount.destroy()` for unlinking. Clerk's `useUser()` hook provides real-time external account state.\n\n3. **Re-authentication Flow**: Implement Clerk's `user.verifySession()` or prompt password/OAuth re-auth before sensitive operations. Consider session freshness check (e.g., require re-auth if session >15 minutes old).\n\n4. **Validation Logic**: Before unlinking, verify `user.externalAccounts.length + (user.passwordEnabled ? 1 : 0) > 1` to ensure one login method remains.\n\n5. **Audit Logging**: Store linking events in Convex with schema: `{userId, action: 'link'|'unlink', provider, timestamp, ipAddress}`. Use Convex mutations triggered after successful Clerk operations.\n\n6. **Error Handling**: Clerk returns specific error codes for already-linked accounts (`external_account_exists`). Map these to user-friendly messages.\n\n**Security Considerations:**\n- Rate limit linking attempts to prevent enumeration attacks\n- Log failed linking attempts for security monitoring\n- Consider email notification when new provider linked\n\n**Dependencies:** Requires US-001 (Basic Authentication) and US-004 (Profile Management) for settings page foundation.",
          "testCases": "[{\"description\":\"Successfully link new OAuth provider to account\",\"given\":\"User is logged in with email/password and has no Google account linked\",\"when\":\"User clicks 'Link Google Account', completes OAuth flow, and re-authenticates\",\"then\":\"Google account appears in linked accounts list, success toast displays, and audit log entry is created with action 'link' and provider 'google'\"},{\"description\":\"Prevent unlinking last remaining login method\",\"given\":\"User is logged in with only GitHub OAuth (no password, no other providers)\",\"when\":\"User attempts to unlink their GitHub account\",\"then\":\"Unlink button is disabled or action is blocked with error message 'Cannot remove your only login method. Please add another provider or set a password first.'\"},{\"description\":\"Show error when linking already-used OAuth account\",\"given\":\"User A is logged in and User B has already linked their Google account (google-123)\",\"when\":\"User A attempts to link the same Google account (google-123)\",\"then\":\"Error message displays 'This Google account is already linked to another user. Please use a different account or contact support.'\"},{\"description\":\"Require re-authentication for security-sensitive actions\",\"given\":\"User is logged in with session older than 15 minutes\",\"when\":\"User clicks 'Unlink' on a connected OAuth provider\",\"then\":\"Re-authentication modal appears requiring password or fresh OAuth login before action proceeds\"},{\"description\":\"Display all linked accounts with management options\",\"given\":\"User has Google and GitHub OAuth providers linked plus password authentication\",\"when\":\"User navigates to account settings security section\",\"then\":\"Both providers display with icons, email identifiers, link dates, and enabled 'Remove' buttons for each\"}]"
        },
        {
          "id": "US-006",
          "title": "Password Reset and Account Recovery",
          "description": "As a user who has forgotten my password, I want to securely reset it so that I can regain access to my account.",
          "acceptanceCriteria": "- User can request password reset via email from login page\n- Clerk sends secure reset link to verified email address\n- Reset link expires after reasonable time period (e.g., 1 hour)\n- User can set new password meeting security requirements\n- Password requirements are clearly displayed with inline validation\n- Successful reset logs user in and shows toast confirmation\n- Failed reset attempts (invalid/expired link) show clear error messages\n- Password reset requests are rate limited to prevent abuse\n- All password reset actions are logged in audit trail",
          "techNotes": "**Implementation Approach:**\n\nThis story leverages Clerk's built-in password reset functionality, requiring minimal custom implementation while ensuring proper integration with the HackForge platform.\n\n**Architecture Considerations:**\n\n1. **Clerk Integration:** Use `<SignIn />` component's forgot password flow or Clerk's `useSignIn` hook for custom UI. The `forgotPassword` method initiates the reset email via Clerk's infrastructure.\n\n2. **Custom Reset Page:** Create `/reset-password` route using TanStack Start that handles the magic link callback. Use Clerk's `handleMagicLinkVerification` for token validation.\n\n3. **Password Validation:** Implement client-side validation matching Clerk's password policy (configurable in Clerk Dashboard). Use real-time feedback with debounced validation for UX.\n\n4. **Rate Limiting:** Implement at Cloudflare Workers edge using KV store to track reset requests per email/IP. Suggest 3 requests per email per hour, 10 per IP per hour.\n\n5. **Audit Logging:** Create Convex mutation `logPasswordResetEvent` triggered on: request initiated, link clicked, password changed, and failures. Store IP, user agent, timestamp, and outcome.\n\n**Security Considerations:**\n- Never confirm/deny email existence (timing-safe responses)\n- Invalidate all existing sessions on password change\n- Log failed verification attempts for security monitoring\n- Consider adding CAPTCHA after multiple failed attempts\n\n**Dependencies:** Relies on US-004 (email infrastructure) for delivery. Audit trail feeds into admin dashboard (future epic).",
          "testCases": "[{\"description\":\"Successful password reset flow\",\"given\":\"A registered user with verified email 'user@example.com' is on the login page\",\"when\":\"User clicks 'Forgot Password', enters their email, receives reset link, clicks link within 1 hour, and enters a valid new password meeting requirements\",\"then\":\"Password is updated, user is automatically logged in, toast displays 'Password reset successful', and audit log records the successful reset\"},{\"description\":\"Expired reset link handling\",\"given\":\"A user has requested a password reset and received a reset link\",\"when\":\"User clicks the reset link after 1 hour has passed\",\"then\":\"User sees error message 'This reset link has expired. Please request a new one', is redirected to forgot password page, and audit log records the expired link attempt\"},{\"description\":\"Password validation feedback\",\"given\":\"User is on the password reset page with valid token\",\"when\":\"User types 'weak' in the new password field\",\"then\":\"Inline validation displays unmet requirements in red (minimum 8 characters, uppercase, number, special character) and submit button remains disabled\"},{\"description\":\"Rate limiting prevents abuse\",\"given\":\"A user or IP has requested 3 password resets in the last hour\",\"when\":\"Another password reset is requested for the same email\",\"then\":\"System returns 'Too many reset requests. Please try again later' without sending email, and the attempt is logged for security monitoring\"},{\"description\":\"Invalid reset token handling\",\"given\":\"A user navigates to the reset password page\",\"when\":\"The URL contains a malformed or tampered reset token\",\"then\":\"User sees error message 'Invalid reset link. Please request a new password reset', no password change form is displayed, and suspicious activity is logged\"}]"
        },
        {
          "id": "US-007",
          "title": "Role-Based Access Control Foundation",
          "description": "As a platform user, I want my access permissions to be determined by my assigned roles so that I can only perform actions appropriate to my responsibilities.",
          "acceptanceCriteria": "- System supports roles: Organiser, Admin, Curator, Judge, Problem Proposer, Participant\n- Roles are assigned per-hackathon (user can have different roles in different hackathons)\n- User can have multiple roles within the same hackathon\n- Role assignments are stored in Convex and checked on all protected actions\n- Unauthorized access attempts return appropriate error responses\n- UI elements are conditionally rendered based on user's roles\n- Role changes take effect immediately without requiring re-login\n- All role assignments and changes are logged in audit trail with actor information",
          "techNotes": "Implement RBAC using a HackathonRoleAssignment Convex table with composite key (userId, hackathonId, role). Create a roles enum type for type-safety across the stack. Build a useHackathonRoles(hackathonId) hook that queries user's roles and provides helper methods like hasRole(), hasAnyRole(), and can() for permission checks.\n\nServer-side: Create a withRoleCheck() wrapper for Convex mutations/queries that validates roles before execution. This should accept required roles as parameter and throw ConvexError with 403-equivalent code on failure. Cache role lookups within request context to avoid repeated DB queries.\n\nClient-side: Build a RoleGate component for conditional rendering: <RoleGate roles={['Organiser', 'Admin']}><AdminPanel /></RoleGate>. Use React Context to provide roles at hackathon route level, refreshing on focus/navigation.\n\nFor immediate effect on role changes, leverage Convex's real-time subscriptions - the useHackathonRoles hook will automatically update when assignments change. Implement an AuditLog table capturing: timestamp, actorId, targetUserId, hackathonId, action (ROLE_ASSIGNED|ROLE_REVOKED), role, and metadata. Use Convex triggers or wrap assignment mutations to ensure audit entries are always created atomically.\n\nConsider creating a permissions map that translates roles to granular permissions (e.g., Curator can 'review_problems' but not 'manage_judges'), enabling future flexibility without schema changes.",
          "testCases": "[{\"description\":\"User with Organiser role can access hackathon admin functions\",\"given\":\"A user is authenticated and has Organiser role assigned for hackathon H1\",\"when\":\"The user attempts to access the hackathon settings page for H1\",\"then\":\"The settings page loads successfully and all admin controls are visible\"},{\"description\":\"User without required role receives authorization error\",\"given\":\"A user is authenticated with only Participant role for hackathon H1\",\"when\":\"The user attempts to call the assignJudge mutation for H1\",\"then\":\"The system returns a 403 Forbidden error with message 'Insufficient permissions' and the action is not performed\"},{\"description\":\"User can have different roles across different hackathons\",\"given\":\"A user has Organiser role for hackathon H1 and Participant role for hackathon H2\",\"when\":\"The user views the dashboard for each hackathon\",\"then\":\"H1 dashboard shows organiser tools and H2 dashboard shows participant view only\"},{\"description\":\"Role assignment change takes effect immediately\",\"given\":\"A user with Participant role is viewing hackathon H1 dashboard\",\"when\":\"An admin assigns the Curator role to that user for H1\",\"then\":\"Without page refresh or re-login, the user's UI updates to show Curator-specific elements within 2 seconds\"},{\"description\":\"Role changes are recorded in audit trail\",\"given\":\"An admin is authenticated and viewing user management for hackathon H1\",\"when\":\"The admin assigns the Judge role to user U1\",\"then\":\"An audit log entry is created with the admin's ID as actor, U1 as target, 'ROLE_ASSIGNED' action, 'Judge' role, hackathon H1, and current timestamp\"}]"
        },
        {
          "id": "US-008",
          "title": "Account Deletion and Data Management",
          "description": "As a user, I want to be able to delete my account so that my personal data is removed from the platform when I no longer wish to use it.",
          "acceptanceCriteria": "- User can request account deletion from account settings\n- Deletion requires re-authentication and explicit confirmation\n- System warns user about consequences (loss of hackathon history, team memberships)\n- User's personal data is removed from Convex database\n- User's profile picture is removed from Cloudflare R2\n- Historical records (submissions, team memberships) are anonymized rather than deleted for audit integrity\n- Clerk account is deleted via API integration\n- Deletion is logged in audit trail (anonymized user reference)\n- User receives confirmation email before deletion is processed\n- 7-day grace period before permanent deletion with option to cancel",
          "techNotes": "**Implementation Approach:**\n\nImplement a soft-delete workflow with a 7-day grace period using Convex scheduled functions. Create a `deletionRequests` table tracking user deletion state (pending, cancelled, completed) with timestamps.\n\n**Architecture:**\n\n1. **Re-authentication Flow:** Use Clerk's `reverifySession()` or require password re-entry before initiating deletion. Store a short-lived deletion token in Convex.\n\n2. **Deletion Request Mutation:** Create `requestAccountDeletion` mutation that validates re-auth, creates deletion request record, schedules a Convex `scheduledFunction` to execute in 7 days, and triggers confirmation email via Clerk or Resend.\n\n3. **Scheduled Deletion Function:** The scheduled function performs: (a) anonymize user references in `submissions`, `teamMembers`, `judgingRecords` by replacing userId with `DELETED_USER_<hash>`; (b) delete personal data from `users` table; (c) call Clerk Admin API `DELETE /users/{user_id}`; (d) delete R2 objects via `r2.delete()` for profile pictures using stored object keys; (e) create audit log entry with anonymized reference.\n\n4. **Cancellation:** Allow cancellation by updating deletion request status and cancelling the scheduled function via `ctx.scheduler.cancel(scheduledId)`.\n\n**Security Considerations:**\n- Rate limit deletion requests to prevent abuse\n- Ensure re-auth token expires quickly (5 minutes)\n- Audit log must not contain PII post-deletion\n- Handle Clerk API failures gracefully with retry logic\n\n**Dependencies:** US-001 (authentication), US-002 (profile with R2 storage)",
          "testCases": "[{\"description\":\"Successfully initiate account deletion with valid re-authentication\",\"given\":\"A logged-in user on the account settings page who has re-authenticated within the last 5 minutes\",\"when\":\"The user confirms account deletion after reviewing the consequences warning\",\"then\":\"A deletion request is created with 'pending' status, a scheduled deletion is set for 7 days, the user receives a confirmation email, and the user sees a message confirming the grace period with cancellation option\"},{\"description\":\"Reject deletion request without re-authentication\",\"given\":\"A logged-in user on the account settings page who has not re-authenticated recently\",\"when\":\"The user attempts to initiate account deletion\",\"then\":\"The system prompts for password re-entry, the deletion request is blocked until re-authentication succeeds, and no deletion request record is created\"},{\"description\":\"Cancel deletion during grace period\",\"given\":\"A user with a pending deletion request within the 7-day grace period\",\"when\":\"The user clicks 'Cancel Deletion' from the account settings or email link\",\"then\":\"The deletion request status changes to 'cancelled', the scheduled deletion function is cancelled, the user receives confirmation of cancellation, and the account remains fully functional\"},{\"description\":\"Complete deletion anonymizes historical records\",\"given\":\"A user with pending deletion whose 7-day grace period has expired and who has submissions and team memberships\",\"when\":\"The scheduled deletion function executes\",\"then\":\"The user's personal data is removed from the users table, submissions and team records show 'DELETED_USER_xxx' instead of user ID, the profile picture is deleted from R2, the Clerk account is deleted, and an anonymized audit log entry is created\"},{\"description\":\"Handle Clerk API failure during deletion gracefully\",\"given\":\"A deletion in progress where the Clerk API is temporarily unavailable\",\"when\":\"The scheduled deletion function attempts to delete the Clerk account and receives a 503 error\",\"then\":\"The deletion is retried with exponential backoff, local data deletion proceeds independently, the failure is logged for admin review, and the user is notified if deletion cannot complete after retries\"}]"
        }
      ]
    },
    {
      "title": "Hackathon Setup & Configuration",
      "description": "Creating and managing hackathons including name, theme, dates, submission cutoff, about pages, categories, moderation modes (open/curated), visibility settings (public/invite-only), and submission gallery configuration.",
      "userStories": [
        {
          "id": "US-009",
          "title": "Create New Hackathon with Basic Details",
          "description": "As an Organiser, I want to create a new hackathon with basic information (name, theme, description) so that I can establish the foundation for my event.",
          "acceptanceCriteria": "- Form includes fields for hackathon name (required, max 100 characters), theme (required, max 200 characters), and rich-text description\n- Name uniqueness is validated across active hackathons\n- Inline validation errors display for invalid/missing required fields\n- Toast notification confirms successful hackathon creation\n- User is redirected to hackathon dashboard after creation\n- Audit log entry captures creation event with timestamp and user ID\n- Rate limiting prevents rapid creation attempts (max 5 hackathons per hour per user)",
          "techNotes": "**Implementation Approach:**\n\nCreate a multi-layer solution using Convex mutations for hackathon creation with server-side validation. The form component should use TanStack Form with Zod schema validation for client-side checks before submission.\n\n**Database Schema (Convex):**\n- `hackathons` table: `id`, `name` (indexed), `theme`, `description` (rich text stored as JSON), `status` (enum: draft/active/completed/archived), `organiserId`, `createdAt`, `updatedAt`\n- `auditLogs` table: `entityType`, `entityId`, `action`, `userId`, `timestamp`, `metadata`\n- `rateLimits` table: `userId`, `action`, `windowStart`, `count`\n\n**Key Implementation Details:**\n1. Use Convex's `ctx.auth` to verify Clerk session and extract userId\n2. Implement rate limiting as a Convex query checking creation count within sliding 1-hour window\n3. Name uniqueness check should query hackathons where `status !== 'archived'` using a compound index\n4. Rich text editor: Consider Tiptap or Lexical for description field, storing as serialized JSON\n5. Use Convex's transactional guarantees to atomically create hackathon + audit log entry\n\n**Security Considerations:**\n- Validate Organiser role via Clerk metadata before allowing creation\n- Sanitize rich text content server-side to prevent XSS\n- Rate limit check must occur server-side in mutation, not just client\n\n**Dependencies:** Requires Clerk role configuration for 'Organiser' role. Consider extracting audit logging into a reusable Convex function.",
          "testCases": "[{\"description\":\"Successfully create hackathon with valid basic details\",\"given\":\"An authenticated user with Organiser role is on the create hackathon page and has created fewer than 5 hackathons in the past hour\",\"when\":\"They enter a unique name 'AI Innovation Challenge 2025', theme 'Sustainable Technology', a valid rich-text description, and submit the form\",\"then\":\"A success toast notification appears, the hackathon is persisted to the database with correct fields, an audit log entry is created with userId and timestamp, and user is redirected to the new hackathon dashboard\"},{\"description\":\"Reject creation when hackathon name already exists among active hackathons\",\"given\":\"An Organiser is creating a hackathon and an active hackathon named 'Climate Hack 2025' already exists\",\"when\":\"They enter 'Climate Hack 2025' as the hackathon name and attempt to submit\",\"then\":\"An inline validation error displays under the name field stating 'A hackathon with this name already exists', the form is not submitted, and no database records are created\"},{\"description\":\"Display inline validation errors for missing required fields\",\"given\":\"An Organiser is on the create hackathon form with all fields empty\",\"when\":\"They focus and blur the name field without entering text, then click the submit button\",\"then\":\"Inline error messages appear under name field showing 'Name is required' and under theme field showing 'Theme is required', submit button remains disabled or submission is prevented\"},{\"description\":\"Enforce rate limiting after 5 hackathon creations per hour\",\"given\":\"An Organiser has successfully created 5 hackathons within the last 60 minutes\",\"when\":\"They attempt to create a 6th hackathon with valid details\",\"then\":\"The creation is rejected with an error message 'Rate limit exceeded. You can create up to 5 hackathons per hour. Please try again later.', no hackathon is created, and the attempt is logged\"},{\"description\":\"Enforce maximum character limits on name and theme fields\",\"given\":\"An Organiser is filling out the create hackathon form\",\"when\":\"They enter a name exceeding 100 characters and a theme exceeding 200 characters\",\"then\":\"The name field shows character count and error 'Name must be 100 characters or less', the theme field shows error 'Theme must be 200 characters or less', and form submission is blocked until corrected\"}]"
        },
        {
          "id": "US-010",
          "title": "Configure Hackathon Timeline and Dates",
          "description": "As an Organiser, I want to set key dates for my hackathon (start date, end date, submission cutoff, judging period) so that participants understand the event schedule.",
          "acceptanceCriteria": "- Date picker allows selection of: registration open, hackathon start, submission cutoff, judging start, judging end, results date\n- Validation ensures logical date ordering (start before end, cutoff before judging)\n- Dates display in user's local timezone with UTC stored in database\n- Warning shown if submission cutoff is less than 24 hours from start\n- Changes to dates after hackathon starts require confirmation dialog\n- Timeline is displayed visually on hackathon public/about page\n- Audit log captures all date modifications with before/after values",
          "techNotes": "**Implementation Approach:**\n\nCreate a `HackathonTimeline` component using a date-range picker library like `react-day-picker` or `@internationalized/date` for robust timezone handling. Store all dates as UTC timestamps in Convex using `v.number()` for epoch milliseconds.\n\n**Architecture:**\n- Convex schema: Add `timeline` object to hackathon document with fields: `registrationOpen`, `hackathonStart`, `submissionCutoff`, `judgingStart`, `judgingEnd`, `resultsDate`\n- Create `mutations/updateTimeline.ts` with server-side validation logic for date ordering\n- Use Convex's `ctx.db.patch()` for atomic updates with audit logging via a separate `auditLogs` table\n\n**Timezone Handling:**\nUse `Intl.DateTimeFormat` API for client-side display. Store user's timezone preference in Clerk metadata or derive from browser. Display format: \"Mar 15, 2024 at 2:00 PM (PST)\" with UTC tooltip.\n\n**Validation Logic:**\nImplement as a pure function shared between client (immediate feedback) and server (source of truth):\n```\nregistrationOpen < hackathonStart < submissionCutoff < judgingStart < judgingEnd <= resultsDate\n```\n\n**Visual Timeline:**\nUse a horizontal stepper/timeline component showing phases with current phase highlighted. Consider `react-chrono` or custom SVG-based visualization.\n\n**Security Considerations:**\n- Verify organiser role via Clerk session in Convex mutation\n- Rate-limit date changes to prevent abuse\n- Confirmation dialog state should be client-only; server validates hackathon status independently\n\n**Dependencies:** Requires US-001 (Create Hackathon) for base document structure.",
          "testCases": "[{\"description\":\"Successfully save valid hackathon timeline with all dates in correct order\",\"given\":\"An organiser is on the timeline configuration page for their draft hackathon\",\"when\":\"They select registration open (Jan 1), hackathon start (Jan 15), submission cutoff (Jan 20), judging start (Jan 21), judging end (Jan 25), results date (Jan 26) and click Save\",\"then\":\"All dates are stored in UTC in the database, success toast is shown, and audit log entry is created with the new values\"},{\"description\":\"Reject timeline with illogical date ordering\",\"given\":\"An organiser is configuring the hackathon timeline\",\"when\":\"They set submission cutoff (Jan 25) after judging start (Jan 20) and attempt to save\",\"then\":\"Validation error is displayed stating 'Submission cutoff must be before judging start', save button remains disabled, and no database write occurs\"},{\"description\":\"Display warning for tight submission window\",\"given\":\"An organiser is setting hackathon dates\",\"when\":\"They set hackathon start as March 1 at 9:00 AM and submission cutoff as March 1 at 11:00 PM (14 hours difference)\",\"then\":\"A warning banner appears stating 'Submission window is less than 24 hours. Participants may not have enough time to complete their projects.' but saving is still allowed\"},{\"description\":\"Require confirmation when modifying dates after hackathon has started\",\"given\":\"A hackathon has started (current date is past hackathonStart) and the organiser navigates to timeline settings\",\"when\":\"They attempt to extend the submission cutoff by 2 days and click Save\",\"then\":\"A confirmation dialog appears warning 'This hackathon is already in progress. Changing dates will notify all participants. Are you sure?' with Cancel and Confirm options\"},{\"description\":\"Display dates in user's local timezone while storing UTC\",\"given\":\"An organiser in PST (UTC-8) has saved hackathon start as Jan 15, 2024 9:00 AM PST\",\"when\":\"A participant in EST (UTC-5) views the hackathon public page\",\"then\":\"The participant sees 'January 15, 2024 at 12:00 PM EST' and hovering shows '17:00 UTC', while database contains timestamp 1705334400000\"}]"
        },
        {
          "id": "US-011",
          "title": "Set Hackathon Visibility and Discovery Settings",
          "description": "As an Organiser, I want to configure whether my hackathon appears in the public directory or is invite-only so that I can control who discovers and accesses my event.",
          "acceptanceCriteria": "- Toggle option for 'Public' (listed in directory) or 'Invite-Only' (direct link access only)\n- Public hackathons appear in browseable directory with search/filter capabilities\n- Invite-only hackathons generate a unique shareable link\n- Visibility can be changed before hackathon starts; warning shown if changing after registration opens\n- Invite-only hackathons show 'Private Event' badge when accessed via direct link\n- SEO metadata (noindex) applied to invite-only hackathon pages\n- Audit log tracks visibility changes with timestamp",
          "techNotes": "**Implementation Approach:**\n\nCreate a visibility configuration system with two primary modes stored in Convex. The hackathon schema should include `visibility: 'public' | 'invite-only'`, `inviteCode: string` (UUID for shareable links), and `visibilityChangedAt: number` timestamp.\n\n**Architecture Considerations:**\n\n1. **Directory Indexing**: Add a Convex index on `visibility` field for efficient public hackathon queries. The directory page queries only `visibility: 'public'` records with pagination.\n\n2. **Invite Link Generation**: Use `crypto.randomUUID()` on Cloudflare Workers to generate unique invite codes. Store as `/join/{inviteCode}` routes that resolve to the hackathon.\n\n3. **SEO Control**: Implement middleware in TanStack Start that injects `<meta name=\"robots\" content=\"noindex, nofollow\">` for invite-only pages. Use Cloudflare Workers to set `X-Robots-Tag` header as backup.\n\n4. **Visibility Change Guard**: Query registration count before allowing visibility changes. If registrations exist, show confirmation modal warning about potential participant confusion.\n\n5. **Audit Logging**: Create `visibilityAuditLog` Convex table with `hackathonId`, `previousValue`, `newValue`, `changedBy` (Clerk userId), and `timestamp`. Use Convex mutation triggers.\n\n**Security Considerations:**\n- Validate organiser permissions via Clerk session before visibility mutations\n- Rate-limit invite code lookups to prevent enumeration attacks\n- Ensure invite codes aren't guessable (use UUID v4, not sequential)\n\n**Dependencies:** Requires US-009 (basic hackathon creation) for the hackathon entity to exist.",
          "testCases": "[{\"description\":\"Successfully toggle hackathon to public visibility\",\"given\":\"An authenticated Organiser with an invite-only hackathon that has no registrations\",\"when\":\"The Organiser sets visibility to 'Public' and saves\",\"then\":\"The hackathon visibility updates to 'public', it appears in the public directory, the invite code remains valid but optional, and an audit log entry is created with the change details\"},{\"description\":\"Generate unique shareable link for invite-only hackathon\",\"given\":\"An authenticated Organiser creating or editing a hackathon\",\"when\":\"The Organiser sets visibility to 'Invite-Only' and saves\",\"then\":\"A unique invite code is generated, a shareable link in format '/join/{inviteCode}' is displayed, the hackathon does not appear in public directory searches, and the page includes noindex meta tag\"},{\"description\":\"Warning displayed when changing visibility after registration opens\",\"given\":\"An authenticated Organiser with a public hackathon that has 5 registered participants\",\"when\":\"The Organiser attempts to change visibility to 'Invite-Only'\",\"then\":\"A confirmation modal appears warning that 5 participants have registered, explains the implications of the change, and requires explicit confirmation before proceeding\"},{\"description\":\"Private Event badge displays on invite-only hackathon page\",\"given\":\"A user accessing an invite-only hackathon via the direct shareable link\",\"when\":\"The hackathon detail page loads\",\"then\":\"A 'Private Event' badge is prominently displayed, the page contains noindex meta robots tag, and the X-Robots-Tag header is set to 'noindex, nofollow'\"},{\"description\":\"Prevent visibility change by non-organiser\",\"given\":\"An authenticated user who is a Participant but not an Organiser of a hackathon\",\"when\":\"The user attempts to access or modify the visibility settings via API\",\"then\":\"The request is rejected with a 403 Forbidden error, no changes are made to the hackathon, and the attempt is logged for security monitoring\"}]"
        },
        {
          "id": "US-012",
          "title": "Configure Submission Categories",
          "description": "As an Organiser, I want to create and manage categories for problem submissions so that solutions can be organized and judged appropriately.",
          "acceptanceCriteria": "- Add, edit, and delete categories with name (required, max 50 chars) and description (optional, max 500 chars)\n- Minimum of 1 category required before hackathon can be published\n- Maximum of 20 categories per hackathon\n- Categories can be reordered via drag-and-drop\n- Warning displayed when deleting category that has assigned problems\n- Categories cannot be deleted after submissions exist (only renamed/hidden)\n- Category list displays on public hackathon page for participant reference",
          "techNotes": "Implement categories as a Convex table with fields: id, hackathonId, name, description, displayOrder, isHidden, createdAt, updatedAt. Use a compound index on (hackathonId, displayOrder) for efficient ordered queries.\n\nFor drag-and-drop reordering, use @dnd-kit/core with @dnd-kit/sortable on the frontend. Implement optimistic updates via Convex mutations - update displayOrder for affected categories in a single transaction to maintain consistency.\n\nCategory mutations should validate: (1) organiser role via Clerk session, (2) hackathon ownership, (3) character limits, (4) category count limits. Create a reusable validation helper since these checks apply across CRUD operations.\n\nFor delete protection, query problems table to check assignments before deletion. After submissions exist (check submissions table for any with matching hackathonId), restrict mutations to only allow name/description/isHidden updates. Surface this state via a 'hasSubmissions' flag in the hackathon query response.\n\nPublic category list endpoint should filter out isHidden categories and return only necessary fields (name, description, displayOrder). Consider caching this at the Cloudflare Workers edge for published hackathons.\n\nDependencies: Requires hackathon entity from US-001, problems table structure for assignment checking. Will be consumed by problem submission (US-015) and judging assignment stories.",
          "testCases": "[{\"description\":\"Successfully create a new category with valid inputs\",\"given\":\"An authenticated Organiser with an unpublished hackathon containing 0 categories\",\"when\":\"They submit a category with name 'AI Solutions' (12 chars) and description 'Artificial intelligence focused submissions' (44 chars)\",\"then\":\"Category is created with displayOrder 1, success confirmation shown, and category appears in the list\"},{\"description\":\"Prevent hackathon publish without minimum categories\",\"given\":\"An Organiser with a hackathon that has 0 categories configured\",\"when\":\"They attempt to publish the hackathon\",\"then\":\"Publish is blocked with error message 'At least 1 category required before publishing'\"},{\"description\":\"Enforce maximum category limit\",\"given\":\"An Organiser with a hackathon that already has 20 categories\",\"when\":\"They attempt to add a 21st category\",\"then\":\"Creation is rejected with error 'Maximum of 20 categories allowed per hackathon'\"},{\"description\":\"Display warning when deleting category with assigned problems\",\"given\":\"An Organiser with a category that has 3 problems assigned to it\",\"when\":\"They click delete on that category\",\"then\":\"A warning modal appears stating '3 problems are assigned to this category. They will become uncategorized. Continue?'\"},{\"description\":\"Prevent category deletion after submissions exist\",\"given\":\"An Organiser with a hackathon that has received at least one submission\",\"when\":\"They attempt to delete any category\",\"then\":\"Delete option is disabled/hidden, tooltip shows 'Categories cannot be deleted after submissions begin. You may hide or rename instead.'\"}]"
        },
        {
          "id": "US-013",
          "title": "Set Moderation Mode for Problem Submissions",
          "description": "As an Organiser, I want to choose between open and curated moderation modes so that I can control how problem proposals enter the hackathon.",
          "acceptanceCriteria": "- Radio selection for 'Open' (problems auto-approved) or 'Curated' (problems require curator approval)\n- In Curated mode, Curator role assignment becomes required before hackathon starts\n- Moderation mode can only be changed before problem submission opens\n- Clear explanation text describes each mode's workflow\n- Dashboard displays pending approval count when in Curated mode\n- Notification preferences allow curators to opt into alerts for new submissions\n- Mode selection is reflected in problem submission guidelines shown to proposers",
          "techNotes": "## Implementation Approach\n\nImplement moderation mode as a discriminated union type in the hackathon schema: `moderationMode: 'open' | 'curated'`. This enables type-safe conditional logic throughout the codebase. Store in the existing hackathon Convex document with a migration defaulting existing hackathons to 'open'.\n\n### Architecture Considerations\n\n**State Machine Integration**: Moderation mode changes must respect hackathon lifecycle states. Create a Convex mutation `updateModerationMode` that validates against `hackathonPhase !== 'problem_submission_open'`. Use optimistic updates in TanStack for responsive UI.\n\n**Curator Dependency Validation**: Before transitioning hackathon to problem submission phase, implement a pre-flight check query `canOpenProblemSubmissions` that returns `{ valid: boolean, errors: string[] }`. In Curated mode, verify at least one user has Curator role assigned.\n\n**Pending Count Real-time Updates**: Leverage Convex's reactive queries for dashboard pending count. Create `getPendingProblemCount(hackathonId)` subscription that filters problems where `status === 'pending_approval' && hackathon.moderationMode === 'curated'`.\n\n**Notification Preferences**: Extend curator's notification settings in user-hackathon-role junction table with `notifyOnNewSubmission: boolean`. Use Convex scheduled functions to batch curator notifications, preventing spam on bulk submissions.\n\n### Security Considerations\n- Mutation must verify caller has Organiser role via Clerk session\n- Prevent race conditions with Convex's transactional mutations when checking phase state\n- Audit log mode changes for compliance tracking",
          "testCases": "[{\"description\":\"Organiser successfully sets moderation mode to Curated before submissions open\",\"given\":\"An authenticated Organiser viewing hackathon settings where problem submission phase has not started and current mode is Open\",\"when\":\"The Organiser selects 'Curated' radio option and clicks Save\",\"then\":\"The moderation mode is persisted as 'curated', a success toast confirms the change, and the Curator assignment section displays a required indicator\"},{\"description\":\"System prevents mode change after problem submission opens\",\"given\":\"An authenticated Organiser viewing hackathon settings where problem submission phase is currently active with mode set to Open\",\"when\":\"The Organiser attempts to change moderation mode to Curated\",\"then\":\"The radio buttons are disabled, a tooltip explains 'Mode cannot be changed after submissions open', and no mutation is triggered\"},{\"description\":\"Dashboard displays pending approval count in Curated mode\",\"given\":\"A hackathon in Curated mode with 5 submitted problems where 3 are pending approval and 2 are approved\",\"when\":\"The Organiser navigates to the hackathon dashboard\",\"then\":\"A badge displays '3 pending' next to the Problems section, and clicking it navigates to the filtered problem review queue\"},{\"description\":\"System blocks hackathon start without assigned Curator in Curated mode\",\"given\":\"A hackathon configured in Curated mode with zero users assigned the Curator role\",\"when\":\"The Organiser attempts to open the problem submission phase\",\"then\":\"The action is blocked with error message 'At least one Curator must be assigned before opening submissions in Curated mode', and the phase remains unchanged\"},{\"description\":\"Problem proposer sees mode-specific submission guidelines\",\"given\":\"A logged-in Participant accessing the problem submission form for a hackathon in Curated mode\",\"when\":\"The submission form loads\",\"then\":\"An info banner displays 'Submissions require curator approval before becoming visible' and the submit button text reads 'Submit for Review'\"}]"
        },
        {
          "id": "US-014",
          "title": "Create and Edit Hackathon About Page",
          "description": "As an Organiser, I want to create a rich about page for my hackathon with rules, prizes, and event details so that participants have all necessary information.",
          "acceptanceCriteria": "- Rich text editor supports headings, lists, links, images, and basic formatting\n- Predefined sections available: Overview, Rules, Prizes, Schedule, FAQ, Sponsors\n- Sections can be reordered, hidden, or shown\n- Auto-save drafts every 30 seconds with visual indicator\n- Preview mode shows page as participants will see it\n- Image uploads stored in Cloudflare R2 with max 5MB per image\n- Version history preserved; ability to revert to previous versions\n- About page URL is shareable and accessible based on visibility settings",
          "techNotes": "**Implementation Approach:**\n\nUse TipTap editor (ProseMirror-based) for rich text editing—it's TypeScript-native, extensible, and works well with React/TanStack. Store content as JSON (TipTap's native format) in Convex for efficient querying and rendering.\n\n**Data Model:**\n- `hackathonAboutPages` table: hackathonId, sections (array of {type, title, content, visible, order}), currentVersion, lastAutoSave\n- `aboutPageVersions` table: pageId, version, sections, createdAt, createdBy (for version history)\n\n**Section Management:**\nPredefined section types as enum; each section stores TipTap JSON content. Implement drag-and-drop reordering via dnd-kit. Hidden sections persist in data but filtered in participant view.\n\n**Auto-Save Implementation:**\nDebounced Convex mutation (30s interval) updating draft field. Track `isDirty` state client-side; show saving/saved indicator in UI. Use `useEffect` cleanup to save on unmount.\n\n**Image Upload Flow:**\n1. Client validates file size (<5MB) and type before upload\n2. Generate presigned URL from Cloudflare Worker → R2\n3. Direct browser upload to R2\n4. Store R2 URL in TipTap content\n5. Consider image optimization via Cloudflare Images if available\n\n**Version History:**\nCreate new version entry on explicit 'Publish' action (not auto-save). Limit stored versions (e.g., last 20) with Convex scheduled function cleanup. Revert copies historical version to current.\n\n**Security:**\nClerk middleware validates Organiser role for edit endpoints. Public about page respects hackathon visibility settings (US-011 dependency). Sanitize HTML output to prevent XSS.",
          "testCases": "[{\"description\":\"Organiser creates about page with multiple formatted sections\",\"given\":\"An authenticated Organiser with an existing hackathon and no about page content\",\"when\":\"They add Overview and Rules sections with headings, bullet lists, and links, then click Publish\",\"then\":\"The about page is saved with both sections visible, content properly formatted, and a version 1 entry is created in history\"},{\"description\":\"Auto-save triggers after content changes\",\"given\":\"An Organiser is editing the about page with unsaved changes\",\"when\":\"30 seconds pass without manual save and the saving indicator appears\",\"then\":\"Draft content is persisted to database, indicator shows 'Saved', and refreshing the page restores the draft content\"},{\"description\":\"Image upload rejected when exceeding size limit\",\"given\":\"An Organiser is editing a section and attempts to insert an image\",\"when\":\"They select an image file that is 6MB in size\",\"then\":\"Upload is blocked before network request, error message displays 'Image must be under 5MB', and editor content remains unchanged\"},{\"description\":\"Revert to previous version restores historical content\",\"given\":\"An about page with 3 published versions where version 2 had a Sponsors section that was removed in version 3\",\"when\":\"The Organiser views version history, selects version 2, and confirms revert\",\"then\":\"Current content is replaced with version 2 content including Sponsors section, a new version 4 is created, and auto-save indicator shows the change\"},{\"description\":\"Participant views about page respecting visibility settings\",\"given\":\"A hackathon with visibility set to 'invite-only' and a published about page\",\"when\":\"An unauthenticated user accesses the shareable about page URL\",\"then\":\"They receive a 403 response or are redirected to login, and the about page content is not exposed\"},{\"description\":\"Section reordering persists correctly\",\"given\":\"An about page with sections in order: Overview, Rules, Prizes, FAQ\",\"when\":\"Organiser drags Prizes section above Rules and triggers auto-save\",\"then\":\"Section order is saved as Overview, Prizes, Rules, FAQ and preview mode displays sections in the new order\"}]"
        },
        {
          "id": "US-015",
          "title": "Configure Submission Gallery Settings",
          "description": "As an Organiser, I want to configure how the submission gallery displays and what information is visible so that I can control the participant experience during and after the event.",
          "acceptanceCriteria": "- Toggle for gallery visibility: hidden during judging, visible after results, or always visible\n- Option to show/hide team member names on public submissions\n- Option to show/hide vote counts or rankings before results published\n- Configure which submission fields display in gallery cards (title, thumbnail, category, team)\n- Gallery supports filtering by category and sorting (newest, alphabetical, random)\n- Settings can be modified until results are published\n- Preview mode shows gallery as participants will see it",
          "techNotes": "Implement gallery settings as a nested object within the hackathon document in Convex, using a GallerySettings type with fields: visibilityMode (enum: 'hidden_during_judging' | 'visible_after_results' | 'always_visible'), showTeamMembers (boolean), showVoteCounts (boolean), displayFields (array of enabled field keys), and sorting/filtering defaults.\n\nCreate a Convex mutation `updateGallerySettings` with organiser role validation and a check that results haven't been published (query hackathon.resultsPublishedAt). Use Convex's schema validation to ensure displayFields only contains valid options: ['title', 'thumbnail', 'category', 'team'].\n\nFor the preview mode, implement a query `getGalleryPreview` that applies the current settings to actual submission data, returning transformed results as participants would see them. This avoids duplicating rendering logic—the same query powers both preview and actual gallery views, with a `previewMode` flag that bypasses visibility checks for organisers.\n\nGallery filtering and sorting should be handled client-side for small hackathons (<100 submissions) using TanStack Query's select option. For larger events, implement Convex indexes on category and createdAt fields with parameterized queries.\n\nSecurity consideration: The gallery query must check visibility settings server-side before returning data—never trust client-side filtering for hiding sensitive information like vote counts. Implement a middleware pattern in the query that strips restricted fields based on current hackathon phase and settings.\n\nDependency: Requires US-011 (submission structure) and US-023 (judging workflow) for phase detection.",
          "testCases": "[{\"description\":\"Organiser successfully updates gallery visibility mode\",\"given\":\"An organiser is authenticated and managing a hackathon where results have not been published\",\"when\":\"They set gallery visibility to 'visible_after_results' and save settings\",\"then\":\"The gallery settings are updated in the database and participants cannot view the gallery until results are published\"},{\"description\":\"Gallery respects team member visibility setting\",\"given\":\"Gallery settings have showTeamMembers set to false and gallery is visible\",\"when\":\"A participant views a submission in the gallery\",\"then\":\"The submission card displays title, thumbnail, and category but team member names are hidden\"},{\"description\":\"Settings modification blocked after results published\",\"given\":\"An organiser is managing a hackathon where results have already been published\",\"when\":\"They attempt to modify any gallery setting\",\"then\":\"The system rejects the change with error 'Gallery settings cannot be modified after results are published'\"},{\"description\":\"Preview mode shows gallery as participants will see it\",\"given\":\"An organiser has configured gallery to hide vote counts and show only title and category fields\",\"when\":\"They activate preview mode\",\"then\":\"The preview displays submissions with only title and category visible, vote counts hidden, matching exactly what participants would see\"},{\"description\":\"Gallery filtering returns only matching category submissions\",\"given\":\"A hackathon has 10 submissions across 3 categories and gallery is visible\",\"when\":\"A participant filters the gallery by 'AI/ML' category\",\"then\":\"Only submissions tagged with 'AI/ML' category are displayed, sorted according to the configured default sort order\"}]"
        },
        {
          "id": "US-016",
          "title": "Archive Completed Hackathon",
          "description": "As an Organiser, I want to manually archive a completed hackathon so that it becomes read-only while remaining accessible for historical reference.",
          "acceptanceCriteria": "- Archive action available only after results are published\n- Confirmation dialog warns that action makes hackathon read-only\n- Archived hackathons display 'Archived' badge on all pages\n- All data remains viewable: submissions, results, leaderboard, about page\n- No new submissions, team changes, or judging actions permitted\n- Archived hackathons appear in separate 'Past Events' section of directory\n- Organisers can still access analytics and export data from archived events\n- Audit log captures archive action with timestamp and user",
          "techNotes": "Implement archival as a state transition in the hackathon lifecycle, extending the existing status enum to include 'archived' as a terminal state. The archive mutation in Convex should validate preconditions: user must be Organiser, hackathon status must be 'results_published'. Use a transaction to atomically update status and create an audit log entry with timestamp, userId, and previous state.\n\nFor the read-only enforcement, implement a Convex middleware or wrapper function that checks hackathon status before any mutation affecting submissions, teams, or judging. This centralizes the logic rather than scattering checks across individual mutations. Consider creating an `assertHackathonMutable(hackathonId)` helper.\n\nThe 'Archived' badge should be a shared UI component that reads from hackathon context, displayed consistently in the header layout. For the directory separation, modify the hackathon listing query to accept a filter parameter and use Convex indexes on status for efficient querying of active vs. archived events.\n\nAnalytics and export functionality should remain unchanged since they're read operations. However, verify that any 'draft report' or 'pending export' features handle the archived state gracefully. The confirmation dialog should use a modal pattern consistent with other destructive actions, clearly stating irreversibility. Consider whether super-admins should have an 'unarchive' capability for edge cases—if so, implement as a separate privileged mutation with its own audit trail.",
          "testCases": "[{\"description\":\"Successfully archive a hackathon after results are published\",\"given\":\"A hackathon exists with status 'results_published' and the current user is an Organiser\",\"when\":\"The Organiser confirms the archive action in the confirmation dialog\",\"then\":\"The hackathon status changes to 'archived', an audit log entry is created with timestamp and user ID, and a success notification is displayed\"},{\"description\":\"Archive action is unavailable before results publication\",\"given\":\"A hackathon exists with status 'judging_complete' (results not yet published) and the current user is an Organiser\",\"when\":\"The Organiser views the hackathon management page\",\"then\":\"The archive button is disabled or hidden, with a tooltip explaining that results must be published first\"},{\"description\":\"Archived hackathon blocks submission mutations\",\"given\":\"A hackathon has been archived and a participant attempts to modify their submission\",\"when\":\"The participant submits an edit request via the API\",\"then\":\"The mutation is rejected with error code 'HACKATHON_ARCHIVED' and the submission remains unchanged\"},{\"description\":\"Archived hackathons appear in Past Events directory section\",\"given\":\"Three hackathons exist: two active and one archived, all set to public visibility\",\"when\":\"A visitor browses the public hackathon directory\",\"then\":\"Active hackathons appear in the main listing, the archived hackathon appears under 'Past Events' section with an 'Archived' badge\"},{\"description\":\"Organiser can export data from archived hackathon\",\"given\":\"A hackathon is archived and the Organiser navigates to the analytics dashboard\",\"when\":\"The Organiser clicks 'Export Submissions CSV'\",\"then\":\"The export generates successfully with all historical data intact and downloads to the user's device\"}]"
        }
      ]
    },
    {
      "title": "Role & Access Management",
      "description": "Assigning and managing hackathon roles (Owner, Admin, Curator, Judge) via email invitations or existing user selection, with per-hackathon permissions and ownership transfer capabilities.",
      "userStories": [
        {
          "id": "US-017",
          "title": "Invite Hackathon Roles via Email",
          "description": "As an organiser, I want to invite admins, curators, and judges to my hackathon via email so that I can onboard team members who aren't yet on the platform.",
          "acceptanceCriteria": "- Organiser can enter an email address and select a role (Admin, Curator, or Judge) to send an invitation\n- System sends an email with a unique, secure invitation link that expires after 7 days\n- Email clearly states the hackathon name, role being offered, and who sent the invitation\n- Recipients without accounts are directed to create one, then automatically assigned the role\n- Recipients with existing accounts (different email) can link the invitation to their account\n- Pending invitations are visible in the hackathon's role management dashboard with sent date and status\n- Organisers can resend or revoke pending invitations\n- Inline validation prevents inviting the same email twice for the same role\n- Toast notification confirms successful invitation sent",
          "techNotes": "Implement invitation system using Convex for state management and Clerk for authentication integration.\n\n**Data Model:**\nCreate `hackathonInvitations` table with fields: id, hackathonId, email (indexed), role, invitedBy, token (unique secure string), status (pending/accepted/revoked), createdAt, expiresAt. Add compound index on (hackathonId, email, role) for duplicate detection.\n\n**Token Generation:**\nGenerate cryptographically secure tokens using `crypto.randomUUID()` combined with additional entropy. Store hashed tokens in database, include raw token only in email links. Set 7-day expiry at creation time.\n\n**Email Integration:**\nUse Cloudflare Workers with a transactional email service (Resend or SendGrid). Create email template including: hackathon name, role description, inviter name, and CTA button with invitation link. Link format: `{baseUrl}/invite/{token}`.\n\n**Invitation Flow:**\n1. Validate email format and check for existing pending invitation (same email + role + hackathon)\n2. Generate secure token, create invitation record\n3. Trigger email via Convex action calling Cloudflare Worker\n4. Return success for toast notification\n\n**Redemption Flow:**\nCreate `/invite/[token]` route in TanStack Start. On load, validate token exists and not expired. If user authenticated via Clerk, assign role directly. If unauthenticated, store token in session/localStorage, redirect to Clerk sign-up/sign-in, then process on callback.\n\n**Account Linking:**\nFor existing users with different emails, show confirmation modal explaining the invitation will be linked to their current account. Update invitation with acceptedBy userId.\n\n**Security Considerations:**\nRate limit invitation sends per organiser (e.g., 50/hour). Validate organiser still has permission before processing redemption. Log all invitation activities for audit trail.",
          "testCases": "[{\"description\":\"Successfully send invitation to new email\",\"given\":\"An organiser is on the role management page for their hackathon and enters a valid email 'newuser@example.com' with role 'Judge'\",\"when\":\"The organiser clicks the send invitation button\",\"then\":\"A pending invitation record is created with 7-day expiry, an email is sent containing hackathon name, 'Judge' role, organiser's name, and secure link, the invitation appears in the pending list with 'Sent' status and current date, and a success toast notification is displayed\"},{\"description\":\"Prevent duplicate invitation for same email and role\",\"given\":\"A pending invitation already exists for 'existing@example.com' as 'Curator' for this hackathon\",\"when\":\"The organiser attempts to invite 'existing@example.com' as 'Curator' again\",\"then\":\"Inline validation error appears immediately stating 'This email already has a pending Curator invitation', the send button is disabled, and no duplicate invitation is created\"},{\"description\":\"New user redeems invitation and creates account\",\"given\":\"A valid pending invitation exists for 'newbie@example.com' as 'Admin' and the recipient has no platform account\",\"when\":\"The recipient clicks the invitation link and completes Clerk account creation with email 'newbie@example.com'\",\"then\":\"The user is automatically assigned the Admin role for the hackathon, the invitation status updates to 'accepted', and the user is redirected to the hackathon dashboard with their new role active\"},{\"description\":\"Existing user links invitation to different account email\",\"given\":\"A valid invitation exists for 'work@example.com' as 'Judge' and the user is logged in with account 'personal@example.com'\",\"when\":\"The user clicks the invitation link while authenticated\",\"then\":\"A confirmation modal displays explaining the Judge role will be linked to their 'personal@example.com' account, upon confirmation the role is assigned to their existing account, and the invitation records the accepting userId\"},{\"description\":\"Reject expired invitation redemption\",\"given\":\"An invitation was created 8 days ago and has expired\",\"when\":\"A user clicks the expired invitation link\",\"then\":\"The user sees an error page stating 'This invitation has expired', a prompt to contact the organiser for a new invitation is shown, and no role assignment occurs\"},{\"description\":\"Organiser revokes pending invitation\",\"given\":\"A pending invitation exists for 'unwanted@example.com' as 'Curator' visible in the dashboard\",\"when\":\"The organiser clicks the revoke button and confirms the action\",\"then\":\"The invitation status changes to 'revoked', the invitation link becomes invalid and shows 'revoked' error if accessed, and the invitation is removed from or marked as revoked in the pending list\"}]"
        },
        {
          "id": "US-018",
          "title": "Assign Roles to Existing Platform Users",
          "description": "As an organiser, I want to assign hackathon roles to users already on the platform so that I can quickly add team members without waiting for email acceptance.",
          "acceptanceCriteria": "- Organiser can search for existing users by name or email with typeahead suggestions\n- Search results show user name, email, and profile avatar for identification\n- Organiser can select a user and assign them a role (Admin, Curator, or Judge)\n- Role assignment takes effect immediately without requiring user acceptance\n- Assigned user receives an in-app notification about their new role\n- Assigned user receives an email notification based on their notification preferences\n- Cannot assign a role to a user who already holds that role in the hackathon\n- Audit log records who assigned the role, to whom, and when",
          "techNotes": "Implement user search with Convex's built-in text search or a custom index on users table for name/email fields. Create a searchUsers query that filters by partial matches and excludes users already holding the target role in the hackathon. The typeahead component should debounce requests (300ms) and limit results to 10 users for performance.\n\nRole assignment requires a Convex mutation that: (1) validates organiser permissions via Clerk session, (2) checks user doesn't already hold the role, (3) creates the role assignment record, (4) triggers notification creation, (5) logs to audit table. Use Convex's transactional guarantees to ensure atomicity.\n\nFor notifications, create a dual-delivery system: always create an in-app notification record, then check user's notification_preferences table before queuing email. Email delivery should use Cloudflare Workers with a queue for reliable delivery. Consider using Resend or SendGrid via Workers for transactional emails.\n\nAudit logging should capture: actor_id (organiser), target_user_id, hackathon_id, role_assigned, timestamp, and action_type. Store in a dedicated audit_logs table with indexes on hackathon_id and timestamp for efficient querying.\n\nSecurity considerations: Ensure search endpoint doesn't leak sensitive user data beyond what's needed for identification. Rate-limit search queries to prevent enumeration attacks. Validate role enum server-side to prevent injection of invalid roles.",
          "testCases": "[{\"description\":\"Successfully assign judge role to existing user\",\"given\":\"An organiser is on the role management page for their hackathon and a platform user 'jane@example.com' exists without any role in this hackathon\",\"when\":\"The organiser searches for 'jane', selects the user from results, chooses 'Judge' role, and confirms assignment\",\"then\":\"The role is assigned immediately, the user appears in the judges list, an in-app notification is created for Jane, and an audit log entry records the assignment with organiser ID and timestamp\"},{\"description\":\"Typeahead search returns matching users with required display fields\",\"given\":\"Platform has users: 'Alice Smith (alice@test.com)', 'Bob Allen (bob@test.com)', and 'Charlie Brown (charlie@test.com)'\",\"when\":\"Organiser types 'ali' in the search field\",\"then\":\"Search results show 'Alice Smith' and 'Bob Allen' (matching 'ali' in name or email), each displaying name, email, and profile avatar\"},{\"description\":\"Prevent duplicate role assignment\",\"given\":\"User 'mark@example.com' already holds the Curator role for hackathon 'AI Challenge 2024'\",\"when\":\"Organiser attempts to assign the Curator role to mark@example.com for the same hackathon\",\"then\":\"The system prevents the assignment, displays an error message 'User already holds this role', and no duplicate record is created\"},{\"description\":\"Email notification respects user preferences\",\"given\":\"User 'opt-out@example.com' has email notifications disabled in their preferences and user 'opt-in@example.com' has email notifications enabled\",\"when\":\"Organiser assigns Admin role to both users\",\"then\":\"Both users receive in-app notifications, only 'opt-in@example.com' receives an email notification, and 'opt-out@example.com' receives no email\"},{\"description\":\"Unauthorised user cannot assign roles\",\"given\":\"A user who is a Participant (not an Organiser) in hackathon 'Code Sprint'\",\"when\":\"The user attempts to access the role assignment endpoint or UI for that hackathon\",\"then\":\"The request is rejected with 403 Forbidden, no role assignment occurs, and the attempt is logged for security monitoring\"}]"
        },
        {
          "id": "US-019",
          "title": "View and Manage Hackathon Role Assignments",
          "description": "As an organiser, I want to view all role assignments for my hackathon in one place so that I can understand who has access and make changes as needed.",
          "acceptanceCriteria": "- Role management dashboard displays all assigned roles grouped by role type (Owner, Admin, Curator, Judge)\n- Each entry shows user name, email, role, assigned date, and who assigned them\n- Pending email invitations appear in a separate section with expiration status\n- Organiser can filter the list by role type\n- Organiser can search within assigned roles by name or email\n- Dashboard shows total count per role type\n- Empty states provide clear guidance on how to add roles\n- Dashboard is accessible only to Owner and Admins",
          "techNotes": "Implement a role management dashboard as a dedicated route within the hackathon organiser section, accessible via `/hackathon/:id/roles`. Use Convex queries to fetch role assignments with pagination support, joining user data from Clerk for display names and emails. Create a `getRoleAssignments` query that returns assignments grouped by role type, including metadata (assignedAt timestamp, assignedBy user reference). For pending invitations, query the invitations table filtering by hackathon ID and status='pending', calculating expiration status client-side based on createdAt + TTL. Implement filtering and search using Convex query arguments rather than client-side filtering for performance. Use TanStack Query for data fetching with appropriate cache invalidation when roles change. The UI should use a tabbed or accordion layout for role groupings, with a search input that debounces queries (300ms). Access control requires middleware checking the current user has Owner or Admin role for the hackathon - implement as a reusable `requireHackathonRole` helper. Consider creating a composite index on `(hackathonId, roleType)` for efficient grouped queries. For the counts summary, either compute in a separate aggregation query or derive from the grouped results. Empty states should include CTAs linking to the role invitation flow (US-017/018). Ensure proper loading skeletons for each section independently.",
          "testCases": "[{\"description\":\"Owner views complete role assignment dashboard with all role types\",\"given\":\"A hackathon exists with 2 Admins, 3 Curators, and 5 Judges assigned, plus 2 pending invitations\",\"when\":\"The Owner navigates to the role management dashboard\",\"then\":\"Dashboard displays roles grouped by type with correct counts (2 Admins, 3 Curators, 5 Judges), each entry shows user name, email, role, assigned date, and assigner name, and pending invitations section shows 2 entries with expiration status\"},{\"description\":\"Admin filters role list by specific role type\",\"given\":\"An Admin is viewing the role management dashboard with mixed role assignments\",\"when\":\"The Admin selects 'Judge' from the role type filter\",\"then\":\"Only Judge role assignments are displayed, other role sections are hidden or collapsed, and the filter selection is visually indicated\"},{\"description\":\"Organiser searches for a specific user across all roles\",\"given\":\"The dashboard contains 15 role assignments including user 'Sarah Chen' as a Curator\",\"when\":\"The organiser types 'sarah' in the search field\",\"then\":\"Results filter to show only Sarah Chen's assignment, search works across name and email fields, and clearing search restores full list\"},{\"description\":\"Dashboard shows expired invitation with appropriate status\",\"given\":\"A pending Judge invitation was sent 8 days ago with a 7-day expiration policy\",\"when\":\"The organiser views the pending invitations section\",\"then\":\"The invitation displays with 'Expired' status badge, visual distinction from active pending invitations, and option to resend or revoke is available\"},{\"description\":\"Non-admin participant is denied access to role dashboard\",\"given\":\"A user is a registered Participant in the hackathon but has no organiser roles\",\"when\":\"The user attempts to access the role management dashboard URL directly\",\"then\":\"Access is denied with appropriate error message, user is redirected to hackathon overview or shown 403 state, and no role assignment data is exposed\"},{\"description\":\"Empty state displays when no roles of a type are assigned\",\"given\":\"A new hackathon with only the Owner assigned and no other roles\",\"when\":\"The Owner views the role management dashboard\",\"then\":\"Empty states appear for Admin, Curator, and Judge sections with helpful guidance text and clear CTA buttons to invite users for each role type\"}]"
        },
        {
          "id": "US-020",
          "title": "Remove Role Assignments",
          "description": "As an organiser, I want to remove a role from a user so that I can revoke access when someone leaves the team or was assigned incorrectly.",
          "acceptanceCriteria": "- Organiser can remove any role except Owner from any assigned user\n- Removal requires confirmation dialog explaining the action's impact\n- Removed user loses access to role-specific features immediately\n- Removed user receives an in-app notification about the role removal\n- Removed user can still access the hackathon as a regular participant if they were registered\n- Audit log records who removed the role, from whom, and when\n- Cannot remove your own Admin role (prevents accidental lockout)\n- Toast notification confirms successful role removal",
          "techNotes": "## Implementation Approach\n\nBuild a role removal mutation in Convex that enforces business rules server-side. The mutation should validate: (1) requester has Organiser/Admin permission, (2) target role isn't Owner, (3) user isn't removing their own Admin role. Use Convex's transactional guarantees to atomically update the role assignment and create audit/notification records.\n\n## Architecture Considerations\n\n**Confirmation Dialog**: Implement a reusable confirmation modal component that displays context-specific impact messaging. For role removal, show what features the user will lose access to based on the role being removed.\n\n**Immediate Access Revocation**: Convex's real-time subscriptions will automatically update the UI when role data changes. Ensure all role-gated components use reactive queries so removed users see changes instantly without refresh.\n\n**Notification System**: Create a notification record in Convex with type 'ROLE_REMOVED', linking to the hackathon. The notification should include the role name and hackathon title for context.\n\n## Security Considerations\n\n- Server-side validation is critical; never trust client-side role checks alone\n- Rate limit role removal operations to prevent abuse\n- Consider soft-delete pattern for role assignments to preserve history\n- Validate the target user actually has the role being removed\n\n## Dependencies\n\n- US-019 (Role Assignment) for shared role management infrastructure\n- Notification system must be in place\n- Audit logging infrastructure from earlier stories",
          "testCases": "[{\"description\":\"Successfully remove curator role from assigned user\",\"given\":\"An organiser is viewing a hackathon where User B has the Curator role assigned\",\"when\":\"The organiser clicks remove on User B's Curator role and confirms the action in the dialog\",\"then\":\"User B's Curator role is removed, they lose access to curator features immediately, receive an in-app notification, a success toast is shown, and an audit log entry is created\"},{\"description\":\"Prevent removal of Owner role\",\"given\":\"An organiser is viewing the role assignments for a hackathon\",\"when\":\"The organiser attempts to remove the Owner role from a user\",\"then\":\"The remove option is disabled or hidden for the Owner role, and no removal action is possible\"},{\"description\":\"Prevent self-removal of Admin role\",\"given\":\"An admin user is viewing their own role assignments on a hackathon\",\"when\":\"They attempt to remove their own Admin role\",\"then\":\"The system displays an error message explaining they cannot remove their own Admin role to prevent lockout\"},{\"description\":\"Removed user retains participant access\",\"given\":\"User C is registered as a participant and also has the Judge role on a hackathon\",\"when\":\"An organiser removes User C's Judge role\",\"then\":\"User C loses access to judging features but can still access the hackathon as a regular participant, view their team, and access participant-level features\"},{\"description\":\"Confirmation dialog displays role-specific impact\",\"given\":\"An organiser initiates removal of a Judge role from a user\",\"when\":\"The confirmation dialog appears\",\"then\":\"The dialog clearly explains the user will lose access to scoring submissions, viewing judging criteria, and other judge-specific features, with confirm and cancel options\"}]"
        },
        {
          "id": "US-021",
          "title": "Transfer Hackathon Ownership",
          "description": "As a hackathon owner, I want to transfer ownership to another user so that someone else can take over primary responsibility for the event.",
          "acceptanceCriteria": "- Only the current Owner can initiate ownership transfer\n- Owner can select from existing Admins or invite a new user via email to become Owner\n- Transfer requires the Owner to re-authenticate (password/MFA) as a security measure\n- Transfer requires explicit confirmation with clear warning about losing Owner privileges\n- If transferring to a new user via email, transfer completes only after they accept and create/link account\n- New Owner receives all Owner permissions immediately upon transfer completion\n- Previous Owner is automatically demoted to Admin role\n- Both parties receive email and in-app notifications about the ownership change\n- Audit log records the complete ownership transfer with timestamps",
          "techNotes": "Implement ownership transfer as a multi-step workflow with pending transfer states stored in Convex. Create a `pendingOwnershipTransfers` table tracking: hackathonId, initiatorId, targetUserId (nullable for email invites), targetEmail, status (pending_acceptance, pending_auth, completed, cancelled, expired), createdAt, expiresAt, and completedAt.\n\nFor the transfer flow: (1) Owner initiates transfer, selecting existing Admin or entering email; (2) System creates pending transfer record; (3) If email invite, generate secure token and send invitation email via Cloudflare Workers email integration; (4) Before completion, require re-authentication through Clerk's `useSession().session.verifyWithSession()` or step-up authentication flow; (5) On confirmation, execute atomic transaction updating hackathon.ownerId, demoting previous owner to Admin in hackathonMembers, and promoting new owner.\n\nSecurity considerations: Implement transfer token expiration (72 hours recommended), rate-limit transfer initiations (max 3 pending per hackathon), and ensure re-auth check happens server-side in Convex mutation. Use Clerk webhooks to handle cases where invited user creates new account.\n\nFor notifications, leverage existing notification system (likely from US-019/US-020 patterns) to send both email and in-app alerts. Audit logging should capture: previous_owner_id, new_owner_id, transfer_method (existing_admin/email_invite), acceptance_timestamp, and IP addresses for security review.\n\nEdge cases: Handle scenarios where target Admin is removed before accepting, hackathon is deleted during pending transfer, or owner attempts multiple simultaneous transfers.",
          "testCases": "[{\"description\":\"Owner successfully transfers ownership to existing Admin\",\"given\":\"User is the Owner of hackathon 'TechHack 2024' and user 'jane@example.com' is an Admin of that hackathon\",\"when\":\"Owner selects jane@example.com as new owner, re-authenticates successfully, and confirms the transfer with acknowledgment checkbox\",\"then\":\"jane@example.com becomes the new Owner with full permissions, previous owner is demoted to Admin role, both users receive email and in-app notifications, and audit log records transfer with timestamp and user IDs\"},{\"description\":\"Owner transfers ownership via email invitation to new user\",\"given\":\"User is the Owner of hackathon 'StartupJam' and wants to transfer to 'newowner@company.com' who has no account\",\"when\":\"Owner enters newowner@company.com, re-authenticates, confirms transfer, and newowner@company.com receives invitation email, creates Clerk account, and accepts transfer\",\"then\":\"Transfer completes only after new user accepts, new user becomes Owner, previous owner becomes Admin, invitation token is invalidated, and audit log shows complete transfer timeline\"},{\"description\":\"Non-owner user cannot initiate ownership transfer\",\"given\":\"User is an Admin (not Owner) of hackathon 'CodeFest'\",\"when\":\"User attempts to access ownership transfer functionality or directly calls the transfer mutation\",\"then\":\"Request is rejected with 403 Forbidden error, no pending transfer is created, and attempt is logged as unauthorized access\"},{\"description\":\"Transfer fails without re-authentication\",\"given\":\"Owner has initiated transfer to existing Admin and is on confirmation screen\",\"when\":\"Owner attempts to complete transfer without re-authenticating or with stale session verification\",\"then\":\"Transfer is blocked with message requiring re-authentication, pending transfer remains in 'pending_auth' status, and no ownership changes occur\"},{\"description\":\"Pending email transfer expires after timeout period\",\"given\":\"Owner initiated transfer via email to 'invited@example.com' 73 hours ago and invitation has not been accepted\",\"when\":\"System runs expiration check or invited user attempts to accept the expired invitation\",\"then\":\"Transfer is marked as expired, acceptance link returns 'Transfer invitation has expired' error, Owner is notified that transfer expired, and Owner can initiate new transfer if desired\"}]"
        },
        {
          "id": "US-022",
          "title": "Per-Hackathon Permission Enforcement",
          "description": "As the platform, I need to enforce role-based permissions per hackathon so that users can only perform actions appropriate to their assigned roles.",
          "acceptanceCriteria": "- Owner has full access to all hackathon settings, roles, and destructive actions (archive, delete)\n- Admins can manage most settings, invite/remove Curators and Judges, but cannot transfer ownership or remove Owner\n- Curators can manage problems, review submissions, and publish results but cannot modify hackathon settings or roles\n- Judges can only access judging interface and view submissions assigned to them\n- UI elements for unauthorized actions are hidden, not just disabled\n- Direct API calls to unauthorized endpoints return 403 Forbidden with clear error message\n- Role checks happen on every request, not cached from session start\n- Users with multiple roles see a combined permission set (union of all role permissions)\n- Permission changes take effect immediately without requiring re-login",
          "techNotes": "Implement a permission enforcement system using Convex's built-in authorization patterns with real-time reactivity. Create a `permissions.ts` module defining granular permission constants (e.g., `HACKATHON_SETTINGS_WRITE`, `ROLES_MANAGE`, `PROBLEMS_CURATE`, `JUDGING_ACCESS`) mapped to each role. Use Convex's `ctx.auth` combined with a `getUserHackathonRoles` query that fetches fresh role data on every mutation/query—Convex's caching handles performance while ensuring freshness.\n\nImplement a `checkPermission(ctx, hackathonId, requiredPermissions[])` helper that: 1) fetches user's roles for that hackathon, 2) computes union of all permissions across roles, 3) throws `ConvexError` with 403-equivalent code if unauthorized. Wrap all hackathon-scoped mutations/queries with this check.\n\nFor the frontend, create a `useHackathonPermissions(hackathonId)` hook using Convex's reactive queries—permissions update instantly when roles change server-side. Components use this hook for conditional rendering (hidden, not disabled). TanStack Router loaders should also verify permissions before rendering protected routes.\n\nEdge cases: handle role removal mid-session (Convex reactivity handles this), multiple browser tabs (reactive sync), and race conditions during role changes (Convex's transactional mutations ensure consistency). For Judges, implement row-level security on submissions table filtering by assignment.\n\nSecurity considerations: never trust client-side permission checks alone, validate ownership transfer requires current owner's session, log permission denials for audit trail.",
          "testCases": "[{\"description\":\"Owner can delete hackathon while Admin cannot\",\"given\":\"A hackathon with User A as Owner and User B as Admin\",\"when\":\"User A attempts to delete the hackathon, then User B attempts to delete the same hackathon\",\"then\":\"User A's deletion succeeds and hackathon is removed; User B receives 403 Forbidden with message 'Insufficient permissions: only Owner can delete hackathon'\"},{\"description\":\"Judge can only view assigned submissions\",\"given\":\"A hackathon with 10 submissions where Judge J is assigned to submissions 1-3\",\"when\":\"Judge J queries the submissions endpoint for this hackathon\",\"then\":\"Only submissions 1-3 are returned; attempting to access submission 4 directly returns 403 Forbidden\"},{\"description\":\"Permission union for user with multiple roles\",\"given\":\"User has both Curator and Judge roles on hackathon H\",\"when\":\"User accesses the hackathon dashboard\",\"then\":\"User can access problem management (Curator permission) AND judging interface (Judge permission); UI shows both navigation sections\"},{\"description\":\"Role removal takes effect immediately without re-login\",\"given\":\"User is logged in with Admin role on hackathon H in two browser tabs\",\"when\":\"Owner removes User's Admin role while User is actively viewing admin settings\",\"then\":\"Within 2 seconds, both tabs redirect to unauthorized view; subsequent API calls return 403; no page refresh or re-login required\"},{\"description\":\"Admin cannot remove Owner or transfer ownership\",\"given\":\"Hackathon H with Owner O and Admin A\",\"when\":\"Admin A attempts to: 1) remove Owner O from roles, 2) transfer ownership to themselves via API\",\"then\":\"Both operations return 403 Forbidden; Owner O retains ownership; audit log records attempted privilege escalation\"}]"
        },
        {
          "id": "US-023",
          "title": "Role-Based Navigation and Dashboard",
          "description": "As a user with a hackathon role, I want to see navigation and dashboard elements relevant to my role so that I can quickly access the tools I need.",
          "acceptanceCriteria": "- Dashboard shows role-specific quick actions (e.g., Judges see 'Start Judging', Curators see 'Review Submissions')\n- Navigation menu adapts to show only accessible sections based on user's role(s)\n- Users with multiple roles see a combined navigation with all permitted sections\n- Role badge is displayed next to hackathon name indicating user's role(s)\n- Switching between hackathons updates navigation based on role in each hackathon\n- First-time role holders see a brief onboarding tooltip explaining their responsibilities\n- Dashboard widgets prioritize information relevant to user's role",
          "techNotes": "Implement role-based navigation using a centralized role permissions configuration that maps roles to allowed routes and features. Create a `useHackathonRole` hook that queries Convex for the user's role(s) in the currently selected hackathon, returning permissions and navigation items.\n\nArchitecture: Build a `RoleNavigationProvider` context that wraps hackathon pages, computing the merged navigation structure for users with multiple roles. Use TanStack Router's route guards to validate access server-side on Cloudflare Workers, preventing unauthorized route access even if client navigation is bypassed.\n\nFor dashboard widgets, implement a widget registry pattern where each widget declares its required roles. The dashboard component filters and prioritizes widgets based on role hierarchy (Organiser > Admin > Curator > Judge > Participant). Store onboarding tooltip dismissal state in Convex user preferences, keyed by role type.\n\nRole badges should use a `RoleBadgeGroup` component that handles multiple roles gracefully (show primary + '+N' for many roles). When switching hackathons via the hackathon selector, invalidate the role query and trigger navigation recalculation.\n\nDependencies: Requires US-020 (role assignment) for role data. Consider caching role permissions in Clerk session claims for faster initial loads, syncing on role changes via Convex mutations.\n\nSecurity: Always validate role permissions server-side in Convex queries/mutations. Never trust client-side role state for data access. Implement audit logging for role-based feature access.",
          "testCases": "[{\"description\":\"Judge sees role-specific quick actions on dashboard\",\"given\":\"A user is assigned the Judge role for hackathon 'AI Challenge 2024'\",\"when\":\"The user navigates to the hackathon dashboard\",\"then\":\"The dashboard displays 'Start Judging' quick action, shows judging queue widget, and displays a Judge role badge next to the hackathon name\"},{\"description\":\"User with multiple roles sees combined navigation\",\"given\":\"A user has both Curator and Judge roles for the current hackathon\",\"when\":\"The user views the navigation menu\",\"then\":\"The navigation shows both 'Review Submissions' (Curator) and 'Judging Panel' (Judge) sections, and role badge displays 'Curator, Judge'\"},{\"description\":\"Navigation updates when switching hackathons with different roles\",\"given\":\"A user is a Judge in 'Hackathon A' and a Participant in 'Hackathon B'\",\"when\":\"The user switches from 'Hackathon A' to 'Hackathon B' using the hackathon selector\",\"then\":\"Navigation updates to show only Participant-accessible sections, quick actions change to participant-relevant items, and role badge updates to 'Participant'\"},{\"description\":\"First-time role holder sees onboarding tooltip\",\"given\":\"A user has just been assigned the Curator role and has never held this role before\",\"when\":\"The user loads the hackathon dashboard for the first time after role assignment\",\"then\":\"An onboarding tooltip appears explaining Curator responsibilities including 'Review and categorize problem submissions', and dismissing the tooltip persists the preference\"},{\"description\":\"User without hackathon role sees restricted navigation\",\"given\":\"A user visits a public hackathon page but has no assigned role in that hackathon\",\"when\":\"The user views the navigation and dashboard\",\"then\":\"Navigation shows only public sections (Overview, Problems, Teams), no role badge is displayed, and dashboard shows general hackathon information without role-specific widgets\"}]"
        },
        {
          "id": "US-024",
          "title": "Audit Trail for Role Changes",
          "description": "As an organiser, I want to view an audit trail of all role-related actions so that I can track who made changes for compliance and debugging purposes.",
          "acceptanceCriteria": "- Audit log captures: role assignments, role removals, invitation sends/resends/revocations, ownership transfers\n- Each entry includes timestamp, action type, actor (who performed it), target user, and role involved\n- Log entries are immutable and cannot be edited or deleted\n- Organisers can filter audit log by action type, date range, or user involved\n- Audit log is accessible only to Owner and Admins\n- Log exports available in CSV format for compliance records\n- Pagination handles large audit histories efficiently\n- Timestamps display in user's local timezone with UTC available on hover",
          "techNotes": "Implement audit trail using a dedicated Convex table `roleAuditLogs` with append-only semantics enforced at the mutation level (no update/delete mutations exposed). Schema includes: `hackathonId`, `timestamp` (UTC), `actionType` (enum: ROLE_ASSIGNED, ROLE_REMOVED, INVITATION_SENT, INVITATION_RESENT, INVITATION_REVOKED, OWNERSHIP_TRANSFERRED), `actorId`, `targetUserId`, `role`, and `metadata` (JSON for additional context like previous role). Create a Convex mutation wrapper that all role-related mutations call to ensure consistent logging—never log directly from individual mutations. For immutability, implement at application layer since Convex doesn't have native append-only tables; add a server-side validator that rejects any modification attempts. Query layer should use Convex indexes on `hackathonId + timestamp` and `hackathonId + actionType` for efficient filtering. Implement cursor-based pagination returning 50 entries per page with `startAfter` cursor. For CSV export, create a Convex action that streams results to R2, generates a signed URL, and returns it to the client—avoid loading entire history into memory. Timezone handling is purely frontend: store all timestamps as UTC, use `Intl.DateTimeFormat` with user's locale for display, show UTC on hover via title attribute. Access control enforced via Convex query/mutation guards checking Clerk user's role is Owner or Admin for the hackathon. Consider adding a background job to archive logs older than retention period to cold storage in R2 if audit histories grow large.",
          "testCases": "[{\"description\":\"Audit log captures role assignment with complete details\",\"given\":\"An Admin assigns the Judge role to a user in a hackathon\",\"when\":\"The role assignment mutation completes successfully\",\"then\":\"An audit log entry is created with actionType ROLE_ASSIGNED, correct actorId, targetUserId, role as Judge, and UTC timestamp\"},{\"description\":\"Audit log entries cannot be modified or deleted\",\"given\":\"An existing audit log entry for a role removal action\",\"when\":\"Any attempt is made to update or delete the entry via API\",\"then\":\"The operation is rejected with a 403 Forbidden error and the original entry remains unchanged\"},{\"description\":\"Filtering audit log by action type returns correct subset\",\"given\":\"An audit log with 10 entries: 5 ROLE_ASSIGNED, 3 INVITATION_SENT, 2 OWNERSHIP_TRANSFERRED\",\"when\":\"An Owner filters the log by actionType INVITATION_SENT\",\"then\":\"Only the 3 invitation-related entries are returned in descending chronological order\"},{\"description\":\"Non-Owner/Admin users cannot access audit log\",\"given\":\"A user with Judge role attempts to view the hackathon audit log\",\"when\":\"The audit log query is executed\",\"then\":\"The query returns a 403 Forbidden error with message indicating insufficient permissions\"},{\"description\":\"CSV export generates downloadable file with all filtered entries\",\"given\":\"An Owner requests CSV export of audit logs filtered to last 30 days with 150 entries matching\",\"when\":\"The export action completes\",\"then\":\"A signed R2 URL is returned pointing to a CSV file containing all 150 entries with columns: timestamp, actionType, actor, targetUser, role\"}]"
        }
      ]
    },
    {
      "title": "Problem Management & Q&A",
      "description": "Problem submission by proposers, curator approval workflow for curated mode, hide/unhide functionality, moderated Q&A system where questions are private until proposer answers publicly.",
      "userStories": [
        {
          "id": "US-025",
          "title": "Submit Problem as Proposer",
          "description": "As a Problem Proposer, I want to submit problem statements for a hackathon so that participants can work on solving them during the event.",
          "acceptanceCriteria": "- Proposer can create a new problem with title, description, category, and optional attachments\n- Problem description supports rich text formatting (markdown)\n- Attachments are stored in Cloudflare R2 with appropriate size limits\n- Proposer can save problem as draft before final submission\n- Submitted problems display a pending status until curator review (in curated mode)\n- Proposer receives in-app notification confirming successful submission\n- Form displays inline validation errors for required fields\n- System creates audit log entry for problem submission",
          "techNotes": "**Implementation Approach:**\n\nCreate a multi-step problem submission flow using TanStack Form for complex form state management with draft persistence. The form component should handle rich text editing via a lightweight markdown editor (consider `@uiw/react-md-editor` or `react-simplemde-editor`) with preview capability.\n\n**File Upload Architecture:**\nImplement chunked uploads directly to Cloudflare R2 using presigned URLs generated via a Convex action. Create a `generateUploadUrl` action that returns a signed R2 PUT URL with 15-minute expiry. Enforce size limits (suggest 10MB per file, 50MB total per problem) client-side with server validation. Store file metadata in a `problemAttachments` table linked to problems.\n\n**Data Model:**\nProblems table should include: `hackathonId`, `proposerId`, `title`, `description` (markdown), `category`, `status` (enum: draft/pending/approved/rejected), `submittedAt`, `createdAt`, `updatedAt`. Use Convex's optimistic updates for draft saves to provide instant feedback.\n\n**Submission Flow:**\n1. Draft save: Upsert problem with status='draft', debounced auto-save every 30s\n2. Final submit: Validate all required fields, transition status to 'pending' (if hackathon uses curation) or 'approved'\n3. Trigger Convex scheduled function to create audit log entry and send in-app notification\n\n**Security Considerations:**\n- Verify proposer has Problem Proposer role for the specific hackathon via Clerk JWT claims\n- Sanitize markdown input to prevent XSS (use `DOMPurify` on render)\n- Validate file MIME types server-side, not just extensions\n- Rate limit submissions to prevent spam (suggest 10 problems/hour/user)",
          "testCases": "[{\"description\":\"Successfully submit a complete problem with attachments\",\"given\":\"A user with Problem Proposer role for hackathon H-001 is on the problem submission form\",\"when\":\"They enter a valid title, markdown description, select category 'AI/ML', upload a 5MB PDF attachment, and click Submit\",\"then\":\"The problem is created with status 'pending', attachment is stored in R2, audit log entry is created with action 'problem_submitted', and proposer receives in-app notification 'Your problem has been submitted for review'\"},{\"description\":\"Save problem as draft with partial data\",\"given\":\"A Problem Proposer has entered only a title 'Climate Data Challenge' with no other fields completed\",\"when\":\"They click 'Save Draft' button\",\"then\":\"The problem is saved with status 'draft', no validation errors are shown, and the user can navigate away and return to continue editing\"},{\"description\":\"Reject submission with missing required fields\",\"given\":\"A Problem Proposer is on the submission form with title field empty but description filled\",\"when\":\"They click the Submit button\",\"then\":\"Form displays inline validation error 'Title is required' under the title field, submission is prevented, and no database record is created\"},{\"description\":\"Reject oversized file attachment\",\"given\":\"A Problem Proposer is uploading attachments to their problem\",\"when\":\"They attempt to upload a 15MB file exceeding the 10MB limit\",\"then\":\"Upload is rejected with error message 'File exceeds maximum size of 10MB', the file is not uploaded to R2, and previously uploaded valid attachments remain intact\"},{\"description\":\"Prevent submission by unauthorized user\",\"given\":\"A user with only Participant role (not Problem Proposer) for hackathon H-001 attempts to access the problem submission endpoint\",\"when\":\"They send a POST request to create a problem for H-001\",\"then\":\"Request is rejected with 403 Forbidden error, no problem record is created, and security event is logged\"}]"
        },
        {
          "id": "US-026",
          "title": "Curator Approval Workflow for Problems",
          "description": "As a Curator, I want to review and approve or reject submitted problems so that only quality problems are made available to participants in curated hackathons.",
          "acceptanceCriteria": "- Curator sees a queue of pending problems requiring review\n- Each problem displays full details including title, description, category, and attachments\n- Curator can approve a problem, making it visible to participants\n- Curator can reject a problem with a required rejection reason\n- Rejected problems notify the proposer via email and in-app notification with the rejection reason\n- Approved problems notify the proposer via email and in-app notification\n- Curator can filter pending problems by category or submission date\n- Approval workflow only applies when hackathon is configured for curated mode\n- In non-curated mode, problems are automatically visible upon submission\n- All approval/rejection actions are logged in the audit trail",
          "techNotes": "Implement the curator approval workflow using Convex for state management and real-time updates. Create a `problemReviews` table to track review history with fields: problemId, curatorId, action (approved/rejected), reason (nullable), timestamp. Add a `status` field to problems table with enum values: 'pending_review', 'approved', 'rejected', 'auto_approved'.\n\nThe review queue should be a Convex query filtering problems by hackathonId and status='pending_review', with optional filters for category and submissionDate. Use Convex indexes on (hackathonId, status) and (hackathonId, category, status) for efficient querying.\n\nImplement approval/rejection as Convex mutations that: 1) Validate curator role via Clerk session, 2) Check hackathon is in curated mode, 3) Update problem status, 4) Create review record, 5) Trigger notifications. Use Convex's transactional guarantees for atomicity.\n\nFor notifications, create a reusable notification service that handles both in-app (store in `notifications` table) and email (queue to Cloudflare Workers via Convex HTTP actions). Email templates should include rejection reasons for rejected problems.\n\nThe curated mode check should be a hackathon-level setting (`curationEnabled: boolean`). When disabled, problem submission mutation should auto-set status to 'auto_approved'. Audit logging should use the existing audit trail pattern, capturing actor, action, targetId, metadata, and timestamp.\n\nConsider adding optimistic UI updates for the review queue to improve curator UX, and implement proper RBAC checks to ensure only assigned curators can review problems for their hackathons.",
          "testCases": "[{\"description\":\"Curator successfully approves a pending problem\",\"given\":\"A curator is assigned to a curated hackathon and there is a problem with status 'pending_review'\",\"when\":\"The curator clicks approve on the problem\",\"then\":\"The problem status changes to 'approved', the problem becomes visible to participants, the proposer receives an email notification, the proposer receives an in-app notification, and an audit log entry is created with action 'problem_approved'\"},{\"description\":\"Curator rejects a problem with required reason\",\"given\":\"A curator is reviewing a pending problem in the review queue\",\"when\":\"The curator clicks reject and provides a rejection reason 'Problem scope is too broad for the hackathon theme'\",\"then\":\"The problem status changes to 'rejected', the problem remains hidden from participants, the proposer receives an email containing the rejection reason, the proposer receives an in-app notification with the rejection reason, and an audit log entry is created\"},{\"description\":\"Curator cannot reject without providing a reason\",\"given\":\"A curator is attempting to reject a pending problem\",\"when\":\"The curator clicks reject without entering a rejection reason\",\"then\":\"The rejection is blocked, a validation error message 'Rejection reason is required' is displayed, and the problem status remains 'pending_review'\"},{\"description\":\"Problems auto-approve in non-curated hackathons\",\"given\":\"A hackathon is configured with curationEnabled set to false\",\"when\":\"A proposer submits a new problem to the hackathon\",\"then\":\"The problem status is immediately set to 'auto_approved', the problem is visible to participants without curator review, and no entry appears in the curator review queue\"},{\"description\":\"Curator filters pending problems by category and date\",\"given\":\"A curator has 10 pending problems across categories 'AI', 'Web', and 'Mobile' submitted over the past week\",\"when\":\"The curator filters by category 'AI' and submission date 'Last 3 days'\",\"then\":\"Only problems matching both criteria are displayed, the count indicator updates to reflect filtered results, and clearing filters restores the full pending queue\"},{\"description\":\"Non-curator user cannot access review queue\",\"given\":\"A user with 'participant' role attempts to access the problem review queue\",\"when\":\"The user navigates to the curator review queue URL\",\"then\":\"Access is denied with a 403 Forbidden response, the user is redirected to an unauthorized page, and an audit log entry is created for the unauthorized access attempt\"}]"
        },
        {
          "id": "US-027",
          "title": "Hide and Unhide Problems",
          "description": "As a Curator, I want to hide or unhide problems after they have been approved so that I can manage problem visibility without permanently deleting them.",
          "acceptanceCriteria": "- Curator can hide any approved/visible problem from participants\n- Hidden problems are no longer visible to participants or teams\n- Curator can unhide previously hidden problems to restore visibility\n- Hidden problems display a clear 'hidden' status indicator to curators\n- Proposers are notified when their problem is hidden or unhidden\n- Teams currently working on a hidden problem see a notification that the problem is no longer available\n- Hidden problems retain all associated Q&A data\n- Hide/unhide actions are recorded in the audit log with timestamps\n- Curators can view a filtered list of all hidden problems",
          "techNotes": "Implement problem visibility toggle using a `status` field on the problems table in Convex, extending existing states to include 'hidden'. Create a Convex mutation `toggleProblemVisibility` that validates curator role via Clerk session, updates the problem status, and triggers notification side effects.\n\n**Architecture Considerations:**\n- Add `hiddenAt` and `hiddenBy` timestamp fields for audit trail alongside the status change\n- Create a Convex action for batch notifications: notify the problem proposer and any teams with this problem as their active selection\n- Use Convex's real-time subscriptions so teams viewing a hidden problem see immediate UI updates\n\n**Query Modifications:**\n- Participant-facing problem queries must filter out `status: 'hidden'` problems\n- Curator queries should include all statuses with visual differentiation\n- Add a dedicated `listHiddenProblems` query with pagination for the curator filtered view\n\n**Notification Strategy:**\n- Create notification records in Convex for in-app display\n- Queue email notifications via Cloudflare Workers for proposers and affected team leads\n- Teams should see a dismissible banner on their dashboard if their selected problem becomes hidden\n\n**Security:**\n- Validate curator role and hackathon association in mutation\n- Ensure hidden problems return 404 for unauthorized users attempting direct access\n- Audit log entries should be immutable, stored in separate collection\n\n**Edge Cases:**\n- Handle race condition where team submits solution while problem is being hidden\n- Preserve Q&A data by soft-delete pattern (status change, not deletion)",
          "testCases": "[{\"description\":\"Curator successfully hides an approved problem\",\"given\":\"A curator is authenticated and an approved problem exists in their hackathon\",\"when\":\"The curator clicks 'Hide Problem' and confirms the action\",\"then\":\"The problem status changes to 'hidden', hiddenAt timestamp is recorded, audit log entry is created, and the proposer receives a notification\"},{\"description\":\"Hidden problem is not visible to participants\",\"given\":\"A problem has been hidden by a curator and a participant is browsing available problems\",\"when\":\"The participant views the problem list or attempts to access the hidden problem directly\",\"then\":\"The hidden problem does not appear in the list and direct URL access returns a 'problem not found' message\"},{\"description\":\"Team is notified when their active problem is hidden\",\"given\":\"A team has selected problem X as their working problem and the problem is currently visible\",\"when\":\"A curator hides problem X\",\"then\":\"All team members receive an in-app notification that their problem is no longer available, and the team dashboard displays a warning banner\"},{\"description\":\"Curator unhides a previously hidden problem\",\"given\":\"A curator is viewing the hidden problems list and a hidden problem exists\",\"when\":\"The curator clicks 'Unhide Problem' on the hidden problem\",\"then\":\"The problem status returns to 'approved', it becomes visible to participants again, the proposer is notified of restoration, and an audit log entry records the unhide action\"},{\"description\":\"Q&A data is preserved when problem is hidden and unhidden\",\"given\":\"A problem has 5 Q&A threads with responses and is subsequently hidden\",\"when\":\"The curator unhides the problem and participants view it\",\"then\":\"All 5 Q&A threads and their responses are intact and visible to participants\"}]"
        },
        {
          "id": "US-028",
          "title": "Edit and Update Submitted Problems",
          "description": "As a Problem Proposer, I want to edit my submitted problems so that I can correct errors or add clarifications before and during the hackathon.",
          "acceptanceCriteria": "- Proposer can edit title, description, category, and attachments of their own problems\n- Edits to approved problems in curated mode trigger re-review by curator\n- Edits to pending problems do not restart the review process\n- Previous versions of problem content are preserved for audit purposes\n- Participants are notified of significant updates to problems they are following\n- Edit history is visible to curators and organisers\n- Proposer cannot edit problems after hackathon enters judging phase\n- Toast notification confirms successful save of edits",
          "techNotes": "**Implementation Approach:**\n\nBuild a versioned problem editing system using Convex's transactional capabilities. Create a `problemVersions` table to store complete snapshots of problem state on each edit, enabling audit trails and rollback capabilities.\n\n**Architecture:**\n\n1. **Version Control Layer:** On each edit, insert current problem state into `problemVersions` before applying changes. Store version number, timestamp, editor ID, and change summary. Use Convex mutations to ensure atomicity.\n\n2. **Status Management:** Implement state machine logic: if problem status is 'approved' and hackathon uses curation, transition to 'pending_re_review' and notify assigned curator. Problems in 'pending' status retain that status on edit.\n\n3. **Phase Gating:** Query hackathon phase from parent record; reject edits with clear error if phase >= 'judging'. Implement as Convex validator middleware.\n\n4. **Attachment Handling:** For R2 attachments, implement soft-delete pattern—mark old attachments as superseded rather than deleting, preserving audit trail. New uploads go through existing R2 upload flow.\n\n5. **Notification System:** Track problem followers in `problemFollows` table. On significant edits (title, description, category changes), queue notifications via Convex scheduled functions. Define 'significant' vs 'minor' edit classification.\n\n6. **Edit History UI:** Create `/problems/:id/history` route showing diff view between versions. Use `diff` library for text comparison. Restrict access to curators/organisers via Clerk role checks.\n\n**Security:** Validate ownership via Clerk user ID match. Sanitize markdown input. Rate-limit edit operations to prevent abuse.",
          "testCases": "[{\"description\":\"Proposer successfully edits their pending problem\",\"given\":\"A Problem Proposer has a problem in 'pending' status and the hackathon is in 'active' phase\",\"when\":\"The proposer updates the title, description, and adds a new attachment, then clicks save\",\"then\":\"The problem is updated with new content, status remains 'pending', a version snapshot is created in problemVersions table, and a success toast notification appears\"},{\"description\":\"Editing approved problem triggers re-review in curated hackathon\",\"given\":\"A Problem Proposer has an 'approved' problem in a hackathon with curation enabled\",\"when\":\"The proposer edits the problem description and saves\",\"then\":\"The problem status changes to 'pending_re_review', the assigned curator receives a notification, a version snapshot is preserved, and the proposer sees a toast indicating the problem will be re-reviewed\"},{\"description\":\"Edit blocked during judging phase\",\"given\":\"A Problem Proposer has a problem and the hackathon has entered 'judging' phase\",\"when\":\"The proposer attempts to access the edit form or submit edits\",\"then\":\"The edit button is disabled or hidden, API calls return a 403 error with message 'Problems cannot be edited during judging phase', and no changes are persisted\"},{\"description\":\"Followers notified of significant problem updates\",\"given\":\"A problem has 5 participants following it and the hackathon is in 'active' phase\",\"when\":\"The Problem Proposer changes the problem category from 'AI/ML' to 'Web Development'\",\"then\":\"All 5 followers receive in-app notifications about the category change, the notification includes the problem title and nature of the change, and a version snapshot captures the previous category\"},{\"description\":\"Unauthorized user cannot edit another proposer's problem\",\"given\":\"User A submitted a problem and User B is also a Problem Proposer in the same hackathon\",\"when\":\"User B attempts to edit User A's problem via direct API call or URL manipulation\",\"then\":\"The API returns a 403 Forbidden error, no changes are made to the problem, and the attempt is logged for security audit\"}]"
        },
        {
          "id": "US-029",
          "title": "Submit Private Question on Problem",
          "description": "As a Participant, I want to submit questions about a problem privately so that I can get clarifications without revealing my thought process to other teams.",
          "acceptanceCriteria": "- Participant can submit a question on any visible problem\n- Questions are only visible to the proposer and the submitting participant initially\n- Participant can view all their own submitted questions and their status\n- Questions display submission timestamp and current status (pending/answered)\n- Participant receives notification when their question is answered\n- Questions have a character limit of 1000 characters\n- Inline validation prevents empty question submission\n- Rate limiting prevents spam (max 10 questions per problem per participant per hour)",
          "techNotes": "Implement private Q&A using Convex with a `problemQuestions` table containing fields: `id`, `problemId`, `participantId`, `questionText`, `status` (pending/answered), `createdAt`, `answeredAt`, and `answer`. Create a compound index on `(problemId, participantId)` for efficient querying and rate limit checks.\n\nFor the submission flow, build a React component with TanStack Form for validation. Implement client-side validation for empty checks and 1000-character limit with real-time character counter. Use Convex mutations with server-side validation to prevent bypassing.\n\nRate limiting should be enforced in the Convex mutation by querying questions from the same participant on the same problem within the last hour using `createdAt` filtering. Return a descriptive error if limit exceeded.\n\nVisibility rules are critical: Convex queries must filter by `participantId` matching the authenticated user OR by proposer role on the linked problem. Use Clerk's `userId` from the Convex auth context for secure filtering.\n\nNotifications leverage Convex's reactive subscriptions for in-app alerts. When a question's status changes to 'answered', trigger a notification insert to the participant's notification queue. Email notifications can be handled via Convex scheduled functions calling an email service.\n\nConsider adding optimistic updates for better UX on submission. Edge cases include handling deleted problems (soft delete questions or show archived state) and ensuring proposers who are also participants see appropriate separation.",
          "testCases": "[{\"description\":\"Successfully submit a private question on a visible problem\",\"given\":\"A participant is authenticated and viewing a problem they have access to\",\"when\":\"They enter a valid question (between 1-1000 characters) and click submit\",\"then\":\"The question is saved with status 'pending', appears in their question list with timestamp, and a success message is displayed\"},{\"description\":\"Prevent submission of empty question\",\"given\":\"A participant is on the question submission form for a problem\",\"when\":\"They attempt to submit with an empty question field or only whitespace\",\"then\":\"Inline validation error is displayed, submit button remains disabled, and no API call is made\"},{\"description\":\"Enforce character limit on question text\",\"given\":\"A participant is typing a question on the submission form\",\"when\":\"They enter text exceeding 1000 characters\",\"then\":\"Characters beyond 1000 are prevented or truncated, character counter shows limit reached, and validation error appears if they attempt to submit\"},{\"description\":\"Rate limit prevents spam submissions\",\"given\":\"A participant has already submitted 10 questions on a specific problem within the last hour\",\"when\":\"They attempt to submit an 11th question on the same problem\",\"then\":\"Submission is rejected with a clear error message indicating the rate limit and when they can submit again\"},{\"description\":\"Participant receives notification when question is answered\",\"given\":\"A participant has a pending question on a problem\",\"when\":\"The problem proposer submits an answer to that question\",\"then\":\"The participant receives an in-app notification, and the question status updates to 'answered' with the response visible\"}]"
        },
        {
          "id": "US-030",
          "title": "Answer Questions and Publish to FAQ",
          "description": "As a Problem Proposer, I want to answer participant questions and have my answers published publicly so that all teams benefit from the clarification.",
          "acceptanceCriteria": "- Proposer sees a list of pending questions for each of their problems\n- Proposer can write and submit an answer to any pending question\n- Upon answering, the Q&A pair becomes publicly visible to all participants\n- Original question text is shown alongside the proposer's answer\n- Proposer can edit their answer after publishing (with edit indicator shown)\n- Proposer can choose to answer privately without publishing (visible only to asker)\n- Proposer can decline to answer with a standard 'cannot answer' response\n- All participants can view the public FAQ section for each problem\n- Question asker's identity remains anonymous in the public FAQ\n- Email and in-app notification sent to asker when question is answered",
          "techNotes": "Implement a Q&A management system using Convex for real-time data synchronization. Create a `question_answers` table with fields: questionId, answerId, answerText, answerType (public/private/declined), answeredAt, editedAt, and editCount. The answerType enum controls visibility logic throughout the application.\n\nFor the proposer dashboard, create a Convex query `getProposerPendingQuestions` that aggregates unanswered questions across all problems owned by the authenticated user. Use Convex's real-time subscriptions so the pending count updates live in the UI.\n\nImplement three distinct mutation endpoints: `publishAnswer` (public FAQ), `sendPrivateAnswer` (direct to asker), and `declineQuestion` (canned response). Each mutation should trigger the notification system via Convex scheduled functions to handle both email (via Clerk's email service or a dedicated provider like Resend) and in-app notifications stored in a `notifications` table.\n\nFor public FAQ rendering, create a `getPublicFAQ` query that returns only public Q&A pairs with asker identity stripped. Include pagination for problems with many questions. The edit indicator should show 'Edited' with relative timestamp but not expose edit history publicly.\n\nSecurity considerations: Verify proposer ownership of the problem before allowing answer operations. Rate-limit answer submissions to prevent spam. Sanitize answer content for XSS before storage. Ensure private answers are properly scoped in all queries using Convex's argument validation and auth context.",
          "testCases": "[{\"description\":\"Proposer publishes answer to pending question\",\"given\":\"A Problem Proposer is authenticated and has a problem with one pending question from a participant\",\"when\":\"The proposer writes an answer and selects 'Publish to FAQ'\",\"then\":\"The Q&A pair becomes visible in the public FAQ section, the question status changes to 'answered', the asker receives both email and in-app notification, and the asker's identity is not displayed in the public FAQ\"},{\"description\":\"Proposer edits a previously published answer\",\"given\":\"A Problem Proposer has a published Q&A pair in the FAQ for their problem\",\"when\":\"The proposer modifies the answer text and saves the changes\",\"then\":\"The updated answer is displayed in the FAQ, an 'Edited' indicator appears next to the answer, the original question text remains unchanged, and no duplicate notification is sent to the asker\"},{\"description\":\"Proposer sends private answer visible only to asker\",\"given\":\"A Problem Proposer is viewing a pending question that contains team-specific context\",\"when\":\"The proposer writes an answer and selects 'Answer Privately'\",\"then\":\"The answer is visible only to the original question asker, the question does not appear in the public FAQ, other participants cannot see this Q&A pair, and the asker receives a notification indicating a private response\"},{\"description\":\"Proposer declines to answer with standard response\",\"given\":\"A Problem Proposer receives a question that cannot be answered due to competition fairness\",\"when\":\"The proposer clicks 'Decline to Answer'\",\"then\":\"A standard 'This question cannot be answered' response is recorded, the asker is notified of the decline, the question is removed from the pending queue, and the declined Q&A does not appear in public FAQ\"},{\"description\":\"Participant views public FAQ with multiple answered questions\",\"given\":\"A problem has five published Q&A pairs from different anonymous participants\",\"when\":\"Any authenticated participant navigates to the problem's FAQ section\",\"then\":\"All five Q&A pairs are displayed with original questions and proposer answers, no asker identities are revealed, edited answers show the edit indicator, and the FAQ updates in real-time if new answers are published\"}]"
        },
        {
          "id": "US-031",
          "title": "Browse and Search Problem FAQ",
          "description": "As a Participant, I want to browse and search the FAQ for each problem so that I can find existing answers before submitting duplicate questions.",
          "acceptanceCriteria": "- Each problem displays a publicly visible FAQ section with all answered questions\n- FAQ entries show the question, answer, and answer timestamp\n- Participants can search FAQ entries by keyword\n- FAQ entries are sorted by most recent first by default\n- Participants can sort FAQ by relevance when searching\n- FAQ clearly indicates total number of answered questions\n- Empty FAQ state shows appropriate message encouraging questions\n- FAQ updates in real-time when new answers are published",
          "techNotes": "Implement FAQ browsing using Convex's real-time subscriptions for live updates when new answers are published. Create a `problemFaqs` query that filters Q&A entries where `status === 'answered'` and `isPublic === true`. For search functionality, implement client-side filtering for small datasets (<100 entries) using simple keyword matching against question/answer text. For larger datasets, leverage Convex's search indexes with `searchIndex('search_faq', { searchField: 'searchableText' })` where searchableText is a concatenated field of question + answer.\n\nArchitecture: Create a `<ProblemFAQ>` component that accepts problemId and uses `useQuery` for real-time subscription. Implement sorting with a toggle between 'recent' (default, by answeredAt desc) and 'relevance' (when search active, scored by match density). The relevance scoring can use a simple term frequency approach client-side.\n\nDependencies: Requires US-026 (Q&A submission) and US-029 (answer publishing) to populate FAQ data. Share the same Q&A data model but filter to answered entries only.\n\nEdge cases: Handle HTML/markdown in answers safely using a sanitization library like DOMPurify. Consider debouncing search input (300ms) to prevent excessive re-renders. Cache search results briefly to improve perceived performance.\n\nSecurity: Ensure query only returns public, answered questions - enforce this in the Convex query function, not just client-side filtering.",
          "testCases": "[{\"description\":\"Display FAQ entries for a problem with answered questions\",\"given\":\"A problem exists with 5 answered and published Q&A entries\",\"when\":\"A participant navigates to the problem's FAQ section\",\"then\":\"All 5 FAQ entries are displayed showing question, answer, and answer timestamp, sorted by most recent first\"},{\"description\":\"Search FAQ entries by keyword returns matching results\",\"given\":\"A problem FAQ contains entries about 'team size', 'submission format', and 'judging criteria'\",\"when\":\"A participant searches for 'submission'\",\"then\":\"Only the 'submission format' entry is displayed and sorting changes to relevance-based\"},{\"description\":\"Display empty state when no FAQ entries exist\",\"given\":\"A problem exists with no answered questions\",\"when\":\"A participant views the FAQ section\",\"then\":\"An empty state message is shown saying 'No questions answered yet. Be the first to ask!' with a link to submit a question\"},{\"description\":\"Real-time update when new answer is published\",\"given\":\"A participant is viewing a problem FAQ showing 3 entries\",\"when\":\"A curator publishes an answer to a previously pending question\",\"then\":\"The FAQ automatically updates to show 4 entries and the count updates without page refresh\"},{\"description\":\"Search with no matching results shows appropriate feedback\",\"given\":\"A problem FAQ contains entries about general topics\",\"when\":\"A participant searches for 'xyznonexistent123'\",\"then\":\"A message displays 'No FAQ entries match your search' with option to clear search or submit a new question\"}]"
        },
        {
          "id": "US-032",
          "title": "Manage Q&A as Curator",
          "description": "As a Curator, I want to moderate the Q&A system so that I can remove inappropriate content and ensure the FAQ remains helpful for all participants.",
          "acceptanceCriteria": "- Curator can view all questions (pending and answered) across all problems\n- Curator can hide inappropriate questions from the public FAQ\n- Curator can hide inappropriate answers and notify proposer to revise\n- Curator can delete questions that violate guidelines with notification to asker\n- Curator actions on Q&A are logged in the audit trail\n- Curator can filter Q&A by problem, status, or date range\n- Hidden Q&A items display as 'removed by moderator' in the public FAQ\n- Curator can reinstate previously hidden Q&A items",
          "techNotes": "Implement Q&A moderation as a Convex mutation layer with role-based access control checking Clerk's user metadata for Curator role. Create a unified Q&A dashboard view using TanStack Query to fetch all questions/answers with server-side filtering via Convex indexes on `hackathonId + status + problemId + createdAt` for efficient multi-criteria queries.\n\nDesign a `moderationActions` table to track all curator interventions: `{id, targetType: 'question'|'answer', targetId, action: 'hide'|'delete'|'reinstate', reason, curatorId, timestamp, notificationSent}`. This satisfies audit requirements and enables reinstatement by preserving original content.\n\nFor hiding vs deleting: hidden items retain data but set `visibility: 'hidden'` with `moderatorNote` field; deleted items soft-delete with `deletedAt` timestamp. Public FAQ queries filter `WHERE visibility = 'public' AND deletedAt IS NULL`, showing placeholder text for hidden items via a computed field.\n\nNotification system should leverage existing in-app notification infrastructure (likely from US-017 or similar). Create reusable `sendModerationNotification` function that handles both email (via Cloudflare Workers + email service) and in-app notifications with templated messages for each action type.\n\nSecurity considerations: Validate curator has access to specific hackathon, rate-limit moderation actions to prevent abuse, sanitize all user-provided reasons/notes. Consider implementing a two-curator approval flow for deletions in future iteration.",
          "testCases": "[{\"description\":\"Curator successfully hides an inappropriate answer with proposer notification\",\"given\":\"A Curator is logged in and viewing Q&A for a hackathon with an answered question containing inappropriate content\",\"when\":\"The Curator selects the answer, chooses 'Hide' action, and provides a revision request reason\",\"then\":\"The answer visibility changes to 'hidden', the proposer receives an in-app and email notification with the revision request, the action is recorded in the audit trail, and the public FAQ shows 'removed by moderator' in place of the answer\"},{\"description\":\"Curator filters Q&A by problem and pending status\",\"given\":\"A Curator is viewing the Q&A dashboard for a hackathon with 50 questions across 10 problems in various states\",\"when\":\"The Curator applies filters for Problem 'AI Challenge' and Status 'pending'\",\"then\":\"Only pending questions for the 'AI Challenge' problem are displayed, filter state persists in URL for shareability, and result count updates to reflect filtered items\"},{\"description\":\"Curator reinstates a previously hidden question\",\"given\":\"A Curator is viewing hidden Q&A items and identifies a question that was hidden in error\",\"when\":\"The Curator selects the hidden question and chooses 'Reinstate' action\",\"then\":\"The question visibility changes to 'public', it reappears in the public FAQ with original content, a reinstatement entry is added to the audit trail, and the original asker receives a notification that their question is now visible\"},{\"description\":\"Curator attempts to delete question without required permissions\",\"given\":\"A user with Participant role (not Curator) attempts to access the moderation API endpoint directly\",\"when\":\"The user sends a delete request for a question ID via API\",\"then\":\"The request is rejected with 403 Forbidden, no changes are made to the question, and the attempt is logged as a security event\"},{\"description\":\"Curator deletes guideline-violating question with notification to asker\",\"given\":\"A Curator identifies a question that clearly violates hackathon guidelines and needs removal\",\"when\":\"The Curator selects 'Delete' action, confirms the deletion, and selects the relevant guideline violation category\",\"then\":\"The question is soft-deleted and no longer appears in any public view, the asker receives a notification explaining the violation and removal, the audit trail records the deletion with violation category, and associated answers are also hidden\"}]"
        }
      ]
    },
    {
      "title": "Team & Participant Management",
      "description": "Team creation, open join requests, invite codes, free movement between teams until submission cutoff, participant dashboard showing event status, team info, deadlines and action items.",
      "userStories": [
        {
          "id": "US-033",
          "title": "Create a New Team",
          "description": "As a hackathon participant, I want to create a new team so that I can collaborate with others on solving a problem.",
          "acceptanceCriteria": "- Participant can create a team with a required name (max 100 characters) and optional description\n- System validates team name uniqueness within the hackathon\n- Creator automatically becomes the team lead with management privileges\n- Team is associated with the current hackathon context\n- System generates a unique private invite code for the team upon creation\n- Inline validation errors display for invalid/duplicate team names\n- Toast notification confirms successful team creation\n- Audit log records team creation with timestamp, creator ID, and hackathon ID\n- Team creation is blocked if submission cutoff has passed",
          "techNotes": "**Implementation Approach:**\n\nCreate a Convex mutation `teams.create` that handles team creation with transactional integrity. The mutation should: (1) verify the authenticated user via Clerk session, (2) check hackathon submission cutoff hasn't passed by querying the hackathon's `submissionDeadline` field, (3) validate team name length and uniqueness using a compound index on `(hackathonId, normalizedName)` where `normalizedName` is lowercase/trimmed, (4) generate a cryptographically secure invite code using `crypto.randomUUID()` or a shorter nanoid-style code for usability.\n\n**Schema Design:**\nTeams table: `{ hackathonId, name, normalizedName, description?, leaderId, inviteCode, createdAt }`. Create a `teamMembers` junction table: `{ teamId, userId, role: 'lead' | 'member', joinedAt }` for flexible membership management.\n\n**Frontend Implementation:**\nUse TanStack Form for the creation form with real-time validation. Implement debounced uniqueness checking via a Convex query `teams.checkNameAvailable` to provide inline feedback before submission. Display toast notifications using a lightweight library like Sonner.\n\n**Security Considerations:**\n- Verify participant is registered for the hackathon before allowing team creation\n- Prevent users from creating multiple teams in the same hackathon\n- Rate limit team creation to prevent abuse\n- Sanitize team name/description to prevent XSS\n\n**Audit Logging:**\nUse a separate `auditLogs` table with immutable inserts capturing `{ action: 'TEAM_CREATED', entityType: 'team', entityId, actorId, hackathonId, timestamp, metadata }`.",
          "testCases": "[{\"description\":\"Successfully create a team with valid name and description\",\"given\":\"A registered participant is logged into an active hackathon where submission cutoff has not passed and they are not already on a team\",\"when\":\"The participant submits a team creation form with name 'Innovation Squad' (25 characters) and description 'Building amazing solutions'\",\"then\":\"The team is created with the participant as team lead, a unique invite code is generated, a success toast notification appears, an audit log entry is recorded with timestamp and creator ID, and the participant is redirected to the team management page\"},{\"description\":\"Reject team creation with duplicate name within hackathon\",\"given\":\"A participant is in a hackathon where a team named 'Alpha Team' already exists\",\"when\":\"The participant attempts to create a team with the name 'Alpha Team' or 'alpha team' (case-insensitive match)\",\"then\":\"An inline validation error displays 'A team with this name already exists in this hackathon' and the form submission is blocked\"},{\"description\":\"Reject team creation after submission cutoff\",\"given\":\"A participant is in a hackathon where the submission cutoff datetime has passed\",\"when\":\"The participant attempts to access the team creation form or submit a new team\",\"then\":\"The system displays an error message 'Team creation is no longer available - submission deadline has passed' and the creation action is disabled\"},{\"description\":\"Reject team name exceeding character limit\",\"given\":\"A participant is creating a team in an active hackathon\",\"when\":\"The participant enters a team name with 101 characters\",\"then\":\"An inline validation error displays 'Team name must be 100 characters or less' and the submit button remains disabled\"},{\"description\":\"Prevent participant from creating multiple teams in same hackathon\",\"given\":\"A participant who is already a member or lead of an existing team in the current hackathon\",\"when\":\"The participant attempts to create a new team\",\"then\":\"The system displays an error 'You are already part of a team in this hackathon' and blocks team creation\"}]"
        },
        {
          "id": "US-034",
          "title": "Browse and Request to Join Open Teams",
          "description": "As a hackathon participant without a team, I want to browse available teams and request to join one so that I can find collaborators with similar interests.",
          "acceptanceCriteria": "- Participant can view a list of teams in the hackathon that allow open join requests\n- Team list displays team name, description, current member count, and problem focus (if selected)\n- Participant can submit a join request with an optional message to the team lead\n- System prevents duplicate pending requests to the same team\n- Participant can cancel their pending request before it's reviewed\n- Join request functionality is disabled after submission cutoff\n- Toast notification confirms request submission\n- Audit log records join request with timestamp and relevant IDs",
          "techNotes": "**Implementation Approach:**\n\nCreate a team browsing interface with filtering and join request workflow. Use Convex queries with compound indexes on `teams` table filtering by `hackathonId`, `allowsJoinRequests: true`, and excluding teams the participant already belongs to or has pending requests with.\n\n**Data Model Extensions:**\n- `joinRequests` table: `id`, `teamId`, `requesterId`, `hackathonId`, `message`, `status` (pending/accepted/rejected/cancelled), `createdAt`, `updatedAt`\n- Add index on `(hackathonId, requesterId, status)` for duplicate detection\n- Add index on `(teamId, status)` for team lead's pending request view\n\n**Key Components:**\n- `TeamBrowserCard`: Displays team info with member avatars, problem badge, and \"Request to Join\" button\n- `JoinRequestModal`: Optional message input (max 500 chars) with submission\n- `PendingRequestsBanner`: Shows user's active requests with cancel option\n\n**Business Logic (Convex mutations):**\n- `submitJoinRequest`: Validate no existing pending request (unique constraint), check submission cutoff against `hackathon.submissionDeadline`, verify user not already in a team for this hackathon\n- `cancelJoinRequest`: Only requester can cancel, only pending status requests\n\n**Security Considerations:**\n- Rate limit join requests (max 5 pending per hackathon per user)\n- Validate participant role and hackathon registration before allowing requests\n- Sanitize message content for XSS\n\n**Audit Integration:**\n- Log `JOIN_REQUEST_SUBMITTED`, `JOIN_REQUEST_CANCELLED` events with `teamId`, `requesterId`, `hackathonId`",
          "testCases": "[{\"description\":\"Successfully submit join request to open team\",\"given\":\"A registered participant without a team, and an open team 'AI Innovators' with 3/5 members in active hackathon\",\"when\":\"Participant views team list, clicks 'Request to Join' on AI Innovators, enters message 'Experienced in ML', and submits\",\"then\":\"Join request is created with pending status, toast shows 'Request sent to AI Innovators', request appears in participant's pending list, audit log entry created with JOIN_REQUEST_SUBMITTED event\"},{\"description\":\"Prevent duplicate pending requests to same team\",\"given\":\"Participant has an existing pending join request to team 'DataCrunchers'\",\"when\":\"Participant attempts to submit another join request to 'DataCrunchers'\",\"then\":\"Submit button is disabled or hidden for that team, if bypassed via API returns error 'You already have a pending request to this team'\"},{\"description\":\"Cancel pending join request\",\"given\":\"Participant has a pending join request to team 'CloudBuilders' submitted 2 hours ago\",\"when\":\"Participant clicks 'Cancel Request' on their pending request and confirms\",\"then\":\"Request status changes to cancelled, request removed from pending list, team no longer shows 'Request Pending' state, audit log entry created with JOIN_REQUEST_CANCELLED event\"},{\"description\":\"Block join requests after submission cutoff\",\"given\":\"Hackathon submission deadline was 1 hour ago, participant has no team\",\"when\":\"Participant navigates to team browser\",\"then\":\"Team list displays with message 'Team formation period has ended', all 'Request to Join' buttons are disabled, attempting API call returns error 'Submission period has closed'\"},{\"description\":\"Filter teams correctly for eligible participant\",\"given\":\"Hackathon has 5 teams: 2 with open join requests enabled, 2 closed teams, 1 team participant already belongs to\",\"when\":\"Participant opens team browser for this hackathon\",\"then\":\"Only 2 open teams are displayed, participant's current team and closed teams are not shown in browseable list\"}]"
        },
        {
          "id": "US-035",
          "title": "Manage Team Join Requests as Team Lead",
          "description": "As a team lead, I want to review and respond to join requests so that I can control who joins my team.",
          "acceptanceCriteria": "- Team lead sees a list of pending join requests with requester name, profile info, and optional message\n- Team lead can approve or reject each request individually\n- Approved requesters are immediately added to the team roster\n- Rejected requesters receive in-app notification of the decision\n- Approved requesters receive in-app and email notification (based on preferences)\n- Team lead can view history of past decisions (approved/rejected)\n- Request management is disabled after submission cutoff\n- Inline error displays if approving would exceed any team size limits\n- Audit log records each approval/rejection with timestamp",
          "techNotes": "Implement join request management as a Convex mutation-driven workflow with real-time reactivity. Create a `teamJoinRequests` table with fields: `teamId`, `requesterId`, `message`, `status` (pending/approved/rejected), `decidedAt`, `decidedBy`. Index on `[teamId, status]` for efficient pending request queries.\n\nThe team lead dashboard should use a Convex query subscription to reactively display pending requests, showing requester profile data joined from the users table. Implement `approveJoinRequest` and `rejectJoinRequest` mutations that validate: (1) caller is team lead via Clerk session, (2) hackathon submission cutoff hasn't passed, (3) for approvals, team size limit won't be exceeded.\n\nOn approval, the mutation should atomically: update request status, add user to `teamMembers` table, and create notification records. Use Convex's transactional guarantees to prevent race conditions when multiple requests are processed simultaneously near capacity limits.\n\nNotifications should be handled via a Convex action that checks user preferences and conditionally triggers email via Cloudflare Workers queue. Create an `auditLog` table entry for each decision with `action`, `targetUserId`, `teamId`, `timestamp`, and `actorId`.\n\nFor the decision history view, query requests with non-pending status, sorted by `decidedAt` descending. Consider pagination for teams with extensive history. Edge case: handle scenario where requester withdraws request between page load and decision action.",
          "testCases": "[{\"description\":\"Team lead successfully approves a pending join request\",\"given\":\"A team lead is authenticated and has a pending join request from a user, and the team is under capacity, and submission cutoff has not passed\",\"when\":\"The team lead clicks approve on the join request\",\"then\":\"The request status changes to approved, the requester is added to the team roster, the requester receives in-app notification, email is sent based on requester preferences, and an audit log entry is created with timestamp\"},{\"description\":\"Team lead rejects a join request with notification sent\",\"given\":\"A team lead is viewing pending join requests with at least one request present\",\"when\":\"The team lead clicks reject on a specific join request\",\"then\":\"The request status changes to rejected, the requester receives an in-app notification of rejection, the requester is not added to the team, and an audit log entry records the rejection\"},{\"description\":\"Approval blocked when team size limit would be exceeded\",\"given\":\"A team has 4 members and the hackathon maximum team size is 4, and there is a pending join request\",\"when\":\"The team lead attempts to approve the join request\",\"then\":\"An inline error message displays indicating team size limit would be exceeded, the request remains in pending status, and no team membership changes occur\"},{\"description\":\"Request management disabled after submission cutoff\",\"given\":\"A team lead has pending join requests and the hackathon submission cutoff datetime has passed\",\"when\":\"The team lead views the join request management interface\",\"then\":\"The approve and reject buttons are disabled, a message indicates that request management is closed, and pending requests are displayed as read-only\"},{\"description\":\"Team lead views history of past approved and rejected decisions\",\"given\":\"A team lead has previously approved 2 requests and rejected 1 request for their team\",\"when\":\"The team lead navigates to the decision history section\",\"then\":\"All 3 past decisions are displayed with requester names, decision type (approved/rejected), and timestamps, sorted by most recent first\"}]"
        },
        {
          "id": "US-036",
          "title": "Join Team via Private Invite Code",
          "description": "As a hackathon participant, I want to join a team using a private invite code so that I can quickly join a team I've been personally invited to.",
          "acceptanceCriteria": "- Participant can enter an invite code on the team join page\n- Valid code immediately adds participant to the team without approval\n- Invalid or expired codes display inline error message\n- Codes from other hackathons are rejected with clear error\n- Participant is redirected to their new team dashboard upon success\n- Toast notification confirms successful team join\n- Join via code is blocked after submission cutoff\n- Audit log records code-based join with timestamp and method",
          "techNotes": "Implement invite code redemption as a Convex mutation `teams:joinViaInviteCode` that validates the code, checks hackathon context, and atomically adds the member. The invite code should be looked up using a Convex index on `teamInviteCodes.code` for O(1) retrieval. Validation must verify: (1) code exists and hasn't expired via `expiresAt` timestamp, (2) code's team belongs to a hackathon where the user is a registered participant, (3) hackathon hasn't passed submission cutoff using `hackathon.submissionDeadline`, (4) team hasn't reached capacity per hackathon rules, (5) user isn't already on another team in this hackathon. Use Convex's transactional guarantees to prevent race conditions when multiple users redeem simultaneously—check team member count within the mutation. The join page should be a TanStack Start route `/hackathons/[hackathonId]/teams/join` with a simple form accepting the code. On successful mutation, invalidate relevant queries and redirect to `/hackathons/[hackathonId]/teams/[teamId]` using TanStack Router's `navigate`. Display errors inline using form state, distinguishing between 'invalid code', 'expired code', 'wrong hackathon', and 'submissions closed' with user-friendly messages. Create an audit log entry via a separate mutation or within the join mutation, recording `userId`, `teamId`, `inviteCodeId`, `timestamp`, and `joinMethod: 'invite_code'`. Consider rate-limiting code attempts per user session to prevent brute-force guessing—Convex's built-in rate limiting or a simple counter with TTL works well.",
          "testCases": "[{\"description\":\"Successfully join team with valid invite code\",\"given\":\"A registered participant in hackathon H1 with no current team, and team T1 has a valid unexpired invite code 'ABC123'\",\"when\":\"Participant enters code 'ABC123' on the team join page and submits\",\"then\":\"Participant is added to team T1 membership, redirected to team T1 dashboard, toast notification displays 'Successfully joined team!', and audit log contains entry with joinMethod 'invite_code'\"},{\"description\":\"Reject expired invite code with clear error\",\"given\":\"A valid participant and team T1 has invite code 'EXPIRED1' with expiresAt set to yesterday\",\"when\":\"Participant enters code 'EXPIRED1' and submits\",\"then\":\"Inline error displays 'This invite code has expired. Please request a new code from the team captain.', participant remains without a team, and no audit log entry is created\"},{\"description\":\"Reject invite code from different hackathon\",\"given\":\"Participant is registered for hackathon H1, and code 'WRONGHACK' belongs to team in hackathon H2\",\"when\":\"Participant enters code 'WRONGHACK' on H1's join page and submits\",\"then\":\"Inline error displays 'This invite code is for a different hackathon.', participant is not added to any team\"},{\"description\":\"Block join after submission cutoff deadline\",\"given\":\"Hackathon H1 has submissionDeadline of 2 hours ago, participant has valid code 'LATEJOIN' for team in H1\",\"when\":\"Participant enters code 'LATEJOIN' and submits\",\"then\":\"Inline error displays 'Team formation has closed for this hackathon. The submission deadline has passed.', join is prevented\"},{\"description\":\"Reject completely invalid or non-existent code\",\"given\":\"A registered participant and no invite code 'FAKECODE' exists in the system\",\"when\":\"Participant enters code 'FAKECODE' and submits\",\"then\":\"Inline error displays 'Invalid invite code. Please check the code and try again.', form remains on join page with code field preserved for correction\"}]"
        },
        {
          "id": "US-037",
          "title": "Regenerate Team Invite Code",
          "description": "As a team lead, I want to regenerate my team's invite code so that I can invalidate old codes if they were shared inappropriately.",
          "acceptanceCriteria": "- Team lead can regenerate invite code from team settings\n- Old invite code is immediately invalidated\n- New unique code is generated and displayed\n- Confirmation dialog warns that old code will stop working\n- Toast notification confirms code regeneration\n- Code regeneration is disabled after submission cutoff\n- Audit log records code regeneration with timestamp",
          "techNotes": "## Implementation Approach\n\nImplement invite code regeneration as a Convex mutation with atomic invalidation and generation. The code regeneration must be a single atomic operation to prevent race conditions where both old and new codes might temporarily work.\n\n### Architecture Considerations\n\n**Code Generation Strategy:**\n- Use `crypto.randomUUID()` or nanoid for generating unique codes\n- Consider shorter, human-friendly codes (e.g., 8 alphanumeric chars) for easier sharing\n- Store generation timestamp for audit purposes\n\n**Convex Mutation Design:**\n```typescript\n// mutations/teams.ts\nexport const regenerateInviteCode = mutation({\n  args: { teamId: v.id('teams') },\n  handler: async (ctx, { teamId }) => {\n    // 1. Verify team lead status via Clerk identity\n    // 2. Check submission cutoff hasn't passed\n    // 3. Atomically update inviteCode + audit log\n  }\n})\n```\n\n**Cutoff Enforcement:**\n- Query hackathon's submission deadline from parent event\n- Compare against `Date.now()` server-side (never trust client time)\n- Return specific error code for UI to display appropriate message\n\n**Audit Log Schema:**\n- Store in separate `auditLogs` table with teamId index\n- Record: action type, userId, previousCodeHash (not full code), timestamp\n- Hash old codes before storing for security\n\n### Security Considerations\n- Never expose old invite codes in responses or logs\n- Rate limit regeneration (suggest 5 per hour) to prevent abuse\n- Validate Clerk session and team membership server-side\n\n### Frontend Integration\n- Use TanStack Query mutation with optimistic updates disabled (wait for confirmation)\n- Confirmation dialog via headless UI component\n- Toast via sonner or similar notification library",
          "testCases": "[{\"description\":\"Team lead successfully regenerates invite code\",\"given\":\"User is authenticated as team lead and submission cutoff has not passed\",\"when\":\"User clicks regenerate code and confirms in the dialog\",\"then\":\"Old invite code is invalidated, new unique code is generated and displayed, toast confirms success, and audit log entry is created with timestamp\"},{\"description\":\"Non-team-lead member cannot regenerate invite code\",\"given\":\"User is authenticated as a regular team member (not team lead)\",\"when\":\"User attempts to access the regenerate code function\",\"then\":\"Action is rejected with 403 forbidden error and regenerate button is not visible in team settings\"},{\"description\":\"Code regeneration blocked after submission cutoff\",\"given\":\"User is team lead but hackathon submission deadline has passed\",\"when\":\"User attempts to regenerate the invite code\",\"then\":\"Action is rejected with appropriate error message explaining cutoff has passed and UI shows regenerate button as disabled with tooltip\"},{\"description\":\"Old invite code immediately stops working after regeneration\",\"given\":\"Team lead has regenerated the invite code and another user has the old code\",\"when\":\"User attempts to join team using the old invite code\",\"then\":\"Join attempt fails with 'Invalid or expired invite code' error message\"},{\"description\":\"Confirmation dialog cancellation preserves existing code\",\"given\":\"User is team lead viewing team settings with existing invite code ABC123\",\"when\":\"User clicks regenerate, sees warning dialog, and clicks Cancel\",\"then\":\"Dialog closes, existing invite code ABC123 remains active and unchanged, no audit log entry is created\"}]"
        },
        {
          "id": "US-038",
          "title": "Leave Current Team",
          "description": "As a team member, I want to leave my current team so that I can join a different team or work solo.",
          "acceptanceCriteria": "- Team member can leave team from team dashboard or settings\n- Confirmation dialog explains implications of leaving\n- Upon leaving, member is removed from team roster immediately\n- If team lead leaves and other members exist, system prompts to transfer leadership first\n- If last member leaves, team is marked as disbanded (not deleted for audit purposes)\n- Member can freely join another team after leaving (before cutoff)\n- Toast notification confirms successful departure\n- Remaining team members receive in-app notification\n- Leave functionality is blocked after submission cutoff\n- Audit log records departure with timestamp",
          "techNotes": "Implement team departure as a Convex mutation with comprehensive state validation. The mutation should first verify the user is actually a team member, then check submission cutoff deadline against the hackathon's configured dates. For team lead departures, implement a pre-check that returns a specific error code requiring leadership transfer (US-037 dependency) before allowing departure.\n\nUse Convex's transactional guarantees to atomically: (1) remove member from team roster, (2) update team member count, (3) create audit log entry, and (4) schedule notifications. For the 'last member leaves' scenario, update team status to 'disbanded' rather than deleting, preserving referential integrity for audit trails and historical reporting.\n\nThe confirmation dialog should be a client-side modal component that fetches current team state (member count, user's role, cutoff status) to display contextual warnings. Use optimistic updates for the UI but handle rollback if the mutation fails due to race conditions (e.g., cutoff passed during confirmation).\n\nNotifications to remaining members should use Convex's scheduled functions to batch notifications efficiently. Store the departure event in an audit_logs table with fields: team_id, user_id, action_type, timestamp, and metadata (capturing member count at time of departure).\n\nEdge case: Handle concurrent departures where two members leave simultaneously and both think they're not the last member. The mutation should re-check member count within the transaction.",
          "testCases": "[{\"description\":\"Regular member successfully leaves team before cutoff\",\"given\":\"A user is a regular member (not lead) of a team with 3 members, and submission cutoff is in the future\",\"when\":\"The user confirms they want to leave the team from the team dashboard\",\"then\":\"User is removed from team roster immediately, team member count decreases to 2, user sees success toast notification, remaining 2 members receive in-app notifications, and audit log records the departure with timestamp\"},{\"description\":\"Team lead blocked from leaving without transferring leadership\",\"given\":\"A user is the team lead of a team with 2 other members\",\"when\":\"The team lead attempts to leave the team\",\"then\":\"System displays error prompting to transfer leadership first, user remains on team roster, and no notifications are sent to other members\"},{\"description\":\"Last member leaving causes team disbandment\",\"given\":\"A user is the only remaining member of a team (and is the lead)\",\"when\":\"The user confirms they want to leave the team\",\"then\":\"User is removed from roster, team status is updated to 'disbanded', team record is preserved in database, audit log records both departure and disbandment, and user can now join other teams\"},{\"description\":\"Leave functionality blocked after submission cutoff\",\"given\":\"A user is a team member and the hackathon submission cutoff has passed\",\"when\":\"The user attempts to access the leave team functionality\",\"then\":\"Leave button is disabled or hidden, attempting the action via API returns a 'cutoff_passed' error, and user sees message explaining teams are locked after cutoff\"},{\"description\":\"Departed member can join new team before cutoff\",\"given\":\"A user has just left their previous team and submission cutoff is still in the future\",\"when\":\"The user attempts to join a different team or create a new team\",\"then\":\"User is allowed to join/create team without restrictions, user's participant status shows no current team, and previous team membership does not block new team actions\"}]"
        },
        {
          "id": "US-039",
          "title": "Transfer Team Leadership",
          "description": "As a team lead, I want to transfer leadership to another team member so that someone else can manage the team if I need to step back.",
          "acceptanceCriteria": "- Team lead can select another team member to become the new lead\n- Confirmation dialog requires explicit confirmation of transfer\n- Upon transfer, new lead gains all management privileges\n- Former lead becomes a regular team member\n- Both parties receive in-app notification of the change\n- Transfer is blocked after submission cutoff\n- Toast notification confirms successful transfer\n- Audit log records leadership change with timestamp and both user IDs",
          "techNotes": "Implement leadership transfer as an atomic Convex mutation to ensure data consistency. The mutation should accept teamId and newLeaderId, validate that the caller is current lead, verify the target is an active team member, and check submission cutoff hasn't passed.\n\nCreate a `transferTeamLeadership` mutation that: (1) validates current user is team lead via Clerk session, (2) queries team membership to confirm new lead is a member, (3) checks hackathon phase against submission cutoff timestamp, (4) updates team document's leaderId field, (5) updates both users' membership roles in a single transaction, (6) creates audit log entry with previous/new lead IDs and timestamp, (7) triggers notifications for both parties.\n\nFor the confirmation dialog, use a two-step UI pattern: first click opens modal with clear warning text about privilege transfer, second click executes the mutation. Consider adding a brief cooldown or requiring the new lead to accept (though AC doesn't require acceptance).\n\nNotifications should use the existing in-app notification system, creating entries for both users with appropriate message templates. The audit log should be a separate Convex table with immutable entries indexed by teamId and timestamp.\n\nEdge cases: handle race conditions if new lead leaves team during transfer, prevent transfer to oneself, handle network failures gracefully with optimistic UI rollback. Security: verify both users belong to same team and hackathon, prevent privilege escalation by non-leads.",
          "testCases": "[{\"description\":\"Successfully transfer leadership to team member\",\"given\":\"User is team lead of a team with member Alice, and submission cutoff has not passed\",\"when\":\"User selects Alice as new lead and confirms the transfer in the confirmation dialog\",\"then\":\"Alice becomes team lead with full management privileges, user becomes regular member, both receive in-app notifications, toast confirms successful transfer, and audit log records the change with timestamp and both user IDs\"},{\"description\":\"Transfer blocked after submission cutoff\",\"given\":\"User is team lead and submission cutoff deadline has passed\",\"when\":\"User attempts to initiate leadership transfer\",\"then\":\"Transfer option is disabled or hidden, and attempting via API returns error indicating cutoff has passed\"},{\"description\":\"Confirmation dialog requires explicit confirmation\",\"given\":\"User is team lead and has selected a team member for transfer\",\"when\":\"User clicks transfer button\",\"then\":\"Confirmation dialog appears with clear warning about transferring privileges, and transfer only executes after explicit confirmation click\"},{\"description\":\"Cannot transfer to non-team member\",\"given\":\"User is team lead\",\"when\":\"User attempts to transfer leadership to a user not in their team via API manipulation\",\"then\":\"System rejects the transfer with appropriate error message and no changes are made\"},{\"description\":\"Non-lead cannot initiate transfer\",\"given\":\"User is a regular team member, not the team lead\",\"when\":\"User attempts to access leadership transfer functionality\",\"then\":\"Transfer option is not visible in UI, and direct API call returns unauthorized error\"}]"
        },
        {
          "id": "US-040",
          "title": "View Participant Dashboard",
          "description": "As a hackathon participant, I want to see a personalized dashboard showing my event status, team info, deadlines, and required actions so that I can stay organized and not miss important dates.",
          "acceptanceCriteria": "- Dashboard displays current hackathon name, phase, and participant's registration status\n- Team section shows team name, members, role (lead/member), and invite code (if lead)\n- If not on a team, dashboard shows options to create or join a team\n- Deadlines section lists upcoming dates: team formation cutoff, submission deadline, judging period\n- Action items section highlights pending tasks: incomplete profile, missing team, unsubmitted solution\n- Each deadline shows countdown timer for items within 48 hours\n- Dashboard updates in real-time as status changes (Convex reactivity)\n- Notification preferences link is accessible from dashboard\n- Dashboard adapts for participants in multiple concurrent hackathons",
          "techNotes": "Implement the participant dashboard as a reactive TanStack Start route at `/dashboard` using Convex's real-time subscriptions for live updates. Create a `useParticipantDashboard` hook that aggregates data from multiple Convex queries: participant registrations, team memberships, hackathon phases, and deadlines.\n\n**Architecture:** Use a compound query pattern in Convex to fetch all dashboard data efficiently. Create `dashboard.getParticipantOverview` that joins participant records with hackathon metadata, team info, and computed action items. Leverage Convex's reactivity so status changes push updates automatically without polling.\n\n**Multi-hackathon support:** Structure the dashboard with a hackathon selector/tabs component when user has multiple active registrations. Store last-viewed hackathon in localStorage for return visits. Each hackathon card should be a self-contained component receiving its data slice.\n\n**Countdown timers:** Implement client-side countdown using `useEffect` with `setInterval` for deadlines within 48 hours. Calculate time remaining from deadline timestamps stored in Convex. Use a shared `CountdownTimer` component with configurable urgency thresholds for styling.\n\n**Action items computation:** Create a Convex query function that computes pending actions server-side by checking: profile completeness (Clerk metadata + custom fields), team membership status, and submission existence. Return structured action items with priority levels and deep links to resolution pages.\n\n**Dependencies:** Requires US-020 (Team Management), US-030 (Hackathon Phases), and participant registration stories. Clerk's `useUser` provides base identity; extend with Convex participant profile data.",
          "testCases": "[{\"description\":\"Dashboard displays hackathon overview for registered participant\",\"given\":\"A participant is registered for 'AI Innovation Hackathon' which is in the 'team_formation' phase\",\"when\":\"The participant navigates to their dashboard\",\"then\":\"Dashboard shows hackathon name 'AI Innovation Hackathon', current phase 'Team Formation', and registration status 'Confirmed'\"},{\"description\":\"Team section shows complete team information for team lead\",\"given\":\"A participant is the lead of team 'Neural Ninjas' with 3 members and invite code 'NN-2024-XYZ'\",\"when\":\"The participant views the team section of their dashboard\",\"then\":\"Team section displays team name 'Neural Ninjas', lists all 3 members with names and roles, shows role as 'Team Lead', and displays invite code 'NN-2024-XYZ' with copy button\"},{\"description\":\"Dashboard shows team creation options when participant has no team\",\"given\":\"A participant is registered for a hackathon but has not joined or created a team\",\"when\":\"The participant views the team section of their dashboard\",\"then\":\"Team section displays 'You are not on a team' message with prominent 'Create Team' and 'Join Team' buttons\"},{\"description\":\"Countdown timer appears for deadlines within 48 hours\",\"given\":\"The submission deadline is 36 hours away and team formation deadline has passed\",\"when\":\"The participant views the deadlines section\",\"then\":\"Submission deadline shows active countdown timer displaying hours and minutes, team formation deadline shows as 'Passed' without timer\"},{\"description\":\"Action items highlight incomplete required tasks\",\"given\":\"A participant has incomplete profile (missing bio), no team, and no submitted solution during submission phase\",\"when\":\"The participant views the action items section\",\"then\":\"Action items section lists three items: 'Complete your profile' linking to profile page, 'Join or create a team' linking to team page, and 'Submit your solution' linking to submission page, each with visual urgency indicator\"},{\"description\":\"Dashboard handles multiple concurrent hackathon registrations\",\"given\":\"A participant is registered for 'AI Hackathon' (submission phase) and 'Green Tech Challenge' (team formation phase)\",\"when\":\"The participant loads their dashboard\",\"then\":\"Dashboard displays hackathon selector showing both events, defaults to most recently active hackathon, and allows switching between hackathon views without page reload\"}]"
        }
      ]
    },
    {
      "title": "Solution Submissions",
      "description": "Multi-file submissions (video 500MB, deck 50MB, description, optional GitHub/demo links), category selection, version history for edits, curator approval workflow, and configurable public gallery view.",
      "userStories": [
        {
          "id": "US-041",
          "title": "Create Solution Submission Draft",
          "description": "As a team lead or member, I want to create a submission draft for my team's solution so that we can start documenting our work before the deadline.",
          "acceptanceCriteria": "- Team members can initiate a new submission from their team dashboard\n- Submission form includes fields for: title, description (rich text), category selection, optional GitHub URL, optional demo URL\n- Draft is auto-saved periodically to prevent data loss\n- Only one active submission allowed per team per hackathon\n- Submission displays current status (draft, submitted, approved, rejected)\n- Inline validation errors shown for invalid URLs or missing required fields\n- Toast notification confirms successful draft creation",
          "techNotes": "**Implementation Approach:**\n\nCreate a `submissions` table in Convex with fields: `teamId`, `hackathonId`, `title`, `description` (rich text stored as JSON/HTML), `categoryId`, `githubUrl`, `demoUrl`, `status` (enum: draft/submitted/approved/rejected), `createdBy`, `createdAt`, `updatedAt`. Add a unique compound index on `[teamId, hackathonId]` to enforce one submission per team.\n\n**Architecture:**\n\nBuild a `SubmissionForm` component using TanStack Form for validation and state management. Implement auto-save using a debounced Convex mutation (2-3 second delay) triggered on form changes. Store the debounce timer in a ref to cancel on unmount.\n\n**Key Mutations:**\n- `createSubmissionDraft`: Validates team membership via Clerk session, checks no existing submission exists, creates draft\n- `updateSubmissionDraft`: Updates fields, validates URLs with regex pattern, updates `updatedAt` timestamp\n\n**Validation:**\nURL validation should use a permissive regex for GitHub (`^https://github\\.com/[\\w-]+/[\\w.-]+`) and general URLs for demo links. Use Zod schemas shared between client and Convex for consistent validation.\n\n**Security Considerations:**\n- Verify user is member of the team via Clerk + team membership table\n- Sanitize rich text input to prevent XSS (consider using DOMPurify)\n- Rate-limit auto-save mutations to prevent abuse\n\n**Dependencies:**\n- Requires team membership system (likely US-030s)\n- Needs category definitions from hackathon setup\n- Consider using Tiptap or Lexical for rich text editing",
          "testCases": "[{\"description\":\"Successfully create a new submission draft\",\"given\":\"A user is authenticated, is a member of a team participating in an active hackathon, and the team has no existing submission\",\"when\":\"The user navigates to the team dashboard and clicks 'Create Submission'\",\"then\":\"A new submission draft is created with status 'draft', the submission form is displayed with empty fields, and a toast notification confirms 'Draft created successfully'\"},{\"description\":\"Prevent duplicate submissions for same hackathon\",\"given\":\"A team already has an existing submission (any status) for the current hackathon\",\"when\":\"A team member attempts to create a new submission\",\"then\":\"The system displays an error message 'Your team already has a submission for this hackathon', the create action is blocked, and the user is redirected to the existing submission\"},{\"description\":\"Auto-save draft on form changes\",\"given\":\"A user has an open submission draft form with title 'AI Assistant' entered\",\"when\":\"The user modifies the description field and waits 3 seconds without further input\",\"then\":\"The draft is automatically saved to the database, the 'updatedAt' timestamp is refreshed, and a subtle 'Draft saved' indicator appears without interrupting the user\"},{\"description\":\"Validate GitHub URL format\",\"given\":\"A user is editing their submission draft\",\"when\":\"The user enters 'not-a-valid-url' in the GitHub URL field and moves focus away\",\"then\":\"An inline validation error appears below the field stating 'Please enter a valid GitHub repository URL', the field is highlighted in red, and auto-save is skipped for the invalid field\"},{\"description\":\"Reject submission creation for non-team members\",\"given\":\"A user is authenticated but is not a member of any team in the hackathon\",\"when\":\"The user attempts to access the submission creation endpoint directly via API\",\"then\":\"The system returns a 403 Forbidden error, no draft is created, and an error message indicates 'You must be part of a team to create a submission'\"}]"
        },
        {
          "id": "US-042",
          "title": "Upload Demo Video with Size Validation",
          "description": "As a team member, I want to upload a demo video of our solution so that judges can see our project in action.",
          "acceptanceCriteria": "- Video upload accepts common formats (MP4, MOV, WebM)\n- Maximum file size enforced at 500MB with clear error message if exceeded\n- Upload progress indicator shows percentage complete\n- Files stored in Cloudflare R2 with secure access URLs\n- Video preview available after successful upload\n- Option to replace existing video before submission deadline\n- Upload can be cancelled mid-progress\n- Toast notification on successful upload or error",
          "techNotes": "**Implementation Approach:**\n\nUse Cloudflare R2's multipart upload API for handling large video files efficiently. Implement client-side validation first (file type via MIME type and extension, size check against 500MB limit) before initiating upload to fail fast and save bandwidth.\n\n**Architecture:**\n\n1. **Upload Flow:** Client requests presigned URL from Convex action → Convex generates R2 presigned multipart upload URL → Client uploads directly to R2 with progress tracking via XMLHttpRequest or fetch with ReadableStream → On completion, client notifies Convex to store file metadata and generate secure access URL.\n\n2. **Progress Tracking:** Use XMLHttpRequest's `upload.onprogress` event for reliable percentage calculation. Store upload state in React state with TanStack's mutation handling for optimistic UI updates.\n\n3. **Secure Access:** Generate time-limited signed URLs for video playback. Store R2 object keys in Convex, not raw URLs. Validate team membership before URL generation.\n\n4. **Cancellation:** Implement AbortController for fetch-based uploads. For multipart uploads, call R2's AbortMultipartUpload to clean up partial uploads.\n\n**Dependencies:** Requires team membership validation (US-030s), submission deadline checking, and potentially video transcoding consideration for playback compatibility.\n\n**Security Considerations:** Validate MIME type server-side (don't trust client headers), scan for malicious content if budget allows, enforce per-team upload quotas to prevent abuse. Ensure only team members can replace/view videos before judging phase.",
          "testCases": "[{\"description\":\"Successfully upload valid MP4 video under size limit\",\"given\":\"A team member is on the solution submission page with a valid 150MB MP4 file selected\",\"when\":\"The user initiates the upload\",\"then\":\"Progress indicator shows percentage increasing from 0-100%, upload completes successfully, video preview renders the uploaded content, success toast notification appears, and file metadata is stored in Convex with R2 reference\"},{\"description\":\"Reject upload exceeding 500MB size limit\",\"given\":\"A team member selects a 650MB video file for upload\",\"when\":\"The user attempts to initiate the upload\",\"then\":\"Upload is blocked before any network request, error message clearly states 'File exceeds maximum size of 500MB (your file: 650MB)', no progress indicator appears, and error toast notification is displayed\"},{\"description\":\"Reject unsupported video format\",\"given\":\"A team member selects an AVI format video file\",\"when\":\"The user attempts to upload the file\",\"then\":\"Upload is rejected with error message 'Unsupported format. Please upload MP4, MOV, or WebM files', file input is cleared, and user can select a different file\"},{\"description\":\"Cancel upload mid-progress\",\"given\":\"A team member has initiated a large video upload currently showing 45% progress\",\"when\":\"The user clicks the cancel upload button\",\"then\":\"Upload is immediately aborted, progress indicator disappears, partial upload is cleaned up from R2, confirmation message shows 'Upload cancelled', and user can initiate a new upload\"},{\"description\":\"Replace existing video before deadline\",\"given\":\"A team has previously uploaded a demo video and the submission deadline has not passed\",\"when\":\"A team member uploads a new video file\",\"then\":\"Confirmation modal asks 'Replace existing video?', upon confirmation new upload proceeds, old video is deleted from R2 after successful new upload, video preview updates to show new content, and replacement is logged for audit\"},{\"description\":\"Block upload after submission deadline\",\"given\":\"A team member attempts to access video upload after the hackathon submission deadline has passed\",\"when\":\"The user tries to select or upload a video file\",\"then\":\"Upload controls are disabled, message displays 'Submission deadline has passed', existing video remains accessible for viewing but not modification\"}]"
        },
        {
          "id": "US-043",
          "title": "Upload Presentation Deck",
          "description": "As a team member, I want to upload our presentation deck so that judges can review our solution details and approach.",
          "acceptanceCriteria": "- Deck upload accepts PDF, PPTX, and Google Slides export formats\n- Maximum file size enforced at 50MB with clear error message if exceeded\n- Upload progress indicator shows percentage complete\n- Files stored in Cloudflare R2 with secure access URLs\n- Deck preview or download link available after upload\n- Option to replace existing deck before submission deadline\n- Previous deck versions preserved in version history\n- Inline error shown for unsupported file types",
          "techNotes": "**Implementation Approach:**\n\nBuild a robust file upload system using Cloudflare R2 for storage with presigned URLs for secure, direct browser-to-R2 uploads. This offloads bandwidth from Workers and enables progress tracking.\n\n**Architecture:**\n\n1. **Upload Flow:** Client requests presigned URL from Convex action → Convex generates R2 presigned PUT URL with content-type restrictions → Client uploads directly to R2 with XHR for progress events → On completion, client notifies Convex to record metadata.\n\n2. **File Validation:** Client-side validation for immediate feedback (MIME type, extension, size). Server-side validation in Convex action before generating presigned URL. Accept `application/pdf`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.google-apps.presentation`.\n\n3. **Version History:** Store deck records in a `presentation_decks` table with `teamId`, `submissionId`, `version`, `r2Key`, `originalFilename`, `uploadedBy`, `uploadedAt`, `isActive`. Soft-replace by marking previous as inactive rather than deleting.\n\n4. **Secure Access:** Generate time-limited signed URLs for viewing/downloading. Check team membership and deadline status before serving URLs.\n\n**Dependencies:** Requires US-041 (submission creation) for linking decks to submissions. Uses Clerk for `uploadedBy` user identification.\n\n**Security Considerations:** Validate Content-Type header matches extension. Scan filenames for path traversal. Enforce team membership check before any upload operation. Rate limit upload requests to prevent abuse.\n\n**Libraries:** Use native `XMLHttpRequest` or `axios` with `onUploadProgress` for progress tracking. Consider `react-dropzone` for drag-and-drop UX.",
          "testCases": "[{\"description\":\"Successfully upload a PDF presentation deck\",\"given\":\"I am logged in as a team member with an active submission before the deadline\",\"when\":\"I select a valid 10MB PDF file and initiate upload\",\"then\":\"Upload progress indicator shows percentage from 0-100%, file is stored in R2, deck preview link becomes available, and success confirmation is displayed\"},{\"description\":\"Reject file exceeding maximum size limit\",\"given\":\"I am logged in as a team member with an active submission\",\"when\":\"I attempt to upload a 55MB PPTX file\",\"then\":\"Upload is prevented before transfer begins, error message displays 'File size exceeds 50MB limit', and no file is stored in R2\"},{\"description\":\"Reject unsupported file format with inline error\",\"given\":\"I am logged in as a team member on the deck upload interface\",\"when\":\"I attempt to upload a .docx or .zip file\",\"then\":\"Inline error displays 'Unsupported file type. Please upload PDF, PPTX, or Google Slides export', upload button remains disabled, and file is not transmitted\"},{\"description\":\"Replace existing deck while preserving version history\",\"given\":\"I am logged in as a team member with a previously uploaded deck and submission deadline has not passed\",\"when\":\"I upload a new PDF deck using the replace option\",\"then\":\"New deck becomes the active version, previous deck is preserved in version history with timestamp, version history shows both files with upload dates and uploaders\"},{\"description\":\"Prevent deck replacement after submission deadline\",\"given\":\"I am logged in as a team member and the submission deadline has passed\",\"when\":\"I attempt to upload or replace the presentation deck\",\"then\":\"Upload controls are disabled, message displays 'Submission deadline has passed - deck cannot be modified', and existing deck remains unchanged\"}]"
        },
        {
          "id": "US-044",
          "title": "Select Submission Category",
          "description": "As a team lead, I want to select which category our submission competes in so that it is evaluated by the appropriate judges.",
          "acceptanceCriteria": "- Dropdown or selection UI shows all available categories for the hackathon\n- Category descriptions visible to help teams choose appropriately\n- Only categories configured by organiser are available\n- Category can be changed until submission deadline\n- Selected category displayed prominently on submission summary\n- Category selection required before final submission\n- If hackathon has single category, it is auto-selected",
          "techNotes": "Implement category selection as a controlled form component within the submission workflow. Create a Convex query `getHackathonCategories(hackathonId)` that returns categories configured by organisers, including id, name, description, and any judge assignments. The selection UI should use a radio group for fewer than 5 categories or a searchable dropdown (using Radix Select or similar) for larger lists.\n\nStore the selected category in the submissions table with a `categoryId` field. Implement a Convex mutation `updateSubmissionCategory` that validates: (1) user is team lead via team membership lookup, (2) category belongs to the hackathon, (3) submission deadline hasn't passed using server-side timestamp comparison. For single-category hackathons, auto-populate during submission creation and hide the selection UI, showing only a read-only display.\n\nCategory descriptions should render markdown/rich text if organisers use formatting. Consider caching category data client-side with TanStack Query's stale-while-revalidate pattern since categories rarely change mid-hackathon. The submission summary component should prominently display the category with visual distinction (badge/chip pattern).\n\nEdge cases: handle category deletion by organiser (soft delete, preserve existing selections), validate category isn't full if organisers set submission caps per category. Use optimistic updates for category changes to improve perceived performance.",
          "testCases": "[{\"description\":\"Team lead successfully selects submission category\",\"given\":\"A team lead with an active submission and a hackathon with 3 available categories\",\"when\":\"The team lead opens the category selector and chooses 'AI/ML Solutions' category\",\"then\":\"The category is saved to the submission, a success confirmation appears, and the submission summary displays 'AI/ML Solutions' prominently\"},{\"description\":\"Category auto-selected for single-category hackathon\",\"given\":\"A hackathon configured with only one category 'General' and a team creating a new submission\",\"when\":\"The submission form loads\",\"then\":\"The category field shows 'General' as pre-selected and read-only, with no dropdown interaction available\"},{\"description\":\"Category change blocked after submission deadline\",\"given\":\"A team lead with a submission where the hackathon deadline was 2 hours ago\",\"when\":\"The team lead attempts to change the category from 'Mobile Apps' to 'Web Apps'\",\"then\":\"The category selector is disabled, an error message states 'Category cannot be changed after the submission deadline', and the original category remains unchanged\"},{\"description\":\"Non-team-lead member cannot change category\",\"given\":\"A team member who is not the team lead viewing the submission\",\"when\":\"The team member attempts to access the category selection control\",\"then\":\"The category selector is either hidden or displayed as read-only, with no edit capability available\"},{\"description\":\"Category descriptions help team make informed choice\",\"given\":\"A team lead viewing category options where 'Hardware Hack' has description 'Projects involving physical computing, IoT, or robotics components'\",\"when\":\"The team lead expands or hovers over the 'Hardware Hack' category option\",\"then\":\"The full category description is visible, helping the team understand if their project qualifies for this category\"}]"
        },
        {
          "id": "US-045",
          "title": "Submit Solution for Review",
          "description": "As a team lead, I want to submit our completed solution so that it enters the curator review queue before the deadline.",
          "acceptanceCriteria": "- Submit button only enabled when all required fields are complete (title, description, category, at least one file)\n- Confirmation modal shows submission summary before final submit\n- Submission blocked after hackathon deadline with clear message\n- Submission status changes to 'pending review' upon submission\n- Team receives in-app notification confirming submission\n- Email notification sent to team members if email preferences enabled\n- Audit log entry created with submission timestamp and user\n- Toast notification confirms successful submission",
          "techNotes": "**Implementation Approach:**\n\nCreate a `submitSolution` Convex mutation that orchestrates the submission workflow atomically. The mutation should validate team lead authorization via Clerk session, check deadline against hackathon's `submissionDeadline` field, and verify all required fields (title, description, category, files array length > 0).\n\n**Architecture Considerations:**\n\n- Use Convex's transactional guarantees to atomically update solution status to 'pending_review' and create audit log entry\n- Implement optimistic UI updates with TanStack Query for immediate feedback, rolling back on mutation failure\n- File references should already exist in R2 from prior upload steps; validate file IDs exist before submission\n\n**Key Implementation Details:**\n\n1. **Deadline Check:** Compare `Date.now()` against `hackathon.submissionDeadline` server-side (never trust client time)\n2. **Confirmation Modal:** Use React state to capture form snapshot, display summary, require explicit confirmation before calling mutation\n3. **Notifications:** Trigger Convex scheduled function for email dispatch via Resend/SendGrid; create in-app notification documents for all team members\n4. **Audit Log:** Store `{solutionId, action: 'submitted', userId, timestamp, metadata}` in `auditLogs` table\n\n**Security Considerations:**\n\n- Verify submitting user is actual team lead via `teamMembers` table role field\n- Rate limit submissions to prevent spam (1 per minute per team)\n- Validate file IDs belong to this team's solution to prevent reference injection\n\n**Dependencies:** Requires US-042 (file upload) and US-038 (solution draft creation) to be complete.",
          "testCases": "[{\"description\":\"Successfully submit complete solution before deadline\",\"given\":\"A team lead with a solution containing title 'AI Assistant', description (200 chars), category 'Developer Tools', and 2 uploaded files, and hackathon deadline is 24 hours away\",\"when\":\"The team lead reviews the confirmation modal and clicks 'Confirm Submission'\",\"then\":\"Solution status updates to 'pending_review', audit log entry is created with current timestamp and user ID, in-app notifications are created for all 3 team members, email is queued for members with email preferences enabled, and success toast displays 'Solution submitted successfully'\"},{\"description\":\"Submit button disabled when required fields incomplete\",\"given\":\"A team lead viewing their solution with title and description filled but no files uploaded and no category selected\",\"when\":\"The team lead views the submission form\",\"then\":\"The submit button is disabled with tooltip 'Complete all required fields: category, at least one file' and required field indicators show on category dropdown and file upload section\"},{\"description\":\"Submission blocked after hackathon deadline\",\"given\":\"A team lead with a complete solution and hackathon deadline was 2 hours ago\",\"when\":\"The team lead attempts to access the submit functionality\",\"then\":\"Submit button is disabled, error banner displays 'Submission deadline has passed (ended March 15, 2024 at 5:00 PM UTC)', and no mutation is triggered even if API called directly\"},{\"description\":\"Non-team-lead member cannot submit\",\"given\":\"A team member with role 'contributor' (not team lead) viewing their team's complete solution before deadline\",\"when\":\"The team member views the solution page\",\"then\":\"Submit button is not visible, only 'Request team lead to submit' message is shown, and direct API call returns 403 with 'Only team lead can submit'\"},{\"description\":\"Confirmation modal displays accurate submission summary\",\"given\":\"A team lead clicks submit on solution titled 'SmartScheduler' with description 'AI-powered calendar...', category 'Productivity', and files ['pitch.pdf', 'demo.mp4', 'source.zip']\",\"when\":\"The confirmation modal opens\",\"then\":\"Modal displays solution title 'SmartScheduler', truncated description (first 100 chars with ellipsis), category 'Productivity', file count '3 files attached' with file names listed, team name, and warning 'This action cannot be undone. Your solution will enter the review queue.'\"}]"
        },
        {
          "id": "US-046",
          "title": "Edit Submission with Version History",
          "description": "As a team member, I want to edit our submitted solution and have all changes tracked so that we can improve our submission while preserving history.",
          "acceptanceCriteria": "- Edit button available on submitted solutions until hackathon deadline\n- Each save creates a new version with timestamp and editor info\n- Version history panel shows all previous versions with dates\n- Previous versions are read-only but fully viewable\n- Judges always see the latest submitted version\n- Version comparison not required but versions individually accessible\n- Editing after deadline is blocked with clear message\n- Audit log captures each version save with user and timestamp",
          "techNotes": "**Implementation Approach:**\n\nDesign a versioned submission system using Convex's document model with an append-only version collection. Create a `submissionVersions` table with fields: `submissionId`, `versionNumber`, `content`, `attachments`, `editorId`, `createdAt`. The main `submissions` table maintains a `currentVersionId` reference and `latestVersionNumber` counter for efficient queries.\n\n**Architecture Considerations:**\n\n1. **Version Creation**: On each save, insert a new version document and atomically update the parent submission's `currentVersionId` and increment `latestVersionNumber` using Convex mutations with transactional guarantees.\n\n2. **Deadline Enforcement**: Implement a server-side middleware check in mutations comparing `Date.now()` against `hackathon.submissionDeadline`. Return structured errors for client-side messaging. Never trust client-side deadline checks alone.\n\n3. **Audit Logging**: Leverage Convex's built-in `_creationTime` for timestamps. Store `editorId` (from Clerk's `ctx.auth.getUserIdentity()`) with each version. Consider a separate `auditLog` table for cross-cutting audit requirements.\n\n4. **File Handling**: Version attachments by storing R2 object keys per version. Avoid deleting old files to preserve history integrity. Consider lifecycle policies for storage optimization post-hackathon.\n\n**Security Considerations:**\n- Validate team membership before allowing edits\n- Ensure `editorId` comes from authenticated session, not request body\n- Rate-limit version creation to prevent spam (suggest 1 save per 30 seconds)\n\n**Dependencies:** US-044 (initial submission), US-031 (team membership validation)",
          "testCases": "[{\"description\":\"Successfully edit submission before deadline creates new version\",\"given\":\"A team member is authenticated, the team has an existing submission with version 1, and the hackathon submission deadline is 2 hours away\",\"when\":\"The team member updates the solution description and clicks save\",\"then\":\"A new version 2 is created with the updated content, current timestamp, and editor's user ID; the submission's currentVersionId points to version 2; the user sees a success confirmation\"},{\"description\":\"Version history displays all previous versions chronologically\",\"given\":\"A submission exists with 3 versions created by different team members at different times\",\"when\":\"A team member opens the version history panel\",\"then\":\"All 3 versions are displayed in reverse chronological order showing version number, editor name, and formatted timestamp; each version has a 'View' action available\"},{\"description\":\"Previous versions are viewable but not editable\",\"given\":\"A team member is viewing version 1 of a submission that currently has 3 versions\",\"when\":\"The team member views the version 1 details\",\"then\":\"All content and attachments from version 1 are displayed in read-only mode; no edit button or editable fields are present; a label indicates 'Historical Version'\"},{\"description\":\"Editing blocked after submission deadline with clear message\",\"given\":\"A team member is authenticated, the team has an existing submission, and the hackathon submission deadline passed 30 minutes ago\",\"when\":\"The team member attempts to access the edit functionality\",\"then\":\"The edit button is disabled or hidden; attempting to save via API returns a 403 error; a clear message displays 'Submission deadline has passed. Editing is no longer available.'\"},{\"description\":\"Judges view shows only the latest submitted version\",\"given\":\"A judge is authenticated and assigned to evaluate a submission that has 4 versions\",\"when\":\"The judge opens the submission for review\",\"then\":\"Only version 4 (the latest) content is displayed; no version history panel or version selector is visible to the judge; the view matches what the team last submitted\"}]"
        },
        {
          "id": "US-047",
          "title": "Curator Submission Approval Workflow",
          "description": "As a curator, I want to review and approve or reject submissions so that only appropriate content appears in the judging pool and public gallery.",
          "acceptanceCriteria": "- Curator dashboard shows queue of pending submissions\n- Each submission displays full details including all files and links\n- Approve action moves submission to 'approved' status\n- Reject action requires a reason and moves to 'rejected' status\n- Rejected teams receive notification with rejection reason\n- Approved submissions become visible to assigned judges\n- Bulk approve option available for multiple submissions\n- Filter options: pending, approved, rejected, all\n- Audit log captures approval/rejection with curator ID and timestamp",
          "techNotes": "Implement curator workflow using Convex mutations with role-based access control via Clerk. Create a `submission_reviews` table to track approval actions with fields: submissionId, curatorId, action (approved/rejected), reason (nullable), timestamp. Use Convex indexes on status and hackathonId for efficient queue filtering.\n\nThe curator dashboard should use TanStack Query for real-time updates via Convex subscriptions, ensuring the queue reflects changes immediately when other curators act. Implement optimistic updates for smooth UX during approve/reject actions.\n\nFor bulk approval, use Convex's transaction support to ensure atomicity—either all selected submissions update or none do. Limit bulk operations to 50 items per request to avoid timeout issues on Cloudflare Workers.\n\nFile preview should lazy-load from R2 using signed URLs with 15-minute expiry for security. Consider implementing a lightweight document viewer component for common formats (PDF, images, markdown).\n\nNotification system should trigger via Convex scheduled functions after rejection, queuing emails through a dedicated notification service. Store notification preferences to respect user settings.\n\nAudit logging is critical—use a separate `audit_logs` table with immutable append-only pattern. Include curator ID from Clerk session, action type, affected submission IDs, and full timestamp. This supports compliance requirements and dispute resolution.\n\nEdge cases: Handle concurrent curator actions on same submission (use optimistic locking), curator attempting to review their own team's submission (block with role check), and submissions with missing/corrupted files (flag for admin review rather than silent failure).",
          "testCases": "[{\"description\":\"Curator approves a pending submission successfully\",\"given\":\"A curator is logged in and viewing a pending submission with complete details and files\",\"when\":\"The curator clicks the approve button for the submission\",\"then\":\"The submission status changes to approved, an audit log entry is created with curator ID and timestamp, and the submission becomes visible in the judges' queue\"},{\"description\":\"Curator rejects submission with required reason\",\"given\":\"A curator is viewing a pending submission that violates guidelines\",\"when\":\"The curator clicks reject and attempts to submit without entering a reason\",\"then\":\"A validation error is displayed requiring a rejection reason, and the submission remains in pending status\"},{\"description\":\"Rejected team receives notification with reason\",\"given\":\"A curator has rejected a submission with reason 'Submission contains prohibited external API usage'\",\"when\":\"The rejection is processed\",\"then\":\"All team members receive an in-app notification and email containing the rejection reason, and the notification links to their submission\"},{\"description\":\"Bulk approve multiple submissions atomically\",\"given\":\"A curator has selected 5 pending submissions using the checkbox interface\",\"when\":\"The curator clicks bulk approve and one submission fails validation due to missing files\",\"then\":\"None of the 5 submissions are approved, an error message identifies the problematic submission, and all remain in pending status\"},{\"description\":\"Filter displays correct submission counts by status\",\"given\":\"A hackathon has 10 pending, 25 approved, and 3 rejected submissions\",\"when\":\"The curator switches between filter options on the dashboard\",\"then\":\"Each filter shows the correct count badge and displays only submissions matching that status, with the default view showing pending submissions first\"}]"
        },
        {
          "id": "US-048",
          "title": "Public Gallery Display",
          "description": "As an organiser, I want to configure a public gallery of approved submissions so that stakeholders can browse solutions after the hackathon.",
          "acceptanceCriteria": "- Gallery toggle setting available in hackathon configuration\n- When enabled, approved submissions appear in public gallery view\n- Gallery shows submission title, description preview, category, and team name\n- Video and deck accessible from gallery if submission is public\n- Gallery respects hackathon visibility (public hackathons only)\n- Organisers can exclude specific submissions from gallery\n- Gallery only visible after curator publishes results (configurable)\n- Gallery accessible via shareable public URL",
          "techNotes": "Implement public gallery as a separate public route (e.g., /gallery/{hackathonSlug}) that bypasses authentication for read-only access. Create a 'gallerySettings' object in hackathon schema with fields: enabled (boolean), visibleAfterResults (boolean), publishedAt (timestamp). Add 'excludedFromGallery' boolean flag to submissions table, defaulting to false.\n\nFor the gallery query, create a Convex function that joins submissions with teams, filtering by: hackathon.isPublic === true, hackathon.gallerySettings.enabled === true, submission.status === 'approved', submission.excludedFromGallery === false, and optionally resultsPublished timestamp check. Use Convex's .paginate() for efficient loading of large galleries.\n\nGenerate shareable URLs using hackathon slug for SEO-friendly paths. Implement Open Graph meta tags dynamically for social sharing. For video/deck access, check submission.isPublic flag before exposing R2 signed URLs - use short-lived signatures (1 hour) for public content.\n\nCache gallery data aggressively since it's read-heavy post-hackathon. Consider implementing a denormalized 'gallerySubmissions' table populated when results are published, avoiding complex joins on public queries. Add rate limiting on the public endpoint via Cloudflare Workers to prevent scraping. Ensure description preview is truncated server-side (150 chars) to control payload size and prevent layout issues.",
          "testCases": "[{\"description\":\"Gallery displays approved submissions for public hackathon with gallery enabled\",\"given\":\"A public hackathon with gallery enabled, results published, and 3 approved submissions (1 excluded from gallery)\",\"when\":\"An unauthenticated user visits the gallery URL /gallery/{hackathonSlug}\",\"then\":\"Gallery displays 2 submissions with title, description preview (max 150 chars), category, and team name visible\"},{\"description\":\"Gallery respects hackathon visibility restrictions\",\"given\":\"An invite-only hackathon with gallery toggle enabled and approved submissions\",\"when\":\"A user attempts to access the gallery URL for this hackathon\",\"then\":\"System returns 404 or 'Gallery not available' message, submissions are not exposed\"},{\"description\":\"Gallery hidden until results are published when configured\",\"given\":\"A public hackathon with gallery enabled, 'visible after results' setting ON, and results not yet published\",\"when\":\"A user visits the gallery URL\",\"then\":\"System displays 'Gallery will be available after results are announced' message with no submissions shown\"},{\"description\":\"Organiser excludes specific submission from gallery\",\"given\":\"A public hackathon with gallery enabled and an approved submission currently visible in gallery\",\"when\":\"Organiser toggles 'exclude from gallery' for that submission and saves\",\"then\":\"Submission no longer appears in public gallery view, other submissions remain visible\"},{\"description\":\"Video and deck access respects submission privacy settings\",\"given\":\"Gallery with two submissions: one marked public with video/deck, one marked private with video/deck\",\"when\":\"User browses the gallery and attempts to access media for both submissions\",\"then\":\"Public submission shows video player and deck download link; private submission shows only title and description with 'Media not publicly available' indicator\"}]"
        }
      ]
    },
    {
      "title": "Judging & Results",
      "description": "Flexible judge assignment (category-based or manual), hybrid judge interface (grid overview with expandable details), ranked choice scoring system, private rankings until judging closes, result overrides, and manual leaderboard publishing by curators.",
      "userStories": [
        {
          "id": "US-049",
          "title": "Category-Based Judge Assignment",
          "description": "As a curator, I want to assign judges to specific problem categories so that they automatically review all submissions within those categories.",
          "acceptanceCriteria": "- Curator can select one or more problem categories to assign to each judge\n- When a judge is assigned to a category, they automatically see all submissions for problems in that category\n- Judge assignments can be modified until judging phase begins\n- System displays count of submissions per category to help curators balance workload\n- Judges receive email and in-app notification when assigned to categories\n- Curator can view a summary showing which categories have judges assigned and which are unassigned\n- Assignment changes are logged in audit trail with curator ID and timestamp",
          "techNotes": "**Implementation Approach:**\n\nCreate a `judgeCategoryAssignments` table in Convex with fields: `judgeId`, `hackathonId`, `categoryIds` (array), `assignedBy`, `assignedAt`. Use a compound index on `(hackathonId, judgeId)` for efficient lookups and updates.\n\n**Category-Based Submission Resolution:**\nImplement a Convex query `getJudgeSubmissions` that joins category assignments → problems (by category) → submissions. Use Convex's reactive queries so judge dashboards automatically update when new submissions arrive in assigned categories.\n\n**Assignment UI Component:**\nBuild a multi-select category picker with submission counts fetched via `getSubmissionCountsByCategory` query. Display as chips/tags with badges showing count. Include a matrix view showing judges × categories for curator overview.\n\n**Phase Locking:**\nCheck hackathon `currentPhase` before allowing assignment modifications. Return descriptive error if phase is 'judging' or later. Consider adding a `judgeAssignmentsLocked` field for explicit control.\n\n**Notification Integration:**\nTrigger notifications via Convex action that calls both email (via Clerk's email or external service) and creates in-app notification record. Batch notifications if multiple categories assigned simultaneously.\n\n**Audit Trail:**\nUse `auditLogs` table with `entityType: 'judgeCategoryAssignment'`, `action` (assigned/modified/removed), `changes` (diff of categoryIds), `performedBy`, `timestamp`. Query with index on `(hackathonId, entityType)` for curator review.\n\n**Security:**\nValidate curator role via Clerk session. Ensure judges being assigned actually have judge role for this hackathon.",
          "testCases": "[{\"description\":\"Successfully assign judge to multiple categories\",\"given\":\"A curator is logged in, hackathon is in team-formation phase, and Judge A exists with no category assignments\",\"when\":\"Curator selects categories 'AI/ML' and 'Web3' and assigns them to Judge A\",\"then\":\"Assignment is saved, Judge A can query submissions for both categories, curator sees updated assignment summary, and audit log entry is created with curator ID and timestamp\"},{\"description\":\"Display submission counts per category for workload balancing\",\"given\":\"A hackathon has 3 categories: 'AI/ML' with 12 submissions, 'Web3' with 5 submissions, and 'Healthcare' with 8 submissions\",\"when\":\"Curator opens the judge assignment interface\",\"then\":\"Each category displays its submission count as a badge, and total workload is shown when hovering over assigned categories\"},{\"description\":\"Prevent assignment modification after judging begins\",\"given\":\"A hackathon has transitioned to 'judging' phase and Judge B is assigned to 'Fintech' category\",\"when\":\"Curator attempts to add 'Sustainability' category to Judge B's assignments\",\"then\":\"System rejects the modification with error 'Judge assignments cannot be modified after judging has begun' and no changes are persisted\"},{\"description\":\"Send notifications when judge is assigned to categories\",\"given\":\"Judge C has email notifications enabled and is not currently assigned to any categories\",\"when\":\"Curator assigns Judge C to 'Education' and 'Gaming' categories\",\"then\":\"Judge C receives one email listing both assigned categories and one in-app notification appears in their notification center within 30 seconds\"},{\"description\":\"Highlight unassigned categories in curator summary view\",\"given\":\"A hackathon has 4 categories where 'AI/ML' and 'Web3' have judges assigned but 'Healthcare' and 'Fintech' have no judges\",\"when\":\"Curator views the category assignment summary dashboard\",\"then\":\"'Healthcare' and 'Fintech' are visually highlighted as unassigned with warning indicators, and a summary shows '2 of 4 categories have judges assigned'\"}]"
        },
        {
          "id": "US-050",
          "title": "Manual Submission Assignment to Judges",
          "description": "As a curator, I want to manually assign specific submissions to individual judges so that I have fine-grained control over the judging process when category-based assignment doesn't fit.",
          "acceptanceCriteria": "- Curator can select individual submissions and assign them to specific judges\n- Same submission can be assigned to multiple judges for cross-evaluation\n- Curator can use both category-based and manual assignment within the same hackathon\n- Manual assignments override category-based assignments when both exist for a judge\n- Judges receive notification when new submissions are manually assigned to them\n- Curator can bulk-select submissions for assignment to speed up the process\n- System prevents assigning submissions to judges who are members of the submitting team\n- All manual assignments are logged with curator ID, judge ID, submission ID, and timestamp",
          "techNotes": "Implement manual submission assignment using a dedicated `judgeAssignments` table in Convex with fields: id, hackathonId, judgeId, submissionId, assignmentType ('manual' | 'category'), assignedBy (curatorId), assignedAt, and priority flag for override logic. Create a Convex mutation `assignSubmissionsToJudge` that accepts an array of submissionIds and a judgeId, enabling bulk operations in a single transaction.\n\nFor conflict-of-interest prevention, implement a pre-assignment validation query that joins submissions with team memberships, rejecting any assignment where judgeId exists in the submitting team's member list. Use Convex's transactional guarantees to ensure atomic bulk assignments.\n\nThe override mechanism should use assignment priority: when fetching a judge's queue, filter by judgeId and apply COALESCE-style logic where manual assignments take precedence. Implement this in a `getJudgeAssignments` query that returns deduplicated submissions with their assignment source.\n\nFor the UI, build a multi-select DataTable component using TanStack Table with row selection state. Include a judge selector dropdown (filtered to exclude team members) and a 'Assign Selected' action button. Implement optimistic updates for responsive UX.\n\nNotifications should trigger via Convex's scheduled functions, calling an internal action that creates in-app notifications and optionally queues emails through a Cloudflare Worker. Audit logging should use a separate `assignmentAuditLog` table populated within the same mutation transaction to ensure consistency.",
          "testCases": "[{\"description\":\"Curator successfully assigns single submission to a judge\",\"given\":\"A curator is viewing unassigned submissions and a judge exists who is not a member of any submitting team\",\"when\":\"The curator selects one submission and assigns it to the judge\",\"then\":\"The assignment is created with type 'manual', the judge receives an in-app notification, and an audit log entry is recorded with curator ID, judge ID, submission ID, and timestamp\"},{\"description\":\"Bulk assignment of multiple submissions to a single judge\",\"given\":\"A curator has selected 5 submissions and a valid judge is chosen\",\"when\":\"The curator clicks 'Assign Selected' to assign all submissions to the judge\",\"then\":\"All 5 assignments are created atomically, the judge receives one consolidated notification, and 5 audit log entries are created\"},{\"description\":\"System prevents assignment to judge who is a team member\",\"given\":\"A submission exists from Team Alpha and Judge Bob is a member of Team Alpha\",\"when\":\"The curator attempts to assign Team Alpha's submission to Judge Bob\",\"then\":\"The system rejects the assignment with error 'Cannot assign submission to a judge who is a member of the submitting team' and no assignment or audit log is created\"},{\"description\":\"Manual assignment overrides category-based assignment for the same judge\",\"given\":\"Judge Carol has submission S1 assigned via category-based rules and a curator manually assigns S1 to Judge Carol with specific instructions\",\"when\":\"Judge Carol views their assignment queue\",\"then\":\"Submission S1 appears once with assignment type 'manual' and the category-based assignment is superseded but retained in history\"},{\"description\":\"Same submission assigned to multiple judges for cross-evaluation\",\"given\":\"Submission S2 exists and judges Dave and Eve are both eligible (not team members)\",\"when\":\"The curator assigns S2 to Dave, then separately assigns S2 to Eve\",\"then\":\"Both assignments are created successfully, both judges see S2 in their queues, and both receive notifications with separate audit log entries\"}]"
        },
        {
          "id": "US-051",
          "title": "Hybrid Judge Interface with Grid Overview",
          "description": "As a judge, I want to see all my assigned submissions in a grid overview with the ability to expand details so that I can efficiently review and compare multiple submissions.",
          "acceptanceCriteria": "- Grid displays submission title, team name, problem category, and judging status (not started, in progress, completed)\n- Judges can filter grid by category, problem, or judging status\n- Judges can sort grid by submission date, team name, or problem title\n- Clicking a submission expands an inline detail panel showing full submission content\n- Expanded view displays the latest submitted version of all materials (description, demo video, presentation deck)\n- Judges can navigate between expanded submissions without returning to grid view\n- Grid persists judge's filter and sort preferences within the session\n- Submission materials load progressively to handle large video files\n- Interface works on tablet and desktop screen sizes",
          "techNotes": "Implement a responsive grid-based judge interface using TanStack Table for efficient data handling and virtualization. The grid component should fetch assigned submissions via a Convex query (`getJudgeAssignments`) that joins submission data with team info, problem categories, and current judging status.\n\nFor the expandable detail panel, use a master-detail pattern where clicking a row renders an inline expansion below the grid row rather than a modal—this preserves context and enables quick navigation. Store expansion state locally and implement keyboard navigation (arrow keys, Enter to expand/collapse) for accessibility.\n\nFilter and sort state should be managed via TanStack Router search params for URL persistence within session, falling back to React state. This enables shareable filtered views and browser back/forward navigation. Implement a `useJudgePreferences` hook that syncs these preferences.\n\nFor progressive loading of submission materials, implement a tiered approach: load metadata and thumbnails immediately, lazy-load video players only when expanded, and use R2 presigned URLs with short TTLs for secure video streaming. Consider HLS streaming for large videos via Cloudflare Stream integration if file sizes exceed 100MB.\n\nResponsive design should use CSS Grid with `auto-fit` and `minmax()` for tablet adaptation—collapse to 2 columns on tablet, single-card view on narrow viewports. The expanded panel should stack below the selected card on mobile breakpoints.\n\nSecurity: Verify judge assignment via Clerk session in all Convex queries. Cache submission data client-side with SWR pattern but invalidate on judging status changes from other judges.",
          "testCases": "[{\"description\":\"Grid displays all assigned submissions with correct metadata\",\"given\":\"A judge is logged in and assigned to 5 submissions across 2 problem categories\",\"when\":\"The judge navigates to the judging interface\",\"then\":\"The grid displays all 5 submissions showing title, team name, problem category, and judging status for each, with 2 showing 'not started', 2 showing 'in progress', and 1 showing 'completed'\"},{\"description\":\"Filter submissions by judging status\",\"given\":\"A judge is viewing a grid with 10 submissions in various judging states\",\"when\":\"The judge selects 'In Progress' from the status filter dropdown\",\"then\":\"The grid updates to show only submissions with 'in progress' status, the filter selection persists in the UI, and the URL search params reflect the active filter\"},{\"description\":\"Expand submission to view full details with progressive video loading\",\"given\":\"A judge is viewing the submissions grid and a submission has a 200MB demo video attached\",\"when\":\"The judge clicks on a submission row to expand it\",\"then\":\"An inline detail panel expands below the row showing submission description and presentation deck immediately, while the video player shows a loading placeholder and begins streaming progressively without blocking the UI\"},{\"description\":\"Navigate between expanded submissions using keyboard\",\"given\":\"A judge has expanded submission #3 in a list of 5 submissions and is viewing its details\",\"when\":\"The judge presses the down arrow key followed by Enter\",\"then\":\"Submission #3 collapses, submission #4 expands showing its full details, and focus moves to the newly expanded panel without returning to grid-only view\"},{\"description\":\"Grid adapts layout for tablet screen size\",\"given\":\"A judge is viewing the submissions grid on a tablet device with 768px viewport width\",\"when\":\"The interface loads and the judge expands a submission\",\"then\":\"The grid displays in a 2-column layout, the expanded detail panel spans full width below the selected card, and all interactive elements remain accessible with touch targets of at least 44px\"}]"
        },
        {
          "id": "US-052",
          "title": "Ranked Choice Scoring Submission",
          "description": "As a judge, I want to rank submissions using a ranked choice system so that my preferences are captured with appropriate point weighting.",
          "acceptanceCriteria": "- Judge can assign 1st place (3 points), 2nd place (2 points), and 3rd place (1 point) rankings\n- Each ranking position can only be assigned to one submission per judge\n- Judge can leave submissions unranked (0 points) if they don't merit top 3\n- Rankings can be modified until the judging phase closes\n- System validates that judge hasn't assigned duplicate rankings\n- Judge can clear all rankings and start over\n- Interface shows visual feedback when rankings are saved\n- Toast notification confirms successful ranking submission\n- Rankings are saved automatically as judge makes selections (no separate save button required)\n- All ranking changes are logged in audit trail with timestamp",
          "techNotes": "Implement ranked choice scoring using Convex for real-time state management and persistence. Create a `judgeRankings` table with schema: `{ judgeId, hackathonId, submissionId, rank (1-3 or null), updatedAt }` with a compound unique index on `(judgeId, hackathonId, rank)` to enforce single-assignment constraint at database level.\n\nUse Convex mutations with optimistic updates for immediate UI feedback on rank changes. Implement a `setRanking` mutation that: (1) validates judging phase is active via hackathon status check, (2) clears any existing rank assignment for the target position, (3) assigns new rank, (4) writes to audit log table. Wrap in transaction for atomicity.\n\nFrontend: Build drag-and-drop ranking interface using `@dnd-kit/core` for accessible reordering. Display submissions in a list with three designated drop zones for 1st/2nd/3rd. Use Convex's `useMutation` with automatic retry and `useQuery` for real-time sync across tabs. Show optimistic UI state immediately, with rollback on error.\n\nAudit logging: Create `rankingAuditLog` table capturing `{ judgeId, hackathonId, action, previousRank, newRank, submissionId, timestamp }`. Use Convex's `ctx.auth` to securely identify judge from Clerk session.\n\nEdge cases: Handle concurrent modifications if judge has multiple tabs open (Convex handles this via real-time sync). Validate judge assignment to hackathon before allowing any mutations. Consider rate limiting rapid changes to prevent spam.",
          "testCases": "[{\"description\":\"Judge successfully assigns first place ranking\",\"given\":\"A judge is assigned to an active hackathon with 5 submissions and judging phase is open\",\"when\":\"The judge selects a submission and assigns it 1st place (3 points)\",\"then\":\"The ranking is saved automatically, visual indicator shows the submission as ranked #1, toast notification confirms 'Ranking saved', and audit log records the action with timestamp\"},{\"description\":\"System prevents duplicate ranking positions\",\"given\":\"A judge has already assigned Submission A as 1st place\",\"when\":\"The judge attempts to assign Submission B as 1st place\",\"then\":\"Submission A is automatically unranked, Submission B becomes 1st place, both changes are logged in audit trail, and UI updates to reflect the swap\"},{\"description\":\"Judge clears all rankings successfully\",\"given\":\"A judge has assigned 1st, 2nd, and 3rd place rankings to three different submissions\",\"when\":\"The judge clicks 'Clear All Rankings' and confirms the action\",\"then\":\"All three submissions return to unranked state (0 points), visual feedback shows empty ranking slots, toast confirms 'Rankings cleared', and audit log records bulk clear action\"},{\"description\":\"Rankings cannot be modified after judging phase closes\",\"given\":\"A judge has existing rankings and the hackathon judging phase has just closed\",\"when\":\"The judge attempts to modify or add a new ranking\",\"then\":\"The mutation is rejected with error message 'Judging phase has ended', existing rankings remain unchanged, UI disables ranking controls, and no audit entry is created for the failed attempt\"},{\"description\":\"Unranked submissions receive zero points\",\"given\":\"A hackathon has 10 submissions and a judge has only ranked their top 3\",\"when\":\"The system calculates points from this judge's rankings\",\"then\":\"Ranked submissions receive 3, 2, and 1 points respectively, the remaining 7 submissions receive 0 points from this judge, and the judge's ranking is considered complete and valid\"}]"
        },
        {
          "id": "US-053",
          "title": "Private Rankings During Active Judging",
          "description": "As a curator, I want all rankings to remain private until judging closes so that judges aren't influenced by others' scores and results remain confidential.",
          "acceptanceCriteria": "- Judges can only see their own rankings, not other judges' rankings\n- Curators and organisers can view aggregated scores during judging phase but individual judge rankings remain hidden\n- No leaderboard or ranking information is visible to participants, problem proposers, or public during active judging\n- API endpoints enforce privacy rules regardless of UI access\n- Attempting to access ranking data returns appropriate error for unauthorized users\n- System logs any attempts to access private ranking data\n- Privacy status is clearly indicated in curator dashboard during active judging phase",
          "techNotes": "Implement a multi-layered privacy enforcement system for rankings during active judging. Create a RankingPrivacyService that centralizes all access control logic, checking judging phase status and user role before returning any ranking data.\n\nIn Convex, design queries with built-in authorization: `getMyRankings` for judges (filtered by authenticated judge ID), `getAggregatedScores` for curators/organisers (returns only averages, counts, standard deviation - no individual scores), and internal-only `getAllRankings` used solely for aggregation calculations.\n\nImplement a JudgingPhaseGuard middleware for all ranking-related API endpoints that checks hackathon phase status from the database before processing. Return 403 Forbidden with generic message for unauthorized access attempts - avoid revealing whether data exists.\n\nCreate an AuditLogService using a Convex table to record all ranking access attempts with timestamp, userId, requestedResource, accessGranted boolean, and userRole. Use Convex mutations to ensure atomic logging even on denied requests.\n\nFor the curator dashboard, add a PrivacyStatusBanner component that queries current judging phase and displays clear visual indicator (lock icon, colored badge) showing 'Rankings Private - Judging Active'. Use TanStack Query for real-time phase status updates.\n\nEdge cases: Handle race conditions where judging closes mid-request using optimistic locking on phase status. Consider caching aggregated scores with short TTL (30 seconds) to reduce database load while maintaining near-real-time accuracy for curators.",
          "testCases": "[{\"description\":\"Judge can view only their own submitted rankings\",\"given\":\"A judge has submitted rankings for 3 solutions and another judge has submitted rankings for the same solutions during active judging phase\",\"when\":\"The first judge requests their rankings via the getMyRankings endpoint\",\"then\":\"Only the first judge's 3 rankings are returned with full score details, and no data from the other judge's rankings is included in the response\"},{\"description\":\"Curator sees aggregated scores without individual judge details\",\"given\":\"Active judging phase with 4 judges who have each ranked a solution with scores 8, 7, 9, and 6\",\"when\":\"A curator requests the aggregated scores for that solution\",\"then\":\"Response contains average score of 7.5, count of 4 reviews, and standard deviation, but no individual judge identifiers or their specific scores\"},{\"description\":\"Participant receives 403 when attempting to access any ranking data\",\"given\":\"A participant who submitted a solution during active judging phase\",\"when\":\"The participant attempts to call any ranking endpoint including getMyRankings, getAggregatedScores, or getSolutionRankings\",\"then\":\"All requests return HTTP 403 Forbidden with message 'Ranking data is not available during active judging' and no ranking data is leaked in the response\"},{\"description\":\"Unauthorized access attempts are logged with full context\",\"given\":\"A participant and a problem proposer both attempt to access ranking endpoints during active judging\",\"when\":\"Each unauthorized request is processed and denied by the API\",\"then\":\"Two audit log entries are created containing timestamp, user IDs, their roles, the specific endpoint requested, and accessGranted set to false\"},{\"description\":\"Privacy status indicator displays correctly on curator dashboard\",\"given\":\"A curator is viewing the dashboard for a hackathon currently in active judging phase\",\"when\":\"The dashboard loads and the judging phase status is fetched\",\"then\":\"A visible privacy banner displays with lock icon and text 'Rankings Private - Judging In Progress' in a warning color scheme, and this status updates in real-time if phase changes\"}]"
        },
        {
          "id": "US-054",
          "title": "Automated Score Aggregation and Tiebreaking",
          "description": "As a curator, I want the system to automatically aggregate judge rankings and apply tiebreaker rules so that I have accurate preliminary results when judging closes.",
          "acceptanceCriteria": "- System calculates total points for each submission (sum of all judges' ranked choice points)\n- Ties are broken first by count of 1st-place votes\n- If still tied, secondary tiebreaker is count of 2nd-place votes\n- If still tied after both tiebreakers, submissions share the same rank\n- Curator can view detailed breakdown showing each judge's rankings per submission\n- Aggregated results update in real-time as judges submit rankings\n- System clearly indicates when ties exist and how they were resolved\n- Results calculations are logged for audit purposes",
          "techNotes": "Implement score aggregation as a Convex mutation triggered reactively when judge rankings change. Create a `calculateAggregatedScores` function that queries all submitted rankings for a hackathon's judging period, then computes totals using ranked-choice point values (e.g., 1st=N points, 2nd=N-1, etc. where N=submission count).\n\nFor tiebreaking, implement a multi-level sort: (1) total points descending, (2) count of 1st-place votes descending, (3) count of 2nd-place votes descending. Submissions still tied after all tiebreakers receive identical rank values with a `tiedWith` array reference.\n\nStore results in an `aggregatedResults` table with fields: hackathonId, submissionId, totalPoints, rank, firstPlaceVotes, secondPlaceVotes, tieStatus, tieResolution (enum: 'first_place_count' | 'second_place_count' | 'shared_rank' | 'none'), and calculatedAt timestamp.\n\nCreate a separate `scoringAuditLog` table capturing each calculation event with input rankings snapshot, algorithm version, and resulting scores. Use Convex's real-time subscriptions for the curator dashboard—subscribe to the aggregatedResults query filtered by hackathonId.\n\nFor the detailed breakdown view, create a denormalized query joining submissions with all judge rankings, returning a matrix structure. Consider adding an index on (hackathonId, submissionId) for efficient lookups. Implement idempotent recalculation to handle late ranking modifications gracefully.",
          "testCases": "[{\"description\":\"Aggregate scores correctly from multiple judges\",\"given\":\"A hackathon with 3 submissions and 2 judges who have both submitted complete rankings\",\"when\":\"The score aggregation runs after the second judge submits\",\"then\":\"Each submission has a totalPoints value equal to the sum of points from both judges' rankings\"},{\"description\":\"Break tie using first-place vote count\",\"given\":\"Two submissions with identical total points where Submission A has 2 first-place votes and Submission B has 1 first-place vote\",\"when\":\"The tiebreaker logic is applied\",\"then\":\"Submission A ranks higher than Submission B and tieResolution shows 'first_place_count'\"},{\"description\":\"Break tie using second-place votes when first-place counts match\",\"given\":\"Two submissions with identical total points and identical first-place vote counts, where Submission A has 3 second-place votes and Submission B has 1 second-place vote\",\"when\":\"The tiebreaker logic is applied\",\"then\":\"Submission A ranks higher than Submission B and tieResolution shows 'second_place_count'\"},{\"description\":\"Assign shared rank when all tiebreakers exhausted\",\"given\":\"Two submissions with identical total points, identical first-place votes, and identical second-place votes\",\"when\":\"The tiebreaker logic is applied\",\"then\":\"Both submissions receive the same rank value, tieStatus is true, tieResolution shows 'shared_rank', and tiedWith arrays reference each other\"},{\"description\":\"Audit log captures calculation details\",\"given\":\"A curator viewing results after aggregation completes\",\"when\":\"The system logs the score calculation\",\"then\":\"An audit entry exists with hackathonId, timestamp, snapshot of input rankings, algorithm version, and final computed scores\"}]"
        },
        {
          "id": "US-055",
          "title": "Organiser Result Override Before Publishing",
          "description": "As an organiser, I want to override automated rankings before results are published so that I can account for special circumstances or apply additional criteria.",
          "acceptanceCriteria": "- Organiser can adjust final placement of any submission in the leaderboard\n- Override interface shows original calculated rank alongside the override field\n- Organiser must provide a reason when overriding a result (required text field)\n- Multiple submissions can be overridden in a single editing session\n- Overrides can be reverted to original calculated rankings\n- System distinguishes between calculated results and overridden results in curator/organiser view\n- All overrides are logged in audit trail with organiser ID, original rank, new rank, reason, and timestamp\n- Overrides can only be made before results are published\n- Toast notification confirms when overrides are saved",
          "techNotes": "## Implementation Approach\n\nThis feature requires a robust ranking override system with full audit capabilities, built on Convex's transactional guarantees.\n\n### Data Model Extensions\n\nExtend the `submissions` table with override fields: `overrideRank` (optional number), `overrideReason` (optional string), `overrideBy` (optional clerk user ID), `overrideAt` (optional timestamp). Create a new `rankOverrideAuditLog` table storing: `submissionId`, `hackathonId`, `originalRank`, `newRank`, `reason`, `organiserId`, `timestamp`, `action` (enum: 'override' | 'revert').\n\n### Architecture Considerations\n\n**Convex Mutations**: Implement `applyRankOverrides` mutation that accepts an array of `{submissionId, newRank, reason}` objects for batch processing. Use Convex transactions to ensure atomicity - either all overrides succeed or none do. Validate organiser permissions via Clerk session and confirm hackathon status is not 'published'.\n\n**Rank Calculation Logic**: Create a `getEffectiveRankings` query that returns submissions with both `calculatedRank` (from judge scores) and `effectiveRank` (override if present, otherwise calculated). This dual-display approach satisfies the UI requirement.\n\n**Security**: Implement row-level security checks ensuring only organisers/admins of the specific hackathon can apply overrides. Add publication status check at mutation level to hard-block post-publish modifications.\n\n### Frontend Components\n\nBuild an `OverrideLeaderboard` component using TanStack Table with inline editing. Each row shows calculated rank (read-only), override input field, and reason textarea (required when rank differs). Visual indicators (badges/colors) distinguish overridden entries. Implement optimistic updates with rollback on error, displaying toast notifications via a lightweight library like Sonner.",
          "testCases": "[{\"description\":\"Successfully override a single submission ranking with valid reason\",\"given\":\"An organiser is viewing the results dashboard for an unpublished hackathon with 5 ranked submissions where Submission A is ranked #3\",\"when\":\"The organiser changes Submission A's rank to #1 and enters 'Exceptional innovation in accessibility features' as the reason and clicks Save\",\"then\":\"The system saves the override, displays a success toast, shows Submission A with effective rank #1, displays the original calculated rank #3 alongside, and creates an audit log entry with organiser ID, timestamp, original rank 3, new rank 1, and the reason\"},{\"description\":\"Prevent override submission without providing a reason\",\"given\":\"An organiser is editing the leaderboard for an unpublished hackathon and has changed Submission B's rank from #2 to #4\",\"when\":\"The organiser attempts to save without entering a reason in the required text field\",\"then\":\"The system prevents the save action, displays a validation error indicating reason is required, and highlights the empty reason field for Submission B\"},{\"description\":\"Batch override multiple submissions in single session\",\"given\":\"An organiser is viewing results for an unpublished hackathon with submissions ranked 1-5\",\"when\":\"The organiser overrides Submission C from #5 to #2 with reason 'Judge conflict of interest adjusted', overrides Submission D from #1 to #3 with reason 'Disqualification of bonus points per rule 4.2', and clicks Save All\",\"then\":\"The system atomically saves both overrides, displays a single success toast confirming 2 overrides saved, updates the leaderboard to show new effective rankings, and creates two separate audit log entries\"},{\"description\":\"Revert an override back to calculated ranking\",\"given\":\"An organiser is viewing results where Submission E has an active override (calculated rank #4, overridden to #2) with reason 'Initial adjustment'\",\"when\":\"The organiser clicks the Revert button for Submission E and confirms the revert action\",\"then\":\"The system removes the override, restores Submission E to effective rank #4, displays a success toast, removes the override visual indicator, and creates an audit log entry with action type 'revert' capturing the removal\"},{\"description\":\"Block override attempts after results are published\",\"given\":\"An organiser navigates to the results page for a hackathon where results have already been published to participants\",\"when\":\"The organiser attempts to access the override editing interface or modify any ranking\",\"then\":\"The system displays the leaderboard in read-only mode, shows a notice stating 'Results have been published and cannot be modified', hides or disables all override input fields and save buttons, and any direct API mutation attempts return a 403 forbidden error\"}]"
        },
        {
          "id": "US-056",
          "title": "Manual Leaderboard Publishing by Curators",
          "description": "As a curator, I want to manually publish the final leaderboard so that results only become visible to participants and public when I decide they are ready.",
          "acceptanceCriteria": "- Publish button is only available after judging phase has officially closed\n- Pre-publish preview shows exactly what participants will see including rankings, scores, and any overrides\n- Curator must confirm publication with a confirmation dialog warning that this action cannot be undone\n- Once published, leaderboard becomes visible to all participants and (if hackathon is public) the public\n- Published results show team name, submission title, final rank, and total points\n- All participants and team members receive email and in-app notification when results are published\n- Publication timestamp and curator ID are logged in audit trail\n- Published leaderboard cannot be unpublished (results are final)\n- Organisers can still add commentary or announcements after publishing",
          "techNotes": "Implement leaderboard publishing as a state transition on the hackathon document with strict phase validation. Create a Convex mutation `publishLeaderboard` that atomically updates hackathon status to 'results_published', sets `publishedAt` timestamp and `publishedBy` curator ID, and triggers notification fan-out. Use Convex's transactional guarantees to ensure the publish action is atomic.\n\nThe pre-publish preview should query the same data pipeline as the final public leaderboard view, using a `getLeaderboardPreview` query that respects score overrides and calculates final rankings. Store computed rankings in a denormalized `leaderboard_entries` table on publish to freeze results permanently.\n\nFor the confirmation flow, implement a two-step process: first call `prepareLeaderboardPublish` to validate eligibility and return preview data, then `confirmLeaderboardPublish` with a short-lived token to prevent accidental double-clicks. The frontend should use a modal with explicit confirmation text.\n\nNotifications should be handled via Convex scheduled functions to avoid blocking the publish mutation. Fan out to all participants using a background job that batches email sends through a queue. Use Clerk's user metadata to fetch email addresses.\n\nAudit logging should write to an immutable `audit_log` table with action type, actor ID, timestamp, and relevant entity IDs. Consider using Convex's system fields for tamper-evident timestamps.\n\nSecurity: Verify curator role via Clerk session, validate hackathon phase is 'judging_closed', and ensure idempotency by checking if already published before proceeding.",
          "testCases": "[{\"description\":\"Curator successfully publishes leaderboard after judging closes\",\"given\":\"A hackathon with judging phase officially closed, all scores finalized, and a curator logged in with valid permissions\",\"when\":\"The curator clicks the publish button and confirms in the confirmation dialog\",\"then\":\"The leaderboard becomes visible to all participants, publication timestamp and curator ID are recorded in audit trail, and hackathon status changes to results_published\"},{\"description\":\"Publish button is disabled during active judging phase\",\"given\":\"A hackathon currently in active judging phase with judges still submitting scores\",\"when\":\"A curator navigates to the leaderboard management page\",\"then\":\"The publish button is disabled with tooltip explaining judging must close first, and no publish action can be triggered via API\"},{\"description\":\"Pre-publish preview accurately reflects final participant view\",\"given\":\"A hackathon with completed judging, including manual score overrides on two submissions\",\"when\":\"The curator clicks preview before publishing\",\"then\":\"The preview displays team names, submission titles, final ranks, and total points exactly as participants will see them, with overridden scores reflected in rankings\"},{\"description\":\"All participants receive notifications upon publication\",\"given\":\"A published leaderboard for a hackathon with 15 teams totaling 45 participants across all teams\",\"when\":\"The leaderboard publication is confirmed\",\"then\":\"All 45 participants receive both an email notification and an in-app notification with links to view results within 5 minutes of publication\"},{\"description\":\"Published leaderboard cannot be unpublished or republished\",\"given\":\"A hackathon with already published results showing publication timestamp from 2 hours ago\",\"when\":\"A curator or organiser attempts to unpublish or modify the published leaderboard rankings\",\"then\":\"The system rejects the action with an error message stating results are final, and no changes are persisted to rankings or visibility\"}]"
        }
      ]
    },
    {
      "title": "Platform Infrastructure",
      "description": "File upload handling via Cloudflare R2, comprehensive audit logging, standard rate limiting on all API endpoints, basic analytics (registrations, teams, submissions, completion rates), manual archival system, and combined error UX (inline validation + toast notifications).",
      "userStories": [
        {
          "id": "US-057",
          "title": "Upload Demo Videos to Cloudflare R2",
          "description": "As a participant submitting a solution, I want to upload demo videos up to 500MB so that I can showcase my project's functionality to judges.",
          "acceptanceCriteria": "- System accepts video uploads up to 500MB in common formats (MP4, WebM, MOV)\n- Files exceeding 500MB are rejected with clear inline error message before upload starts\n- Upload progress indicator shows percentage complete\n- Successful uploads return a stored URL for the submission\n- Files are stored in Cloudflare R2 with appropriate content-type metadata\n- Failed uploads display toast notification with retry option\n- Partial uploads are cleaned up automatically on failure",
          "techNotes": "## Implementation Approach\n\nUse **TUS protocol** via Cloudflare R2's resumable upload support for reliable large file transfers. Implement client-side validation before upload initiation to fail fast on invalid files.\n\n### Architecture\n\n**Client Layer (TanStack Start)**:\n- Pre-upload validation: check file size (<500MB) and MIME type before any network request\n- Use `@uppy/tus` or native `fetch` with `ReadableStream` for chunked uploads with progress tracking\n- Implement exponential backoff retry logic (3 attempts, 1s/2s/4s delays)\n\n**API Layer (Cloudflare Workers)**:\n- Generate presigned URLs with 1-hour expiry for direct-to-R2 uploads\n- Validate content-type header matches allowed formats\n- Store metadata in Convex: `{submissionId, r2Key, contentType, size, uploadedAt, status}`\n\n**Storage (R2)**:\n- Bucket structure: `demos/{hackathonId}/{teamId}/{timestamp}-{hash}.{ext}`\n- Set lifecycle rule: delete incomplete multipart uploads after 24 hours\n- Configure CORS for direct browser uploads from allowed origins\n\n### Dependencies\n- Requires US-044 (Solution Submissions) for linking videos to submissions\n- Clerk session token passed to Worker for authorization check\n\n### Security Considerations\n- Validate MIME type server-side (don't trust client Content-Type)\n- Scan filenames for path traversal attempts\n- Rate limit: max 3 concurrent uploads per user\n- Consider virus scanning integration for production (ClamAV via Worker)",
          "testCases": "[{\"description\":\"Successfully upload valid MP4 video under size limit\",\"given\":\"A participant is on the solution submission page with a 150MB MP4 file selected\",\"when\":\"They initiate the upload\",\"then\":\"Progress indicator shows percentage increasing from 0-100%, upload completes successfully, and a stored R2 URL is returned and associated with the submission\"},{\"description\":\"Reject oversized file before upload begins\",\"given\":\"A participant selects a 650MB video file for upload\",\"when\":\"The file is selected in the upload component\",\"then\":\"An inline error message displays 'File exceeds 500MB limit' immediately, the upload button is disabled, and no network request is made\"},{\"description\":\"Reject unsupported video format\",\"given\":\"A participant selects a 200MB AVI file for upload\",\"when\":\"The file is selected in the upload component\",\"then\":\"An inline error message displays 'Unsupported format. Please use MP4, WebM, or MOV' and upload is blocked\"},{\"description\":\"Handle network failure with retry option\",\"given\":\"A participant is uploading a 300MB video and upload reaches 45% progress\",\"when\":\"Network connection is interrupted causing upload failure\",\"then\":\"A toast notification appears with message 'Upload failed. Check your connection.' and a 'Retry' button, progress indicator resets, and partial upload chunks are marked for cleanup\"},{\"description\":\"Automatic cleanup of abandoned partial uploads\",\"given\":\"A participant started uploading a 400MB video but closed the browser at 60% progress 25 hours ago\",\"when\":\"The R2 lifecycle policy runs\",\"then\":\"The incomplete multipart upload parts are automatically deleted from R2 storage and no orphaned data remains\"}]"
        },
        {
          "id": "US-058",
          "title": "Upload Presentation Decks to Cloudflare R2",
          "description": "As a participant submitting a solution, I want to upload presentation decks up to 50MB so that I can provide supporting documentation for my project.",
          "acceptanceCriteria": "- System accepts presentation uploads up to 50MB in common formats (PDF, PPTX, KEY)\n- Files exceeding 50MB are rejected with clear inline error message before upload starts\n- Upload progress indicator shows percentage complete\n- Successful uploads return a stored URL for the submission\n- Files are stored in Cloudflare R2 with appropriate content-type metadata\n- File type validation occurs client-side with server-side verification\n- Toast notification confirms successful upload",
          "techNotes": "Implement presentation deck uploads using Cloudflare R2 with a presigned URL workflow for secure, direct-to-storage uploads. Create a Cloudflare Worker endpoint that validates user authentication via Clerk, checks file metadata (size, type), and generates a presigned PUT URL for R2. Client-side validation should use File API to check size (<50MB) and MIME type before upload initiation.\n\nFor the upload component, use a custom React hook with XMLHttpRequest or fetch with ReadableStream to track upload progress. Store file metadata in Convex (filename, size, content-type, R2 key, uploader ID, timestamp) after successful upload confirmation. The R2 bucket should be configured with appropriate CORS headers for the frontend domain.\n\nServer-side verification is critical: the Worker should validate Content-Type header matches allowed types (application/pdf, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/x-iwork-keynote-sfile) and reject mismatched uploads. Consider magic byte validation for enhanced security against renamed files.\n\nArchitecture flow: Client validates → Request presigned URL from Worker → Direct upload to R2 with progress tracking → Confirm upload via Worker → Store metadata in Convex → Return stored URL. Use R2's built-in content-type metadata storage. Implement retry logic with exponential backoff for network failures. Toast notifications should use the app's existing notification system for consistency.",
          "testCases": "[{\"description\":\"Successfully upload valid PDF presentation within size limit\",\"given\":\"A participant is on the solution submission form with a 25MB PDF file selected\",\"when\":\"The participant initiates the upload\",\"then\":\"Upload progress indicator shows percentage advancing from 0-100%, upload completes successfully, toast notification confirms success, and stored R2 URL is returned and associated with the submission\"},{\"description\":\"Reject file exceeding 50MB size limit before upload starts\",\"given\":\"A participant selects a 75MB PPTX file for upload\",\"when\":\"The file is selected in the upload input\",\"then\":\"An inline error message displays immediately stating the file exceeds the 50MB limit, no upload request is initiated, and the submit button remains disabled\"},{\"description\":\"Reject unsupported file format with clear error\",\"given\":\"A participant selects a 10MB .zip file for upload\",\"when\":\"The file is selected in the upload input\",\"then\":\"Client-side validation displays inline error specifying accepted formats (PDF, PPTX, KEY), upload is prevented, and no network request is made\"},{\"description\":\"Server-side verification catches spoofed file extension\",\"given\":\"A participant bypasses client validation and attempts to upload a .exe file renamed to .pdf\",\"when\":\"The upload request reaches the Cloudflare Worker\",\"then\":\"Server-side content-type verification fails, upload is rejected with 400 error, appropriate error message is displayed to user, and no file is stored in R2\"},{\"description\":\"Handle network interruption during upload gracefully\",\"given\":\"A participant is uploading a 40MB presentation and upload is at 60% progress\",\"when\":\"Network connection is temporarily lost\",\"then\":\"Upload pauses, retry mechanism attempts reconnection with exponential backoff, progress indicator shows retry status, and user can cancel or wait for automatic retry\"}]"
        },
        {
          "id": "US-059",
          "title": "Comprehensive Audit Logging for User Actions",
          "description": "As a platform administrator, I want all user actions logged with timestamps so that I can investigate issues, ensure compliance, and maintain transparency.",
          "acceptanceCriteria": "- All create, update, and delete operations are logged to Convex\n- Each log entry includes: user ID, action type, resource type, resource ID, timestamp, and IP address\n- Role changes and permission modifications are logged with before/after states\n- Authentication events (login, logout, failed attempts) are captured\n- Submission version changes reference both old and new version IDs\n- Logs are immutable once written (no edit or delete capability)\n- Audit logs are queryable by user, action type, resource, and date range\n- Sensitive data (passwords, tokens) is never included in log entries",
          "techNotes": "Implement a centralized audit logging system using Convex with an immutable `auditLogs` table. Design the schema with fields: `id`, `userId`, `actionType` (enum: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, AUTH_FAILURE, ROLE_CHANGE, PERMISSION_CHANGE), `resourceType`, `resourceId`, `timestamp`, `ipAddress`, `metadata` (JSON for before/after states, version references). Create a reusable `logAuditEvent` internal Convex function that all mutations call after successful operations. For IP capture, extract from Cloudflare Workers request headers (`CF-Connecting-IP`) and pass through the Convex action context. Implement immutability by omitting any update/delete mutations for the auditLogs table and using Convex's schema validation. For authentication events, integrate with Clerk webhooks (`user.created`, `session.created`, `session.ended`) via a Cloudflare Worker endpoint that forwards to Convex. Create sanitization utilities that strip sensitive fields (password, token, secret, apiKey) from any metadata before logging. Build query functions with compound indexes on `userId`, `actionType`, `resourceType`, and `timestamp` for efficient filtering. Consider pagination using Convex's cursor-based approach for large result sets. For role/permission changes, capture diff using a helper that compares old and new states. Implement rate limiting on audit log queries to prevent abuse. Store submission version transitions as `{oldVersionId, newVersionId}` in metadata.",
          "testCases": "[{\"description\":\"Audit log captures resource creation with all required fields\",\"given\":\"An authenticated user with a valid session and IP address 192.168.1.100\",\"when\":\"The user creates a new hackathon resource\",\"then\":\"An audit log entry is created with userId, actionType CREATE, resourceType hackathon, resourceId, timestamp within 1 second of now, and IP address 192.168.1.100\"},{\"description\":\"Role change logs include before and after states\",\"given\":\"A user with role 'participant' exists and an admin is authenticated\",\"when\":\"The admin changes the user's role to 'judge'\",\"then\":\"An audit log entry is created with actionType ROLE_CHANGE and metadata containing beforeState 'participant' and afterState 'judge'\"},{\"description\":\"Sensitive data is excluded from audit log entries\",\"given\":\"A user update operation includes fields: name, email, password, and apiToken\",\"when\":\"The update operation completes and triggers audit logging\",\"then\":\"The audit log metadata contains name and email but excludes password and apiToken fields\"},{\"description\":\"Audit logs are immutable and cannot be modified\",\"given\":\"An existing audit log entry with id 'audit_123'\",\"when\":\"Any attempt is made to update or delete the audit log entry via API or direct mutation\",\"then\":\"The operation fails with an error indicating audit logs are immutable and the original entry remains unchanged\"},{\"description\":\"Failed authentication attempts are logged without exposing credentials\",\"given\":\"A user attempts to login with email 'user@example.com' and an incorrect password\",\"when\":\"The authentication fails\",\"then\":\"An audit log entry is created with actionType AUTH_FAILURE, metadata containing email but no password field, and the source IP address\"}]"
        },
        {
          "id": "US-060",
          "title": "Rate Limiting on API Endpoints",
          "description": "As a platform operator, I want all API endpoints rate-limited so that the platform remains stable and protected from abuse.",
          "acceptanceCriteria": "- All Convex functions have rate limiting applied via Cloudflare Workers\n- Standard endpoints limited to 100 requests per minute per user/IP\n- File upload endpoints limited to 10 requests per minute per user\n- Authentication endpoints limited to 10 attempts per minute per IP\n- Rate-limited requests return HTTP 429 with Retry-After header\n- Toast notification informs users when they've been rate-limited\n- Rate limit counters reset after the specified time window\n- Authenticated users tracked by user ID; unauthenticated by IP address",
          "techNotes": "## Implementation Approach\n\nImplement rate limiting at the Cloudflare Workers edge layer, intercepting requests before they reach Convex functions. This provides protection at the network edge and reduces load on the database.\n\n### Architecture\n\n**Edge Rate Limiter (Cloudflare Workers)**:\n- Use Cloudflare's Rate Limiting API or implement custom solution with Workers KV/Durable Objects\n- Durable Objects preferred for precise counting with atomic operations\n- Extract user ID from Clerk JWT for authenticated requests; fall back to CF-Connecting-IP header\n- Apply different rate limit tiers based on endpoint path patterns\n\n**Endpoint Classification**:\n```\n/api/auth/* → 10 req/min (IP-based)\n/api/upload/* → 10 req/min (user-based)\n/api/* → 100 req/min (user/IP-based)\n```\n\n**Response Handling**:\n- Return 429 status with `Retry-After` header (seconds until reset)\n- Include `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers for client visibility\n- Body should include machine-readable error code for frontend toast triggering\n\n**Frontend Integration**:\n- Create global fetch interceptor in TanStack Start to detect 429 responses\n- Display toast via shared notification context with countdown from Retry-After\n- Queue failed requests for automatic retry after limit resets\n\n### Security Considerations\n- Validate X-Forwarded-For chain to prevent IP spoofing\n- Consider separate limits for suspicious patterns (failed auth attempts)\n- Log rate limit events for abuse pattern analysis\n- Implement gradual backoff for repeat offenders",
          "testCases": "[{\"description\":\"Standard endpoint allows requests within rate limit\",\"given\":\"An authenticated user has made 50 requests to /api/hackathons in the current minute\",\"when\":\"The user makes another GET request to /api/hackathons\",\"then\":\"The request succeeds with HTTP 200 and X-RateLimit-Remaining header shows 49\"},{\"description\":\"Standard endpoint blocks requests exceeding rate limit\",\"given\":\"An authenticated user has made 100 requests to /api/teams in the current minute\",\"when\":\"The user attempts to make a 101st request to /api/teams\",\"then\":\"The request is rejected with HTTP 429, Retry-After header indicates seconds until reset, and response body contains rate_limit_exceeded error code\"},{\"description\":\"File upload endpoint has stricter rate limit\",\"given\":\"An authenticated user has uploaded 10 files via /api/upload in the current minute\",\"when\":\"The user attempts to upload an 11th file\",\"then\":\"The request is rejected with HTTP 429 and Retry-After header, and frontend displays toast notification explaining the upload limit\"},{\"description\":\"Authentication endpoint rate limits by IP address\",\"given\":\"10 failed login attempts have been made from IP address 192.168.1.100 in the current minute\",\"when\":\"An 11th login attempt is made from the same IP address with different credentials\",\"then\":\"The request is rejected with HTTP 429 regardless of the user credentials provided\"},{\"description\":\"Rate limit counter resets after time window expires\",\"given\":\"A user was rate-limited at timestamp T after making 100 requests and the Retry-After header indicated 45 seconds\",\"when\":\"The user waits 45 seconds and makes a new request at timestamp T+45\",\"then\":\"The request succeeds with HTTP 200 and X-RateLimit-Remaining shows 99\"},{\"description\":\"Unauthenticated requests are tracked by IP address\",\"given\":\"An unauthenticated visitor from IP 10.0.0.50 has made 100 requests to public endpoints\",\"when\":\"The same visitor makes another request without authentication\",\"then\":\"The request is rejected with HTTP 429, while a different IP address can still make requests successfully\"}]"
        },
        {
          "id": "US-061",
          "title": "Basic Platform Analytics Dashboard",
          "description": "As an organiser, I want to view analytics for my hackathon so that I can understand participation levels and track progress.",
          "acceptanceCriteria": "- Dashboard displays total registrations count and registrations over time\n- Dashboard shows number of teams formed and average team size\n- Dashboard displays total submissions and submissions per problem/category\n- Completion rate calculated as (submitted teams / registered teams) percentage\n- Analytics update in real-time as data changes\n- Data is scoped to the organiser's hackathon only\n- Charts/visualizations are responsive and display correctly on desktop and tablet\n- Export functionality for analytics data in CSV format",
          "techNotes": "Implement analytics dashboard using Convex's real-time query capabilities for live data updates. Create a dedicated `analytics` module with aggregation queries that compute metrics server-side to minimize client-side processing.\n\n**Architecture Approach:**\n- Create Convex queries: `getRegistrationStats`, `getTeamStats`, `getSubmissionStats`, `getCompletionRate` - each scoped by hackathonId with organiser authorization check via Clerk\n- Use Convex's reactive queries for automatic real-time updates without polling\n- Implement time-series data using indexed queries on `createdAt` fields, aggregating by day/week buckets\n\n**Visualization:**\n- Use Recharts or Chart.js for responsive charts (line charts for time-series, bar charts for category breakdowns, gauge for completion rate)\n- Implement responsive grid layout with TanStack Start, using CSS Grid with breakpoints for desktop (3-column) and tablet (2-column)\n\n**CSV Export:**\n- Create Convex action `exportAnalyticsCSV` that aggregates all metrics and generates CSV string\n- Use client-side Blob/download for file generation to avoid R2 storage for temporary exports\n\n**Security Considerations:**\n- Verify organiser role and hackathon ownership in every query using Clerk session\n- Avoid exposing participant PII in analytics - use counts and aggregates only\n\n**Dependencies:** Requires US-012 (Team Formation) and submission stories for meaningful data. Consider caching expensive aggregations if performance degrades at scale.",
          "testCases": "[{\"description\":\"Dashboard displays accurate registration metrics for organiser's hackathon\",\"given\":\"An organiser is authenticated and has a hackathon with 50 registrations spread across 7 days\",\"when\":\"The organiser navigates to the analytics dashboard for their hackathon\",\"then\":\"The dashboard displays total registrations as 50 and shows a time-series chart with correct daily registration counts\"},{\"description\":\"Analytics are scoped to prevent cross-hackathon data leakage\",\"given\":\"Two hackathons exist: Hackathon A (owned by Organiser 1) with 30 teams and Hackathon B (owned by Organiser 2) with 15 teams\",\"when\":\"Organiser 1 views analytics for Hackathon A\",\"then\":\"Dashboard shows exactly 30 teams and no data from Hackathon B is visible or accessible\"},{\"description\":\"Completion rate calculates correctly with edge cases\",\"given\":\"A hackathon has 20 registered teams, 8 teams have submitted solutions, and 2 teams have no members\",\"when\":\"The completion rate metric is computed\",\"then\":\"Completion rate displays as 40% (8/20) and handles zero-division gracefully if no teams exist\"},{\"description\":\"Real-time update reflects new submission immediately\",\"given\":\"Organiser has analytics dashboard open showing 5 total submissions\",\"when\":\"A participant submits a new solution to the hackathon\",\"then\":\"The submission count updates to 6 without page refresh and submission-per-category chart reflects the change\"},{\"description\":\"CSV export generates valid file with all analytics data\",\"given\":\"A hackathon has registration, team, and submission data available\",\"when\":\"The organiser clicks the Export CSV button\",\"then\":\"A CSV file downloads containing columns for metric name, value, and timestamp, with all dashboard metrics included and proper formatting\"}]"
        },
        {
          "id": "US-062",
          "title": "Manual Hackathon Archival System",
          "description": "As an organiser, I want to manually archive completed hackathons so that they become read-only while remaining accessible for reference.",
          "acceptanceCriteria": "- Archive action is available only to organisers after results are published\n- Confirmation dialog warns that archival makes the hackathon read-only\n- Archived hackathons display 'Archived' badge in all views\n- All write operations are blocked on archived hackathons with clear error message\n- Archived hackathons remain visible in organiser dashboard and public directory (if public)\n- All data (submissions, teams, results, Q&A) remains viewable\n- Archived hackathons are excluded from active analytics but retain historical data\n- Archival action is logged in audit trail",
          "techNotes": "Implement archival as a status transition in the hackathon lifecycle state machine. Add an `archivedAt` timestamp field and `archivedBy` reference to the hackathons table in Convex. Create a Convex mutation `archiveHackathon` that validates: (1) caller has organiser role, (2) hackathon status is 'results_published' or equivalent terminal state, (3) hackathon is not already archived. Use Convex's transactional guarantees to atomically update status and log the audit entry.\n\nFor write protection, implement a reusable middleware pattern or helper function `assertNotArchived(hackathonId)` that throws a structured error (e.g., `{ code: 'HACKATHON_ARCHIVED', message: 'This hackathon is archived and read-only' }`) to be called at the start of all write mutations affecting hackathon-related entities (submissions, teams, Q&A, etc.). This centralised check prevents scattered conditionals.\n\nOn the frontend, use TanStack Start loaders to fetch archival status and conditionally render the 'Archived' badge component across hackathon cards, detail pages, and dashboard views. Disable or hide edit/submit buttons when archived, showing tooltips explaining why. The confirmation dialog should use a modal component with explicit 'Archive' action button, clearly stating irreversibility.\n\nFor analytics exclusion, add a filter predicate `isArchived: false` to active metrics queries while ensuring historical/reporting queries include archived data. Consider adding an index on `(archivedAt, isPublic)` for efficient directory queries that may filter or sort by archival status.",
          "testCases": "[{\"description\":\"Organiser successfully archives a hackathon after results are published\",\"given\":\"A hackathon with status 'results_published' and the user is an organiser of that hackathon\",\"when\":\"The organiser confirms the archive action in the confirmation dialog\",\"then\":\"The hackathon status changes to archived, archivedAt timestamp is set, an audit log entry is created, and the UI displays the 'Archived' badge\"},{\"description\":\"Archive action is blocked before results are published\",\"given\":\"A hackathon with status 'judging_in_progress' and the user is an organiser\",\"when\":\"The organiser attempts to access the archive action\",\"then\":\"The archive button is disabled or hidden, and attempting the mutation via API returns an error stating results must be published first\"},{\"description\":\"Non-organiser cannot archive a hackathon\",\"given\":\"A hackathon with status 'results_published' and the user is a participant but not an organiser\",\"when\":\"The user attempts to call the archive mutation directly\",\"then\":\"The system returns an authorisation error and the hackathon remains unarchived\"},{\"description\":\"Write operations are blocked on archived hackathons\",\"given\":\"An archived hackathon with existing teams and submissions\",\"when\":\"Any user attempts to create a submission, edit team details, or post a Q&A question\",\"then\":\"The system returns error code 'HACKATHON_ARCHIVED' with message 'This hackathon is archived and read-only', and no data is modified\"},{\"description\":\"Archived hackathon remains visible and readable in public directory\",\"given\":\"A public hackathon that has been archived with submissions, teams, and results data\",\"when\":\"An anonymous user browses the public hackathon directory and views the archived hackathon detail page\",\"then\":\"The hackathon appears in the directory with 'Archived' badge, and all historical data (submissions, teams, results, Q&A) is viewable but no edit controls are displayed\"}]"
        },
        {
          "id": "US-063",
          "title": "Inline Form Validation Errors",
          "description": "As a user filling out forms, I want to see validation errors inline next to the relevant fields so that I can quickly identify and fix issues.",
          "acceptanceCriteria": "- Required field errors appear below the field when user leaves it empty and moves focus\n- Format validation (email, URL, date) shows errors immediately on blur\n- Error messages are specific and actionable (not generic 'invalid input')\n- Error styling uses consistent red color and error icon\n- Errors clear automatically when user corrects the input\n- Multiple errors on a form are all shown simultaneously\n- Form submission is blocked until all inline errors are resolved\n- Screen readers announce error messages for accessibility",
          "techNotes": "## Implementation Approach\n\nBuild a reusable form validation system using **React Hook Form** with **Zod** schemas for type-safe validation. This integrates naturally with TanStack Start's server functions and provides excellent TypeScript support.\n\n### Architecture\n\n**Validation Layer:**\n- Define Zod schemas per form (e.g., `hackathonSchema`, `submissionSchema`) with custom error messages\n- Use `zodResolver` to connect schemas to React Hook Form\n- Implement field-level validation on blur via `mode: 'onBlur'` with `reValidateMode: 'onChange'` for auto-clearing\n\n**Component Structure:**\n- Create `<FormField>` wrapper component handling error display, styling, and ARIA attributes\n- Use `aria-describedby` linking input to error message `<span>`\n- Implement `aria-invalid` and `role=\"alert\"` for screen reader announcements\n- Error icon from Lucide React (`AlertCircle`) with consistent sizing\n\n**Styling:**\n- Tailwind classes: `border-red-500`, `text-red-600`, `bg-red-50` for error states\n- CSS variables for theming: `--error-color`, `--error-bg`\n- Transition animations for error appearance/disappearance\n\n### Dependencies\n- Relies on US-023 (Design System) for consistent styling tokens\n- Error messages should align with content guidelines from US-018 (if applicable)\n\n### Security Considerations\n- Never expose validation logic details that could aid exploitation\n- Sanitize error messages to prevent XSS via user input reflection\n- Server-side validation must mirror client-side (Zod schemas shared via `/shared` directory)",
          "testCases": "[{\"description\":\"Required field shows error on blur when empty\",\"given\":\"User is on a form with a required 'Team Name' field\",\"when\":\"User focuses the field, leaves it empty, and tabs to the next field\",\"then\":\"Error message 'Team name is required' appears below the field with red styling and error icon\"},{\"description\":\"Email format validation shows specific error\",\"given\":\"User is entering an email address in the contact email field\",\"when\":\"User types 'invalid-email' and moves focus away\",\"then\":\"Error message 'Please enter a valid email address' appears below the field\"},{\"description\":\"Error clears automatically when input is corrected\",\"given\":\"User has triggered a validation error on a required field showing 'Hackathon title is required'\",\"when\":\"User types a valid title into the field\",\"then\":\"The error message disappears and field styling returns to normal state\"},{\"description\":\"Multiple errors display simultaneously on form\",\"given\":\"User is on the hackathon creation form with multiple required fields\",\"when\":\"User attempts to submit the form with 'Title' empty, 'Start Date' empty, and 'Description' under minimum length\",\"then\":\"All three fields show their respective inline errors simultaneously and form does not submit\"},{\"description\":\"Screen reader announces error messages accessibly\",\"given\":\"User with screen reader is filling out a form and focuses on the email field\",\"when\":\"User enters 'not-an-email' and tabs away triggering validation error\",\"then\":\"Screen reader announces 'Please enter a valid email address' and field is marked with aria-invalid='true'\"}]"
        },
        {
          "id": "US-064",
          "title": "Toast Notifications for System Actions",
          "description": "As a user performing actions on the platform, I want toast notifications for system responses so that I receive clear feedback on action success or failure.",
          "acceptanceCriteria": "- Success toasts appear for completed actions (save, submit, delete, etc.) in green styling\n- Error toasts appear for system failures (network, server errors) in red styling\n- Warning toasts appear for non-blocking issues in yellow styling\n- Toasts auto-dismiss after 5 seconds for success, persist until dismissed for errors\n- Toasts stack vertically when multiple appear, with newest on top\n- Each toast has a manual dismiss button\n- Toasts include relevant action context (e.g., 'Submission saved successfully')\n- Toast position is consistent (top-right) and doesn't obstruct primary content",
          "techNotes": "## Implementation Approach\n\nImplement a centralized toast notification system using a React context provider with Zustand for lightweight state management. This approach enables toast triggering from anywhere in the app (components, API handlers, form submissions) without prop drilling.\n\n### Architecture\n\n**Toast Provider & Store:**\n- Create `ToastContext` with Zustand store managing toast queue\n- Each toast: `{ id, type: 'success' | 'error' | 'warning', message, context?, timestamp, autoDismiss }`\n- Export `useToast()` hook returning `{ showSuccess, showError, showWarning, dismiss, dismissAll }`\n\n**Toast Container Component:**\n- Fixed position `top-4 right-4` with `z-50`, using `pointer-events-none` on container, `pointer-events-auto` on toasts\n- Flexbox column-reverse for newest-on-top stacking\n- CSS transitions for enter/exit animations (slide-in from right)\n\n**Auto-dismiss Logic:**\n- Success/warning: 5s timeout via `useEffect` with cleanup\n- Errors: No auto-dismiss, require manual interaction\n- Clear timeout on unmount or manual dismiss\n\n### Integration Points\n\n- Wrap app root in `ToastProvider`\n- Create Convex mutation wrapper that auto-shows success/error toasts\n- Integrate with TanStack Query's `onSuccess`/`onError` callbacks\n- Handle Clerk auth errors with appropriate toasts\n\n### Styling\n\nUse Tailwind with semantic colors: `bg-green-50 border-green-500` (success), `bg-red-50 border-red-500` (error), `bg-yellow-50 border-yellow-500` (warning). Include appropriate icons (CheckCircle, XCircle, AlertTriangle) from Lucide.",
          "testCases": "[{\"description\":\"Success toast displays and auto-dismisses after action completion\",\"given\":\"User is logged in and viewing a form\",\"when\":\"User successfully submits a form and the server returns success\",\"then\":\"A green success toast appears in top-right with message 'Submission saved successfully', auto-dismisses after 5 seconds\"},{\"description\":\"Error toast persists until manually dismissed\",\"given\":\"User is performing an action that requires network connectivity\",\"when\":\"The action fails due to a server error (500 response)\",\"then\":\"A red error toast appears with descriptive message, remains visible indefinitely, and only disappears when user clicks dismiss button\"},{\"description\":\"Multiple toasts stack correctly with newest on top\",\"given\":\"User has triggered one action that showed a success toast\",\"when\":\"User triggers another action that also succeeds within 5 seconds\",\"then\":\"Both toasts are visible, stacked vertically, with the newer toast positioned above the older one\"},{\"description\":\"Toast dismiss button removes individual toast\",\"given\":\"Multiple toasts are displayed on screen\",\"when\":\"User clicks the dismiss (X) button on the middle toast\",\"then\":\"Only that specific toast is removed, other toasts remain visible and maintain their positions\"},{\"description\":\"Warning toast displays for non-critical issues\",\"given\":\"User is uploading a file that exceeds recommended size but is still valid\",\"when\":\"The system detects the oversized file during upload\",\"then\":\"A yellow warning toast appears with message indicating file size concern, auto-dismisses after 5 seconds, and upload continues\"}]"
        }
      ]
    }
  ],
  "requirements": [
    {
      "type": "functional",
      "title": "Hybrid Hackathon Discovery",
      "description": "Organisers can configure hackathons as publicly listed in a browseable directory or invite-only accessible via direct links.",
      "priority": "high"
    },
    {
      "type": "functional",
      "title": "Dual Notification System",
      "description": "Platform supports both email and in-app notifications with user preferences for each notification type (deadlines, approvals, results).",
      "priority": "high"
    },
    {
      "type": "functional",
      "title": "Flexible Team Formation",
      "description": "Teams support both open join requests (team leads approve) and private invite codes for members to join.",
      "priority": "high"
    },
    {
      "type": "functional",
      "title": "Moderated Q&A System",
      "description": "Participants submit questions privately on problems; proposers answer publicly, creating a filtered FAQ visible to all teams.",
      "priority": "medium"
    },
    {
      "type": "functional",
      "title": "Version-Controlled Submissions",
      "description": "All submission edits are saved as versions until cutoff; judges see the latest version but complete history is preserved.",
      "priority": "medium"
    },
    {
      "type": "functional",
      "title": "Flexible Judge Assignment",
      "description": "Support both category-based assignment (judges review all submissions in assigned categories) and manual submission assignment.",
      "priority": "high"
    },
    {
      "type": "functional",
      "title": "Ranked Choice Scoring",
      "description": "Judges rank submissions (1st=3pts, 2nd=2pts, 3rd=1pt); ties broken by count of 1st-place votes, then 2nd-place votes.",
      "priority": "high"
    },
    {
      "type": "functional",
      "title": "Manual Result Publishing",
      "description": "Leaderboard remains private until curator explicitly publishes; organisers can override results before publishing.",
      "priority": "high"
    },
    {
      "type": "functional",
      "title": "Role Invitation System",
      "description": "Invite admins, curators, and judges via email (recipients create/link account) or select from existing platform users.",
      "priority": "medium"
    },
    {
      "type": "functional",
      "title": "Manual Archival",
      "description": "Organisers manually archive completed hackathons; archived events become read-only while remaining accessible.",
      "priority": "low"
    },
    {
      "type": "non-functional",
      "title": "File Upload Limits",
      "description": "Enforce standard limits: demo videos max 500MB, presentation decks max 50MB, stored in Cloudflare R2.",
      "priority": "high"
    },
    {
      "type": "non-functional",
      "title": "Comprehensive Audit Logging",
      "description": "Full audit trail of all user actions with timestamps for compliance, debugging, and transparency.",
      "priority": "medium"
    },
    {
      "type": "non-functional",
      "title": "Standard Rate Limiting",
      "description": "Rate limit all API endpoints with reasonable thresholds to prevent abuse and ensure platform stability.",
      "priority": "medium"
    },
    {
      "type": "non-functional",
      "title": "Combined Error UX",
      "description": "Inline errors for form validation, toast notifications for system/action errors and confirmations.",
      "priority": "medium"
    },
    {
      "type": "non-functional",
      "title": "English-Only Interface",
      "description": "Platform UI and all content in English for v1; internationalization out of scope.",
      "priority": "low"
    }
  ],
  "dependencies": [
    {
      "source": "US-002",
      "target": "US-001",
      "type": "depends_on"
    },
    {
      "source": "US-003",
      "target": "US-002",
      "type": "depends_on"
    },
    {
      "source": "US-004",
      "target": "US-003",
      "type": "depends_on"
    },
    {
      "source": "US-005",
      "target": "US-002",
      "type": "depends_on"
    },
    {
      "source": "US-006",
      "target": "US-001",
      "type": "depends_on"
    },
    {
      "source": "US-007",
      "target": "US-002",
      "type": "depends_on"
    },
    {
      "source": "US-008",
      "target": "US-003",
      "type": "depends_on"
    },
    {
      "source": "US-010",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-011",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-012",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-013",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-014",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-015",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-016",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-017",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-017",
      "target": "US-007",
      "type": "depends_on"
    },
    {
      "source": "US-018",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-018",
      "target": "US-007",
      "type": "depends_on"
    },
    {
      "source": "US-019",
      "target": "US-017",
      "type": "depends_on"
    },
    {
      "source": "US-019",
      "target": "US-018",
      "type": "depends_on"
    },
    {
      "source": "US-020",
      "target": "US-019",
      "type": "depends_on"
    },
    {
      "source": "US-021",
      "target": "US-019",
      "type": "depends_on"
    },
    {
      "source": "US-022",
      "target": "US-007",
      "type": "depends_on"
    },
    {
      "source": "US-022",
      "target": "US-019",
      "type": "depends_on"
    },
    {
      "source": "US-023",
      "target": "US-022",
      "type": "depends_on"
    },
    {
      "source": "US-024",
      "target": "US-019",
      "type": "depends_on"
    },
    {
      "source": "US-025",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-025",
      "target": "US-002",
      "type": "depends_on"
    },
    {
      "source": "US-026",
      "target": "US-025",
      "type": "depends_on"
    },
    {
      "source": "US-026",
      "target": "US-013",
      "type": "depends_on"
    },
    {
      "source": "US-027",
      "target": "US-026",
      "type": "depends_on"
    },
    {
      "source": "US-028",
      "target": "US-025",
      "type": "depends_on"
    },
    {
      "source": "US-029",
      "target": "US-026",
      "type": "depends_on"
    },
    {
      "source": "US-030",
      "target": "US-029",
      "type": "depends_on"
    },
    {
      "source": "US-031",
      "target": "US-030",
      "type": "depends_on"
    },
    {
      "source": "US-032",
      "target": "US-029",
      "type": "depends_on"
    },
    {
      "source": "US-032",
      "target": "US-030",
      "type": "depends_on"
    },
    {
      "source": "US-033",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "US-033",
      "target": "US-002",
      "type": "depends_on"
    },
    {
      "source": "US-034",
      "target": "US-033",
      "type": "depends_on"
    },
    {
      "source": "US-035",
      "target": "US-034",
      "type": "depends_on"
    },
    {
      "source": "US-036",
      "target": "US-033",
      "type": "depends_on"
    },
    {
      "source": "US-037",
      "target": "US-036",
      "type": "depends_on"
    },
    {
      "source": "US-038",
      "target": "US-033",
      "type": "depends_on"
    },
    {
      "source": "US-039",
      "target": "US-033",
      "type": "depends_on"
    },
    {
      "source": "US-040",
      "target": "US-033",
      "type": "depends_on"
    },
    {
      "source": "US-040",
      "target": "US-022",
      "type": "depends_on"
    },
    {
      "source": "US-041",
      "target": "US-040",
      "type": "depends_on"
    },
    {
      "source": "US-041",
      "target": "US-026",
      "type": "depends_on"
    },
    {
      "source": "US-042",
      "target": "US-041",
      "type": "depends_on"
    },
    {
      "source": "US-042",
      "target": "US-057",
      "type": "depends_on"
    },
    {
      "source": "US-043",
      "target": "US-041",
      "type": "depends_on"
    },
    {
      "source": "US-043",
      "target": "US-058",
      "type": "depends_on"
    },
    {
      "source": "US-044",
      "target": "US-041",
      "type": "depends_on"
    },
    {
      "source": "US-044",
      "target": "US-012",
      "type": "depends_on"
    },
    {
      "source": "US-045",
      "target": "US-041",
      "type": "depends_on"
    },
    {
      "source": "US-045",
      "target": "US-042",
      "type": "depends_on"
    },
    {
      "source": "US-046",
      "target": "US-045",
      "type": "depends_on"
    },
    {
      "source": "US-047",
      "target": "US-045",
      "type": "depends_on"
    },
    {
      "source": "US-048",
      "target": "US-047",
      "type": "depends_on"
    },
    {
      "source": "US-048",
      "target": "US-015",
      "type": "depends_on"
    },
    {
      "source": "US-049",
      "target": "US-012",
      "type": "depends_on"
    },
    {
      "source": "US-049",
      "target": "US-018",
      "type": "depends_on"
    },
    {
      "source": "US-050",
      "target": "US-047",
      "type": "depends_on"
    },
    {
      "source": "US-050",
      "target": "US-018",
      "type": "depends_on"
    },
    {
      "source": "US-051",
      "target": "US-049",
      "type": "depends_on"
    },
    {
      "source": "US-051",
      "target": "US-050",
      "type": "depends_on"
    },
    {
      "source": "US-052",
      "target": "US-051",
      "type": "depends_on"
    },
    {
      "source": "US-053",
      "target": "US-052",
      "type": "depends_on"
    },
    {
      "source": "US-054",
      "target": "US-052",
      "type": "depends_on"
    },
    {
      "source": "US-055",
      "target": "US-054",
      "type": "depends_on"
    },
    {
      "source": "US-056",
      "target": "US-055",
      "type": "depends_on"
    },
    {
      "source": "US-062",
      "target": "US-016",
      "type": "depends_on"
    },
    {
      "source": "FR-001",
      "target": "US-009",
      "type": "depends_on"
    },
    {
      "source": "FR-001",
      "target": "US-011",
      "type": "depends_on"
    },
    {
      "source": "FR-002",
      "target": "US-004",
      "type": "depends_on"
    },
    {
      "source": "FR-002",
      "target": "US-064",
      "type": "depends_on"
    },
    {
      "source": "FR-003",
      "target": "US-033",
      "type": "depends_on"
    },
    {
      "source": "FR-003",
      "target": "US-034",
      "type": "depends_on"
    },
    {
      "source": "FR-003",
      "target": "US-036",
      "type": "depends_on"
    },
    {
      "source": "FR-004",
      "target": "US-029",
      "type": "depends_on"
    },
    {
      "source": "FR-004",
      "target": "US-030",
      "type": "depends_on"
    },
    {
      "source": "FR-004",
      "target": "US-032",
      "type": "depends_on"
    },
    {
      "source": "FR-005",
      "target": "US-041",
      "type": "depends_on"
    },
    {
      "source": "FR-005",
      "target": "US-046",
      "type": "depends_on"
    },
    {
      "source": "FR-006",
      "target": "US-049",
      "type": "depends_on"
    },
    {
      "source": "FR-006",
      "target": "US-050",
      "type": "depends_on"
    },
    {
      "source": "FR-007",
      "target": "US-052",
      "type": "depends_on"
    },
    {
      "source": "FR-008",
      "target": "US-054",
      "type": "depends_on"
    },
    {
      "source": "FR-008",
      "target": "US-055",
      "type": "depends_on"
    },
    {
      "source": "FR-008",
      "target": "US-056",
      "type": "depends_on"
    },
    {
      "source": "FR-009",
      "target": "US-017",
      "type": "depends_on"
    },
    {
      "source": "FR-009",
      "target": "US-018",
      "type": "depends_on"
    },
    {
      "source": "FR-010",
      "target": "US-016",
      "type": "depends_on"
    },
    {
      "source": "FR-010",
      "target": "US-062",
      "type": "depends_on"
    },
    {
      "source": "NFR-001",
      "target": "US-042",
      "type": "related_to"
    },
    {
      "source": "NFR-001",
      "target": "US-043",
      "type": "related_to"
    },
    {
      "source": "NFR-001",
      "target": "US-057",
      "type": "related_to"
    },
    {
      "source": "NFR-001",
      "target": "US-058",
      "type": "related_to"
    },
    {
      "source": "NFR-002",
      "target": "US-059",
      "type": "depends_on"
    },
    {
      "source": "NFR-002",
      "target": "US-024",
      "type": "related_to"
    },
    {
      "source": "NFR-003",
      "target": "US-060",
      "type": "depends_on"
    },
    {
      "source": "NFR-004",
      "target": "US-063",
      "type": "depends_on"
    },
    {
      "source": "NFR-004",
      "target": "US-064",
      "type": "depends_on"
    },
    {
      "source": "US-004",
      "target": "FR-002",
      "type": "related_to"
    },
    {
      "source": "US-011",
      "target": "FR-001",
      "type": "related_to"
    },
    {
      "source": "US-046",
      "target": "FR-005",
      "type": "related_to"
    },
    {
      "source": "US-052",
      "target": "FR-007",
      "type": "related_to"
    }
  ]
}

---

## Requirements

### Functional Requirements

#### FR-001: Hybrid Hackathon Discovery
**Priority:** high

Organisers can configure hackathons as publicly listed in a browseable directory or invite-only accessible via direct links.

#### FR-002: Dual Notification System
**Priority:** high

Platform supports both email and in-app notifications with user preferences for each notification type (deadlines, approvals, results).

#### FR-003: Flexible Team Formation
**Priority:** high

Teams support both open join requests (team leads approve) and private invite codes for members to join.

#### FR-004: Moderated Q&A System
**Priority:** medium

Participants submit questions privately on problems; proposers answer publicly, creating a filtered FAQ visible to all teams.

#### FR-005: Version-Controlled Submissions
**Priority:** medium

All submission edits are saved as versions until cutoff; judges see the latest version but complete history is preserved.

#### FR-006: Flexible Judge Assignment
**Priority:** high

Support both category-based assignment (judges review all submissions in assigned categories) and manual submission assignment.

#### FR-007: Ranked Choice Scoring
**Priority:** high

Judges rank submissions (1st=3pts, 2nd=2pts, 3rd=1pt); ties broken by count of 1st-place votes, then 2nd-place votes.

#### FR-008: Manual Result Publishing
**Priority:** high

Leaderboard remains private until curator explicitly publishes; organisers can override results before publishing.

#### FR-009: Role Invitation System
**Priority:** medium

Invite admins, curators, and judges via email (recipients create/link account) or select from existing platform users.

#### FR-010: Manual Archival
**Priority:** low

Organisers manually archive completed hackathons; archived events become read-only while remaining accessible.

### Non-Functional Requirements

#### NFR-001: File Upload Limits
**Priority:** high

Enforce standard limits: demo videos max 500MB, presentation decks max 50MB, stored in Cloudflare R2.

#### NFR-002: Comprehensive Audit Logging
**Priority:** medium

Full audit trail of all user actions with timestamps for compliance, debugging, and transparency.

#### NFR-003: Standard Rate Limiting
**Priority:** medium

Rate limit all API endpoints with reasonable thresholds to prevent abuse and ensure platform stability.

#### NFR-004: Combined Error UX
**Priority:** medium

Inline errors for form validation, toast notifications for system/action errors and confirmations.

#### NFR-005: English-Only Interface
**Priority:** low

Platform UI and all content in English for v1; internationalization out of scope.

---

## User Stories

### Epic: Authentication & User Management

User registration, authentication via Clerk, profile management, notification preferences (email/in-app), and role-based access control foundation across hackathons.

#### US-001: User Registration via Clerk
As a new user, I want to create an account on HackForge using Clerk authentication so that I can access the platform and participate in hackathons.

**Acceptance Criteria:**
- User can register using email/password or supported OAuth providers (Google, GitHub)
- Clerk handles all authentication flows including email verification
- Upon successful registration, a user profile is automatically created in Convex database
- User is redirected to profile completion page after first login
- Registration errors display inline validation messages for form fields
- System errors show toast notifications with actionable messages
- Duplicate email addresses are rejected with clear error messaging
- All registration actions are logged in the audit trail with timestamps

**Technical Notes:**
**Implementation Approach:**

Leverage Clerk's React components (`<SignUp />`) with TanStack Start's file-based routing. Create a `/sign-up` route using Clerk's pre-built UI to handle OAuth (Google, GitHub) and email/password flows.

**Convex Integration:**

Implement a Clerk webhook handler as a Convex HTTP action to listen for `user.created` events. This webhook creates the user profile document in Convex with fields: `clerkId`, `email`, `createdAt`, `profileComplete: false`. Use Clerk's `publicMetadata` to store the Convex user ID for quick lookups.

**Post-Registration Flow:**

In the TanStack Start router, add a middleware check using Clerk's `useUser()` hook. If `profileComplete` is false, redirect to `/onboarding`. Store this flag in both Clerk metadata and Convex for redundancy.

**Error Handling:**

Clerk handles most validation (email format, password strength). For duplicate emails, Clerk returns specific error codes—map these to user-friendly messages. Wrap Clerk components with an error boundary for unexpected failures, displaying toast notifications via a context provider.

**Audit Logging:**

Create a Convex mutation `logAuditEvent` called from the webhook handler. Schema: `{ userId, action: 'USER_REGISTERED', timestamp, metadata: { provider, ip } }`. Index on `userId` and `timestamp` for efficient querying.

**Security Considerations:**

Validate webhook signatures using Clerk's `svix` library. Rate limiting is handled by Clerk. Ensure Convex functions use proper authentication context.

**Test Cases:**
[{"description":"Successful registration with email and password","given":"A new user is on the registration page with no existing account","when":"The user enters a valid email, a password meeting strength requirements, and submits the form","then":"Clerk creates the account, sends verification email, webhook creates Convex profile with profileComplete=false, and user sees verification prompt"},{"description":"Successful registration via GitHub OAuth","given":"A new user is on the registration page and has a GitHub account not linked to HackForge","when":"The user clicks 'Continue with GitHub' and authorizes the application","then":"Clerk creates the account, webhook creates Convex profile, audit log records 'USER_REGISTERED' with provider='github', and user is redirected to onboarding"},{"description":"Registration rejected for duplicate email","given":"A user with email 'existing@example.com' already exists in the system","when":"A new user attempts to register with 'existing@example.com'","then":"Registration fails with inline error message 'An account with this email already exists', no duplicate profile is created, and sign-in option is suggested"},{"description":"Registration fails with weak password","given":"A new user is on the registration page","when":"The user enters a valid email but a password that does not meet Clerk's strength requirements (e.g., '123')","then":"Form displays inline validation error on password field specifying requirements, submit button remains disabled until corrected"},{"description":"Webhook failure creates orphaned Clerk account gracefully","given":"A new user completes Clerk registration but the Convex webhook handler fails due to database unavailability","when":"The webhook returns an error status","then":"Clerk retries the webhook per retry policy, user can still access Clerk auth, and on next login the system attempts profile creation recovery"}]

#### US-002: User Login and Session Management
As a returning user, I want to securely log into HackForge so that I can access my hackathons, teams, and submissions.

**Acceptance Criteria:**
- User can log in using email/password or previously linked OAuth providers
- Clerk manages session tokens and refresh automatically
- User is redirected to their dashboard or intended destination after login
- Failed login attempts show appropriate error messages via inline validation
- Session persists across browser tabs and reasonable time periods
- User can log out from any page, clearing session completely
- Login/logout actions are recorded in audit log with timestamps
- Rate limiting applied to login endpoint to prevent brute force attacks

**Technical Notes:**
**Implementation Approach:**

Leverage Clerk's pre-built `<SignIn />` component with TanStack Start for seamless SSR integration. Configure Clerk middleware in the Cloudflare Worker entry point to handle session validation on every request.

**Architecture Considerations:**

1. **Session Management**: Use Clerk's `getAuth()` helper in server functions to extract user context. Sessions are JWT-based with automatic refresh handled client-side by Clerk's SDK.

2. **Redirect Logic**: Store intended destination in URL params (`redirect_url`) before auth redirect. Post-login, use TanStack Router's `navigate()` to honor this or default to `/dashboard`.

3. **Audit Logging**: Create a Convex mutation `logAuthEvent` triggered via Clerk webhooks (user.signed_in, user.signed_out). Store in an `auditLogs` table with userId, action, timestamp, IP, and userAgent.

4. **Rate Limiting**: Implement at Cloudflare Worker level using `cf.cacheKey` with sliding window counter in KV. Suggest 5 attempts per minute per IP/email combination. Return 429 with Retry-After header.

**Security Considerations:**
- Enable Clerk's bot protection and CAPTCHA for suspicious patterns
- Ensure logout clears Clerk session AND any app-specific cookies
- Sanitize redirect URLs to prevent open redirect vulnerabilities

**Dependencies:** US-001 (Registration) must exist for OAuth provider linking. Clerk webhook endpoints require Convex HTTP actions.

**Test Cases:**
[{"description":"Successful login with email and password","given":"A registered user with email 'alex@example.com' and valid password exists","when":"User enters correct credentials and submits login form","then":"User is authenticated, redirected to dashboard, and session cookie is set with valid JWT"},{"description":"Login with OAuth provider redirects correctly","given":"User previously registered via GitHub OAuth","when":"User clicks 'Continue with GitHub' and completes OAuth flow","then":"User is authenticated and redirected to original intended page stored in redirect_url param"},{"description":"Failed login shows inline validation error","given":"A registered user exists with email 'alex@example.com'","when":"User enters correct email but incorrect password","then":"Form displays inline error 'Invalid email or password' without page reload and password field is cleared"},{"description":"Rate limiting blocks brute force attempts","given":"An IP address has made 5 failed login attempts in the last minute","when":"A 6th login attempt is made from the same IP","then":"Server returns HTTP 429 with 'Retry-After' header and user sees 'Too many attempts, please try again later' message"},{"description":"Logout clears session completely across contexts","given":"User is logged in with active session in two browser tabs","when":"User clicks logout button in one tab","then":"Session is invalidated, both tabs redirect to login page on next interaction, and audit log records logout event with timestamp"}]

#### US-003: User Profile Management
As a registered user, I want to create and manage my profile so that other participants and organisers can identify me within hackathons.

**Acceptance Criteria:**
- User can set display name, bio, and profile picture
- Profile picture uploads are stored in Cloudflare R2
- User can add optional fields: location, skills/interests, social links (GitHub, LinkedIn, portfolio)
- All profile fields validate appropriately with inline error messages
- Profile changes are saved and reflected immediately across the platform
- User can view their own profile as others see it
- Profile updates are logged in audit trail
- Display name is required; other fields are optional

**Technical Notes:**
**Implementation Approach:**

Create a profile management system leveraging Clerk's user metadata combined with Convex for extended profile data. Store basic identity in Clerk (display name synced to publicMetadata) while keeping rich profile data (bio, skills, social links) in a Convex `userProfiles` table linked by Clerk userId.

**Architecture Considerations:**

- **Profile Picture Upload:** Implement a presigned URL flow via Cloudflare R2. Create a Convex action that generates a presigned PUT URL, client uploads directly to R2, then stores the resulting URL in the profile. Use a dedicated `hackforge-avatars` bucket with public read access.
- **Validation Strategy:** Use Zod schemas shared between client and server. Display name: 2-50 chars, required. Bio: max 500 chars. Social links: URL validation with domain allowlists (github.com, linkedin.com). Skills: array of strings, max 20 items.
- **Real-time Updates:** Leverage Convex's reactive queries so profile changes propagate instantly across all connected clients viewing that profile.
- **Audit Trail:** Create a `profileAuditLog` table capturing userId, timestamp, changedFields (as JSON diff), and IP address from request headers.

**Security Considerations:**

- Validate image uploads: check Content-Type (image/*), enforce max size (2MB)
- Sanitize bio field to prevent XSS
- Rate limit profile updates (max 10/minute)
- Ensure users can only modify their own profiles via Clerk session validation

**Dependencies:** Requires Clerk integration (US-001) and R2 bucket configuration.

**Test Cases:**
[{"description":"Successfully update display name and bio","given":"An authenticated user with an existing profile","when":"The user updates their display name to 'Alex Chen' and bio to 'Full-stack developer passionate about AI'","then":"The profile is saved successfully, changes appear immediately on their profile page, and an audit log entry is created with the changed fields"},{"description":"Upload profile picture to R2 storage","given":"An authenticated user on the profile edit page","when":"The user selects a valid JPEG image (500KB) and clicks upload","then":"The image is uploaded to Cloudflare R2, the profile picture URL is stored in the user profile, and the new avatar displays across the platform"},{"description":"Reject invalid profile picture upload","given":"An authenticated user attempting to upload a profile picture","when":"The user selects a file that is 5MB in size or has a non-image MIME type","then":"The upload is rejected with an inline error message stating 'Profile picture must be an image under 2MB' and no changes are saved"},{"description":"Validate social links format","given":"An authenticated user editing their social links","when":"The user enters 'not-a-valid-url' in the GitHub field and 'https://linkedin.com/in/alexchen' in the LinkedIn field","then":"An inline validation error appears under the GitHub field stating 'Please enter a valid GitHub URL', the LinkedIn field shows valid, and the save button remains disabled"},{"description":"Require display name field","given":"An authenticated user editing their profile","when":"The user clears the display name field and attempts to save","then":"An inline error message 'Display name is required' appears, the form is not submitted, and focus moves to the display name field"}]

#### US-004: Notification Preferences Configuration
As a user, I want to configure my notification preferences so that I receive relevant updates through my preferred channels without being overwhelmed.

**Acceptance Criteria:**
- User can toggle email notifications on/off for each notification type
- User can toggle in-app notifications on/off for each notification type
- Notification types include: deadline reminders, approval notifications, result announcements, team invitations, Q&A updates
- Default preferences are set to receive all notifications via both channels
- Preferences are saved immediately with toast confirmation
- User can use 'enable all' or 'disable all' shortcuts for each channel
- Preference changes are logged in audit trail
- Email notifications respect user's verified email from Clerk

**Technical Notes:**
**Implementation Approach:**

Create a `userNotificationPreferences` table in Convex with a document per user, storing a map of notification types to channel preferences. Use Convex's reactive queries to sync preferences to the UI in real-time.

**Schema Design:**
```typescript
notificationPreferences: defineTable({
  userId: v.string(), // Clerk user ID
  preferences: v.object({
    deadlineReminders: v.object({ email: v.boolean(), inApp: v.boolean() }),
    approvalNotifications: v.object({ email: v.boolean(), inApp: v.boolean() }),
    resultAnnouncements: v.object({ email: v.boolean(), inApp: v.boolean() }),
    teamInvitations: v.object({ email: v.boolean(), inApp: v.boolean() }),
    qnaUpdates: v.object({ email: v.boolean(), inApp: v.boolean() })
  }),
  updatedAt: v.number()
}).index('by_user', ['userId'])
```

**Architecture Considerations:**
- Use Convex mutations with optimistic updates for instant UI feedback
- Implement audit logging via a separate `auditLog` table, triggered within the same mutation for atomicity
- Fetch verified email status from Clerk's `useUser()` hook; disable email toggles if unverified
- Create reusable `NotificationToggleGroup` component with bulk action buttons
- Use Sonner (via TanStack Start) for toast confirmations

**Security:**
- Mutations must validate `ctx.auth` matches the preference document owner
- Rate limit preference updates to prevent abuse (Convex action with rate limiting helper)

**Dependencies:** Requires US-001 (user registration) and US-002 (email verification) to be complete.

**Test Cases:**
[{"description":"User successfully toggles individual notification preference","given":"A logged-in user with default notification preferences (all enabled) is on the notification settings page","when":"The user toggles off email notifications for deadline reminders and the mutation completes","then":"The toggle reflects the off state, a success toast appears saying 'Preferences saved', and the database shows deadlineReminders.email as false while all other preferences remain true"},{"description":"User applies enable all shortcut for a channel","given":"A logged-in user has previously disabled email notifications for 3 of 5 notification types","when":"The user clicks the 'Enable all' button in the email notifications column","then":"All 5 email notification toggles switch to enabled state, a single success toast confirms the bulk update, and the database reflects all email preferences as true"},{"description":"Email toggles disabled when email not verified","given":"A logged-in user whose Clerk account has no verified email address navigates to notification preferences","when":"The notification preferences page loads","then":"All email notification toggles are visually disabled with a tooltip explaining 'Verify your email to enable email notifications', and clicking them does not trigger any mutation"},{"description":"Preference change is recorded in audit trail","given":"A logged-in user with userId 'user_abc123' has inApp notifications for teamInvitations currently enabled","when":"The user toggles off inApp notifications for team invitations","then":"An audit log entry is created with action 'notification_preference_updated', userId 'user_abc123', details containing the changed field and old/new values, and a timestamp within 1 second of the request"},{"description":"New user receives default preferences on first access","given":"A newly registered user who has never accessed notification settings","when":"The user navigates to the notification preferences page for the first time","then":"A preferences document is created with all notification types set to true for both email and inApp channels, and the UI displays all toggles in the enabled state"}]

#### US-005: Account Linking and OAuth Management
As a user, I want to link multiple authentication providers to my account so that I can log in using my preferred method.

**Acceptance Criteria:**
- User can link additional OAuth providers (Google, GitHub) from account settings
- User can unlink OAuth providers as long as at least one login method remains
- Attempting to link an already-used OAuth account shows clear error message
- Linked accounts display in account settings with option to remove
- Linking/unlinking actions require re-authentication for security
- All account linking changes are logged in audit trail
- Toast notifications confirm successful link/unlink actions

**Technical Notes:**
**Implementation Approach:**

Leverage Clerk's built-in OAuth account linking capabilities through their `externalAccounts` API. Clerk handles the OAuth flow complexity, but we need custom UI and validation logic.

**Architecture Considerations:**

1. **Account Settings Page**: Create `/settings/security` route using TanStack Start with sections for linked accounts and security options.

2. **Clerk Integration**: Use `user.createExternalAccount()` for linking and `externalAccount.destroy()` for unlinking. Clerk's `useUser()` hook provides real-time external account state.

3. **Re-authentication Flow**: Implement Clerk's `user.verifySession()` or prompt password/OAuth re-auth before sensitive operations. Consider session freshness check (e.g., require re-auth if session >15 minutes old).

4. **Validation Logic**: Before unlinking, verify `user.externalAccounts.length + (user.passwordEnabled ? 1 : 0) > 1` to ensure one login method remains.

5. **Audit Logging**: Store linking events in Convex with schema: `{userId, action: 'link'|'unlink', provider, timestamp, ipAddress}`. Use Convex mutations triggered after successful Clerk operations.

6. **Error Handling**: Clerk returns specific error codes for already-linked accounts (`external_account_exists`). Map these to user-friendly messages.

**Security Considerations:**
- Rate limit linking attempts to prevent enumeration attacks
- Log failed linking attempts for security monitoring
- Consider email notification when new provider linked

**Dependencies:** Requires US-001 (Basic Authentication) and US-004 (Profile Management) for settings page foundation.

**Test Cases:**
[{"description":"Successfully link new OAuth provider to account","given":"User is logged in with email/password and has no Google account linked","when":"User clicks 'Link Google Account', completes OAuth flow, and re-authenticates","then":"Google account appears in linked accounts list, success toast displays, and audit log entry is created with action 'link' and provider 'google'"},{"description":"Prevent unlinking last remaining login method","given":"User is logged in with only GitHub OAuth (no password, no other providers)","when":"User attempts to unlink their GitHub account","then":"Unlink button is disabled or action is blocked with error message 'Cannot remove your only login method. Please add another provider or set a password first.'"},{"description":"Show error when linking already-used OAuth account","given":"User A is logged in and User B has already linked their Google account (google-123)","when":"User A attempts to link the same Google account (google-123)","then":"Error message displays 'This Google account is already linked to another user. Please use a different account or contact support.'"},{"description":"Require re-authentication for security-sensitive actions","given":"User is logged in with session older than 15 minutes","when":"User clicks 'Unlink' on a connected OAuth provider","then":"Re-authentication modal appears requiring password or fresh OAuth login before action proceeds"},{"description":"Display all linked accounts with management options","given":"User has Google and GitHub OAuth providers linked plus password authentication","when":"User navigates to account settings security section","then":"Both providers display with icons, email identifiers, link dates, and enabled 'Remove' buttons for each"}]

#### US-006: Password Reset and Account Recovery
As a user who has forgotten my password, I want to securely reset it so that I can regain access to my account.

**Acceptance Criteria:**
- User can request password reset via email from login page
- Clerk sends secure reset link to verified email address
- Reset link expires after reasonable time period (e.g., 1 hour)
- User can set new password meeting security requirements
- Password requirements are clearly displayed with inline validation
- Successful reset logs user in and shows toast confirmation
- Failed reset attempts (invalid/expired link) show clear error messages
- Password reset requests are rate limited to prevent abuse
- All password reset actions are logged in audit trail

**Technical Notes:**
**Implementation Approach:**

This story leverages Clerk's built-in password reset functionality, requiring minimal custom implementation while ensuring proper integration with the HackForge platform.

**Architecture Considerations:**

1. **Clerk Integration:** Use `<SignIn />` component's forgot password flow or Clerk's `useSignIn` hook for custom UI. The `forgotPassword` method initiates the reset email via Clerk's infrastructure.

2. **Custom Reset Page:** Create `/reset-password` route using TanStack Start that handles the magic link callback. Use Clerk's `handleMagicLinkVerification` for token validation.

3. **Password Validation:** Implement client-side validation matching Clerk's password policy (configurable in Clerk Dashboard). Use real-time feedback with debounced validation for UX.

4. **Rate Limiting:** Implement at Cloudflare Workers edge using KV store to track reset requests per email/IP. Suggest 3 requests per email per hour, 10 per IP per hour.

5. **Audit Logging:** Create Convex mutation `logPasswordResetEvent` triggered on: request initiated, link clicked, password changed, and failures. Store IP, user agent, timestamp, and outcome.

**Security Considerations:**
- Never confirm/deny email existence (timing-safe responses)
- Invalidate all existing sessions on password change
- Log failed verification attempts for security monitoring
- Consider adding CAPTCHA after multiple failed attempts

**Dependencies:** Relies on US-004 (email infrastructure) for delivery. Audit trail feeds into admin dashboard (future epic).

**Test Cases:**
[{"description":"Successful password reset flow","given":"A registered user with verified email 'user@example.com' is on the login page","when":"User clicks 'Forgot Password', enters their email, receives reset link, clicks link within 1 hour, and enters a valid new password meeting requirements","then":"Password is updated, user is automatically logged in, toast displays 'Password reset successful', and audit log records the successful reset"},{"description":"Expired reset link handling","given":"A user has requested a password reset and received a reset link","when":"User clicks the reset link after 1 hour has passed","then":"User sees error message 'This reset link has expired. Please request a new one', is redirected to forgot password page, and audit log records the expired link attempt"},{"description":"Password validation feedback","given":"User is on the password reset page with valid token","when":"User types 'weak' in the new password field","then":"Inline validation displays unmet requirements in red (minimum 8 characters, uppercase, number, special character) and submit button remains disabled"},{"description":"Rate limiting prevents abuse","given":"A user or IP has requested 3 password resets in the last hour","when":"Another password reset is requested for the same email","then":"System returns 'Too many reset requests. Please try again later' without sending email, and the attempt is logged for security monitoring"},{"description":"Invalid reset token handling","given":"A user navigates to the reset password page","when":"The URL contains a malformed or tampered reset token","then":"User sees error message 'Invalid reset link. Please request a new password reset', no password change form is displayed, and suspicious activity is logged"}]

#### US-007: Role-Based Access Control Foundation
As a platform user, I want my access permissions to be determined by my assigned roles so that I can only perform actions appropriate to my responsibilities.

**Acceptance Criteria:**
- System supports roles: Organiser, Admin, Curator, Judge, Problem Proposer, Participant
- Roles are assigned per-hackathon (user can have different roles in different hackathons)
- User can have multiple roles within the same hackathon
- Role assignments are stored in Convex and checked on all protected actions
- Unauthorized access attempts return appropriate error responses
- UI elements are conditionally rendered based on user's roles
- Role changes take effect immediately without requiring re-login
- All role assignments and changes are logged in audit trail with actor information

**Technical Notes:**
Implement RBAC using a HackathonRoleAssignment Convex table with composite key (userId, hackathonId, role). Create a roles enum type for type-safety across the stack. Build a useHackathonRoles(hackathonId) hook that queries user's roles and provides helper methods like hasRole(), hasAnyRole(), and can() for permission checks.

Server-side: Create a withRoleCheck() wrapper for Convex mutations/queries that validates roles before execution. This should accept required roles as parameter and throw ConvexError with 403-equivalent code on failure. Cache role lookups within request context to avoid repeated DB queries.

Client-side: Build a RoleGate component for conditional rendering: <RoleGate roles={['Organiser', 'Admin']}><AdminPanel /></RoleGate>. Use React Context to provide roles at hackathon route level, refreshing on focus/navigation.

For immediate effect on role changes, leverage Convex's real-time subscriptions - the useHackathonRoles hook will automatically update when assignments change. Implement an AuditLog table capturing: timestamp, actorId, targetUserId, hackathonId, action (ROLE_ASSIGNED|ROLE_REVOKED), role, and metadata. Use Convex triggers or wrap assignment mutations to ensure audit entries are always created atomically.

Consider creating a permissions map that translates roles to granular permissions (e.g., Curator can 'review_problems' but not 'manage_judges'), enabling future flexibility without schema changes.

**Test Cases:**
[{"description":"User with Organiser role can access hackathon admin functions","given":"A user is authenticated and has Organiser role assigned for hackathon H1","when":"The user attempts to access the hackathon settings page for H1","then":"The settings page loads successfully and all admin controls are visible"},{"description":"User without required role receives authorization error","given":"A user is authenticated with only Participant role for hackathon H1","when":"The user attempts to call the assignJudge mutation for H1","then":"The system returns a 403 Forbidden error with message 'Insufficient permissions' and the action is not performed"},{"description":"User can have different roles across different hackathons","given":"A user has Organiser role for hackathon H1 and Participant role for hackathon H2","when":"The user views the dashboard for each hackathon","then":"H1 dashboard shows organiser tools and H2 dashboard shows participant view only"},{"description":"Role assignment change takes effect immediately","given":"A user with Participant role is viewing hackathon H1 dashboard","when":"An admin assigns the Curator role to that user for H1","then":"Without page refresh or re-login, the user's UI updates to show Curator-specific elements within 2 seconds"},{"description":"Role changes are recorded in audit trail","given":"An admin is authenticated and viewing user management for hackathon H1","when":"The admin assigns the Judge role to user U1","then":"An audit log entry is created with the admin's ID as actor, U1 as target, 'ROLE_ASSIGNED' action, 'Judge' role, hackathon H1, and current timestamp"}]

#### US-008: Account Deletion and Data Management
As a user, I want to be able to delete my account so that my personal data is removed from the platform when I no longer wish to use it.

**Acceptance Criteria:**
- User can request account deletion from account settings
- Deletion requires re-authentication and explicit confirmation
- System warns user about consequences (loss of hackathon history, team memberships)
- User's personal data is removed from Convex database
- User's profile picture is removed from Cloudflare R2
- Historical records (submissions, team memberships) are anonymized rather than deleted for audit integrity
- Clerk account is deleted via API integration
- Deletion is logged in audit trail (anonymized user reference)
- User receives confirmation email before deletion is processed
- 7-day grace period before permanent deletion with option to cancel

**Technical Notes:**
**Implementation Approach:**

Implement a soft-delete workflow with a 7-day grace period using Convex scheduled functions. Create a `deletionRequests` table tracking user deletion state (pending, cancelled, completed) with timestamps.

**Architecture:**

1. **Re-authentication Flow:** Use Clerk's `reverifySession()` or require password re-entry before initiating deletion. Store a short-lived deletion token in Convex.

2. **Deletion Request Mutation:** Create `requestAccountDeletion` mutation that validates re-auth, creates deletion request record, schedules a Convex `scheduledFunction` to execute in 7 days, and triggers confirmation email via Clerk or Resend.

3. **Scheduled Deletion Function:** The scheduled function performs: (a) anonymize user references in `submissions`, `teamMembers`, `judgingRecords` by replacing userId with `DELETED_USER_<hash>`; (b) delete personal data from `users` table; (c) call Clerk Admin API `DELETE /users/{user_id}`; (d) delete R2 objects via `r2.delete()` for profile pictures using stored object keys; (e) create audit log entry with anonymized reference.

4. **Cancellation:** Allow cancellation by updating deletion request status and cancelling the scheduled function via `ctx.scheduler.cancel(scheduledId)`.

**Security Considerations:**
- Rate limit deletion requests to prevent abuse
- Ensure re-auth token expires quickly (5 minutes)
- Audit log must not contain PII post-deletion
- Handle Clerk API failures gracefully with retry logic

**Dependencies:** US-001 (authentication), US-002 (profile with R2 storage)

**Test Cases:**
[{"description":"Successfully initiate account deletion with valid re-authentication","given":"A logged-in user on the account settings page who has re-authenticated within the last 5 minutes","when":"The user confirms account deletion after reviewing the consequences warning","then":"A deletion request is created with 'pending' status, a scheduled deletion is set for 7 days, the user receives a confirmation email, and the user sees a message confirming the grace period with cancellation option"},{"description":"Reject deletion request without re-authentication","given":"A logged-in user on the account settings page who has not re-authenticated recently","when":"The user attempts to initiate account deletion","then":"The system prompts for password re-entry, the deletion request is blocked until re-authentication succeeds, and no deletion request record is created"},{"description":"Cancel deletion during grace period","given":"A user with a pending deletion request within the 7-day grace period","when":"The user clicks 'Cancel Deletion' from the account settings or email link","then":"The deletion request status changes to 'cancelled', the scheduled deletion function is cancelled, the user receives confirmation of cancellation, and the account remains fully functional"},{"description":"Complete deletion anonymizes historical records","given":"A user with pending deletion whose 7-day grace period has expired and who has submissions and team memberships","when":"The scheduled deletion function executes","then":"The user's personal data is removed from the users table, submissions and team records show 'DELETED_USER_xxx' instead of user ID, the profile picture is deleted from R2, the Clerk account is deleted, and an anonymized audit log entry is created"},{"description":"Handle Clerk API failure during deletion gracefully","given":"A deletion in progress where the Clerk API is temporarily unavailable","when":"The scheduled deletion function attempts to delete the Clerk account and receives a 503 error","then":"The deletion is retried with exponential backoff, local data deletion proceeds independently, the failure is logged for admin review, and the user is notified if deletion cannot complete after retries"}]

### Epic: Hackathon Setup & Configuration

Creating and managing hackathons including name, theme, dates, submission cutoff, about pages, categories, moderation modes (open/curated), visibility settings (public/invite-only), and submission gallery configuration.

#### US-009: Create New Hackathon with Basic Details
As an Organiser, I want to create a new hackathon with basic information (name, theme, description) so that I can establish the foundation for my event.

**Acceptance Criteria:**
- Form includes fields for hackathon name (required, max 100 characters), theme (required, max 200 characters), and rich-text description
- Name uniqueness is validated across active hackathons
- Inline validation errors display for invalid/missing required fields
- Toast notification confirms successful hackathon creation
- User is redirected to hackathon dashboard after creation
- Audit log entry captures creation event with timestamp and user ID
- Rate limiting prevents rapid creation attempts (max 5 hackathons per hour per user)

**Technical Notes:**
**Implementation Approach:**

Create a multi-layer solution using Convex mutations for hackathon creation with server-side validation. The form component should use TanStack Form with Zod schema validation for client-side checks before submission.

**Database Schema (Convex):**
- `hackathons` table: `id`, `name` (indexed), `theme`, `description` (rich text stored as JSON), `status` (enum: draft/active/completed/archived), `organiserId`, `createdAt`, `updatedAt`
- `auditLogs` table: `entityType`, `entityId`, `action`, `userId`, `timestamp`, `metadata`
- `rateLimits` table: `userId`, `action`, `windowStart`, `count`

**Key Implementation Details:**
1. Use Convex's `ctx.auth` to verify Clerk session and extract userId
2. Implement rate limiting as a Convex query checking creation count within sliding 1-hour window
3. Name uniqueness check should query hackathons where `status !== 'archived'` using a compound index
4. Rich text editor: Consider Tiptap or Lexical for description field, storing as serialized JSON
5. Use Convex's transactional guarantees to atomically create hackathon + audit log entry

**Security Considerations:**
- Validate Organiser role via Clerk metadata before allowing creation
- Sanitize rich text content server-side to prevent XSS
- Rate limit check must occur server-side in mutation, not just client

**Dependencies:** Requires Clerk role configuration for 'Organiser' role. Consider extracting audit logging into a reusable Convex function.

**Test Cases:**
[{"description":"Successfully create hackathon with valid basic details","given":"An authenticated user with Organiser role is on the create hackathon page and has created fewer than 5 hackathons in the past hour","when":"They enter a unique name 'AI Innovation Challenge 2025', theme 'Sustainable Technology', a valid rich-text description, and submit the form","then":"A success toast notification appears, the hackathon is persisted to the database with correct fields, an audit log entry is created with userId and timestamp, and user is redirected to the new hackathon dashboard"},{"description":"Reject creation when hackathon name already exists among active hackathons","given":"An Organiser is creating a hackathon and an active hackathon named 'Climate Hack 2025' already exists","when":"They enter 'Climate Hack 2025' as the hackathon name and attempt to submit","then":"An inline validation error displays under the name field stating 'A hackathon with this name already exists', the form is not submitted, and no database records are created"},{"description":"Display inline validation errors for missing required fields","given":"An Organiser is on the create hackathon form with all fields empty","when":"They focus and blur the name field without entering text, then click the submit button","then":"Inline error messages appear under name field showing 'Name is required' and under theme field showing 'Theme is required', submit button remains disabled or submission is prevented"},{"description":"Enforce rate limiting after 5 hackathon creations per hour","given":"An Organiser has successfully created 5 hackathons within the last 60 minutes","when":"They attempt to create a 6th hackathon with valid details","then":"The creation is rejected with an error message 'Rate limit exceeded. You can create up to 5 hackathons per hour. Please try again later.', no hackathon is created, and the attempt is logged"},{"description":"Enforce maximum character limits on name and theme fields","given":"An Organiser is filling out the create hackathon form","when":"They enter a name exceeding 100 characters and a theme exceeding 200 characters","then":"The name field shows character count and error 'Name must be 100 characters or less', the theme field shows error 'Theme must be 200 characters or less', and form submission is blocked until corrected"}]

#### US-010: Configure Hackathon Timeline and Dates
As an Organiser, I want to set key dates for my hackathon (start date, end date, submission cutoff, judging period) so that participants understand the event schedule.

**Acceptance Criteria:**
- Date picker allows selection of: registration open, hackathon start, submission cutoff, judging start, judging end, results date
- Validation ensures logical date ordering (start before end, cutoff before judging)
- Dates display in user's local timezone with UTC stored in database
- Warning shown if submission cutoff is less than 24 hours from start
- Changes to dates after hackathon starts require confirmation dialog
- Timeline is displayed visually on hackathon public/about page
- Audit log captures all date modifications with before/after values

**Technical Notes:**
**Implementation Approach:**

Create a `HackathonTimeline` component using a date-range picker library like `react-day-picker` or `@internationalized/date` for robust timezone handling. Store all dates as UTC timestamps in Convex using `v.number()` for epoch milliseconds.

**Architecture:**
- Convex schema: Add `timeline` object to hackathon document with fields: `registrationOpen`, `hackathonStart`, `submissionCutoff`, `judgingStart`, `judgingEnd`, `resultsDate`
- Create `mutations/updateTimeline.ts` with server-side validation logic for date ordering
- Use Convex's `ctx.db.patch()` for atomic updates with audit logging via a separate `auditLogs` table

**Timezone Handling:**
Use `Intl.DateTimeFormat` API for client-side display. Store user's timezone preference in Clerk metadata or derive from browser. Display format: "Mar 15, 2024 at 2:00 PM (PST)" with UTC tooltip.

**Validation Logic:**
Implement as a pure function shared between client (immediate feedback) and server (source of truth):
```
registrationOpen < hackathonStart < submissionCutoff < judgingStart < judgingEnd <= resultsDate
```

**Visual Timeline:**
Use a horizontal stepper/timeline component showing phases with current phase highlighted. Consider `react-chrono` or custom SVG-based visualization.

**Security Considerations:**
- Verify organiser role via Clerk session in Convex mutation
- Rate-limit date changes to prevent abuse
- Confirmation dialog state should be client-only; server validates hackathon status independently

**Dependencies:** Requires US-001 (Create Hackathon) for base document structure.

**Test Cases:**
[{"description":"Successfully save valid hackathon timeline with all dates in correct order","given":"An organiser is on the timeline configuration page for their draft hackathon","when":"They select registration open (Jan 1), hackathon start (Jan 15), submission cutoff (Jan 20), judging start (Jan 21), judging end (Jan 25), results date (Jan 26) and click Save","then":"All dates are stored in UTC in the database, success toast is shown, and audit log entry is created with the new values"},{"description":"Reject timeline with illogical date ordering","given":"An organiser is configuring the hackathon timeline","when":"They set submission cutoff (Jan 25) after judging start (Jan 20) and attempt to save","then":"Validation error is displayed stating 'Submission cutoff must be before judging start', save button remains disabled, and no database write occurs"},{"description":"Display warning for tight submission window","given":"An organiser is setting hackathon dates","when":"They set hackathon start as March 1 at 9:00 AM and submission cutoff as March 1 at 11:00 PM (14 hours difference)","then":"A warning banner appears stating 'Submission window is less than 24 hours. Participants may not have enough time to complete their projects.' but saving is still allowed"},{"description":"Require confirmation when modifying dates after hackathon has started","given":"A hackathon has started (current date is past hackathonStart) and the organiser navigates to timeline settings","when":"They attempt to extend the submission cutoff by 2 days and click Save","then":"A confirmation dialog appears warning 'This hackathon is already in progress. Changing dates will notify all participants. Are you sure?' with Cancel and Confirm options"},{"description":"Display dates in user's local timezone while storing UTC","given":"An organiser in PST (UTC-8) has saved hackathon start as Jan 15, 2024 9:00 AM PST","when":"A participant in EST (UTC-5) views the hackathon public page","then":"The participant sees 'January 15, 2024 at 12:00 PM EST' and hovering shows '17:00 UTC', while database contains timestamp 1705334400000"}]

#### US-011: Set Hackathon Visibility and Discovery Settings
As an Organiser, I want to configure whether my hackathon appears in the public directory or is invite-only so that I can control who discovers and accesses my event.

**Acceptance Criteria:**
- Toggle option for 'Public' (listed in directory) or 'Invite-Only' (direct link access only)
- Public hackathons appear in browseable directory with search/filter capabilities
- Invite-only hackathons generate a unique shareable link
- Visibility can be changed before hackathon starts; warning shown if changing after registration opens
- Invite-only hackathons show 'Private Event' badge when accessed via direct link
- SEO metadata (noindex) applied to invite-only hackathon pages
- Audit log tracks visibility changes with timestamp

**Technical Notes:**
**Implementation Approach:**

Create a visibility configuration system with two primary modes stored in Convex. The hackathon schema should include `visibility: 'public' | 'invite-only'`, `inviteCode: string` (UUID for shareable links), and `visibilityChangedAt: number` timestamp.

**Architecture Considerations:**

1. **Directory Indexing**: Add a Convex index on `visibility` field for efficient public hackathon queries. The directory page queries only `visibility: 'public'` records with pagination.

2. **Invite Link Generation**: Use `crypto.randomUUID()` on Cloudflare Workers to generate unique invite codes. Store as `/join/{inviteCode}` routes that resolve to the hackathon.

3. **SEO Control**: Implement middleware in TanStack Start that injects `<meta name="robots" content="noindex, nofollow">` for invite-only pages. Use Cloudflare Workers to set `X-Robots-Tag` header as backup.

4. **Visibility Change Guard**: Query registration count before allowing visibility changes. If registrations exist, show confirmation modal warning about potential participant confusion.

5. **Audit Logging**: Create `visibilityAuditLog` Convex table with `hackathonId`, `previousValue`, `newValue`, `changedBy` (Clerk userId), and `timestamp`. Use Convex mutation triggers.

**Security Considerations:**
- Validate organiser permissions via Clerk session before visibility mutations
- Rate-limit invite code lookups to prevent enumeration attacks
- Ensure invite codes aren't guessable (use UUID v4, not sequential)

**Dependencies:** Requires US-009 (basic hackathon creation) for the hackathon entity to exist.

**Test Cases:**
[{"description":"Successfully toggle hackathon to public visibility","given":"An authenticated Organiser with an invite-only hackathon that has no registrations","when":"The Organiser sets visibility to 'Public' and saves","then":"The hackathon visibility updates to 'public', it appears in the public directory, the invite code remains valid but optional, and an audit log entry is created with the change details"},{"description":"Generate unique shareable link for invite-only hackathon","given":"An authenticated Organiser creating or editing a hackathon","when":"The Organiser sets visibility to 'Invite-Only' and saves","then":"A unique invite code is generated, a shareable link in format '/join/{inviteCode}' is displayed, the hackathon does not appear in public directory searches, and the page includes noindex meta tag"},{"description":"Warning displayed when changing visibility after registration opens","given":"An authenticated Organiser with a public hackathon that has 5 registered participants","when":"The Organiser attempts to change visibility to 'Invite-Only'","then":"A confirmation modal appears warning that 5 participants have registered, explains the implications of the change, and requires explicit confirmation before proceeding"},{"description":"Private Event badge displays on invite-only hackathon page","given":"A user accessing an invite-only hackathon via the direct shareable link","when":"The hackathon detail page loads","then":"A 'Private Event' badge is prominently displayed, the page contains noindex meta robots tag, and the X-Robots-Tag header is set to 'noindex, nofollow'"},{"description":"Prevent visibility change by non-organiser","given":"An authenticated user who is a Participant but not an Organiser of a hackathon","when":"The user attempts to access or modify the visibility settings via API","then":"The request is rejected with a 403 Forbidden error, no changes are made to the hackathon, and the attempt is logged for security monitoring"}]

#### US-012: Configure Submission Categories
As an Organiser, I want to create and manage categories for problem submissions so that solutions can be organized and judged appropriately.

**Acceptance Criteria:**
- Add, edit, and delete categories with name (required, max 50 chars) and description (optional, max 500 chars)
- Minimum of 1 category required before hackathon can be published
- Maximum of 20 categories per hackathon
- Categories can be reordered via drag-and-drop
- Warning displayed when deleting category that has assigned problems
- Categories cannot be deleted after submissions exist (only renamed/hidden)
- Category list displays on public hackathon page for participant reference

**Technical Notes:**
Implement categories as a Convex table with fields: id, hackathonId, name, description, displayOrder, isHidden, createdAt, updatedAt. Use a compound index on (hackathonId, displayOrder) for efficient ordered queries.

For drag-and-drop reordering, use @dnd-kit/core with @dnd-kit/sortable on the frontend. Implement optimistic updates via Convex mutations - update displayOrder for affected categories in a single transaction to maintain consistency.

Category mutations should validate: (1) organiser role via Clerk session, (2) hackathon ownership, (3) character limits, (4) category count limits. Create a reusable validation helper since these checks apply across CRUD operations.

For delete protection, query problems table to check assignments before deletion. After submissions exist (check submissions table for any with matching hackathonId), restrict mutations to only allow name/description/isHidden updates. Surface this state via a 'hasSubmissions' flag in the hackathon query response.

Public category list endpoint should filter out isHidden categories and return only necessary fields (name, description, displayOrder). Consider caching this at the Cloudflare Workers edge for published hackathons.

Dependencies: Requires hackathon entity from US-001, problems table structure for assignment checking. Will be consumed by problem submission (US-015) and judging assignment stories.

**Test Cases:**
[{"description":"Successfully create a new category with valid inputs","given":"An authenticated Organiser with an unpublished hackathon containing 0 categories","when":"They submit a category with name 'AI Solutions' (12 chars) and description 'Artificial intelligence focused submissions' (44 chars)","then":"Category is created with displayOrder 1, success confirmation shown, and category appears in the list"},{"description":"Prevent hackathon publish without minimum categories","given":"An Organiser with a hackathon that has 0 categories configured","when":"They attempt to publish the hackathon","then":"Publish is blocked with error message 'At least 1 category required before publishing'"},{"description":"Enforce maximum category limit","given":"An Organiser with a hackathon that already has 20 categories","when":"They attempt to add a 21st category","then":"Creation is rejected with error 'Maximum of 20 categories allowed per hackathon'"},{"description":"Display warning when deleting category with assigned problems","given":"An Organiser with a category that has 3 problems assigned to it","when":"They click delete on that category","then":"A warning modal appears stating '3 problems are assigned to this category. They will become uncategorized. Continue?'"},{"description":"Prevent category deletion after submissions exist","given":"An Organiser with a hackathon that has received at least one submission","when":"They attempt to delete any category","then":"Delete option is disabled/hidden, tooltip shows 'Categories cannot be deleted after submissions begin. You may hide or rename instead.'"}]

#### US-013: Set Moderation Mode for Problem Submissions
As an Organiser, I want to choose between open and curated moderation modes so that I can control how problem proposals enter the hackathon.

**Acceptance Criteria:**
- Radio selection for 'Open' (problems auto-approved) or 'Curated' (problems require curator approval)
- In Curated mode, Curator role assignment becomes required before hackathon starts
- Moderation mode can only be changed before problem submission opens
- Clear explanation text describes each mode's workflow
- Dashboard displays pending approval count when in Curated mode
- Notification preferences allow curators to opt into alerts for new submissions
- Mode selection is reflected in problem submission guidelines shown to proposers

**Technical Notes:**
## Implementation Approach

Implement moderation mode as a discriminated union type in the hackathon schema: `moderationMode: 'open' | 'curated'`. This enables type-safe conditional logic throughout the codebase. Store in the existing hackathon Convex document with a migration defaulting existing hackathons to 'open'.

### Architecture Considerations

**State Machine Integration**: Moderation mode changes must respect hackathon lifecycle states. Create a Convex mutation `updateModerationMode` that validates against `hackathonPhase !== 'problem_submission_open'`. Use optimistic updates in TanStack for responsive UI.

**Curator Dependency Validation**: Before transitioning hackathon to problem submission phase, implement a pre-flight check query `canOpenProblemSubmissions` that returns `{ valid: boolean, errors: string[] }`. In Curated mode, verify at least one user has Curator role assigned.

**Pending Count Real-time Updates**: Leverage Convex's reactive queries for dashboard pending count. Create `getPendingProblemCount(hackathonId)` subscription that filters problems where `status === 'pending_approval' && hackathon.moderationMode === 'curated'`.

**Notification Preferences**: Extend curator's notification settings in user-hackathon-role junction table with `notifyOnNewSubmission: boolean`. Use Convex scheduled functions to batch curator notifications, preventing spam on bulk submissions.

### Security Considerations
- Mutation must verify caller has Organiser role via Clerk session
- Prevent race conditions with Convex's transactional mutations when checking phase state
- Audit log mode changes for compliance tracking

**Test Cases:**
[{"description":"Organiser successfully sets moderation mode to Curated before submissions open","given":"An authenticated Organiser viewing hackathon settings where problem submission phase has not started and current mode is Open","when":"The Organiser selects 'Curated' radio option and clicks Save","then":"The moderation mode is persisted as 'curated', a success toast confirms the change, and the Curator assignment section displays a required indicator"},{"description":"System prevents mode change after problem submission opens","given":"An authenticated Organiser viewing hackathon settings where problem submission phase is currently active with mode set to Open","when":"The Organiser attempts to change moderation mode to Curated","then":"The radio buttons are disabled, a tooltip explains 'Mode cannot be changed after submissions open', and no mutation is triggered"},{"description":"Dashboard displays pending approval count in Curated mode","given":"A hackathon in Curated mode with 5 submitted problems where 3 are pending approval and 2 are approved","when":"The Organiser navigates to the hackathon dashboard","then":"A badge displays '3 pending' next to the Problems section, and clicking it navigates to the filtered problem review queue"},{"description":"System blocks hackathon start without assigned Curator in Curated mode","given":"A hackathon configured in Curated mode with zero users assigned the Curator role","when":"The Organiser attempts to open the problem submission phase","then":"The action is blocked with error message 'At least one Curator must be assigned before opening submissions in Curated mode', and the phase remains unchanged"},{"description":"Problem proposer sees mode-specific submission guidelines","given":"A logged-in Participant accessing the problem submission form for a hackathon in Curated mode","when":"The submission form loads","then":"An info banner displays 'Submissions require curator approval before becoming visible' and the submit button text reads 'Submit for Review'"}]

#### US-014: Create and Edit Hackathon About Page
As an Organiser, I want to create a rich about page for my hackathon with rules, prizes, and event details so that participants have all necessary information.

**Acceptance Criteria:**
- Rich text editor supports headings, lists, links, images, and basic formatting
- Predefined sections available: Overview, Rules, Prizes, Schedule, FAQ, Sponsors
- Sections can be reordered, hidden, or shown
- Auto-save drafts every 30 seconds with visual indicator
- Preview mode shows page as participants will see it
- Image uploads stored in Cloudflare R2 with max 5MB per image
- Version history preserved; ability to revert to previous versions
- About page URL is shareable and accessible based on visibility settings

**Technical Notes:**
**Implementation Approach:**

Use TipTap editor (ProseMirror-based) for rich text editing—it's TypeScript-native, extensible, and works well with React/TanStack. Store content as JSON (TipTap's native format) in Convex for efficient querying and rendering.

**Data Model:**
- `hackathonAboutPages` table: hackathonId, sections (array of {type, title, content, visible, order}), currentVersion, lastAutoSave
- `aboutPageVersions` table: pageId, version, sections, createdAt, createdBy (for version history)

**Section Management:**
Predefined section types as enum; each section stores TipTap JSON content. Implement drag-and-drop reordering via dnd-kit. Hidden sections persist in data but filtered in participant view.

**Auto-Save Implementation:**
Debounced Convex mutation (30s interval) updating draft field. Track `isDirty` state client-side; show saving/saved indicator in UI. Use `useEffect` cleanup to save on unmount.

**Image Upload Flow:**
1. Client validates file size (<5MB) and type before upload
2. Generate presigned URL from Cloudflare Worker → R2
3. Direct browser upload to R2
4. Store R2 URL in TipTap content
5. Consider image optimization via Cloudflare Images if available

**Version History:**
Create new version entry on explicit 'Publish' action (not auto-save). Limit stored versions (e.g., last 20) with Convex scheduled function cleanup. Revert copies historical version to current.

**Security:**
Clerk middleware validates Organiser role for edit endpoints. Public about page respects hackathon visibility settings (US-011 dependency). Sanitize HTML output to prevent XSS.

**Test Cases:**
[{"description":"Organiser creates about page with multiple formatted sections","given":"An authenticated Organiser with an existing hackathon and no about page content","when":"They add Overview and Rules sections with headings, bullet lists, and links, then click Publish","then":"The about page is saved with both sections visible, content properly formatted, and a version 1 entry is created in history"},{"description":"Auto-save triggers after content changes","given":"An Organiser is editing the about page with unsaved changes","when":"30 seconds pass without manual save and the saving indicator appears","then":"Draft content is persisted to database, indicator shows 'Saved', and refreshing the page restores the draft content"},{"description":"Image upload rejected when exceeding size limit","given":"An Organiser is editing a section and attempts to insert an image","when":"They select an image file that is 6MB in size","then":"Upload is blocked before network request, error message displays 'Image must be under 5MB', and editor content remains unchanged"},{"description":"Revert to previous version restores historical content","given":"An about page with 3 published versions where version 2 had a Sponsors section that was removed in version 3","when":"The Organiser views version history, selects version 2, and confirms revert","then":"Current content is replaced with version 2 content including Sponsors section, a new version 4 is created, and auto-save indicator shows the change"},{"description":"Participant views about page respecting visibility settings","given":"A hackathon with visibility set to 'invite-only' and a published about page","when":"An unauthenticated user accesses the shareable about page URL","then":"They receive a 403 response or are redirected to login, and the about page content is not exposed"},{"description":"Section reordering persists correctly","given":"An about page with sections in order: Overview, Rules, Prizes, FAQ","when":"Organiser drags Prizes section above Rules and triggers auto-save","then":"Section order is saved as Overview, Prizes, Rules, FAQ and preview mode displays sections in the new order"}]

#### US-015: Configure Submission Gallery Settings
As an Organiser, I want to configure how the submission gallery displays and what information is visible so that I can control the participant experience during and after the event.

**Acceptance Criteria:**
- Toggle for gallery visibility: hidden during judging, visible after results, or always visible
- Option to show/hide team member names on public submissions
- Option to show/hide vote counts or rankings before results published
- Configure which submission fields display in gallery cards (title, thumbnail, category, team)
- Gallery supports filtering by category and sorting (newest, alphabetical, random)
- Settings can be modified until results are published
- Preview mode shows gallery as participants will see it

**Technical Notes:**
Implement gallery settings as a nested object within the hackathon document in Convex, using a GallerySettings type with fields: visibilityMode (enum: 'hidden_during_judging' | 'visible_after_results' | 'always_visible'), showTeamMembers (boolean), showVoteCounts (boolean), displayFields (array of enabled field keys), and sorting/filtering defaults.

Create a Convex mutation `updateGallerySettings` with organiser role validation and a check that results haven't been published (query hackathon.resultsPublishedAt). Use Convex's schema validation to ensure displayFields only contains valid options: ['title', 'thumbnail', 'category', 'team'].

For the preview mode, implement a query `getGalleryPreview` that applies the current settings to actual submission data, returning transformed results as participants would see them. This avoids duplicating rendering logic—the same query powers both preview and actual gallery views, with a `previewMode` flag that bypasses visibility checks for organisers.

Gallery filtering and sorting should be handled client-side for small hackathons (<100 submissions) using TanStack Query's select option. For larger events, implement Convex indexes on category and createdAt fields with parameterized queries.

Security consideration: The gallery query must check visibility settings server-side before returning data—never trust client-side filtering for hiding sensitive information like vote counts. Implement a middleware pattern in the query that strips restricted fields based on current hackathon phase and settings.

Dependency: Requires US-011 (submission structure) and US-023 (judging workflow) for phase detection.

**Test Cases:**
[{"description":"Organiser successfully updates gallery visibility mode","given":"An organiser is authenticated and managing a hackathon where results have not been published","when":"They set gallery visibility to 'visible_after_results' and save settings","then":"The gallery settings are updated in the database and participants cannot view the gallery until results are published"},{"description":"Gallery respects team member visibility setting","given":"Gallery settings have showTeamMembers set to false and gallery is visible","when":"A participant views a submission in the gallery","then":"The submission card displays title, thumbnail, and category but team member names are hidden"},{"description":"Settings modification blocked after results published","given":"An organiser is managing a hackathon where results have already been published","when":"They attempt to modify any gallery setting","then":"The system rejects the change with error 'Gallery settings cannot be modified after results are published'"},{"description":"Preview mode shows gallery as participants will see it","given":"An organiser has configured gallery to hide vote counts and show only title and category fields","when":"They activate preview mode","then":"The preview displays submissions with only title and category visible, vote counts hidden, matching exactly what participants would see"},{"description":"Gallery filtering returns only matching category submissions","given":"A hackathon has 10 submissions across 3 categories and gallery is visible","when":"A participant filters the gallery by 'AI/ML' category","then":"Only submissions tagged with 'AI/ML' category are displayed, sorted according to the configured default sort order"}]

#### US-016: Archive Completed Hackathon
As an Organiser, I want to manually archive a completed hackathon so that it becomes read-only while remaining accessible for historical reference.

**Acceptance Criteria:**
- Archive action available only after results are published
- Confirmation dialog warns that action makes hackathon read-only
- Archived hackathons display 'Archived' badge on all pages
- All data remains viewable: submissions, results, leaderboard, about page
- No new submissions, team changes, or judging actions permitted
- Archived hackathons appear in separate 'Past Events' section of directory
- Organisers can still access analytics and export data from archived events
- Audit log captures archive action with timestamp and user

**Technical Notes:**
Implement archival as a state transition in the hackathon lifecycle, extending the existing status enum to include 'archived' as a terminal state. The archive mutation in Convex should validate preconditions: user must be Organiser, hackathon status must be 'results_published'. Use a transaction to atomically update status and create an audit log entry with timestamp, userId, and previous state.

For the read-only enforcement, implement a Convex middleware or wrapper function that checks hackathon status before any mutation affecting submissions, teams, or judging. This centralizes the logic rather than scattering checks across individual mutations. Consider creating an `assertHackathonMutable(hackathonId)` helper.

The 'Archived' badge should be a shared UI component that reads from hackathon context, displayed consistently in the header layout. For the directory separation, modify the hackathon listing query to accept a filter parameter and use Convex indexes on status for efficient querying of active vs. archived events.

Analytics and export functionality should remain unchanged since they're read operations. However, verify that any 'draft report' or 'pending export' features handle the archived state gracefully. The confirmation dialog should use a modal pattern consistent with other destructive actions, clearly stating irreversibility. Consider whether super-admins should have an 'unarchive' capability for edge cases—if so, implement as a separate privileged mutation with its own audit trail.

**Test Cases:**
[{"description":"Successfully archive a hackathon after results are published","given":"A hackathon exists with status 'results_published' and the current user is an Organiser","when":"The Organiser confirms the archive action in the confirmation dialog","then":"The hackathon status changes to 'archived', an audit log entry is created with timestamp and user ID, and a success notification is displayed"},{"description":"Archive action is unavailable before results publication","given":"A hackathon exists with status 'judging_complete' (results not yet published) and the current user is an Organiser","when":"The Organiser views the hackathon management page","then":"The archive button is disabled or hidden, with a tooltip explaining that results must be published first"},{"description":"Archived hackathon blocks submission mutations","given":"A hackathon has been archived and a participant attempts to modify their submission","when":"The participant submits an edit request via the API","then":"The mutation is rejected with error code 'HACKATHON_ARCHIVED' and the submission remains unchanged"},{"description":"Archived hackathons appear in Past Events directory section","given":"Three hackathons exist: two active and one archived, all set to public visibility","when":"A visitor browses the public hackathon directory","then":"Active hackathons appear in the main listing, the archived hackathon appears under 'Past Events' section with an 'Archived' badge"},{"description":"Organiser can export data from archived hackathon","given":"A hackathon is archived and the Organiser navigates to the analytics dashboard","when":"The Organiser clicks 'Export Submissions CSV'","then":"The export generates successfully with all historical data intact and downloads to the user's device"}]

### Epic: Role & Access Management

Assigning and managing hackathon roles (Owner, Admin, Curator, Judge) via email invitations or existing user selection, with per-hackathon permissions and ownership transfer capabilities.

#### US-017: Invite Hackathon Roles via Email
As an organiser, I want to invite admins, curators, and judges to my hackathon via email so that I can onboard team members who aren't yet on the platform.

**Acceptance Criteria:**
- Organiser can enter an email address and select a role (Admin, Curator, or Judge) to send an invitation
- System sends an email with a unique, secure invitation link that expires after 7 days
- Email clearly states the hackathon name, role being offered, and who sent the invitation
- Recipients without accounts are directed to create one, then automatically assigned the role
- Recipients with existing accounts (different email) can link the invitation to their account
- Pending invitations are visible in the hackathon's role management dashboard with sent date and status
- Organisers can resend or revoke pending invitations
- Inline validation prevents inviting the same email twice for the same role
- Toast notification confirms successful invitation sent

**Technical Notes:**
Implement invitation system using Convex for state management and Clerk for authentication integration.

**Data Model:**
Create `hackathonInvitations` table with fields: id, hackathonId, email (indexed), role, invitedBy, token (unique secure string), status (pending/accepted/revoked), createdAt, expiresAt. Add compound index on (hackathonId, email, role) for duplicate detection.

**Token Generation:**
Generate cryptographically secure tokens using `crypto.randomUUID()` combined with additional entropy. Store hashed tokens in database, include raw token only in email links. Set 7-day expiry at creation time.

**Email Integration:**
Use Cloudflare Workers with a transactional email service (Resend or SendGrid). Create email template including: hackathon name, role description, inviter name, and CTA button with invitation link. Link format: `{baseUrl}/invite/{token}`.

**Invitation Flow:**
1. Validate email format and check for existing pending invitation (same email + role + hackathon)
2. Generate secure token, create invitation record
3. Trigger email via Convex action calling Cloudflare Worker
4. Return success for toast notification

**Redemption Flow:**
Create `/invite/[token]` route in TanStack Start. On load, validate token exists and not expired. If user authenticated via Clerk, assign role directly. If unauthenticated, store token in session/localStorage, redirect to Clerk sign-up/sign-in, then process on callback.

**Account Linking:**
For existing users with different emails, show confirmation modal explaining the invitation will be linked to their current account. Update invitation with acceptedBy userId.

**Security Considerations:**
Rate limit invitation sends per organiser (e.g., 50/hour). Validate organiser still has permission before processing redemption. Log all invitation activities for audit trail.

**Test Cases:**
[{"description":"Successfully send invitation to new email","given":"An organiser is on the role management page for their hackathon and enters a valid email 'newuser@example.com' with role 'Judge'","when":"The organiser clicks the send invitation button","then":"A pending invitation record is created with 7-day expiry, an email is sent containing hackathon name, 'Judge' role, organiser's name, and secure link, the invitation appears in the pending list with 'Sent' status and current date, and a success toast notification is displayed"},{"description":"Prevent duplicate invitation for same email and role","given":"A pending invitation already exists for 'existing@example.com' as 'Curator' for this hackathon","when":"The organiser attempts to invite 'existing@example.com' as 'Curator' again","then":"Inline validation error appears immediately stating 'This email already has a pending Curator invitation', the send button is disabled, and no duplicate invitation is created"},{"description":"New user redeems invitation and creates account","given":"A valid pending invitation exists for 'newbie@example.com' as 'Admin' and the recipient has no platform account","when":"The recipient clicks the invitation link and completes Clerk account creation with email 'newbie@example.com'","then":"The user is automatically assigned the Admin role for the hackathon, the invitation status updates to 'accepted', and the user is redirected to the hackathon dashboard with their new role active"},{"description":"Existing user links invitation to different account email","given":"A valid invitation exists for 'work@example.com' as 'Judge' and the user is logged in with account 'personal@example.com'","when":"The user clicks the invitation link while authenticated","then":"A confirmation modal displays explaining the Judge role will be linked to their 'personal@example.com' account, upon confirmation the role is assigned to their existing account, and the invitation records the accepting userId"},{"description":"Reject expired invitation redemption","given":"An invitation was created 8 days ago and has expired","when":"A user clicks the expired invitation link","then":"The user sees an error page stating 'This invitation has expired', a prompt to contact the organiser for a new invitation is shown, and no role assignment occurs"},{"description":"Organiser revokes pending invitation","given":"A pending invitation exists for 'unwanted@example.com' as 'Curator' visible in the dashboard","when":"The organiser clicks the revoke button and confirms the action","then":"The invitation status changes to 'revoked', the invitation link becomes invalid and shows 'revoked' error if accessed, and the invitation is removed from or marked as revoked in the pending list"}]

#### US-018: Assign Roles to Existing Platform Users
As an organiser, I want to assign hackathon roles to users already on the platform so that I can quickly add team members without waiting for email acceptance.

**Acceptance Criteria:**
- Organiser can search for existing users by name or email with typeahead suggestions
- Search results show user name, email, and profile avatar for identification
- Organiser can select a user and assign them a role (Admin, Curator, or Judge)
- Role assignment takes effect immediately without requiring user acceptance
- Assigned user receives an in-app notification about their new role
- Assigned user receives an email notification based on their notification preferences
- Cannot assign a role to a user who already holds that role in the hackathon
- Audit log records who assigned the role, to whom, and when

**Technical Notes:**
Implement user search with Convex's built-in text search or a custom index on users table for name/email fields. Create a searchUsers query that filters by partial matches and excludes users already holding the target role in the hackathon. The typeahead component should debounce requests (300ms) and limit results to 10 users for performance.

Role assignment requires a Convex mutation that: (1) validates organiser permissions via Clerk session, (2) checks user doesn't already hold the role, (3) creates the role assignment record, (4) triggers notification creation, (5) logs to audit table. Use Convex's transactional guarantees to ensure atomicity.

For notifications, create a dual-delivery system: always create an in-app notification record, then check user's notification_preferences table before queuing email. Email delivery should use Cloudflare Workers with a queue for reliable delivery. Consider using Resend or SendGrid via Workers for transactional emails.

Audit logging should capture: actor_id (organiser), target_user_id, hackathon_id, role_assigned, timestamp, and action_type. Store in a dedicated audit_logs table with indexes on hackathon_id and timestamp for efficient querying.

Security considerations: Ensure search endpoint doesn't leak sensitive user data beyond what's needed for identification. Rate-limit search queries to prevent enumeration attacks. Validate role enum server-side to prevent injection of invalid roles.

**Test Cases:**
[{"description":"Successfully assign judge role to existing user","given":"An organiser is on the role management page for their hackathon and a platform user 'jane@example.com' exists without any role in this hackathon","when":"The organiser searches for 'jane', selects the user from results, chooses 'Judge' role, and confirms assignment","then":"The role is assigned immediately, the user appears in the judges list, an in-app notification is created for Jane, and an audit log entry records the assignment with organiser ID and timestamp"},{"description":"Typeahead search returns matching users with required display fields","given":"Platform has users: 'Alice Smith (alice@test.com)', 'Bob Allen (bob@test.com)', and 'Charlie Brown (charlie@test.com)'","when":"Organiser types 'ali' in the search field","then":"Search results show 'Alice Smith' and 'Bob Allen' (matching 'ali' in name or email), each displaying name, email, and profile avatar"},{"description":"Prevent duplicate role assignment","given":"User 'mark@example.com' already holds the Curator role for hackathon 'AI Challenge 2024'","when":"Organiser attempts to assign the Curator role to mark@example.com for the same hackathon","then":"The system prevents the assignment, displays an error message 'User already holds this role', and no duplicate record is created"},{"description":"Email notification respects user preferences","given":"User 'opt-out@example.com' has email notifications disabled in their preferences and user 'opt-in@example.com' has email notifications enabled","when":"Organiser assigns Admin role to both users","then":"Both users receive in-app notifications, only 'opt-in@example.com' receives an email notification, and 'opt-out@example.com' receives no email"},{"description":"Unauthorised user cannot assign roles","given":"A user who is a Participant (not an Organiser) in hackathon 'Code Sprint'","when":"The user attempts to access the role assignment endpoint or UI for that hackathon","then":"The request is rejected with 403 Forbidden, no role assignment occurs, and the attempt is logged for security monitoring"}]

#### US-019: View and Manage Hackathon Role Assignments
As an organiser, I want to view all role assignments for my hackathon in one place so that I can understand who has access and make changes as needed.

**Acceptance Criteria:**
- Role management dashboard displays all assigned roles grouped by role type (Owner, Admin, Curator, Judge)
- Each entry shows user name, email, role, assigned date, and who assigned them
- Pending email invitations appear in a separate section with expiration status
- Organiser can filter the list by role type
- Organiser can search within assigned roles by name or email
- Dashboard shows total count per role type
- Empty states provide clear guidance on how to add roles
- Dashboard is accessible only to Owner and Admins

**Technical Notes:**
Implement a role management dashboard as a dedicated route within the hackathon organiser section, accessible via `/hackathon/:id/roles`. Use Convex queries to fetch role assignments with pagination support, joining user data from Clerk for display names and emails. Create a `getRoleAssignments` query that returns assignments grouped by role type, including metadata (assignedAt timestamp, assignedBy user reference). For pending invitations, query the invitations table filtering by hackathon ID and status='pending', calculating expiration status client-side based on createdAt + TTL. Implement filtering and search using Convex query arguments rather than client-side filtering for performance. Use TanStack Query for data fetching with appropriate cache invalidation when roles change. The UI should use a tabbed or accordion layout for role groupings, with a search input that debounces queries (300ms). Access control requires middleware checking the current user has Owner or Admin role for the hackathon - implement as a reusable `requireHackathonRole` helper. Consider creating a composite index on `(hackathonId, roleType)` for efficient grouped queries. For the counts summary, either compute in a separate aggregation query or derive from the grouped results. Empty states should include CTAs linking to the role invitation flow (US-017/018). Ensure proper loading skeletons for each section independently.

**Test Cases:**
[{"description":"Owner views complete role assignment dashboard with all role types","given":"A hackathon exists with 2 Admins, 3 Curators, and 5 Judges assigned, plus 2 pending invitations","when":"The Owner navigates to the role management dashboard","then":"Dashboard displays roles grouped by type with correct counts (2 Admins, 3 Curators, 5 Judges), each entry shows user name, email, role, assigned date, and assigner name, and pending invitations section shows 2 entries with expiration status"},{"description":"Admin filters role list by specific role type","given":"An Admin is viewing the role management dashboard with mixed role assignments","when":"The Admin selects 'Judge' from the role type filter","then":"Only Judge role assignments are displayed, other role sections are hidden or collapsed, and the filter selection is visually indicated"},{"description":"Organiser searches for a specific user across all roles","given":"The dashboard contains 15 role assignments including user 'Sarah Chen' as a Curator","when":"The organiser types 'sarah' in the search field","then":"Results filter to show only Sarah Chen's assignment, search works across name and email fields, and clearing search restores full list"},{"description":"Dashboard shows expired invitation with appropriate status","given":"A pending Judge invitation was sent 8 days ago with a 7-day expiration policy","when":"The organiser views the pending invitations section","then":"The invitation displays with 'Expired' status badge, visual distinction from active pending invitations, and option to resend or revoke is available"},{"description":"Non-admin participant is denied access to role dashboard","given":"A user is a registered Participant in the hackathon but has no organiser roles","when":"The user attempts to access the role management dashboard URL directly","then":"Access is denied with appropriate error message, user is redirected to hackathon overview or shown 403 state, and no role assignment data is exposed"},{"description":"Empty state displays when no roles of a type are assigned","given":"A new hackathon with only the Owner assigned and no other roles","when":"The Owner views the role management dashboard","then":"Empty states appear for Admin, Curator, and Judge sections with helpful guidance text and clear CTA buttons to invite users for each role type"}]

#### US-020: Remove Role Assignments
As an organiser, I want to remove a role from a user so that I can revoke access when someone leaves the team or was assigned incorrectly.

**Acceptance Criteria:**
- Organiser can remove any role except Owner from any assigned user
- Removal requires confirmation dialog explaining the action's impact
- Removed user loses access to role-specific features immediately
- Removed user receives an in-app notification about the role removal
- Removed user can still access the hackathon as a regular participant if they were registered
- Audit log records who removed the role, from whom, and when
- Cannot remove your own Admin role (prevents accidental lockout)
- Toast notification confirms successful role removal

**Technical Notes:**
## Implementation Approach

Build a role removal mutation in Convex that enforces business rules server-side. The mutation should validate: (1) requester has Organiser/Admin permission, (2) target role isn't Owner, (3) user isn't removing their own Admin role. Use Convex's transactional guarantees to atomically update the role assignment and create audit/notification records.

## Architecture Considerations

**Confirmation Dialog**: Implement a reusable confirmation modal component that displays context-specific impact messaging. For role removal, show what features the user will lose access to based on the role being removed.

**Immediate Access Revocation**: Convex's real-time subscriptions will automatically update the UI when role data changes. Ensure all role-gated components use reactive queries so removed users see changes instantly without refresh.

**Notification System**: Create a notification record in Convex with type 'ROLE_REMOVED', linking to the hackathon. The notification should include the role name and hackathon title for context.

## Security Considerations

- Server-side validation is critical; never trust client-side role checks alone
- Rate limit role removal operations to prevent abuse
- Consider soft-delete pattern for role assignments to preserve history
- Validate the target user actually has the role being removed

## Dependencies

- US-019 (Role Assignment) for shared role management infrastructure
- Notification system must be in place
- Audit logging infrastructure from earlier stories

**Test Cases:**
[{"description":"Successfully remove curator role from assigned user","given":"An organiser is viewing a hackathon where User B has the Curator role assigned","when":"The organiser clicks remove on User B's Curator role and confirms the action in the dialog","then":"User B's Curator role is removed, they lose access to curator features immediately, receive an in-app notification, a success toast is shown, and an audit log entry is created"},{"description":"Prevent removal of Owner role","given":"An organiser is viewing the role assignments for a hackathon","when":"The organiser attempts to remove the Owner role from a user","then":"The remove option is disabled or hidden for the Owner role, and no removal action is possible"},{"description":"Prevent self-removal of Admin role","given":"An admin user is viewing their own role assignments on a hackathon","when":"They attempt to remove their own Admin role","then":"The system displays an error message explaining they cannot remove their own Admin role to prevent lockout"},{"description":"Removed user retains participant access","given":"User C is registered as a participant and also has the Judge role on a hackathon","when":"An organiser removes User C's Judge role","then":"User C loses access to judging features but can still access the hackathon as a regular participant, view their team, and access participant-level features"},{"description":"Confirmation dialog displays role-specific impact","given":"An organiser initiates removal of a Judge role from a user","when":"The confirmation dialog appears","then":"The dialog clearly explains the user will lose access to scoring submissions, viewing judging criteria, and other judge-specific features, with confirm and cancel options"}]

#### US-021: Transfer Hackathon Ownership
As a hackathon owner, I want to transfer ownership to another user so that someone else can take over primary responsibility for the event.

**Acceptance Criteria:**
- Only the current Owner can initiate ownership transfer
- Owner can select from existing Admins or invite a new user via email to become Owner
- Transfer requires the Owner to re-authenticate (password/MFA) as a security measure
- Transfer requires explicit confirmation with clear warning about losing Owner privileges
- If transferring to a new user via email, transfer completes only after they accept and create/link account
- New Owner receives all Owner permissions immediately upon transfer completion
- Previous Owner is automatically demoted to Admin role
- Both parties receive email and in-app notifications about the ownership change
- Audit log records the complete ownership transfer with timestamps

**Technical Notes:**
Implement ownership transfer as a multi-step workflow with pending transfer states stored in Convex. Create a `pendingOwnershipTransfers` table tracking: hackathonId, initiatorId, targetUserId (nullable for email invites), targetEmail, status (pending_acceptance, pending_auth, completed, cancelled, expired), createdAt, expiresAt, and completedAt.

For the transfer flow: (1) Owner initiates transfer, selecting existing Admin or entering email; (2) System creates pending transfer record; (3) If email invite, generate secure token and send invitation email via Cloudflare Workers email integration; (4) Before completion, require re-authentication through Clerk's `useSession().session.verifyWithSession()` or step-up authentication flow; (5) On confirmation, execute atomic transaction updating hackathon.ownerId, demoting previous owner to Admin in hackathonMembers, and promoting new owner.

Security considerations: Implement transfer token expiration (72 hours recommended), rate-limit transfer initiations (max 3 pending per hackathon), and ensure re-auth check happens server-side in Convex mutation. Use Clerk webhooks to handle cases where invited user creates new account.

For notifications, leverage existing notification system (likely from US-019/US-020 patterns) to send both email and in-app alerts. Audit logging should capture: previous_owner_id, new_owner_id, transfer_method (existing_admin/email_invite), acceptance_timestamp, and IP addresses for security review.

Edge cases: Handle scenarios where target Admin is removed before accepting, hackathon is deleted during pending transfer, or owner attempts multiple simultaneous transfers.

**Test Cases:**
[{"description":"Owner successfully transfers ownership to existing Admin","given":"User is the Owner of hackathon 'TechHack 2024' and user 'jane@example.com' is an Admin of that hackathon","when":"Owner selects jane@example.com as new owner, re-authenticates successfully, and confirms the transfer with acknowledgment checkbox","then":"jane@example.com becomes the new Owner with full permissions, previous owner is demoted to Admin role, both users receive email and in-app notifications, and audit log records transfer with timestamp and user IDs"},{"description":"Owner transfers ownership via email invitation to new user","given":"User is the Owner of hackathon 'StartupJam' and wants to transfer to 'newowner@company.com' who has no account","when":"Owner enters newowner@company.com, re-authenticates, confirms transfer, and newowner@company.com receives invitation email, creates Clerk account, and accepts transfer","then":"Transfer completes only after new user accepts, new user becomes Owner, previous owner becomes Admin, invitation token is invalidated, and audit log shows complete transfer timeline"},{"description":"Non-owner user cannot initiate ownership transfer","given":"User is an Admin (not Owner) of hackathon 'CodeFest'","when":"User attempts to access ownership transfer functionality or directly calls the transfer mutation","then":"Request is rejected with 403 Forbidden error, no pending transfer is created, and attempt is logged as unauthorized access"},{"description":"Transfer fails without re-authentication","given":"Owner has initiated transfer to existing Admin and is on confirmation screen","when":"Owner attempts to complete transfer without re-authenticating or with stale session verification","then":"Transfer is blocked with message requiring re-authentication, pending transfer remains in 'pending_auth' status, and no ownership changes occur"},{"description":"Pending email transfer expires after timeout period","given":"Owner initiated transfer via email to 'invited@example.com' 73 hours ago and invitation has not been accepted","when":"System runs expiration check or invited user attempts to accept the expired invitation","then":"Transfer is marked as expired, acceptance link returns 'Transfer invitation has expired' error, Owner is notified that transfer expired, and Owner can initiate new transfer if desired"}]

#### US-022: Per-Hackathon Permission Enforcement
As the platform, I need to enforce role-based permissions per hackathon so that users can only perform actions appropriate to their assigned roles.

**Acceptance Criteria:**
- Owner has full access to all hackathon settings, roles, and destructive actions (archive, delete)
- Admins can manage most settings, invite/remove Curators and Judges, but cannot transfer ownership or remove Owner
- Curators can manage problems, review submissions, and publish results but cannot modify hackathon settings or roles
- Judges can only access judging interface and view submissions assigned to them
- UI elements for unauthorized actions are hidden, not just disabled
- Direct API calls to unauthorized endpoints return 403 Forbidden with clear error message
- Role checks happen on every request, not cached from session start
- Users with multiple roles see a combined permission set (union of all role permissions)
- Permission changes take effect immediately without requiring re-login

**Technical Notes:**
Implement a permission enforcement system using Convex's built-in authorization patterns with real-time reactivity. Create a `permissions.ts` module defining granular permission constants (e.g., `HACKATHON_SETTINGS_WRITE`, `ROLES_MANAGE`, `PROBLEMS_CURATE`, `JUDGING_ACCESS`) mapped to each role. Use Convex's `ctx.auth` combined with a `getUserHackathonRoles` query that fetches fresh role data on every mutation/query—Convex's caching handles performance while ensuring freshness.

Implement a `checkPermission(ctx, hackathonId, requiredPermissions[])` helper that: 1) fetches user's roles for that hackathon, 2) computes union of all permissions across roles, 3) throws `ConvexError` with 403-equivalent code if unauthorized. Wrap all hackathon-scoped mutations/queries with this check.

For the frontend, create a `useHackathonPermissions(hackathonId)` hook using Convex's reactive queries—permissions update instantly when roles change server-side. Components use this hook for conditional rendering (hidden, not disabled). TanStack Router loaders should also verify permissions before rendering protected routes.

Edge cases: handle role removal mid-session (Convex reactivity handles this), multiple browser tabs (reactive sync), and race conditions during role changes (Convex's transactional mutations ensure consistency). For Judges, implement row-level security on submissions table filtering by assignment.

Security considerations: never trust client-side permission checks alone, validate ownership transfer requires current owner's session, log permission denials for audit trail.

**Test Cases:**
[{"description":"Owner can delete hackathon while Admin cannot","given":"A hackathon with User A as Owner and User B as Admin","when":"User A attempts to delete the hackathon, then User B attempts to delete the same hackathon","then":"User A's deletion succeeds and hackathon is removed; User B receives 403 Forbidden with message 'Insufficient permissions: only Owner can delete hackathon'"},{"description":"Judge can only view assigned submissions","given":"A hackathon with 10 submissions where Judge J is assigned to submissions 1-3","when":"Judge J queries the submissions endpoint for this hackathon","then":"Only submissions 1-3 are returned; attempting to access submission 4 directly returns 403 Forbidden"},{"description":"Permission union for user with multiple roles","given":"User has both Curator and Judge roles on hackathon H","when":"User accesses the hackathon dashboard","then":"User can access problem management (Curator permission) AND judging interface (Judge permission); UI shows both navigation sections"},{"description":"Role removal takes effect immediately without re-login","given":"User is logged in with Admin role on hackathon H in two browser tabs","when":"Owner removes User's Admin role while User is actively viewing admin settings","then":"Within 2 seconds, both tabs redirect to unauthorized view; subsequent API calls return 403; no page refresh or re-login required"},{"description":"Admin cannot remove Owner or transfer ownership","given":"Hackathon H with Owner O and Admin A","when":"Admin A attempts to: 1) remove Owner O from roles, 2) transfer ownership to themselves via API","then":"Both operations return 403 Forbidden; Owner O retains ownership; audit log records attempted privilege escalation"}]

#### US-023: Role-Based Navigation and Dashboard
As a user with a hackathon role, I want to see navigation and dashboard elements relevant to my role so that I can quickly access the tools I need.

**Acceptance Criteria:**
- Dashboard shows role-specific quick actions (e.g., Judges see 'Start Judging', Curators see 'Review Submissions')
- Navigation menu adapts to show only accessible sections based on user's role(s)
- Users with multiple roles see a combined navigation with all permitted sections
- Role badge is displayed next to hackathon name indicating user's role(s)
- Switching between hackathons updates navigation based on role in each hackathon
- First-time role holders see a brief onboarding tooltip explaining their responsibilities
- Dashboard widgets prioritize information relevant to user's role

**Technical Notes:**
Implement role-based navigation using a centralized role permissions configuration that maps roles to allowed routes and features. Create a `useHackathonRole` hook that queries Convex for the user's role(s) in the currently selected hackathon, returning permissions and navigation items.

Architecture: Build a `RoleNavigationProvider` context that wraps hackathon pages, computing the merged navigation structure for users with multiple roles. Use TanStack Router's route guards to validate access server-side on Cloudflare Workers, preventing unauthorized route access even if client navigation is bypassed.

For dashboard widgets, implement a widget registry pattern where each widget declares its required roles. The dashboard component filters and prioritizes widgets based on role hierarchy (Organiser > Admin > Curator > Judge > Participant). Store onboarding tooltip dismissal state in Convex user preferences, keyed by role type.

Role badges should use a `RoleBadgeGroup` component that handles multiple roles gracefully (show primary + '+N' for many roles). When switching hackathons via the hackathon selector, invalidate the role query and trigger navigation recalculation.

Dependencies: Requires US-020 (role assignment) for role data. Consider caching role permissions in Clerk session claims for faster initial loads, syncing on role changes via Convex mutations.

Security: Always validate role permissions server-side in Convex queries/mutations. Never trust client-side role state for data access. Implement audit logging for role-based feature access.

**Test Cases:**
[{"description":"Judge sees role-specific quick actions on dashboard","given":"A user is assigned the Judge role for hackathon 'AI Challenge 2024'","when":"The user navigates to the hackathon dashboard","then":"The dashboard displays 'Start Judging' quick action, shows judging queue widget, and displays a Judge role badge next to the hackathon name"},{"description":"User with multiple roles sees combined navigation","given":"A user has both Curator and Judge roles for the current hackathon","when":"The user views the navigation menu","then":"The navigation shows both 'Review Submissions' (Curator) and 'Judging Panel' (Judge) sections, and role badge displays 'Curator, Judge'"},{"description":"Navigation updates when switching hackathons with different roles","given":"A user is a Judge in 'Hackathon A' and a Participant in 'Hackathon B'","when":"The user switches from 'Hackathon A' to 'Hackathon B' using the hackathon selector","then":"Navigation updates to show only Participant-accessible sections, quick actions change to participant-relevant items, and role badge updates to 'Participant'"},{"description":"First-time role holder sees onboarding tooltip","given":"A user has just been assigned the Curator role and has never held this role before","when":"The user loads the hackathon dashboard for the first time after role assignment","then":"An onboarding tooltip appears explaining Curator responsibilities including 'Review and categorize problem submissions', and dismissing the tooltip persists the preference"},{"description":"User without hackathon role sees restricted navigation","given":"A user visits a public hackathon page but has no assigned role in that hackathon","when":"The user views the navigation and dashboard","then":"Navigation shows only public sections (Overview, Problems, Teams), no role badge is displayed, and dashboard shows general hackathon information without role-specific widgets"}]

#### US-024: Audit Trail for Role Changes
As an organiser, I want to view an audit trail of all role-related actions so that I can track who made changes for compliance and debugging purposes.

**Acceptance Criteria:**
- Audit log captures: role assignments, role removals, invitation sends/resends/revocations, ownership transfers
- Each entry includes timestamp, action type, actor (who performed it), target user, and role involved
- Log entries are immutable and cannot be edited or deleted
- Organisers can filter audit log by action type, date range, or user involved
- Audit log is accessible only to Owner and Admins
- Log exports available in CSV format for compliance records
- Pagination handles large audit histories efficiently
- Timestamps display in user's local timezone with UTC available on hover

**Technical Notes:**
Implement audit trail using a dedicated Convex table `roleAuditLogs` with append-only semantics enforced at the mutation level (no update/delete mutations exposed). Schema includes: `hackathonId`, `timestamp` (UTC), `actionType` (enum: ROLE_ASSIGNED, ROLE_REMOVED, INVITATION_SENT, INVITATION_RESENT, INVITATION_REVOKED, OWNERSHIP_TRANSFERRED), `actorId`, `targetUserId`, `role`, and `metadata` (JSON for additional context like previous role). Create a Convex mutation wrapper that all role-related mutations call to ensure consistent logging—never log directly from individual mutations. For immutability, implement at application layer since Convex doesn't have native append-only tables; add a server-side validator that rejects any modification attempts. Query layer should use Convex indexes on `hackathonId + timestamp` and `hackathonId + actionType` for efficient filtering. Implement cursor-based pagination returning 50 entries per page with `startAfter` cursor. For CSV export, create a Convex action that streams results to R2, generates a signed URL, and returns it to the client—avoid loading entire history into memory. Timezone handling is purely frontend: store all timestamps as UTC, use `Intl.DateTimeFormat` with user's locale for display, show UTC on hover via title attribute. Access control enforced via Convex query/mutation guards checking Clerk user's role is Owner or Admin for the hackathon. Consider adding a background job to archive logs older than retention period to cold storage in R2 if audit histories grow large.

**Test Cases:**
[{"description":"Audit log captures role assignment with complete details","given":"An Admin assigns the Judge role to a user in a hackathon","when":"The role assignment mutation completes successfully","then":"An audit log entry is created with actionType ROLE_ASSIGNED, correct actorId, targetUserId, role as Judge, and UTC timestamp"},{"description":"Audit log entries cannot be modified or deleted","given":"An existing audit log entry for a role removal action","when":"Any attempt is made to update or delete the entry via API","then":"The operation is rejected with a 403 Forbidden error and the original entry remains unchanged"},{"description":"Filtering audit log by action type returns correct subset","given":"An audit log with 10 entries: 5 ROLE_ASSIGNED, 3 INVITATION_SENT, 2 OWNERSHIP_TRANSFERRED","when":"An Owner filters the log by actionType INVITATION_SENT","then":"Only the 3 invitation-related entries are returned in descending chronological order"},{"description":"Non-Owner/Admin users cannot access audit log","given":"A user with Judge role attempts to view the hackathon audit log","when":"The audit log query is executed","then":"The query returns a 403 Forbidden error with message indicating insufficient permissions"},{"description":"CSV export generates downloadable file with all filtered entries","given":"An Owner requests CSV export of audit logs filtered to last 30 days with 150 entries matching","when":"The export action completes","then":"A signed R2 URL is returned pointing to a CSV file containing all 150 entries with columns: timestamp, actionType, actor, targetUser, role"}]

### Epic: Problem Management & Q&A

Problem submission by proposers, curator approval workflow for curated mode, hide/unhide functionality, moderated Q&A system where questions are private until proposer answers publicly.

#### US-025: Submit Problem as Proposer
As a Problem Proposer, I want to submit problem statements for a hackathon so that participants can work on solving them during the event.

**Acceptance Criteria:**
- Proposer can create a new problem with title, description, category, and optional attachments
- Problem description supports rich text formatting (markdown)
- Attachments are stored in Cloudflare R2 with appropriate size limits
- Proposer can save problem as draft before final submission
- Submitted problems display a pending status until curator review (in curated mode)
- Proposer receives in-app notification confirming successful submission
- Form displays inline validation errors for required fields
- System creates audit log entry for problem submission

**Technical Notes:**
**Implementation Approach:**

Create a multi-step problem submission flow using TanStack Form for complex form state management with draft persistence. The form component should handle rich text editing via a lightweight markdown editor (consider `@uiw/react-md-editor` or `react-simplemde-editor`) with preview capability.

**File Upload Architecture:**
Implement chunked uploads directly to Cloudflare R2 using presigned URLs generated via a Convex action. Create a `generateUploadUrl` action that returns a signed R2 PUT URL with 15-minute expiry. Enforce size limits (suggest 10MB per file, 50MB total per problem) client-side with server validation. Store file metadata in a `problemAttachments` table linked to problems.

**Data Model:**
Problems table should include: `hackathonId`, `proposerId`, `title`, `description` (markdown), `category`, `status` (enum: draft/pending/approved/rejected), `submittedAt`, `createdAt`, `updatedAt`. Use Convex's optimistic updates for draft saves to provide instant feedback.

**Submission Flow:**
1. Draft save: Upsert problem with status='draft', debounced auto-save every 30s
2. Final submit: Validate all required fields, transition status to 'pending' (if hackathon uses curation) or 'approved'
3. Trigger Convex scheduled function to create audit log entry and send in-app notification

**Security Considerations:**
- Verify proposer has Problem Proposer role for the specific hackathon via Clerk JWT claims
- Sanitize markdown input to prevent XSS (use `DOMPurify` on render)
- Validate file MIME types server-side, not just extensions
- Rate limit submissions to prevent spam (suggest 10 problems/hour/user)

**Test Cases:**
[{"description":"Successfully submit a complete problem with attachments","given":"A user with Problem Proposer role for hackathon H-001 is on the problem submission form","when":"They enter a valid title, markdown description, select category 'AI/ML', upload a 5MB PDF attachment, and click Submit","then":"The problem is created with status 'pending', attachment is stored in R2, audit log entry is created with action 'problem_submitted', and proposer receives in-app notification 'Your problem has been submitted for review'"},{"description":"Save problem as draft with partial data","given":"A Problem Proposer has entered only a title 'Climate Data Challenge' with no other fields completed","when":"They click 'Save Draft' button","then":"The problem is saved with status 'draft', no validation errors are shown, and the user can navigate away and return to continue editing"},{"description":"Reject submission with missing required fields","given":"A Problem Proposer is on the submission form with title field empty but description filled","when":"They click the Submit button","then":"Form displays inline validation error 'Title is required' under the title field, submission is prevented, and no database record is created"},{"description":"Reject oversized file attachment","given":"A Problem Proposer is uploading attachments to their problem","when":"They attempt to upload a 15MB file exceeding the 10MB limit","then":"Upload is rejected with error message 'File exceeds maximum size of 10MB', the file is not uploaded to R2, and previously uploaded valid attachments remain intact"},{"description":"Prevent submission by unauthorized user","given":"A user with only Participant role (not Problem Proposer) for hackathon H-001 attempts to access the problem submission endpoint","when":"They send a POST request to create a problem for H-001","then":"Request is rejected with 403 Forbidden error, no problem record is created, and security event is logged"}]

#### US-026: Curator Approval Workflow for Problems
As a Curator, I want to review and approve or reject submitted problems so that only quality problems are made available to participants in curated hackathons.

**Acceptance Criteria:**
- Curator sees a queue of pending problems requiring review
- Each problem displays full details including title, description, category, and attachments
- Curator can approve a problem, making it visible to participants
- Curator can reject a problem with a required rejection reason
- Rejected problems notify the proposer via email and in-app notification with the rejection reason
- Approved problems notify the proposer via email and in-app notification
- Curator can filter pending problems by category or submission date
- Approval workflow only applies when hackathon is configured for curated mode
- In non-curated mode, problems are automatically visible upon submission
- All approval/rejection actions are logged in the audit trail

**Technical Notes:**
Implement the curator approval workflow using Convex for state management and real-time updates. Create a `problemReviews` table to track review history with fields: problemId, curatorId, action (approved/rejected), reason (nullable), timestamp. Add a `status` field to problems table with enum values: 'pending_review', 'approved', 'rejected', 'auto_approved'.

The review queue should be a Convex query filtering problems by hackathonId and status='pending_review', with optional filters for category and submissionDate. Use Convex indexes on (hackathonId, status) and (hackathonId, category, status) for efficient querying.

Implement approval/rejection as Convex mutations that: 1) Validate curator role via Clerk session, 2) Check hackathon is in curated mode, 3) Update problem status, 4) Create review record, 5) Trigger notifications. Use Convex's transactional guarantees for atomicity.

For notifications, create a reusable notification service that handles both in-app (store in `notifications` table) and email (queue to Cloudflare Workers via Convex HTTP actions). Email templates should include rejection reasons for rejected problems.

The curated mode check should be a hackathon-level setting (`curationEnabled: boolean`). When disabled, problem submission mutation should auto-set status to 'auto_approved'. Audit logging should use the existing audit trail pattern, capturing actor, action, targetId, metadata, and timestamp.

Consider adding optimistic UI updates for the review queue to improve curator UX, and implement proper RBAC checks to ensure only assigned curators can review problems for their hackathons.

**Test Cases:**
[{"description":"Curator successfully approves a pending problem","given":"A curator is assigned to a curated hackathon and there is a problem with status 'pending_review'","when":"The curator clicks approve on the problem","then":"The problem status changes to 'approved', the problem becomes visible to participants, the proposer receives an email notification, the proposer receives an in-app notification, and an audit log entry is created with action 'problem_approved'"},{"description":"Curator rejects a problem with required reason","given":"A curator is reviewing a pending problem in the review queue","when":"The curator clicks reject and provides a rejection reason 'Problem scope is too broad for the hackathon theme'","then":"The problem status changes to 'rejected', the problem remains hidden from participants, the proposer receives an email containing the rejection reason, the proposer receives an in-app notification with the rejection reason, and an audit log entry is created"},{"description":"Curator cannot reject without providing a reason","given":"A curator is attempting to reject a pending problem","when":"The curator clicks reject without entering a rejection reason","then":"The rejection is blocked, a validation error message 'Rejection reason is required' is displayed, and the problem status remains 'pending_review'"},{"description":"Problems auto-approve in non-curated hackathons","given":"A hackathon is configured with curationEnabled set to false","when":"A proposer submits a new problem to the hackathon","then":"The problem status is immediately set to 'auto_approved', the problem is visible to participants without curator review, and no entry appears in the curator review queue"},{"description":"Curator filters pending problems by category and date","given":"A curator has 10 pending problems across categories 'AI', 'Web', and 'Mobile' submitted over the past week","when":"The curator filters by category 'AI' and submission date 'Last 3 days'","then":"Only problems matching both criteria are displayed, the count indicator updates to reflect filtered results, and clearing filters restores the full pending queue"},{"description":"Non-curator user cannot access review queue","given":"A user with 'participant' role attempts to access the problem review queue","when":"The user navigates to the curator review queue URL","then":"Access is denied with a 403 Forbidden response, the user is redirected to an unauthorized page, and an audit log entry is created for the unauthorized access attempt"}]

#### US-027: Hide and Unhide Problems
As a Curator, I want to hide or unhide problems after they have been approved so that I can manage problem visibility without permanently deleting them.

**Acceptance Criteria:**
- Curator can hide any approved/visible problem from participants
- Hidden problems are no longer visible to participants or teams
- Curator can unhide previously hidden problems to restore visibility
- Hidden problems display a clear 'hidden' status indicator to curators
- Proposers are notified when their problem is hidden or unhidden
- Teams currently working on a hidden problem see a notification that the problem is no longer available
- Hidden problems retain all associated Q&A data
- Hide/unhide actions are recorded in the audit log with timestamps
- Curators can view a filtered list of all hidden problems

**Technical Notes:**
Implement problem visibility toggle using a `status` field on the problems table in Convex, extending existing states to include 'hidden'. Create a Convex mutation `toggleProblemVisibility` that validates curator role via Clerk session, updates the problem status, and triggers notification side effects.

**Architecture Considerations:**
- Add `hiddenAt` and `hiddenBy` timestamp fields for audit trail alongside the status change
- Create a Convex action for batch notifications: notify the problem proposer and any teams with this problem as their active selection
- Use Convex's real-time subscriptions so teams viewing a hidden problem see immediate UI updates

**Query Modifications:**
- Participant-facing problem queries must filter out `status: 'hidden'` problems
- Curator queries should include all statuses with visual differentiation
- Add a dedicated `listHiddenProblems` query with pagination for the curator filtered view

**Notification Strategy:**
- Create notification records in Convex for in-app display
- Queue email notifications via Cloudflare Workers for proposers and affected team leads
- Teams should see a dismissible banner on their dashboard if their selected problem becomes hidden

**Security:**
- Validate curator role and hackathon association in mutation
- Ensure hidden problems return 404 for unauthorized users attempting direct access
- Audit log entries should be immutable, stored in separate collection

**Edge Cases:**
- Handle race condition where team submits solution while problem is being hidden
- Preserve Q&A data by soft-delete pattern (status change, not deletion)

**Test Cases:**
[{"description":"Curator successfully hides an approved problem","given":"A curator is authenticated and an approved problem exists in their hackathon","when":"The curator clicks 'Hide Problem' and confirms the action","then":"The problem status changes to 'hidden', hiddenAt timestamp is recorded, audit log entry is created, and the proposer receives a notification"},{"description":"Hidden problem is not visible to participants","given":"A problem has been hidden by a curator and a participant is browsing available problems","when":"The participant views the problem list or attempts to access the hidden problem directly","then":"The hidden problem does not appear in the list and direct URL access returns a 'problem not found' message"},{"description":"Team is notified when their active problem is hidden","given":"A team has selected problem X as their working problem and the problem is currently visible","when":"A curator hides problem X","then":"All team members receive an in-app notification that their problem is no longer available, and the team dashboard displays a warning banner"},{"description":"Curator unhides a previously hidden problem","given":"A curator is viewing the hidden problems list and a hidden problem exists","when":"The curator clicks 'Unhide Problem' on the hidden problem","then":"The problem status returns to 'approved', it becomes visible to participants again, the proposer is notified of restoration, and an audit log entry records the unhide action"},{"description":"Q&A data is preserved when problem is hidden and unhidden","given":"A problem has 5 Q&A threads with responses and is subsequently hidden","when":"The curator unhides the problem and participants view it","then":"All 5 Q&A threads and their responses are intact and visible to participants"}]

#### US-028: Edit and Update Submitted Problems
As a Problem Proposer, I want to edit my submitted problems so that I can correct errors or add clarifications before and during the hackathon.

**Acceptance Criteria:**
- Proposer can edit title, description, category, and attachments of their own problems
- Edits to approved problems in curated mode trigger re-review by curator
- Edits to pending problems do not restart the review process
- Previous versions of problem content are preserved for audit purposes
- Participants are notified of significant updates to problems they are following
- Edit history is visible to curators and organisers
- Proposer cannot edit problems after hackathon enters judging phase
- Toast notification confirms successful save of edits

**Technical Notes:**
**Implementation Approach:**

Build a versioned problem editing system using Convex's transactional capabilities. Create a `problemVersions` table to store complete snapshots of problem state on each edit, enabling audit trails and rollback capabilities.

**Architecture:**

1. **Version Control Layer:** On each edit, insert current problem state into `problemVersions` before applying changes. Store version number, timestamp, editor ID, and change summary. Use Convex mutations to ensure atomicity.

2. **Status Management:** Implement state machine logic: if problem status is 'approved' and hackathon uses curation, transition to 'pending_re_review' and notify assigned curator. Problems in 'pending' status retain that status on edit.

3. **Phase Gating:** Query hackathon phase from parent record; reject edits with clear error if phase >= 'judging'. Implement as Convex validator middleware.

4. **Attachment Handling:** For R2 attachments, implement soft-delete pattern—mark old attachments as superseded rather than deleting, preserving audit trail. New uploads go through existing R2 upload flow.

5. **Notification System:** Track problem followers in `problemFollows` table. On significant edits (title, description, category changes), queue notifications via Convex scheduled functions. Define 'significant' vs 'minor' edit classification.

6. **Edit History UI:** Create `/problems/:id/history` route showing diff view between versions. Use `diff` library for text comparison. Restrict access to curators/organisers via Clerk role checks.

**Security:** Validate ownership via Clerk user ID match. Sanitize markdown input. Rate-limit edit operations to prevent abuse.

**Test Cases:**
[{"description":"Proposer successfully edits their pending problem","given":"A Problem Proposer has a problem in 'pending' status and the hackathon is in 'active' phase","when":"The proposer updates the title, description, and adds a new attachment, then clicks save","then":"The problem is updated with new content, status remains 'pending', a version snapshot is created in problemVersions table, and a success toast notification appears"},{"description":"Editing approved problem triggers re-review in curated hackathon","given":"A Problem Proposer has an 'approved' problem in a hackathon with curation enabled","when":"The proposer edits the problem description and saves","then":"The problem status changes to 'pending_re_review', the assigned curator receives a notification, a version snapshot is preserved, and the proposer sees a toast indicating the problem will be re-reviewed"},{"description":"Edit blocked during judging phase","given":"A Problem Proposer has a problem and the hackathon has entered 'judging' phase","when":"The proposer attempts to access the edit form or submit edits","then":"The edit button is disabled or hidden, API calls return a 403 error with message 'Problems cannot be edited during judging phase', and no changes are persisted"},{"description":"Followers notified of significant problem updates","given":"A problem has 5 participants following it and the hackathon is in 'active' phase","when":"The Problem Proposer changes the problem category from 'AI/ML' to 'Web Development'","then":"All 5 followers receive in-app notifications about the category change, the notification includes the problem title and nature of the change, and a version snapshot captures the previous category"},{"description":"Unauthorized user cannot edit another proposer's problem","given":"User A submitted a problem and User B is also a Problem Proposer in the same hackathon","when":"User B attempts to edit User A's problem via direct API call or URL manipulation","then":"The API returns a 403 Forbidden error, no changes are made to the problem, and the attempt is logged for security audit"}]

#### US-029: Submit Private Question on Problem
As a Participant, I want to submit questions about a problem privately so that I can get clarifications without revealing my thought process to other teams.

**Acceptance Criteria:**
- Participant can submit a question on any visible problem
- Questions are only visible to the proposer and the submitting participant initially
- Participant can view all their own submitted questions and their status
- Questions display submission timestamp and current status (pending/answered)
- Participant receives notification when their question is answered
- Questions have a character limit of 1000 characters
- Inline validation prevents empty question submission
- Rate limiting prevents spam (max 10 questions per problem per participant per hour)

**Technical Notes:**
Implement private Q&A using Convex with a `problemQuestions` table containing fields: `id`, `problemId`, `participantId`, `questionText`, `status` (pending/answered), `createdAt`, `answeredAt`, and `answer`. Create a compound index on `(problemId, participantId)` for efficient querying and rate limit checks.

For the submission flow, build a React component with TanStack Form for validation. Implement client-side validation for empty checks and 1000-character limit with real-time character counter. Use Convex mutations with server-side validation to prevent bypassing.

Rate limiting should be enforced in the Convex mutation by querying questions from the same participant on the same problem within the last hour using `createdAt` filtering. Return a descriptive error if limit exceeded.

Visibility rules are critical: Convex queries must filter by `participantId` matching the authenticated user OR by proposer role on the linked problem. Use Clerk's `userId` from the Convex auth context for secure filtering.

Notifications leverage Convex's reactive subscriptions for in-app alerts. When a question's status changes to 'answered', trigger a notification insert to the participant's notification queue. Email notifications can be handled via Convex scheduled functions calling an email service.

Consider adding optimistic updates for better UX on submission. Edge cases include handling deleted problems (soft delete questions or show archived state) and ensuring proposers who are also participants see appropriate separation.

**Test Cases:**
[{"description":"Successfully submit a private question on a visible problem","given":"A participant is authenticated and viewing a problem they have access to","when":"They enter a valid question (between 1-1000 characters) and click submit","then":"The question is saved with status 'pending', appears in their question list with timestamp, and a success message is displayed"},{"description":"Prevent submission of empty question","given":"A participant is on the question submission form for a problem","when":"They attempt to submit with an empty question field or only whitespace","then":"Inline validation error is displayed, submit button remains disabled, and no API call is made"},{"description":"Enforce character limit on question text","given":"A participant is typing a question on the submission form","when":"They enter text exceeding 1000 characters","then":"Characters beyond 1000 are prevented or truncated, character counter shows limit reached, and validation error appears if they attempt to submit"},{"description":"Rate limit prevents spam submissions","given":"A participant has already submitted 10 questions on a specific problem within the last hour","when":"They attempt to submit an 11th question on the same problem","then":"Submission is rejected with a clear error message indicating the rate limit and when they can submit again"},{"description":"Participant receives notification when question is answered","given":"A participant has a pending question on a problem","when":"The problem proposer submits an answer to that question","then":"The participant receives an in-app notification, and the question status updates to 'answered' with the response visible"}]

#### US-030: Answer Questions and Publish to FAQ
As a Problem Proposer, I want to answer participant questions and have my answers published publicly so that all teams benefit from the clarification.

**Acceptance Criteria:**
- Proposer sees a list of pending questions for each of their problems
- Proposer can write and submit an answer to any pending question
- Upon answering, the Q&A pair becomes publicly visible to all participants
- Original question text is shown alongside the proposer's answer
- Proposer can edit their answer after publishing (with edit indicator shown)
- Proposer can choose to answer privately without publishing (visible only to asker)
- Proposer can decline to answer with a standard 'cannot answer' response
- All participants can view the public FAQ section for each problem
- Question asker's identity remains anonymous in the public FAQ
- Email and in-app notification sent to asker when question is answered

**Technical Notes:**
Implement a Q&A management system using Convex for real-time data synchronization. Create a `question_answers` table with fields: questionId, answerId, answerText, answerType (public/private/declined), answeredAt, editedAt, and editCount. The answerType enum controls visibility logic throughout the application.

For the proposer dashboard, create a Convex query `getProposerPendingQuestions` that aggregates unanswered questions across all problems owned by the authenticated user. Use Convex's real-time subscriptions so the pending count updates live in the UI.

Implement three distinct mutation endpoints: `publishAnswer` (public FAQ), `sendPrivateAnswer` (direct to asker), and `declineQuestion` (canned response). Each mutation should trigger the notification system via Convex scheduled functions to handle both email (via Clerk's email service or a dedicated provider like Resend) and in-app notifications stored in a `notifications` table.

For public FAQ rendering, create a `getPublicFAQ` query that returns only public Q&A pairs with asker identity stripped. Include pagination for problems with many questions. The edit indicator should show 'Edited' with relative timestamp but not expose edit history publicly.

Security considerations: Verify proposer ownership of the problem before allowing answer operations. Rate-limit answer submissions to prevent spam. Sanitize answer content for XSS before storage. Ensure private answers are properly scoped in all queries using Convex's argument validation and auth context.

**Test Cases:**
[{"description":"Proposer publishes answer to pending question","given":"A Problem Proposer is authenticated and has a problem with one pending question from a participant","when":"The proposer writes an answer and selects 'Publish to FAQ'","then":"The Q&A pair becomes visible in the public FAQ section, the question status changes to 'answered', the asker receives both email and in-app notification, and the asker's identity is not displayed in the public FAQ"},{"description":"Proposer edits a previously published answer","given":"A Problem Proposer has a published Q&A pair in the FAQ for their problem","when":"The proposer modifies the answer text and saves the changes","then":"The updated answer is displayed in the FAQ, an 'Edited' indicator appears next to the answer, the original question text remains unchanged, and no duplicate notification is sent to the asker"},{"description":"Proposer sends private answer visible only to asker","given":"A Problem Proposer is viewing a pending question that contains team-specific context","when":"The proposer writes an answer and selects 'Answer Privately'","then":"The answer is visible only to the original question asker, the question does not appear in the public FAQ, other participants cannot see this Q&A pair, and the asker receives a notification indicating a private response"},{"description":"Proposer declines to answer with standard response","given":"A Problem Proposer receives a question that cannot be answered due to competition fairness","when":"The proposer clicks 'Decline to Answer'","then":"A standard 'This question cannot be answered' response is recorded, the asker is notified of the decline, the question is removed from the pending queue, and the declined Q&A does not appear in public FAQ"},{"description":"Participant views public FAQ with multiple answered questions","given":"A problem has five published Q&A pairs from different anonymous participants","when":"Any authenticated participant navigates to the problem's FAQ section","then":"All five Q&A pairs are displayed with original questions and proposer answers, no asker identities are revealed, edited answers show the edit indicator, and the FAQ updates in real-time if new answers are published"}]

#### US-031: Browse and Search Problem FAQ
As a Participant, I want to browse and search the FAQ for each problem so that I can find existing answers before submitting duplicate questions.

**Acceptance Criteria:**
- Each problem displays a publicly visible FAQ section with all answered questions
- FAQ entries show the question, answer, and answer timestamp
- Participants can search FAQ entries by keyword
- FAQ entries are sorted by most recent first by default
- Participants can sort FAQ by relevance when searching
- FAQ clearly indicates total number of answered questions
- Empty FAQ state shows appropriate message encouraging questions
- FAQ updates in real-time when new answers are published

**Technical Notes:**
Implement FAQ browsing using Convex's real-time subscriptions for live updates when new answers are published. Create a `problemFaqs` query that filters Q&A entries where `status === 'answered'` and `isPublic === true`. For search functionality, implement client-side filtering for small datasets (<100 entries) using simple keyword matching against question/answer text. For larger datasets, leverage Convex's search indexes with `searchIndex('search_faq', { searchField: 'searchableText' })` where searchableText is a concatenated field of question + answer.

Architecture: Create a `<ProblemFAQ>` component that accepts problemId and uses `useQuery` for real-time subscription. Implement sorting with a toggle between 'recent' (default, by answeredAt desc) and 'relevance' (when search active, scored by match density). The relevance scoring can use a simple term frequency approach client-side.

Dependencies: Requires US-026 (Q&A submission) and US-029 (answer publishing) to populate FAQ data. Share the same Q&A data model but filter to answered entries only.

Edge cases: Handle HTML/markdown in answers safely using a sanitization library like DOMPurify. Consider debouncing search input (300ms) to prevent excessive re-renders. Cache search results briefly to improve perceived performance.

Security: Ensure query only returns public, answered questions - enforce this in the Convex query function, not just client-side filtering.

**Test Cases:**
[{"description":"Display FAQ entries for a problem with answered questions","given":"A problem exists with 5 answered and published Q&A entries","when":"A participant navigates to the problem's FAQ section","then":"All 5 FAQ entries are displayed showing question, answer, and answer timestamp, sorted by most recent first"},{"description":"Search FAQ entries by keyword returns matching results","given":"A problem FAQ contains entries about 'team size', 'submission format', and 'judging criteria'","when":"A participant searches for 'submission'","then":"Only the 'submission format' entry is displayed and sorting changes to relevance-based"},{"description":"Display empty state when no FAQ entries exist","given":"A problem exists with no answered questions","when":"A participant views the FAQ section","then":"An empty state message is shown saying 'No questions answered yet. Be the first to ask!' with a link to submit a question"},{"description":"Real-time update when new answer is published","given":"A participant is viewing a problem FAQ showing 3 entries","when":"A curator publishes an answer to a previously pending question","then":"The FAQ automatically updates to show 4 entries and the count updates without page refresh"},{"description":"Search with no matching results shows appropriate feedback","given":"A problem FAQ contains entries about general topics","when":"A participant searches for 'xyznonexistent123'","then":"A message displays 'No FAQ entries match your search' with option to clear search or submit a new question"}]

#### US-032: Manage Q&A as Curator
As a Curator, I want to moderate the Q&A system so that I can remove inappropriate content and ensure the FAQ remains helpful for all participants.

**Acceptance Criteria:**
- Curator can view all questions (pending and answered) across all problems
- Curator can hide inappropriate questions from the public FAQ
- Curator can hide inappropriate answers and notify proposer to revise
- Curator can delete questions that violate guidelines with notification to asker
- Curator actions on Q&A are logged in the audit trail
- Curator can filter Q&A by problem, status, or date range
- Hidden Q&A items display as 'removed by moderator' in the public FAQ
- Curator can reinstate previously hidden Q&A items

**Technical Notes:**
Implement Q&A moderation as a Convex mutation layer with role-based access control checking Clerk's user metadata for Curator role. Create a unified Q&A dashboard view using TanStack Query to fetch all questions/answers with server-side filtering via Convex indexes on `hackathonId + status + problemId + createdAt` for efficient multi-criteria queries.

Design a `moderationActions` table to track all curator interventions: `{id, targetType: 'question'|'answer', targetId, action: 'hide'|'delete'|'reinstate', reason, curatorId, timestamp, notificationSent}`. This satisfies audit requirements and enables reinstatement by preserving original content.

For hiding vs deleting: hidden items retain data but set `visibility: 'hidden'` with `moderatorNote` field; deleted items soft-delete with `deletedAt` timestamp. Public FAQ queries filter `WHERE visibility = 'public' AND deletedAt IS NULL`, showing placeholder text for hidden items via a computed field.

Notification system should leverage existing in-app notification infrastructure (likely from US-017 or similar). Create reusable `sendModerationNotification` function that handles both email (via Cloudflare Workers + email service) and in-app notifications with templated messages for each action type.

Security considerations: Validate curator has access to specific hackathon, rate-limit moderation actions to prevent abuse, sanitize all user-provided reasons/notes. Consider implementing a two-curator approval flow for deletions in future iteration.

**Test Cases:**
[{"description":"Curator successfully hides an inappropriate answer with proposer notification","given":"A Curator is logged in and viewing Q&A for a hackathon with an answered question containing inappropriate content","when":"The Curator selects the answer, chooses 'Hide' action, and provides a revision request reason","then":"The answer visibility changes to 'hidden', the proposer receives an in-app and email notification with the revision request, the action is recorded in the audit trail, and the public FAQ shows 'removed by moderator' in place of the answer"},{"description":"Curator filters Q&A by problem and pending status","given":"A Curator is viewing the Q&A dashboard for a hackathon with 50 questions across 10 problems in various states","when":"The Curator applies filters for Problem 'AI Challenge' and Status 'pending'","then":"Only pending questions for the 'AI Challenge' problem are displayed, filter state persists in URL for shareability, and result count updates to reflect filtered items"},{"description":"Curator reinstates a previously hidden question","given":"A Curator is viewing hidden Q&A items and identifies a question that was hidden in error","when":"The Curator selects the hidden question and chooses 'Reinstate' action","then":"The question visibility changes to 'public', it reappears in the public FAQ with original content, a reinstatement entry is added to the audit trail, and the original asker receives a notification that their question is now visible"},{"description":"Curator attempts to delete question without required permissions","given":"A user with Participant role (not Curator) attempts to access the moderation API endpoint directly","when":"The user sends a delete request for a question ID via API","then":"The request is rejected with 403 Forbidden, no changes are made to the question, and the attempt is logged as a security event"},{"description":"Curator deletes guideline-violating question with notification to asker","given":"A Curator identifies a question that clearly violates hackathon guidelines and needs removal","when":"The Curator selects 'Delete' action, confirms the deletion, and selects the relevant guideline violation category","then":"The question is soft-deleted and no longer appears in any public view, the asker receives a notification explaining the violation and removal, the audit trail records the deletion with violation category, and associated answers are also hidden"}]

### Epic: Team & Participant Management

Team creation, open join requests, invite codes, free movement between teams until submission cutoff, participant dashboard showing event status, team info, deadlines and action items.

#### US-033: Create a New Team
As a hackathon participant, I want to create a new team so that I can collaborate with others on solving a problem.

**Acceptance Criteria:**
- Participant can create a team with a required name (max 100 characters) and optional description
- System validates team name uniqueness within the hackathon
- Creator automatically becomes the team lead with management privileges
- Team is associated with the current hackathon context
- System generates a unique private invite code for the team upon creation
- Inline validation errors display for invalid/duplicate team names
- Toast notification confirms successful team creation
- Audit log records team creation with timestamp, creator ID, and hackathon ID
- Team creation is blocked if submission cutoff has passed

**Technical Notes:**
**Implementation Approach:**

Create a Convex mutation `teams.create` that handles team creation with transactional integrity. The mutation should: (1) verify the authenticated user via Clerk session, (2) check hackathon submission cutoff hasn't passed by querying the hackathon's `submissionDeadline` field, (3) validate team name length and uniqueness using a compound index on `(hackathonId, normalizedName)` where `normalizedName` is lowercase/trimmed, (4) generate a cryptographically secure invite code using `crypto.randomUUID()` or a shorter nanoid-style code for usability.

**Schema Design:**
Teams table: `{ hackathonId, name, normalizedName, description?, leaderId, inviteCode, createdAt }`. Create a `teamMembers` junction table: `{ teamId, userId, role: 'lead' | 'member', joinedAt }` for flexible membership management.

**Frontend Implementation:**
Use TanStack Form for the creation form with real-time validation. Implement debounced uniqueness checking via a Convex query `teams.checkNameAvailable` to provide inline feedback before submission. Display toast notifications using a lightweight library like Sonner.

**Security Considerations:**
- Verify participant is registered for the hackathon before allowing team creation
- Prevent users from creating multiple teams in the same hackathon
- Rate limit team creation to prevent abuse
- Sanitize team name/description to prevent XSS

**Audit Logging:**
Use a separate `auditLogs` table with immutable inserts capturing `{ action: 'TEAM_CREATED', entityType: 'team', entityId, actorId, hackathonId, timestamp, metadata }`.

**Test Cases:**
[{"description":"Successfully create a team with valid name and description","given":"A registered participant is logged into an active hackathon where submission cutoff has not passed and they are not already on a team","when":"The participant submits a team creation form with name 'Innovation Squad' (25 characters) and description 'Building amazing solutions'","then":"The team is created with the participant as team lead, a unique invite code is generated, a success toast notification appears, an audit log entry is recorded with timestamp and creator ID, and the participant is redirected to the team management page"},{"description":"Reject team creation with duplicate name within hackathon","given":"A participant is in a hackathon where a team named 'Alpha Team' already exists","when":"The participant attempts to create a team with the name 'Alpha Team' or 'alpha team' (case-insensitive match)","then":"An inline validation error displays 'A team with this name already exists in this hackathon' and the form submission is blocked"},{"description":"Reject team creation after submission cutoff","given":"A participant is in a hackathon where the submission cutoff datetime has passed","when":"The participant attempts to access the team creation form or submit a new team","then":"The system displays an error message 'Team creation is no longer available - submission deadline has passed' and the creation action is disabled"},{"description":"Reject team name exceeding character limit","given":"A participant is creating a team in an active hackathon","when":"The participant enters a team name with 101 characters","then":"An inline validation error displays 'Team name must be 100 characters or less' and the submit button remains disabled"},{"description":"Prevent participant from creating multiple teams in same hackathon","given":"A participant who is already a member or lead of an existing team in the current hackathon","when":"The participant attempts to create a new team","then":"The system displays an error 'You are already part of a team in this hackathon' and blocks team creation"}]

#### US-034: Browse and Request to Join Open Teams
As a hackathon participant without a team, I want to browse available teams and request to join one so that I can find collaborators with similar interests.

**Acceptance Criteria:**
- Participant can view a list of teams in the hackathon that allow open join requests
- Team list displays team name, description, current member count, and problem focus (if selected)
- Participant can submit a join request with an optional message to the team lead
- System prevents duplicate pending requests to the same team
- Participant can cancel their pending request before it's reviewed
- Join request functionality is disabled after submission cutoff
- Toast notification confirms request submission
- Audit log records join request with timestamp and relevant IDs

**Technical Notes:**
**Implementation Approach:**

Create a team browsing interface with filtering and join request workflow. Use Convex queries with compound indexes on `teams` table filtering by `hackathonId`, `allowsJoinRequests: true`, and excluding teams the participant already belongs to or has pending requests with.

**Data Model Extensions:**
- `joinRequests` table: `id`, `teamId`, `requesterId`, `hackathonId`, `message`, `status` (pending/accepted/rejected/cancelled), `createdAt`, `updatedAt`
- Add index on `(hackathonId, requesterId, status)` for duplicate detection
- Add index on `(teamId, status)` for team lead's pending request view

**Key Components:**
- `TeamBrowserCard`: Displays team info with member avatars, problem badge, and "Request to Join" button
- `JoinRequestModal`: Optional message input (max 500 chars) with submission
- `PendingRequestsBanner`: Shows user's active requests with cancel option

**Business Logic (Convex mutations):**
- `submitJoinRequest`: Validate no existing pending request (unique constraint), check submission cutoff against `hackathon.submissionDeadline`, verify user not already in a team for this hackathon
- `cancelJoinRequest`: Only requester can cancel, only pending status requests

**Security Considerations:**
- Rate limit join requests (max 5 pending per hackathon per user)
- Validate participant role and hackathon registration before allowing requests
- Sanitize message content for XSS

**Audit Integration:**
- Log `JOIN_REQUEST_SUBMITTED`, `JOIN_REQUEST_CANCELLED` events with `teamId`, `requesterId`, `hackathonId`

**Test Cases:**
[{"description":"Successfully submit join request to open team","given":"A registered participant without a team, and an open team 'AI Innovators' with 3/5 members in active hackathon","when":"Participant views team list, clicks 'Request to Join' on AI Innovators, enters message 'Experienced in ML', and submits","then":"Join request is created with pending status, toast shows 'Request sent to AI Innovators', request appears in participant's pending list, audit log entry created with JOIN_REQUEST_SUBMITTED event"},{"description":"Prevent duplicate pending requests to same team","given":"Participant has an existing pending join request to team 'DataCrunchers'","when":"Participant attempts to submit another join request to 'DataCrunchers'","then":"Submit button is disabled or hidden for that team, if bypassed via API returns error 'You already have a pending request to this team'"},{"description":"Cancel pending join request","given":"Participant has a pending join request to team 'CloudBuilders' submitted 2 hours ago","when":"Participant clicks 'Cancel Request' on their pending request and confirms","then":"Request status changes to cancelled, request removed from pending list, team no longer shows 'Request Pending' state, audit log entry created with JOIN_REQUEST_CANCELLED event"},{"description":"Block join requests after submission cutoff","given":"Hackathon submission deadline was 1 hour ago, participant has no team","when":"Participant navigates to team browser","then":"Team list displays with message 'Team formation period has ended', all 'Request to Join' buttons are disabled, attempting API call returns error 'Submission period has closed'"},{"description":"Filter teams correctly for eligible participant","given":"Hackathon has 5 teams: 2 with open join requests enabled, 2 closed teams, 1 team participant already belongs to","when":"Participant opens team browser for this hackathon","then":"Only 2 open teams are displayed, participant's current team and closed teams are not shown in browseable list"}]

#### US-035: Manage Team Join Requests as Team Lead
As a team lead, I want to review and respond to join requests so that I can control who joins my team.

**Acceptance Criteria:**
- Team lead sees a list of pending join requests with requester name, profile info, and optional message
- Team lead can approve or reject each request individually
- Approved requesters are immediately added to the team roster
- Rejected requesters receive in-app notification of the decision
- Approved requesters receive in-app and email notification (based on preferences)
- Team lead can view history of past decisions (approved/rejected)
- Request management is disabled after submission cutoff
- Inline error displays if approving would exceed any team size limits
- Audit log records each approval/rejection with timestamp

**Technical Notes:**
Implement join request management as a Convex mutation-driven workflow with real-time reactivity. Create a `teamJoinRequests` table with fields: `teamId`, `requesterId`, `message`, `status` (pending/approved/rejected), `decidedAt`, `decidedBy`. Index on `[teamId, status]` for efficient pending request queries.

The team lead dashboard should use a Convex query subscription to reactively display pending requests, showing requester profile data joined from the users table. Implement `approveJoinRequest` and `rejectJoinRequest` mutations that validate: (1) caller is team lead via Clerk session, (2) hackathon submission cutoff hasn't passed, (3) for approvals, team size limit won't be exceeded.

On approval, the mutation should atomically: update request status, add user to `teamMembers` table, and create notification records. Use Convex's transactional guarantees to prevent race conditions when multiple requests are processed simultaneously near capacity limits.

Notifications should be handled via a Convex action that checks user preferences and conditionally triggers email via Cloudflare Workers queue. Create an `auditLog` table entry for each decision with `action`, `targetUserId`, `teamId`, `timestamp`, and `actorId`.

For the decision history view, query requests with non-pending status, sorted by `decidedAt` descending. Consider pagination for teams with extensive history. Edge case: handle scenario where requester withdraws request between page load and decision action.

**Test Cases:**
[{"description":"Team lead successfully approves a pending join request","given":"A team lead is authenticated and has a pending join request from a user, and the team is under capacity, and submission cutoff has not passed","when":"The team lead clicks approve on the join request","then":"The request status changes to approved, the requester is added to the team roster, the requester receives in-app notification, email is sent based on requester preferences, and an audit log entry is created with timestamp"},{"description":"Team lead rejects a join request with notification sent","given":"A team lead is viewing pending join requests with at least one request present","when":"The team lead clicks reject on a specific join request","then":"The request status changes to rejected, the requester receives an in-app notification of rejection, the requester is not added to the team, and an audit log entry records the rejection"},{"description":"Approval blocked when team size limit would be exceeded","given":"A team has 4 members and the hackathon maximum team size is 4, and there is a pending join request","when":"The team lead attempts to approve the join request","then":"An inline error message displays indicating team size limit would be exceeded, the request remains in pending status, and no team membership changes occur"},{"description":"Request management disabled after submission cutoff","given":"A team lead has pending join requests and the hackathon submission cutoff datetime has passed","when":"The team lead views the join request management interface","then":"The approve and reject buttons are disabled, a message indicates that request management is closed, and pending requests are displayed as read-only"},{"description":"Team lead views history of past approved and rejected decisions","given":"A team lead has previously approved 2 requests and rejected 1 request for their team","when":"The team lead navigates to the decision history section","then":"All 3 past decisions are displayed with requester names, decision type (approved/rejected), and timestamps, sorted by most recent first"}]

#### US-036: Join Team via Private Invite Code
As a hackathon participant, I want to join a team using a private invite code so that I can quickly join a team I've been personally invited to.

**Acceptance Criteria:**
- Participant can enter an invite code on the team join page
- Valid code immediately adds participant to the team without approval
- Invalid or expired codes display inline error message
- Codes from other hackathons are rejected with clear error
- Participant is redirected to their new team dashboard upon success
- Toast notification confirms successful team join
- Join via code is blocked after submission cutoff
- Audit log records code-based join with timestamp and method

**Technical Notes:**
Implement invite code redemption as a Convex mutation `teams:joinViaInviteCode` that validates the code, checks hackathon context, and atomically adds the member. The invite code should be looked up using a Convex index on `teamInviteCodes.code` for O(1) retrieval. Validation must verify: (1) code exists and hasn't expired via `expiresAt` timestamp, (2) code's team belongs to a hackathon where the user is a registered participant, (3) hackathon hasn't passed submission cutoff using `hackathon.submissionDeadline`, (4) team hasn't reached capacity per hackathon rules, (5) user isn't already on another team in this hackathon. Use Convex's transactional guarantees to prevent race conditions when multiple users redeem simultaneously—check team member count within the mutation. The join page should be a TanStack Start route `/hackathons/[hackathonId]/teams/join` with a simple form accepting the code. On successful mutation, invalidate relevant queries and redirect to `/hackathons/[hackathonId]/teams/[teamId]` using TanStack Router's `navigate`. Display errors inline using form state, distinguishing between 'invalid code', 'expired code', 'wrong hackathon', and 'submissions closed' with user-friendly messages. Create an audit log entry via a separate mutation or within the join mutation, recording `userId`, `teamId`, `inviteCodeId`, `timestamp`, and `joinMethod: 'invite_code'`. Consider rate-limiting code attempts per user session to prevent brute-force guessing—Convex's built-in rate limiting or a simple counter with TTL works well.

**Test Cases:**
[{"description":"Successfully join team with valid invite code","given":"A registered participant in hackathon H1 with no current team, and team T1 has a valid unexpired invite code 'ABC123'","when":"Participant enters code 'ABC123' on the team join page and submits","then":"Participant is added to team T1 membership, redirected to team T1 dashboard, toast notification displays 'Successfully joined team!', and audit log contains entry with joinMethod 'invite_code'"},{"description":"Reject expired invite code with clear error","given":"A valid participant and team T1 has invite code 'EXPIRED1' with expiresAt set to yesterday","when":"Participant enters code 'EXPIRED1' and submits","then":"Inline error displays 'This invite code has expired. Please request a new code from the team captain.', participant remains without a team, and no audit log entry is created"},{"description":"Reject invite code from different hackathon","given":"Participant is registered for hackathon H1, and code 'WRONGHACK' belongs to team in hackathon H2","when":"Participant enters code 'WRONGHACK' on H1's join page and submits","then":"Inline error displays 'This invite code is for a different hackathon.', participant is not added to any team"},{"description":"Block join after submission cutoff deadline","given":"Hackathon H1 has submissionDeadline of 2 hours ago, participant has valid code 'LATEJOIN' for team in H1","when":"Participant enters code 'LATEJOIN' and submits","then":"Inline error displays 'Team formation has closed for this hackathon. The submission deadline has passed.', join is prevented"},{"description":"Reject completely invalid or non-existent code","given":"A registered participant and no invite code 'FAKECODE' exists in the system","when":"Participant enters code 'FAKECODE' and submits","then":"Inline error displays 'Invalid invite code. Please check the code and try again.', form remains on join page with code field preserved for correction"}]

#### US-037: Regenerate Team Invite Code
As a team lead, I want to regenerate my team's invite code so that I can invalidate old codes if they were shared inappropriately.

**Acceptance Criteria:**
- Team lead can regenerate invite code from team settings
- Old invite code is immediately invalidated
- New unique code is generated and displayed
- Confirmation dialog warns that old code will stop working
- Toast notification confirms code regeneration
- Code regeneration is disabled after submission cutoff
- Audit log records code regeneration with timestamp

**Technical Notes:**
## Implementation Approach

Implement invite code regeneration as a Convex mutation with atomic invalidation and generation. The code regeneration must be a single atomic operation to prevent race conditions where both old and new codes might temporarily work.

### Architecture Considerations

**Code Generation Strategy:**
- Use `crypto.randomUUID()` or nanoid for generating unique codes
- Consider shorter, human-friendly codes (e.g., 8 alphanumeric chars) for easier sharing
- Store generation timestamp for audit purposes

**Convex Mutation Design:**
```typescript
// mutations/teams.ts
export const regenerateInviteCode = mutation({
  args: { teamId: v.id('teams') },
  handler: async (ctx, { teamId }) => {
    // 1. Verify team lead status via Clerk identity
    // 2. Check submission cutoff hasn't passed
    // 3. Atomically update inviteCode + audit log
  }
})
```

**Cutoff Enforcement:**
- Query hackathon's submission deadline from parent event
- Compare against `Date.now()` server-side (never trust client time)
- Return specific error code for UI to display appropriate message

**Audit Log Schema:**
- Store in separate `auditLogs` table with teamId index
- Record: action type, userId, previousCodeHash (not full code), timestamp
- Hash old codes before storing for security

### Security Considerations
- Never expose old invite codes in responses or logs
- Rate limit regeneration (suggest 5 per hour) to prevent abuse
- Validate Clerk session and team membership server-side

### Frontend Integration
- Use TanStack Query mutation with optimistic updates disabled (wait for confirmation)
- Confirmation dialog via headless UI component
- Toast via sonner or similar notification library

**Test Cases:**
[{"description":"Team lead successfully regenerates invite code","given":"User is authenticated as team lead and submission cutoff has not passed","when":"User clicks regenerate code and confirms in the dialog","then":"Old invite code is invalidated, new unique code is generated and displayed, toast confirms success, and audit log entry is created with timestamp"},{"description":"Non-team-lead member cannot regenerate invite code","given":"User is authenticated as a regular team member (not team lead)","when":"User attempts to access the regenerate code function","then":"Action is rejected with 403 forbidden error and regenerate button is not visible in team settings"},{"description":"Code regeneration blocked after submission cutoff","given":"User is team lead but hackathon submission deadline has passed","when":"User attempts to regenerate the invite code","then":"Action is rejected with appropriate error message explaining cutoff has passed and UI shows regenerate button as disabled with tooltip"},{"description":"Old invite code immediately stops working after regeneration","given":"Team lead has regenerated the invite code and another user has the old code","when":"User attempts to join team using the old invite code","then":"Join attempt fails with 'Invalid or expired invite code' error message"},{"description":"Confirmation dialog cancellation preserves existing code","given":"User is team lead viewing team settings with existing invite code ABC123","when":"User clicks regenerate, sees warning dialog, and clicks Cancel","then":"Dialog closes, existing invite code ABC123 remains active and unchanged, no audit log entry is created"}]

#### US-038: Leave Current Team
As a team member, I want to leave my current team so that I can join a different team or work solo.

**Acceptance Criteria:**
- Team member can leave team from team dashboard or settings
- Confirmation dialog explains implications of leaving
- Upon leaving, member is removed from team roster immediately
- If team lead leaves and other members exist, system prompts to transfer leadership first
- If last member leaves, team is marked as disbanded (not deleted for audit purposes)
- Member can freely join another team after leaving (before cutoff)
- Toast notification confirms successful departure
- Remaining team members receive in-app notification
- Leave functionality is blocked after submission cutoff
- Audit log records departure with timestamp

**Technical Notes:**
Implement team departure as a Convex mutation with comprehensive state validation. The mutation should first verify the user is actually a team member, then check submission cutoff deadline against the hackathon's configured dates. For team lead departures, implement a pre-check that returns a specific error code requiring leadership transfer (US-037 dependency) before allowing departure.

Use Convex's transactional guarantees to atomically: (1) remove member from team roster, (2) update team member count, (3) create audit log entry, and (4) schedule notifications. For the 'last member leaves' scenario, update team status to 'disbanded' rather than deleting, preserving referential integrity for audit trails and historical reporting.

The confirmation dialog should be a client-side modal component that fetches current team state (member count, user's role, cutoff status) to display contextual warnings. Use optimistic updates for the UI but handle rollback if the mutation fails due to race conditions (e.g., cutoff passed during confirmation).

Notifications to remaining members should use Convex's scheduled functions to batch notifications efficiently. Store the departure event in an audit_logs table with fields: team_id, user_id, action_type, timestamp, and metadata (capturing member count at time of departure).

Edge case: Handle concurrent departures where two members leave simultaneously and both think they're not the last member. The mutation should re-check member count within the transaction.

**Test Cases:**
[{"description":"Regular member successfully leaves team before cutoff","given":"A user is a regular member (not lead) of a team with 3 members, and submission cutoff is in the future","when":"The user confirms they want to leave the team from the team dashboard","then":"User is removed from team roster immediately, team member count decreases to 2, user sees success toast notification, remaining 2 members receive in-app notifications, and audit log records the departure with timestamp"},{"description":"Team lead blocked from leaving without transferring leadership","given":"A user is the team lead of a team with 2 other members","when":"The team lead attempts to leave the team","then":"System displays error prompting to transfer leadership first, user remains on team roster, and no notifications are sent to other members"},{"description":"Last member leaving causes team disbandment","given":"A user is the only remaining member of a team (and is the lead)","when":"The user confirms they want to leave the team","then":"User is removed from roster, team status is updated to 'disbanded', team record is preserved in database, audit log records both departure and disbandment, and user can now join other teams"},{"description":"Leave functionality blocked after submission cutoff","given":"A user is a team member and the hackathon submission cutoff has passed","when":"The user attempts to access the leave team functionality","then":"Leave button is disabled or hidden, attempting the action via API returns a 'cutoff_passed' error, and user sees message explaining teams are locked after cutoff"},{"description":"Departed member can join new team before cutoff","given":"A user has just left their previous team and submission cutoff is still in the future","when":"The user attempts to join a different team or create a new team","then":"User is allowed to join/create team without restrictions, user's participant status shows no current team, and previous team membership does not block new team actions"}]

#### US-039: Transfer Team Leadership
As a team lead, I want to transfer leadership to another team member so that someone else can manage the team if I need to step back.

**Acceptance Criteria:**
- Team lead can select another team member to become the new lead
- Confirmation dialog requires explicit confirmation of transfer
- Upon transfer, new lead gains all management privileges
- Former lead becomes a regular team member
- Both parties receive in-app notification of the change
- Transfer is blocked after submission cutoff
- Toast notification confirms successful transfer
- Audit log records leadership change with timestamp and both user IDs

**Technical Notes:**
Implement leadership transfer as an atomic Convex mutation to ensure data consistency. The mutation should accept teamId and newLeaderId, validate that the caller is current lead, verify the target is an active team member, and check submission cutoff hasn't passed.

Create a `transferTeamLeadership` mutation that: (1) validates current user is team lead via Clerk session, (2) queries team membership to confirm new lead is a member, (3) checks hackathon phase against submission cutoff timestamp, (4) updates team document's leaderId field, (5) updates both users' membership roles in a single transaction, (6) creates audit log entry with previous/new lead IDs and timestamp, (7) triggers notifications for both parties.

For the confirmation dialog, use a two-step UI pattern: first click opens modal with clear warning text about privilege transfer, second click executes the mutation. Consider adding a brief cooldown or requiring the new lead to accept (though AC doesn't require acceptance).

Notifications should use the existing in-app notification system, creating entries for both users with appropriate message templates. The audit log should be a separate Convex table with immutable entries indexed by teamId and timestamp.

Edge cases: handle race conditions if new lead leaves team during transfer, prevent transfer to oneself, handle network failures gracefully with optimistic UI rollback. Security: verify both users belong to same team and hackathon, prevent privilege escalation by non-leads.

**Test Cases:**
[{"description":"Successfully transfer leadership to team member","given":"User is team lead of a team with member Alice, and submission cutoff has not passed","when":"User selects Alice as new lead and confirms the transfer in the confirmation dialog","then":"Alice becomes team lead with full management privileges, user becomes regular member, both receive in-app notifications, toast confirms successful transfer, and audit log records the change with timestamp and both user IDs"},{"description":"Transfer blocked after submission cutoff","given":"User is team lead and submission cutoff deadline has passed","when":"User attempts to initiate leadership transfer","then":"Transfer option is disabled or hidden, and attempting via API returns error indicating cutoff has passed"},{"description":"Confirmation dialog requires explicit confirmation","given":"User is team lead and has selected a team member for transfer","when":"User clicks transfer button","then":"Confirmation dialog appears with clear warning about transferring privileges, and transfer only executes after explicit confirmation click"},{"description":"Cannot transfer to non-team member","given":"User is team lead","when":"User attempts to transfer leadership to a user not in their team via API manipulation","then":"System rejects the transfer with appropriate error message and no changes are made"},{"description":"Non-lead cannot initiate transfer","given":"User is a regular team member, not the team lead","when":"User attempts to access leadership transfer functionality","then":"Transfer option is not visible in UI, and direct API call returns unauthorized error"}]

#### US-040: View Participant Dashboard
As a hackathon participant, I want to see a personalized dashboard showing my event status, team info, deadlines, and required actions so that I can stay organized and not miss important dates.

**Acceptance Criteria:**
- Dashboard displays current hackathon name, phase, and participant's registration status
- Team section shows team name, members, role (lead/member), and invite code (if lead)
- If not on a team, dashboard shows options to create or join a team
- Deadlines section lists upcoming dates: team formation cutoff, submission deadline, judging period
- Action items section highlights pending tasks: incomplete profile, missing team, unsubmitted solution
- Each deadline shows countdown timer for items within 48 hours
- Dashboard updates in real-time as status changes (Convex reactivity)
- Notification preferences link is accessible from dashboard
- Dashboard adapts for participants in multiple concurrent hackathons

**Technical Notes:**
Implement the participant dashboard as a reactive TanStack Start route at `/dashboard` using Convex's real-time subscriptions for live updates. Create a `useParticipantDashboard` hook that aggregates data from multiple Convex queries: participant registrations, team memberships, hackathon phases, and deadlines.

**Architecture:** Use a compound query pattern in Convex to fetch all dashboard data efficiently. Create `dashboard.getParticipantOverview` that joins participant records with hackathon metadata, team info, and computed action items. Leverage Convex's reactivity so status changes push updates automatically without polling.

**Multi-hackathon support:** Structure the dashboard with a hackathon selector/tabs component when user has multiple active registrations. Store last-viewed hackathon in localStorage for return visits. Each hackathon card should be a self-contained component receiving its data slice.

**Countdown timers:** Implement client-side countdown using `useEffect` with `setInterval` for deadlines within 48 hours. Calculate time remaining from deadline timestamps stored in Convex. Use a shared `CountdownTimer` component with configurable urgency thresholds for styling.

**Action items computation:** Create a Convex query function that computes pending actions server-side by checking: profile completeness (Clerk metadata + custom fields), team membership status, and submission existence. Return structured action items with priority levels and deep links to resolution pages.

**Dependencies:** Requires US-020 (Team Management), US-030 (Hackathon Phases), and participant registration stories. Clerk's `useUser` provides base identity; extend with Convex participant profile data.

**Test Cases:**
[{"description":"Dashboard displays hackathon overview for registered participant","given":"A participant is registered for 'AI Innovation Hackathon' which is in the 'team_formation' phase","when":"The participant navigates to their dashboard","then":"Dashboard shows hackathon name 'AI Innovation Hackathon', current phase 'Team Formation', and registration status 'Confirmed'"},{"description":"Team section shows complete team information for team lead","given":"A participant is the lead of team 'Neural Ninjas' with 3 members and invite code 'NN-2024-XYZ'","when":"The participant views the team section of their dashboard","then":"Team section displays team name 'Neural Ninjas', lists all 3 members with names and roles, shows role as 'Team Lead', and displays invite code 'NN-2024-XYZ' with copy button"},{"description":"Dashboard shows team creation options when participant has no team","given":"A participant is registered for a hackathon but has not joined or created a team","when":"The participant views the team section of their dashboard","then":"Team section displays 'You are not on a team' message with prominent 'Create Team' and 'Join Team' buttons"},{"description":"Countdown timer appears for deadlines within 48 hours","given":"The submission deadline is 36 hours away and team formation deadline has passed","when":"The participant views the deadlines section","then":"Submission deadline shows active countdown timer displaying hours and minutes, team formation deadline shows as 'Passed' without timer"},{"description":"Action items highlight incomplete required tasks","given":"A participant has incomplete profile (missing bio), no team, and no submitted solution during submission phase","when":"The participant views the action items section","then":"Action items section lists three items: 'Complete your profile' linking to profile page, 'Join or create a team' linking to team page, and 'Submit your solution' linking to submission page, each with visual urgency indicator"},{"description":"Dashboard handles multiple concurrent hackathon registrations","given":"A participant is registered for 'AI Hackathon' (submission phase) and 'Green Tech Challenge' (team formation phase)","when":"The participant loads their dashboard","then":"Dashboard displays hackathon selector showing both events, defaults to most recently active hackathon, and allows switching between hackathon views without page reload"}]

### Epic: Solution Submissions

Multi-file submissions (video 500MB, deck 50MB, description, optional GitHub/demo links), category selection, version history for edits, curator approval workflow, and configurable public gallery view.

#### US-041: Create Solution Submission Draft
As a team lead or member, I want to create a submission draft for my team's solution so that we can start documenting our work before the deadline.

**Acceptance Criteria:**
- Team members can initiate a new submission from their team dashboard
- Submission form includes fields for: title, description (rich text), category selection, optional GitHub URL, optional demo URL
- Draft is auto-saved periodically to prevent data loss
- Only one active submission allowed per team per hackathon
- Submission displays current status (draft, submitted, approved, rejected)
- Inline validation errors shown for invalid URLs or missing required fields
- Toast notification confirms successful draft creation

**Technical Notes:**
**Implementation Approach:**

Create a `submissions` table in Convex with fields: `teamId`, `hackathonId`, `title`, `description` (rich text stored as JSON/HTML), `categoryId`, `githubUrl`, `demoUrl`, `status` (enum: draft/submitted/approved/rejected), `createdBy`, `createdAt`, `updatedAt`. Add a unique compound index on `[teamId, hackathonId]` to enforce one submission per team.

**Architecture:**

Build a `SubmissionForm` component using TanStack Form for validation and state management. Implement auto-save using a debounced Convex mutation (2-3 second delay) triggered on form changes. Store the debounce timer in a ref to cancel on unmount.

**Key Mutations:**
- `createSubmissionDraft`: Validates team membership via Clerk session, checks no existing submission exists, creates draft
- `updateSubmissionDraft`: Updates fields, validates URLs with regex pattern, updates `updatedAt` timestamp

**Validation:**
URL validation should use a permissive regex for GitHub (`^https://github\.com/[\w-]+/[\w.-]+`) and general URLs for demo links. Use Zod schemas shared between client and Convex for consistent validation.

**Security Considerations:**
- Verify user is member of the team via Clerk + team membership table
- Sanitize rich text input to prevent XSS (consider using DOMPurify)
- Rate-limit auto-save mutations to prevent abuse

**Dependencies:**
- Requires team membership system (likely US-030s)
- Needs category definitions from hackathon setup
- Consider using Tiptap or Lexical for rich text editing

**Test Cases:**
[{"description":"Successfully create a new submission draft","given":"A user is authenticated, is a member of a team participating in an active hackathon, and the team has no existing submission","when":"The user navigates to the team dashboard and clicks 'Create Submission'","then":"A new submission draft is created with status 'draft', the submission form is displayed with empty fields, and a toast notification confirms 'Draft created successfully'"},{"description":"Prevent duplicate submissions for same hackathon","given":"A team already has an existing submission (any status) for the current hackathon","when":"A team member attempts to create a new submission","then":"The system displays an error message 'Your team already has a submission for this hackathon', the create action is blocked, and the user is redirected to the existing submission"},{"description":"Auto-save draft on form changes","given":"A user has an open submission draft form with title 'AI Assistant' entered","when":"The user modifies the description field and waits 3 seconds without further input","then":"The draft is automatically saved to the database, the 'updatedAt' timestamp is refreshed, and a subtle 'Draft saved' indicator appears without interrupting the user"},{"description":"Validate GitHub URL format","given":"A user is editing their submission draft","when":"The user enters 'not-a-valid-url' in the GitHub URL field and moves focus away","then":"An inline validation error appears below the field stating 'Please enter a valid GitHub repository URL', the field is highlighted in red, and auto-save is skipped for the invalid field"},{"description":"Reject submission creation for non-team members","given":"A user is authenticated but is not a member of any team in the hackathon","when":"The user attempts to access the submission creation endpoint directly via API","then":"The system returns a 403 Forbidden error, no draft is created, and an error message indicates 'You must be part of a team to create a submission'"}]

#### US-042: Upload Demo Video with Size Validation
As a team member, I want to upload a demo video of our solution so that judges can see our project in action.

**Acceptance Criteria:**
- Video upload accepts common formats (MP4, MOV, WebM)
- Maximum file size enforced at 500MB with clear error message if exceeded
- Upload progress indicator shows percentage complete
- Files stored in Cloudflare R2 with secure access URLs
- Video preview available after successful upload
- Option to replace existing video before submission deadline
- Upload can be cancelled mid-progress
- Toast notification on successful upload or error

**Technical Notes:**
**Implementation Approach:**

Use Cloudflare R2's multipart upload API for handling large video files efficiently. Implement client-side validation first (file type via MIME type and extension, size check against 500MB limit) before initiating upload to fail fast and save bandwidth.

**Architecture:**

1. **Upload Flow:** Client requests presigned URL from Convex action → Convex generates R2 presigned multipart upload URL → Client uploads directly to R2 with progress tracking via XMLHttpRequest or fetch with ReadableStream → On completion, client notifies Convex to store file metadata and generate secure access URL.

2. **Progress Tracking:** Use XMLHttpRequest's `upload.onprogress` event for reliable percentage calculation. Store upload state in React state with TanStack's mutation handling for optimistic UI updates.

3. **Secure Access:** Generate time-limited signed URLs for video playback. Store R2 object keys in Convex, not raw URLs. Validate team membership before URL generation.

4. **Cancellation:** Implement AbortController for fetch-based uploads. For multipart uploads, call R2's AbortMultipartUpload to clean up partial uploads.

**Dependencies:** Requires team membership validation (US-030s), submission deadline checking, and potentially video transcoding consideration for playback compatibility.

**Security Considerations:** Validate MIME type server-side (don't trust client headers), scan for malicious content if budget allows, enforce per-team upload quotas to prevent abuse. Ensure only team members can replace/view videos before judging phase.

**Test Cases:**
[{"description":"Successfully upload valid MP4 video under size limit","given":"A team member is on the solution submission page with a valid 150MB MP4 file selected","when":"The user initiates the upload","then":"Progress indicator shows percentage increasing from 0-100%, upload completes successfully, video preview renders the uploaded content, success toast notification appears, and file metadata is stored in Convex with R2 reference"},{"description":"Reject upload exceeding 500MB size limit","given":"A team member selects a 650MB video file for upload","when":"The user attempts to initiate the upload","then":"Upload is blocked before any network request, error message clearly states 'File exceeds maximum size of 500MB (your file: 650MB)', no progress indicator appears, and error toast notification is displayed"},{"description":"Reject unsupported video format","given":"A team member selects an AVI format video file","when":"The user attempts to upload the file","then":"Upload is rejected with error message 'Unsupported format. Please upload MP4, MOV, or WebM files', file input is cleared, and user can select a different file"},{"description":"Cancel upload mid-progress","given":"A team member has initiated a large video upload currently showing 45% progress","when":"The user clicks the cancel upload button","then":"Upload is immediately aborted, progress indicator disappears, partial upload is cleaned up from R2, confirmation message shows 'Upload cancelled', and user can initiate a new upload"},{"description":"Replace existing video before deadline","given":"A team has previously uploaded a demo video and the submission deadline has not passed","when":"A team member uploads a new video file","then":"Confirmation modal asks 'Replace existing video?', upon confirmation new upload proceeds, old video is deleted from R2 after successful new upload, video preview updates to show new content, and replacement is logged for audit"},{"description":"Block upload after submission deadline","given":"A team member attempts to access video upload after the hackathon submission deadline has passed","when":"The user tries to select or upload a video file","then":"Upload controls are disabled, message displays 'Submission deadline has passed', existing video remains accessible for viewing but not modification"}]

#### US-043: Upload Presentation Deck
As a team member, I want to upload our presentation deck so that judges can review our solution details and approach.

**Acceptance Criteria:**
- Deck upload accepts PDF, PPTX, and Google Slides export formats
- Maximum file size enforced at 50MB with clear error message if exceeded
- Upload progress indicator shows percentage complete
- Files stored in Cloudflare R2 with secure access URLs
- Deck preview or download link available after upload
- Option to replace existing deck before submission deadline
- Previous deck versions preserved in version history
- Inline error shown for unsupported file types

**Technical Notes:**
**Implementation Approach:**

Build a robust file upload system using Cloudflare R2 for storage with presigned URLs for secure, direct browser-to-R2 uploads. This offloads bandwidth from Workers and enables progress tracking.

**Architecture:**

1. **Upload Flow:** Client requests presigned URL from Convex action → Convex generates R2 presigned PUT URL with content-type restrictions → Client uploads directly to R2 with XHR for progress events → On completion, client notifies Convex to record metadata.

2. **File Validation:** Client-side validation for immediate feedback (MIME type, extension, size). Server-side validation in Convex action before generating presigned URL. Accept `application/pdf`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.google-apps.presentation`.

3. **Version History:** Store deck records in a `presentation_decks` table with `teamId`, `submissionId`, `version`, `r2Key`, `originalFilename`, `uploadedBy`, `uploadedAt`, `isActive`. Soft-replace by marking previous as inactive rather than deleting.

4. **Secure Access:** Generate time-limited signed URLs for viewing/downloading. Check team membership and deadline status before serving URLs.

**Dependencies:** Requires US-041 (submission creation) for linking decks to submissions. Uses Clerk for `uploadedBy` user identification.

**Security Considerations:** Validate Content-Type header matches extension. Scan filenames for path traversal. Enforce team membership check before any upload operation. Rate limit upload requests to prevent abuse.

**Libraries:** Use native `XMLHttpRequest` or `axios` with `onUploadProgress` for progress tracking. Consider `react-dropzone` for drag-and-drop UX.

**Test Cases:**
[{"description":"Successfully upload a PDF presentation deck","given":"I am logged in as a team member with an active submission before the deadline","when":"I select a valid 10MB PDF file and initiate upload","then":"Upload progress indicator shows percentage from 0-100%, file is stored in R2, deck preview link becomes available, and success confirmation is displayed"},{"description":"Reject file exceeding maximum size limit","given":"I am logged in as a team member with an active submission","when":"I attempt to upload a 55MB PPTX file","then":"Upload is prevented before transfer begins, error message displays 'File size exceeds 50MB limit', and no file is stored in R2"},{"description":"Reject unsupported file format with inline error","given":"I am logged in as a team member on the deck upload interface","when":"I attempt to upload a .docx or .zip file","then":"Inline error displays 'Unsupported file type. Please upload PDF, PPTX, or Google Slides export', upload button remains disabled, and file is not transmitted"},{"description":"Replace existing deck while preserving version history","given":"I am logged in as a team member with a previously uploaded deck and submission deadline has not passed","when":"I upload a new PDF deck using the replace option","then":"New deck becomes the active version, previous deck is preserved in version history with timestamp, version history shows both files with upload dates and uploaders"},{"description":"Prevent deck replacement after submission deadline","given":"I am logged in as a team member and the submission deadline has passed","when":"I attempt to upload or replace the presentation deck","then":"Upload controls are disabled, message displays 'Submission deadline has passed - deck cannot be modified', and existing deck remains unchanged"}]

#### US-044: Select Submission Category
As a team lead, I want to select which category our submission competes in so that it is evaluated by the appropriate judges.

**Acceptance Criteria:**
- Dropdown or selection UI shows all available categories for the hackathon
- Category descriptions visible to help teams choose appropriately
- Only categories configured by organiser are available
- Category can be changed until submission deadline
- Selected category displayed prominently on submission summary
- Category selection required before final submission
- If hackathon has single category, it is auto-selected

**Technical Notes:**
Implement category selection as a controlled form component within the submission workflow. Create a Convex query `getHackathonCategories(hackathonId)` that returns categories configured by organisers, including id, name, description, and any judge assignments. The selection UI should use a radio group for fewer than 5 categories or a searchable dropdown (using Radix Select or similar) for larger lists.

Store the selected category in the submissions table with a `categoryId` field. Implement a Convex mutation `updateSubmissionCategory` that validates: (1) user is team lead via team membership lookup, (2) category belongs to the hackathon, (3) submission deadline hasn't passed using server-side timestamp comparison. For single-category hackathons, auto-populate during submission creation and hide the selection UI, showing only a read-only display.

Category descriptions should render markdown/rich text if organisers use formatting. Consider caching category data client-side with TanStack Query's stale-while-revalidate pattern since categories rarely change mid-hackathon. The submission summary component should prominently display the category with visual distinction (badge/chip pattern).

Edge cases: handle category deletion by organiser (soft delete, preserve existing selections), validate category isn't full if organisers set submission caps per category. Use optimistic updates for category changes to improve perceived performance.

**Test Cases:**
[{"description":"Team lead successfully selects submission category","given":"A team lead with an active submission and a hackathon with 3 available categories","when":"The team lead opens the category selector and chooses 'AI/ML Solutions' category","then":"The category is saved to the submission, a success confirmation appears, and the submission summary displays 'AI/ML Solutions' prominently"},{"description":"Category auto-selected for single-category hackathon","given":"A hackathon configured with only one category 'General' and a team creating a new submission","when":"The submission form loads","then":"The category field shows 'General' as pre-selected and read-only, with no dropdown interaction available"},{"description":"Category change blocked after submission deadline","given":"A team lead with a submission where the hackathon deadline was 2 hours ago","when":"The team lead attempts to change the category from 'Mobile Apps' to 'Web Apps'","then":"The category selector is disabled, an error message states 'Category cannot be changed after the submission deadline', and the original category remains unchanged"},{"description":"Non-team-lead member cannot change category","given":"A team member who is not the team lead viewing the submission","when":"The team member attempts to access the category selection control","then":"The category selector is either hidden or displayed as read-only, with no edit capability available"},{"description":"Category descriptions help team make informed choice","given":"A team lead viewing category options where 'Hardware Hack' has description 'Projects involving physical computing, IoT, or robotics components'","when":"The team lead expands or hovers over the 'Hardware Hack' category option","then":"The full category description is visible, helping the team understand if their project qualifies for this category"}]

#### US-045: Submit Solution for Review
As a team lead, I want to submit our completed solution so that it enters the curator review queue before the deadline.

**Acceptance Criteria:**
- Submit button only enabled when all required fields are complete (title, description, category, at least one file)
- Confirmation modal shows submission summary before final submit
- Submission blocked after hackathon deadline with clear message
- Submission status changes to 'pending review' upon submission
- Team receives in-app notification confirming submission
- Email notification sent to team members if email preferences enabled
- Audit log entry created with submission timestamp and user
- Toast notification confirms successful submission

**Technical Notes:**
**Implementation Approach:**

Create a `submitSolution` Convex mutation that orchestrates the submission workflow atomically. The mutation should validate team lead authorization via Clerk session, check deadline against hackathon's `submissionDeadline` field, and verify all required fields (title, description, category, files array length > 0).

**Architecture Considerations:**

- Use Convex's transactional guarantees to atomically update solution status to 'pending_review' and create audit log entry
- Implement optimistic UI updates with TanStack Query for immediate feedback, rolling back on mutation failure
- File references should already exist in R2 from prior upload steps; validate file IDs exist before submission

**Key Implementation Details:**

1. **Deadline Check:** Compare `Date.now()` against `hackathon.submissionDeadline` server-side (never trust client time)
2. **Confirmation Modal:** Use React state to capture form snapshot, display summary, require explicit confirmation before calling mutation
3. **Notifications:** Trigger Convex scheduled function for email dispatch via Resend/SendGrid; create in-app notification documents for all team members
4. **Audit Log:** Store `{solutionId, action: 'submitted', userId, timestamp, metadata}` in `auditLogs` table

**Security Considerations:**

- Verify submitting user is actual team lead via `teamMembers` table role field
- Rate limit submissions to prevent spam (1 per minute per team)
- Validate file IDs belong to this team's solution to prevent reference injection

**Dependencies:** Requires US-042 (file upload) and US-038 (solution draft creation) to be complete.

**Test Cases:**
[{"description":"Successfully submit complete solution before deadline","given":"A team lead with a solution containing title 'AI Assistant', description (200 chars), category 'Developer Tools', and 2 uploaded files, and hackathon deadline is 24 hours away","when":"The team lead reviews the confirmation modal and clicks 'Confirm Submission'","then":"Solution status updates to 'pending_review', audit log entry is created with current timestamp and user ID, in-app notifications are created for all 3 team members, email is queued for members with email preferences enabled, and success toast displays 'Solution submitted successfully'"},{"description":"Submit button disabled when required fields incomplete","given":"A team lead viewing their solution with title and description filled but no files uploaded and no category selected","when":"The team lead views the submission form","then":"The submit button is disabled with tooltip 'Complete all required fields: category, at least one file' and required field indicators show on category dropdown and file upload section"},{"description":"Submission blocked after hackathon deadline","given":"A team lead with a complete solution and hackathon deadline was 2 hours ago","when":"The team lead attempts to access the submit functionality","then":"Submit button is disabled, error banner displays 'Submission deadline has passed (ended March 15, 2024 at 5:00 PM UTC)', and no mutation is triggered even if API called directly"},{"description":"Non-team-lead member cannot submit","given":"A team member with role 'contributor' (not team lead) viewing their team's complete solution before deadline","when":"The team member views the solution page","then":"Submit button is not visible, only 'Request team lead to submit' message is shown, and direct API call returns 403 with 'Only team lead can submit'"},{"description":"Confirmation modal displays accurate submission summary","given":"A team lead clicks submit on solution titled 'SmartScheduler' with description 'AI-powered calendar...', category 'Productivity', and files ['pitch.pdf', 'demo.mp4', 'source.zip']","when":"The confirmation modal opens","then":"Modal displays solution title 'SmartScheduler', truncated description (first 100 chars with ellipsis), category 'Productivity', file count '3 files attached' with file names listed, team name, and warning 'This action cannot be undone. Your solution will enter the review queue.'"}]

#### US-046: Edit Submission with Version History
As a team member, I want to edit our submitted solution and have all changes tracked so that we can improve our submission while preserving history.

**Acceptance Criteria:**
- Edit button available on submitted solutions until hackathon deadline
- Each save creates a new version with timestamp and editor info
- Version history panel shows all previous versions with dates
- Previous versions are read-only but fully viewable
- Judges always see the latest submitted version
- Version comparison not required but versions individually accessible
- Editing after deadline is blocked with clear message
- Audit log captures each version save with user and timestamp

**Technical Notes:**
**Implementation Approach:**

Design a versioned submission system using Convex's document model with an append-only version collection. Create a `submissionVersions` table with fields: `submissionId`, `versionNumber`, `content`, `attachments`, `editorId`, `createdAt`. The main `submissions` table maintains a `currentVersionId` reference and `latestVersionNumber` counter for efficient queries.

**Architecture Considerations:**

1. **Version Creation**: On each save, insert a new version document and atomically update the parent submission's `currentVersionId` and increment `latestVersionNumber` using Convex mutations with transactional guarantees.

2. **Deadline Enforcement**: Implement a server-side middleware check in mutations comparing `Date.now()` against `hackathon.submissionDeadline`. Return structured errors for client-side messaging. Never trust client-side deadline checks alone.

3. **Audit Logging**: Leverage Convex's built-in `_creationTime` for timestamps. Store `editorId` (from Clerk's `ctx.auth.getUserIdentity()`) with each version. Consider a separate `auditLog` table for cross-cutting audit requirements.

4. **File Handling**: Version attachments by storing R2 object keys per version. Avoid deleting old files to preserve history integrity. Consider lifecycle policies for storage optimization post-hackathon.

**Security Considerations:**
- Validate team membership before allowing edits
- Ensure `editorId` comes from authenticated session, not request body
- Rate-limit version creation to prevent spam (suggest 1 save per 30 seconds)

**Dependencies:** US-044 (initial submission), US-031 (team membership validation)

**Test Cases:**
[{"description":"Successfully edit submission before deadline creates new version","given":"A team member is authenticated, the team has an existing submission with version 1, and the hackathon submission deadline is 2 hours away","when":"The team member updates the solution description and clicks save","then":"A new version 2 is created with the updated content, current timestamp, and editor's user ID; the submission's currentVersionId points to version 2; the user sees a success confirmation"},{"description":"Version history displays all previous versions chronologically","given":"A submission exists with 3 versions created by different team members at different times","when":"A team member opens the version history panel","then":"All 3 versions are displayed in reverse chronological order showing version number, editor name, and formatted timestamp; each version has a 'View' action available"},{"description":"Previous versions are viewable but not editable","given":"A team member is viewing version 1 of a submission that currently has 3 versions","when":"The team member views the version 1 details","then":"All content and attachments from version 1 are displayed in read-only mode; no edit button or editable fields are present; a label indicates 'Historical Version'"},{"description":"Editing blocked after submission deadline with clear message","given":"A team member is authenticated, the team has an existing submission, and the hackathon submission deadline passed 30 minutes ago","when":"The team member attempts to access the edit functionality","then":"The edit button is disabled or hidden; attempting to save via API returns a 403 error; a clear message displays 'Submission deadline has passed. Editing is no longer available.'"},{"description":"Judges view shows only the latest submitted version","given":"A judge is authenticated and assigned to evaluate a submission that has 4 versions","when":"The judge opens the submission for review","then":"Only version 4 (the latest) content is displayed; no version history panel or version selector is visible to the judge; the view matches what the team last submitted"}]

#### US-047: Curator Submission Approval Workflow
As a curator, I want to review and approve or reject submissions so that only appropriate content appears in the judging pool and public gallery.

**Acceptance Criteria:**
- Curator dashboard shows queue of pending submissions
- Each submission displays full details including all files and links
- Approve action moves submission to 'approved' status
- Reject action requires a reason and moves to 'rejected' status
- Rejected teams receive notification with rejection reason
- Approved submissions become visible to assigned judges
- Bulk approve option available for multiple submissions
- Filter options: pending, approved, rejected, all
- Audit log captures approval/rejection with curator ID and timestamp

**Technical Notes:**
Implement curator workflow using Convex mutations with role-based access control via Clerk. Create a `submission_reviews` table to track approval actions with fields: submissionId, curatorId, action (approved/rejected), reason (nullable), timestamp. Use Convex indexes on status and hackathonId for efficient queue filtering.

The curator dashboard should use TanStack Query for real-time updates via Convex subscriptions, ensuring the queue reflects changes immediately when other curators act. Implement optimistic updates for smooth UX during approve/reject actions.

For bulk approval, use Convex's transaction support to ensure atomicity—either all selected submissions update or none do. Limit bulk operations to 50 items per request to avoid timeout issues on Cloudflare Workers.

File preview should lazy-load from R2 using signed URLs with 15-minute expiry for security. Consider implementing a lightweight document viewer component for common formats (PDF, images, markdown).

Notification system should trigger via Convex scheduled functions after rejection, queuing emails through a dedicated notification service. Store notification preferences to respect user settings.

Audit logging is critical—use a separate `audit_logs` table with immutable append-only pattern. Include curator ID from Clerk session, action type, affected submission IDs, and full timestamp. This supports compliance requirements and dispute resolution.

Edge cases: Handle concurrent curator actions on same submission (use optimistic locking), curator attempting to review their own team's submission (block with role check), and submissions with missing/corrupted files (flag for admin review rather than silent failure).

**Test Cases:**
[{"description":"Curator approves a pending submission successfully","given":"A curator is logged in and viewing a pending submission with complete details and files","when":"The curator clicks the approve button for the submission","then":"The submission status changes to approved, an audit log entry is created with curator ID and timestamp, and the submission becomes visible in the judges' queue"},{"description":"Curator rejects submission with required reason","given":"A curator is viewing a pending submission that violates guidelines","when":"The curator clicks reject and attempts to submit without entering a reason","then":"A validation error is displayed requiring a rejection reason, and the submission remains in pending status"},{"description":"Rejected team receives notification with reason","given":"A curator has rejected a submission with reason 'Submission contains prohibited external API usage'","when":"The rejection is processed","then":"All team members receive an in-app notification and email containing the rejection reason, and the notification links to their submission"},{"description":"Bulk approve multiple submissions atomically","given":"A curator has selected 5 pending submissions using the checkbox interface","when":"The curator clicks bulk approve and one submission fails validation due to missing files","then":"None of the 5 submissions are approved, an error message identifies the problematic submission, and all remain in pending status"},{"description":"Filter displays correct submission counts by status","given":"A hackathon has 10 pending, 25 approved, and 3 rejected submissions","when":"The curator switches between filter options on the dashboard","then":"Each filter shows the correct count badge and displays only submissions matching that status, with the default view showing pending submissions first"}]

#### US-048: Public Gallery Display
As an organiser, I want to configure a public gallery of approved submissions so that stakeholders can browse solutions after the hackathon.

**Acceptance Criteria:**
- Gallery toggle setting available in hackathon configuration
- When enabled, approved submissions appear in public gallery view
- Gallery shows submission title, description preview, category, and team name
- Video and deck accessible from gallery if submission is public
- Gallery respects hackathon visibility (public hackathons only)
- Organisers can exclude specific submissions from gallery
- Gallery only visible after curator publishes results (configurable)
- Gallery accessible via shareable public URL

**Technical Notes:**
Implement public gallery as a separate public route (e.g., /gallery/{hackathonSlug}) that bypasses authentication for read-only access. Create a 'gallerySettings' object in hackathon schema with fields: enabled (boolean), visibleAfterResults (boolean), publishedAt (timestamp). Add 'excludedFromGallery' boolean flag to submissions table, defaulting to false.

For the gallery query, create a Convex function that joins submissions with teams, filtering by: hackathon.isPublic === true, hackathon.gallerySettings.enabled === true, submission.status === 'approved', submission.excludedFromGallery === false, and optionally resultsPublished timestamp check. Use Convex's .paginate() for efficient loading of large galleries.

Generate shareable URLs using hackathon slug for SEO-friendly paths. Implement Open Graph meta tags dynamically for social sharing. For video/deck access, check submission.isPublic flag before exposing R2 signed URLs - use short-lived signatures (1 hour) for public content.

Cache gallery data aggressively since it's read-heavy post-hackathon. Consider implementing a denormalized 'gallerySubmissions' table populated when results are published, avoiding complex joins on public queries. Add rate limiting on the public endpoint via Cloudflare Workers to prevent scraping. Ensure description preview is truncated server-side (150 chars) to control payload size and prevent layout issues.

**Test Cases:**
[{"description":"Gallery displays approved submissions for public hackathon with gallery enabled","given":"A public hackathon with gallery enabled, results published, and 3 approved submissions (1 excluded from gallery)","when":"An unauthenticated user visits the gallery URL /gallery/{hackathonSlug}","then":"Gallery displays 2 submissions with title, description preview (max 150 chars), category, and team name visible"},{"description":"Gallery respects hackathon visibility restrictions","given":"An invite-only hackathon with gallery toggle enabled and approved submissions","when":"A user attempts to access the gallery URL for this hackathon","then":"System returns 404 or 'Gallery not available' message, submissions are not exposed"},{"description":"Gallery hidden until results are published when configured","given":"A public hackathon with gallery enabled, 'visible after results' setting ON, and results not yet published","when":"A user visits the gallery URL","then":"System displays 'Gallery will be available after results are announced' message with no submissions shown"},{"description":"Organiser excludes specific submission from gallery","given":"A public hackathon with gallery enabled and an approved submission currently visible in gallery","when":"Organiser toggles 'exclude from gallery' for that submission and saves","then":"Submission no longer appears in public gallery view, other submissions remain visible"},{"description":"Video and deck access respects submission privacy settings","given":"Gallery with two submissions: one marked public with video/deck, one marked private with video/deck","when":"User browses the gallery and attempts to access media for both submissions","then":"Public submission shows video player and deck download link; private submission shows only title and description with 'Media not publicly available' indicator"}]

### Epic: Judging & Results

Flexible judge assignment (category-based or manual), hybrid judge interface (grid overview with expandable details), ranked choice scoring system, private rankings until judging closes, result overrides, and manual leaderboard publishing by curators.

#### US-049: Category-Based Judge Assignment
As a curator, I want to assign judges to specific problem categories so that they automatically review all submissions within those categories.

**Acceptance Criteria:**
- Curator can select one or more problem categories to assign to each judge
- When a judge is assigned to a category, they automatically see all submissions for problems in that category
- Judge assignments can be modified until judging phase begins
- System displays count of submissions per category to help curators balance workload
- Judges receive email and in-app notification when assigned to categories
- Curator can view a summary showing which categories have judges assigned and which are unassigned
- Assignment changes are logged in audit trail with curator ID and timestamp

**Technical Notes:**
**Implementation Approach:**

Create a `judgeCategoryAssignments` table in Convex with fields: `judgeId`, `hackathonId`, `categoryIds` (array), `assignedBy`, `assignedAt`. Use a compound index on `(hackathonId, judgeId)` for efficient lookups and updates.

**Category-Based Submission Resolution:**
Implement a Convex query `getJudgeSubmissions` that joins category assignments → problems (by category) → submissions. Use Convex's reactive queries so judge dashboards automatically update when new submissions arrive in assigned categories.

**Assignment UI Component:**
Build a multi-select category picker with submission counts fetched via `getSubmissionCountsByCategory` query. Display as chips/tags with badges showing count. Include a matrix view showing judges × categories for curator overview.

**Phase Locking:**
Check hackathon `currentPhase` before allowing assignment modifications. Return descriptive error if phase is 'judging' or later. Consider adding a `judgeAssignmentsLocked` field for explicit control.

**Notification Integration:**
Trigger notifications via Convex action that calls both email (via Clerk's email or external service) and creates in-app notification record. Batch notifications if multiple categories assigned simultaneously.

**Audit Trail:**
Use `auditLogs` table with `entityType: 'judgeCategoryAssignment'`, `action` (assigned/modified/removed), `changes` (diff of categoryIds), `performedBy`, `timestamp`. Query with index on `(hackathonId, entityType)` for curator review.

**Security:**
Validate curator role via Clerk session. Ensure judges being assigned actually have judge role for this hackathon.

**Test Cases:**
[{"description":"Successfully assign judge to multiple categories","given":"A curator is logged in, hackathon is in team-formation phase, and Judge A exists with no category assignments","when":"Curator selects categories 'AI/ML' and 'Web3' and assigns them to Judge A","then":"Assignment is saved, Judge A can query submissions for both categories, curator sees updated assignment summary, and audit log entry is created with curator ID and timestamp"},{"description":"Display submission counts per category for workload balancing","given":"A hackathon has 3 categories: 'AI/ML' with 12 submissions, 'Web3' with 5 submissions, and 'Healthcare' with 8 submissions","when":"Curator opens the judge assignment interface","then":"Each category displays its submission count as a badge, and total workload is shown when hovering over assigned categories"},{"description":"Prevent assignment modification after judging begins","given":"A hackathon has transitioned to 'judging' phase and Judge B is assigned to 'Fintech' category","when":"Curator attempts to add 'Sustainability' category to Judge B's assignments","then":"System rejects the modification with error 'Judge assignments cannot be modified after judging has begun' and no changes are persisted"},{"description":"Send notifications when judge is assigned to categories","given":"Judge C has email notifications enabled and is not currently assigned to any categories","when":"Curator assigns Judge C to 'Education' and 'Gaming' categories","then":"Judge C receives one email listing both assigned categories and one in-app notification appears in their notification center within 30 seconds"},{"description":"Highlight unassigned categories in curator summary view","given":"A hackathon has 4 categories where 'AI/ML' and 'Web3' have judges assigned but 'Healthcare' and 'Fintech' have no judges","when":"Curator views the category assignment summary dashboard","then":"'Healthcare' and 'Fintech' are visually highlighted as unassigned with warning indicators, and a summary shows '2 of 4 categories have judges assigned'"}]

#### US-050: Manual Submission Assignment to Judges
As a curator, I want to manually assign specific submissions to individual judges so that I have fine-grained control over the judging process when category-based assignment doesn't fit.

**Acceptance Criteria:**
- Curator can select individual submissions and assign them to specific judges
- Same submission can be assigned to multiple judges for cross-evaluation
- Curator can use both category-based and manual assignment within the same hackathon
- Manual assignments override category-based assignments when both exist for a judge
- Judges receive notification when new submissions are manually assigned to them
- Curator can bulk-select submissions for assignment to speed up the process
- System prevents assigning submissions to judges who are members of the submitting team
- All manual assignments are logged with curator ID, judge ID, submission ID, and timestamp

**Technical Notes:**
Implement manual submission assignment using a dedicated `judgeAssignments` table in Convex with fields: id, hackathonId, judgeId, submissionId, assignmentType ('manual' | 'category'), assignedBy (curatorId), assignedAt, and priority flag for override logic. Create a Convex mutation `assignSubmissionsToJudge` that accepts an array of submissionIds and a judgeId, enabling bulk operations in a single transaction.

For conflict-of-interest prevention, implement a pre-assignment validation query that joins submissions with team memberships, rejecting any assignment where judgeId exists in the submitting team's member list. Use Convex's transactional guarantees to ensure atomic bulk assignments.

The override mechanism should use assignment priority: when fetching a judge's queue, filter by judgeId and apply COALESCE-style logic where manual assignments take precedence. Implement this in a `getJudgeAssignments` query that returns deduplicated submissions with their assignment source.

For the UI, build a multi-select DataTable component using TanStack Table with row selection state. Include a judge selector dropdown (filtered to exclude team members) and a 'Assign Selected' action button. Implement optimistic updates for responsive UX.

Notifications should trigger via Convex's scheduled functions, calling an internal action that creates in-app notifications and optionally queues emails through a Cloudflare Worker. Audit logging should use a separate `assignmentAuditLog` table populated within the same mutation transaction to ensure consistency.

**Test Cases:**
[{"description":"Curator successfully assigns single submission to a judge","given":"A curator is viewing unassigned submissions and a judge exists who is not a member of any submitting team","when":"The curator selects one submission and assigns it to the judge","then":"The assignment is created with type 'manual', the judge receives an in-app notification, and an audit log entry is recorded with curator ID, judge ID, submission ID, and timestamp"},{"description":"Bulk assignment of multiple submissions to a single judge","given":"A curator has selected 5 submissions and a valid judge is chosen","when":"The curator clicks 'Assign Selected' to assign all submissions to the judge","then":"All 5 assignments are created atomically, the judge receives one consolidated notification, and 5 audit log entries are created"},{"description":"System prevents assignment to judge who is a team member","given":"A submission exists from Team Alpha and Judge Bob is a member of Team Alpha","when":"The curator attempts to assign Team Alpha's submission to Judge Bob","then":"The system rejects the assignment with error 'Cannot assign submission to a judge who is a member of the submitting team' and no assignment or audit log is created"},{"description":"Manual assignment overrides category-based assignment for the same judge","given":"Judge Carol has submission S1 assigned via category-based rules and a curator manually assigns S1 to Judge Carol with specific instructions","when":"Judge Carol views their assignment queue","then":"Submission S1 appears once with assignment type 'manual' and the category-based assignment is superseded but retained in history"},{"description":"Same submission assigned to multiple judges for cross-evaluation","given":"Submission S2 exists and judges Dave and Eve are both eligible (not team members)","when":"The curator assigns S2 to Dave, then separately assigns S2 to Eve","then":"Both assignments are created successfully, both judges see S2 in their queues, and both receive notifications with separate audit log entries"}]

#### US-051: Hybrid Judge Interface with Grid Overview
As a judge, I want to see all my assigned submissions in a grid overview with the ability to expand details so that I can efficiently review and compare multiple submissions.

**Acceptance Criteria:**
- Grid displays submission title, team name, problem category, and judging status (not started, in progress, completed)
- Judges can filter grid by category, problem, or judging status
- Judges can sort grid by submission date, team name, or problem title
- Clicking a submission expands an inline detail panel showing full submission content
- Expanded view displays the latest submitted version of all materials (description, demo video, presentation deck)
- Judges can navigate between expanded submissions without returning to grid view
- Grid persists judge's filter and sort preferences within the session
- Submission materials load progressively to handle large video files
- Interface works on tablet and desktop screen sizes

**Technical Notes:**
Implement a responsive grid-based judge interface using TanStack Table for efficient data handling and virtualization. The grid component should fetch assigned submissions via a Convex query (`getJudgeAssignments`) that joins submission data with team info, problem categories, and current judging status.

For the expandable detail panel, use a master-detail pattern where clicking a row renders an inline expansion below the grid row rather than a modal—this preserves context and enables quick navigation. Store expansion state locally and implement keyboard navigation (arrow keys, Enter to expand/collapse) for accessibility.

Filter and sort state should be managed via TanStack Router search params for URL persistence within session, falling back to React state. This enables shareable filtered views and browser back/forward navigation. Implement a `useJudgePreferences` hook that syncs these preferences.

For progressive loading of submission materials, implement a tiered approach: load metadata and thumbnails immediately, lazy-load video players only when expanded, and use R2 presigned URLs with short TTLs for secure video streaming. Consider HLS streaming for large videos via Cloudflare Stream integration if file sizes exceed 100MB.

Responsive design should use CSS Grid with `auto-fit` and `minmax()` for tablet adaptation—collapse to 2 columns on tablet, single-card view on narrow viewports. The expanded panel should stack below the selected card on mobile breakpoints.

Security: Verify judge assignment via Clerk session in all Convex queries. Cache submission data client-side with SWR pattern but invalidate on judging status changes from other judges.

**Test Cases:**
[{"description":"Grid displays all assigned submissions with correct metadata","given":"A judge is logged in and assigned to 5 submissions across 2 problem categories","when":"The judge navigates to the judging interface","then":"The grid displays all 5 submissions showing title, team name, problem category, and judging status for each, with 2 showing 'not started', 2 showing 'in progress', and 1 showing 'completed'"},{"description":"Filter submissions by judging status","given":"A judge is viewing a grid with 10 submissions in various judging states","when":"The judge selects 'In Progress' from the status filter dropdown","then":"The grid updates to show only submissions with 'in progress' status, the filter selection persists in the UI, and the URL search params reflect the active filter"},{"description":"Expand submission to view full details with progressive video loading","given":"A judge is viewing the submissions grid and a submission has a 200MB demo video attached","when":"The judge clicks on a submission row to expand it","then":"An inline detail panel expands below the row showing submission description and presentation deck immediately, while the video player shows a loading placeholder and begins streaming progressively without blocking the UI"},{"description":"Navigate between expanded submissions using keyboard","given":"A judge has expanded submission #3 in a list of 5 submissions and is viewing its details","when":"The judge presses the down arrow key followed by Enter","then":"Submission #3 collapses, submission #4 expands showing its full details, and focus moves to the newly expanded panel without returning to grid-only view"},{"description":"Grid adapts layout for tablet screen size","given":"A judge is viewing the submissions grid on a tablet device with 768px viewport width","when":"The interface loads and the judge expands a submission","then":"The grid displays in a 2-column layout, the expanded detail panel spans full width below the selected card, and all interactive elements remain accessible with touch targets of at least 44px"}]

#### US-052: Ranked Choice Scoring Submission
As a judge, I want to rank submissions using a ranked choice system so that my preferences are captured with appropriate point weighting.

**Acceptance Criteria:**
- Judge can assign 1st place (3 points), 2nd place (2 points), and 3rd place (1 point) rankings
- Each ranking position can only be assigned to one submission per judge
- Judge can leave submissions unranked (0 points) if they don't merit top 3
- Rankings can be modified until the judging phase closes
- System validates that judge hasn't assigned duplicate rankings
- Judge can clear all rankings and start over
- Interface shows visual feedback when rankings are saved
- Toast notification confirms successful ranking submission
- Rankings are saved automatically as judge makes selections (no separate save button required)
- All ranking changes are logged in audit trail with timestamp

**Technical Notes:**
Implement ranked choice scoring using Convex for real-time state management and persistence. Create a `judgeRankings` table with schema: `{ judgeId, hackathonId, submissionId, rank (1-3 or null), updatedAt }` with a compound unique index on `(judgeId, hackathonId, rank)` to enforce single-assignment constraint at database level.

Use Convex mutations with optimistic updates for immediate UI feedback on rank changes. Implement a `setRanking` mutation that: (1) validates judging phase is active via hackathon status check, (2) clears any existing rank assignment for the target position, (3) assigns new rank, (4) writes to audit log table. Wrap in transaction for atomicity.

Frontend: Build drag-and-drop ranking interface using `@dnd-kit/core` for accessible reordering. Display submissions in a list with three designated drop zones for 1st/2nd/3rd. Use Convex's `useMutation` with automatic retry and `useQuery` for real-time sync across tabs. Show optimistic UI state immediately, with rollback on error.

Audit logging: Create `rankingAuditLog` table capturing `{ judgeId, hackathonId, action, previousRank, newRank, submissionId, timestamp }`. Use Convex's `ctx.auth` to securely identify judge from Clerk session.

Edge cases: Handle concurrent modifications if judge has multiple tabs open (Convex handles this via real-time sync). Validate judge assignment to hackathon before allowing any mutations. Consider rate limiting rapid changes to prevent spam.

**Test Cases:**
[{"description":"Judge successfully assigns first place ranking","given":"A judge is assigned to an active hackathon with 5 submissions and judging phase is open","when":"The judge selects a submission and assigns it 1st place (3 points)","then":"The ranking is saved automatically, visual indicator shows the submission as ranked #1, toast notification confirms 'Ranking saved', and audit log records the action with timestamp"},{"description":"System prevents duplicate ranking positions","given":"A judge has already assigned Submission A as 1st place","when":"The judge attempts to assign Submission B as 1st place","then":"Submission A is automatically unranked, Submission B becomes 1st place, both changes are logged in audit trail, and UI updates to reflect the swap"},{"description":"Judge clears all rankings successfully","given":"A judge has assigned 1st, 2nd, and 3rd place rankings to three different submissions","when":"The judge clicks 'Clear All Rankings' and confirms the action","then":"All three submissions return to unranked state (0 points), visual feedback shows empty ranking slots, toast confirms 'Rankings cleared', and audit log records bulk clear action"},{"description":"Rankings cannot be modified after judging phase closes","given":"A judge has existing rankings and the hackathon judging phase has just closed","when":"The judge attempts to modify or add a new ranking","then":"The mutation is rejected with error message 'Judging phase has ended', existing rankings remain unchanged, UI disables ranking controls, and no audit entry is created for the failed attempt"},{"description":"Unranked submissions receive zero points","given":"A hackathon has 10 submissions and a judge has only ranked their top 3","when":"The system calculates points from this judge's rankings","then":"Ranked submissions receive 3, 2, and 1 points respectively, the remaining 7 submissions receive 0 points from this judge, and the judge's ranking is considered complete and valid"}]

#### US-053: Private Rankings During Active Judging
As a curator, I want all rankings to remain private until judging closes so that judges aren't influenced by others' scores and results remain confidential.

**Acceptance Criteria:**
- Judges can only see their own rankings, not other judges' rankings
- Curators and organisers can view aggregated scores during judging phase but individual judge rankings remain hidden
- No leaderboard or ranking information is visible to participants, problem proposers, or public during active judging
- API endpoints enforce privacy rules regardless of UI access
- Attempting to access ranking data returns appropriate error for unauthorized users
- System logs any attempts to access private ranking data
- Privacy status is clearly indicated in curator dashboard during active judging phase

**Technical Notes:**
Implement a multi-layered privacy enforcement system for rankings during active judging. Create a RankingPrivacyService that centralizes all access control logic, checking judging phase status and user role before returning any ranking data.

In Convex, design queries with built-in authorization: `getMyRankings` for judges (filtered by authenticated judge ID), `getAggregatedScores` for curators/organisers (returns only averages, counts, standard deviation - no individual scores), and internal-only `getAllRankings` used solely for aggregation calculations.

Implement a JudgingPhaseGuard middleware for all ranking-related API endpoints that checks hackathon phase status from the database before processing. Return 403 Forbidden with generic message for unauthorized access attempts - avoid revealing whether data exists.

Create an AuditLogService using a Convex table to record all ranking access attempts with timestamp, userId, requestedResource, accessGranted boolean, and userRole. Use Convex mutations to ensure atomic logging even on denied requests.

For the curator dashboard, add a PrivacyStatusBanner component that queries current judging phase and displays clear visual indicator (lock icon, colored badge) showing 'Rankings Private - Judging Active'. Use TanStack Query for real-time phase status updates.

Edge cases: Handle race conditions where judging closes mid-request using optimistic locking on phase status. Consider caching aggregated scores with short TTL (30 seconds) to reduce database load while maintaining near-real-time accuracy for curators.

**Test Cases:**
[{"description":"Judge can view only their own submitted rankings","given":"A judge has submitted rankings for 3 solutions and another judge has submitted rankings for the same solutions during active judging phase","when":"The first judge requests their rankings via the getMyRankings endpoint","then":"Only the first judge's 3 rankings are returned with full score details, and no data from the other judge's rankings is included in the response"},{"description":"Curator sees aggregated scores without individual judge details","given":"Active judging phase with 4 judges who have each ranked a solution with scores 8, 7, 9, and 6","when":"A curator requests the aggregated scores for that solution","then":"Response contains average score of 7.5, count of 4 reviews, and standard deviation, but no individual judge identifiers or their specific scores"},{"description":"Participant receives 403 when attempting to access any ranking data","given":"A participant who submitted a solution during active judging phase","when":"The participant attempts to call any ranking endpoint including getMyRankings, getAggregatedScores, or getSolutionRankings","then":"All requests return HTTP 403 Forbidden with message 'Ranking data is not available during active judging' and no ranking data is leaked in the response"},{"description":"Unauthorized access attempts are logged with full context","given":"A participant and a problem proposer both attempt to access ranking endpoints during active judging","when":"Each unauthorized request is processed and denied by the API","then":"Two audit log entries are created containing timestamp, user IDs, their roles, the specific endpoint requested, and accessGranted set to false"},{"description":"Privacy status indicator displays correctly on curator dashboard","given":"A curator is viewing the dashboard for a hackathon currently in active judging phase","when":"The dashboard loads and the judging phase status is fetched","then":"A visible privacy banner displays with lock icon and text 'Rankings Private - Judging In Progress' in a warning color scheme, and this status updates in real-time if phase changes"}]

#### US-054: Automated Score Aggregation and Tiebreaking
As a curator, I want the system to automatically aggregate judge rankings and apply tiebreaker rules so that I have accurate preliminary results when judging closes.

**Acceptance Criteria:**
- System calculates total points for each submission (sum of all judges' ranked choice points)
- Ties are broken first by count of 1st-place votes
- If still tied, secondary tiebreaker is count of 2nd-place votes
- If still tied after both tiebreakers, submissions share the same rank
- Curator can view detailed breakdown showing each judge's rankings per submission
- Aggregated results update in real-time as judges submit rankings
- System clearly indicates when ties exist and how they were resolved
- Results calculations are logged for audit purposes

**Technical Notes:**
Implement score aggregation as a Convex mutation triggered reactively when judge rankings change. Create a `calculateAggregatedScores` function that queries all submitted rankings for a hackathon's judging period, then computes totals using ranked-choice point values (e.g., 1st=N points, 2nd=N-1, etc. where N=submission count).

For tiebreaking, implement a multi-level sort: (1) total points descending, (2) count of 1st-place votes descending, (3) count of 2nd-place votes descending. Submissions still tied after all tiebreakers receive identical rank values with a `tiedWith` array reference.

Store results in an `aggregatedResults` table with fields: hackathonId, submissionId, totalPoints, rank, firstPlaceVotes, secondPlaceVotes, tieStatus, tieResolution (enum: 'first_place_count' | 'second_place_count' | 'shared_rank' | 'none'), and calculatedAt timestamp.

Create a separate `scoringAuditLog` table capturing each calculation event with input rankings snapshot, algorithm version, and resulting scores. Use Convex's real-time subscriptions for the curator dashboard—subscribe to the aggregatedResults query filtered by hackathonId.

For the detailed breakdown view, create a denormalized query joining submissions with all judge rankings, returning a matrix structure. Consider adding an index on (hackathonId, submissionId) for efficient lookups. Implement idempotent recalculation to handle late ranking modifications gracefully.

**Test Cases:**
[{"description":"Aggregate scores correctly from multiple judges","given":"A hackathon with 3 submissions and 2 judges who have both submitted complete rankings","when":"The score aggregation runs after the second judge submits","then":"Each submission has a totalPoints value equal to the sum of points from both judges' rankings"},{"description":"Break tie using first-place vote count","given":"Two submissions with identical total points where Submission A has 2 first-place votes and Submission B has 1 first-place vote","when":"The tiebreaker logic is applied","then":"Submission A ranks higher than Submission B and tieResolution shows 'first_place_count'"},{"description":"Break tie using second-place votes when first-place counts match","given":"Two submissions with identical total points and identical first-place vote counts, where Submission A has 3 second-place votes and Submission B has 1 second-place vote","when":"The tiebreaker logic is applied","then":"Submission A ranks higher than Submission B and tieResolution shows 'second_place_count'"},{"description":"Assign shared rank when all tiebreakers exhausted","given":"Two submissions with identical total points, identical first-place votes, and identical second-place votes","when":"The tiebreaker logic is applied","then":"Both submissions receive the same rank value, tieStatus is true, tieResolution shows 'shared_rank', and tiedWith arrays reference each other"},{"description":"Audit log captures calculation details","given":"A curator viewing results after aggregation completes","when":"The system logs the score calculation","then":"An audit entry exists with hackathonId, timestamp, snapshot of input rankings, algorithm version, and final computed scores"}]

#### US-055: Organiser Result Override Before Publishing
As an organiser, I want to override automated rankings before results are published so that I can account for special circumstances or apply additional criteria.

**Acceptance Criteria:**
- Organiser can adjust final placement of any submission in the leaderboard
- Override interface shows original calculated rank alongside the override field
- Organiser must provide a reason when overriding a result (required text field)
- Multiple submissions can be overridden in a single editing session
- Overrides can be reverted to original calculated rankings
- System distinguishes between calculated results and overridden results in curator/organiser view
- All overrides are logged in audit trail with organiser ID, original rank, new rank, reason, and timestamp
- Overrides can only be made before results are published
- Toast notification confirms when overrides are saved

**Technical Notes:**
## Implementation Approach

This feature requires a robust ranking override system with full audit capabilities, built on Convex's transactional guarantees.

### Data Model Extensions

Extend the `submissions` table with override fields: `overrideRank` (optional number), `overrideReason` (optional string), `overrideBy` (optional clerk user ID), `overrideAt` (optional timestamp). Create a new `rankOverrideAuditLog` table storing: `submissionId`, `hackathonId`, `originalRank`, `newRank`, `reason`, `organiserId`, `timestamp`, `action` (enum: 'override' | 'revert').

### Architecture Considerations

**Convex Mutations**: Implement `applyRankOverrides` mutation that accepts an array of `{submissionId, newRank, reason}` objects for batch processing. Use Convex transactions to ensure atomicity - either all overrides succeed or none do. Validate organiser permissions via Clerk session and confirm hackathon status is not 'published'.

**Rank Calculation Logic**: Create a `getEffectiveRankings` query that returns submissions with both `calculatedRank` (from judge scores) and `effectiveRank` (override if present, otherwise calculated). This dual-display approach satisfies the UI requirement.

**Security**: Implement row-level security checks ensuring only organisers/admins of the specific hackathon can apply overrides. Add publication status check at mutation level to hard-block post-publish modifications.

### Frontend Components

Build an `OverrideLeaderboard` component using TanStack Table with inline editing. Each row shows calculated rank (read-only), override input field, and reason textarea (required when rank differs). Visual indicators (badges/colors) distinguish overridden entries. Implement optimistic updates with rollback on error, displaying toast notifications via a lightweight library like Sonner.

**Test Cases:**
[{"description":"Successfully override a single submission ranking with valid reason","given":"An organiser is viewing the results dashboard for an unpublished hackathon with 5 ranked submissions where Submission A is ranked #3","when":"The organiser changes Submission A's rank to #1 and enters 'Exceptional innovation in accessibility features' as the reason and clicks Save","then":"The system saves the override, displays a success toast, shows Submission A with effective rank #1, displays the original calculated rank #3 alongside, and creates an audit log entry with organiser ID, timestamp, original rank 3, new rank 1, and the reason"},{"description":"Prevent override submission without providing a reason","given":"An organiser is editing the leaderboard for an unpublished hackathon and has changed Submission B's rank from #2 to #4","when":"The organiser attempts to save without entering a reason in the required text field","then":"The system prevents the save action, displays a validation error indicating reason is required, and highlights the empty reason field for Submission B"},{"description":"Batch override multiple submissions in single session","given":"An organiser is viewing results for an unpublished hackathon with submissions ranked 1-5","when":"The organiser overrides Submission C from #5 to #2 with reason 'Judge conflict of interest adjusted', overrides Submission D from #1 to #3 with reason 'Disqualification of bonus points per rule 4.2', and clicks Save All","then":"The system atomically saves both overrides, displays a single success toast confirming 2 overrides saved, updates the leaderboard to show new effective rankings, and creates two separate audit log entries"},{"description":"Revert an override back to calculated ranking","given":"An organiser is viewing results where Submission E has an active override (calculated rank #4, overridden to #2) with reason 'Initial adjustment'","when":"The organiser clicks the Revert button for Submission E and confirms the revert action","then":"The system removes the override, restores Submission E to effective rank #4, displays a success toast, removes the override visual indicator, and creates an audit log entry with action type 'revert' capturing the removal"},{"description":"Block override attempts after results are published","given":"An organiser navigates to the results page for a hackathon where results have already been published to participants","when":"The organiser attempts to access the override editing interface or modify any ranking","then":"The system displays the leaderboard in read-only mode, shows a notice stating 'Results have been published and cannot be modified', hides or disables all override input fields and save buttons, and any direct API mutation attempts return a 403 forbidden error"}]

#### US-056: Manual Leaderboard Publishing by Curators
As a curator, I want to manually publish the final leaderboard so that results only become visible to participants and public when I decide they are ready.

**Acceptance Criteria:**
- Publish button is only available after judging phase has officially closed
- Pre-publish preview shows exactly what participants will see including rankings, scores, and any overrides
- Curator must confirm publication with a confirmation dialog warning that this action cannot be undone
- Once published, leaderboard becomes visible to all participants and (if hackathon is public) the public
- Published results show team name, submission title, final rank, and total points
- All participants and team members receive email and in-app notification when results are published
- Publication timestamp and curator ID are logged in audit trail
- Published leaderboard cannot be unpublished (results are final)
- Organisers can still add commentary or announcements after publishing

**Technical Notes:**
Implement leaderboard publishing as a state transition on the hackathon document with strict phase validation. Create a Convex mutation `publishLeaderboard` that atomically updates hackathon status to 'results_published', sets `publishedAt` timestamp and `publishedBy` curator ID, and triggers notification fan-out. Use Convex's transactional guarantees to ensure the publish action is atomic.

The pre-publish preview should query the same data pipeline as the final public leaderboard view, using a `getLeaderboardPreview` query that respects score overrides and calculates final rankings. Store computed rankings in a denormalized `leaderboard_entries` table on publish to freeze results permanently.

For the confirmation flow, implement a two-step process: first call `prepareLeaderboardPublish` to validate eligibility and return preview data, then `confirmLeaderboardPublish` with a short-lived token to prevent accidental double-clicks. The frontend should use a modal with explicit confirmation text.

Notifications should be handled via Convex scheduled functions to avoid blocking the publish mutation. Fan out to all participants using a background job that batches email sends through a queue. Use Clerk's user metadata to fetch email addresses.

Audit logging should write to an immutable `audit_log` table with action type, actor ID, timestamp, and relevant entity IDs. Consider using Convex's system fields for tamper-evident timestamps.

Security: Verify curator role via Clerk session, validate hackathon phase is 'judging_closed', and ensure idempotency by checking if already published before proceeding.

**Test Cases:**
[{"description":"Curator successfully publishes leaderboard after judging closes","given":"A hackathon with judging phase officially closed, all scores finalized, and a curator logged in with valid permissions","when":"The curator clicks the publish button and confirms in the confirmation dialog","then":"The leaderboard becomes visible to all participants, publication timestamp and curator ID are recorded in audit trail, and hackathon status changes to results_published"},{"description":"Publish button is disabled during active judging phase","given":"A hackathon currently in active judging phase with judges still submitting scores","when":"A curator navigates to the leaderboard management page","then":"The publish button is disabled with tooltip explaining judging must close first, and no publish action can be triggered via API"},{"description":"Pre-publish preview accurately reflects final participant view","given":"A hackathon with completed judging, including manual score overrides on two submissions","when":"The curator clicks preview before publishing","then":"The preview displays team names, submission titles, final ranks, and total points exactly as participants will see them, with overridden scores reflected in rankings"},{"description":"All participants receive notifications upon publication","given":"A published leaderboard for a hackathon with 15 teams totaling 45 participants across all teams","when":"The leaderboard publication is confirmed","then":"All 45 participants receive both an email notification and an in-app notification with links to view results within 5 minutes of publication"},{"description":"Published leaderboard cannot be unpublished or republished","given":"A hackathon with already published results showing publication timestamp from 2 hours ago","when":"A curator or organiser attempts to unpublish or modify the published leaderboard rankings","then":"The system rejects the action with an error message stating results are final, and no changes are persisted to rankings or visibility"}]

### Epic: Platform Infrastructure

File upload handling via Cloudflare R2, comprehensive audit logging, standard rate limiting on all API endpoints, basic analytics (registrations, teams, submissions, completion rates), manual archival system, and combined error UX (inline validation + toast notifications).

#### US-057: Upload Demo Videos to Cloudflare R2
As a participant submitting a solution, I want to upload demo videos up to 500MB so that I can showcase my project's functionality to judges.

**Acceptance Criteria:**
- System accepts video uploads up to 500MB in common formats (MP4, WebM, MOV)
- Files exceeding 500MB are rejected with clear inline error message before upload starts
- Upload progress indicator shows percentage complete
- Successful uploads return a stored URL for the submission
- Files are stored in Cloudflare R2 with appropriate content-type metadata
- Failed uploads display toast notification with retry option
- Partial uploads are cleaned up automatically on failure

**Technical Notes:**
## Implementation Approach

Use **TUS protocol** via Cloudflare R2's resumable upload support for reliable large file transfers. Implement client-side validation before upload initiation to fail fast on invalid files.

### Architecture

**Client Layer (TanStack Start)**:
- Pre-upload validation: check file size (<500MB) and MIME type before any network request
- Use `@uppy/tus` or native `fetch` with `ReadableStream` for chunked uploads with progress tracking
- Implement exponential backoff retry logic (3 attempts, 1s/2s/4s delays)

**API Layer (Cloudflare Workers)**:
- Generate presigned URLs with 1-hour expiry for direct-to-R2 uploads
- Validate content-type header matches allowed formats
- Store metadata in Convex: `{submissionId, r2Key, contentType, size, uploadedAt, status}`

**Storage (R2)**:
- Bucket structure: `demos/{hackathonId}/{teamId}/{timestamp}-{hash}.{ext}`
- Set lifecycle rule: delete incomplete multipart uploads after 24 hours
- Configure CORS for direct browser uploads from allowed origins

### Dependencies
- Requires US-044 (Solution Submissions) for linking videos to submissions
- Clerk session token passed to Worker for authorization check

### Security Considerations
- Validate MIME type server-side (don't trust client Content-Type)
- Scan filenames for path traversal attempts
- Rate limit: max 3 concurrent uploads per user
- Consider virus scanning integration for production (ClamAV via Worker)

**Test Cases:**
[{"description":"Successfully upload valid MP4 video under size limit","given":"A participant is on the solution submission page with a 150MB MP4 file selected","when":"They initiate the upload","then":"Progress indicator shows percentage increasing from 0-100%, upload completes successfully, and a stored R2 URL is returned and associated with the submission"},{"description":"Reject oversized file before upload begins","given":"A participant selects a 650MB video file for upload","when":"The file is selected in the upload component","then":"An inline error message displays 'File exceeds 500MB limit' immediately, the upload button is disabled, and no network request is made"},{"description":"Reject unsupported video format","given":"A participant selects a 200MB AVI file for upload","when":"The file is selected in the upload component","then":"An inline error message displays 'Unsupported format. Please use MP4, WebM, or MOV' and upload is blocked"},{"description":"Handle network failure with retry option","given":"A participant is uploading a 300MB video and upload reaches 45% progress","when":"Network connection is interrupted causing upload failure","then":"A toast notification appears with message 'Upload failed. Check your connection.' and a 'Retry' button, progress indicator resets, and partial upload chunks are marked for cleanup"},{"description":"Automatic cleanup of abandoned partial uploads","given":"A participant started uploading a 400MB video but closed the browser at 60% progress 25 hours ago","when":"The R2 lifecycle policy runs","then":"The incomplete multipart upload parts are automatically deleted from R2 storage and no orphaned data remains"}]

#### US-058: Upload Presentation Decks to Cloudflare R2
As a participant submitting a solution, I want to upload presentation decks up to 50MB so that I can provide supporting documentation for my project.

**Acceptance Criteria:**
- System accepts presentation uploads up to 50MB in common formats (PDF, PPTX, KEY)
- Files exceeding 50MB are rejected with clear inline error message before upload starts
- Upload progress indicator shows percentage complete
- Successful uploads return a stored URL for the submission
- Files are stored in Cloudflare R2 with appropriate content-type metadata
- File type validation occurs client-side with server-side verification
- Toast notification confirms successful upload

**Technical Notes:**
Implement presentation deck uploads using Cloudflare R2 with a presigned URL workflow for secure, direct-to-storage uploads. Create a Cloudflare Worker endpoint that validates user authentication via Clerk, checks file metadata (size, type), and generates a presigned PUT URL for R2. Client-side validation should use File API to check size (<50MB) and MIME type before upload initiation.

For the upload component, use a custom React hook with XMLHttpRequest or fetch with ReadableStream to track upload progress. Store file metadata in Convex (filename, size, content-type, R2 key, uploader ID, timestamp) after successful upload confirmation. The R2 bucket should be configured with appropriate CORS headers for the frontend domain.

Server-side verification is critical: the Worker should validate Content-Type header matches allowed types (application/pdf, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/x-iwork-keynote-sfile) and reject mismatched uploads. Consider magic byte validation for enhanced security against renamed files.

Architecture flow: Client validates → Request presigned URL from Worker → Direct upload to R2 with progress tracking → Confirm upload via Worker → Store metadata in Convex → Return stored URL. Use R2's built-in content-type metadata storage. Implement retry logic with exponential backoff for network failures. Toast notifications should use the app's existing notification system for consistency.

**Test Cases:**
[{"description":"Successfully upload valid PDF presentation within size limit","given":"A participant is on the solution submission form with a 25MB PDF file selected","when":"The participant initiates the upload","then":"Upload progress indicator shows percentage advancing from 0-100%, upload completes successfully, toast notification confirms success, and stored R2 URL is returned and associated with the submission"},{"description":"Reject file exceeding 50MB size limit before upload starts","given":"A participant selects a 75MB PPTX file for upload","when":"The file is selected in the upload input","then":"An inline error message displays immediately stating the file exceeds the 50MB limit, no upload request is initiated, and the submit button remains disabled"},{"description":"Reject unsupported file format with clear error","given":"A participant selects a 10MB .zip file for upload","when":"The file is selected in the upload input","then":"Client-side validation displays inline error specifying accepted formats (PDF, PPTX, KEY), upload is prevented, and no network request is made"},{"description":"Server-side verification catches spoofed file extension","given":"A participant bypasses client validation and attempts to upload a .exe file renamed to .pdf","when":"The upload request reaches the Cloudflare Worker","then":"Server-side content-type verification fails, upload is rejected with 400 error, appropriate error message is displayed to user, and no file is stored in R2"},{"description":"Handle network interruption during upload gracefully","given":"A participant is uploading a 40MB presentation and upload is at 60% progress","when":"Network connection is temporarily lost","then":"Upload pauses, retry mechanism attempts reconnection with exponential backoff, progress indicator shows retry status, and user can cancel or wait for automatic retry"}]

#### US-059: Comprehensive Audit Logging for User Actions
As a platform administrator, I want all user actions logged with timestamps so that I can investigate issues, ensure compliance, and maintain transparency.

**Acceptance Criteria:**
- All create, update, and delete operations are logged to Convex
- Each log entry includes: user ID, action type, resource type, resource ID, timestamp, and IP address
- Role changes and permission modifications are logged with before/after states
- Authentication events (login, logout, failed attempts) are captured
- Submission version changes reference both old and new version IDs
- Logs are immutable once written (no edit or delete capability)
- Audit logs are queryable by user, action type, resource, and date range
- Sensitive data (passwords, tokens) is never included in log entries

**Technical Notes:**
Implement a centralized audit logging system using Convex with an immutable `auditLogs` table. Design the schema with fields: `id`, `userId`, `actionType` (enum: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, AUTH_FAILURE, ROLE_CHANGE, PERMISSION_CHANGE), `resourceType`, `resourceId`, `timestamp`, `ipAddress`, `metadata` (JSON for before/after states, version references). Create a reusable `logAuditEvent` internal Convex function that all mutations call after successful operations. For IP capture, extract from Cloudflare Workers request headers (`CF-Connecting-IP`) and pass through the Convex action context. Implement immutability by omitting any update/delete mutations for the auditLogs table and using Convex's schema validation. For authentication events, integrate with Clerk webhooks (`user.created`, `session.created`, `session.ended`) via a Cloudflare Worker endpoint that forwards to Convex. Create sanitization utilities that strip sensitive fields (password, token, secret, apiKey) from any metadata before logging. Build query functions with compound indexes on `userId`, `actionType`, `resourceType`, and `timestamp` for efficient filtering. Consider pagination using Convex's cursor-based approach for large result sets. For role/permission changes, capture diff using a helper that compares old and new states. Implement rate limiting on audit log queries to prevent abuse. Store submission version transitions as `{oldVersionId, newVersionId}` in metadata.

**Test Cases:**
[{"description":"Audit log captures resource creation with all required fields","given":"An authenticated user with a valid session and IP address 192.168.1.100","when":"The user creates a new hackathon resource","then":"An audit log entry is created with userId, actionType CREATE, resourceType hackathon, resourceId, timestamp within 1 second of now, and IP address 192.168.1.100"},{"description":"Role change logs include before and after states","given":"A user with role 'participant' exists and an admin is authenticated","when":"The admin changes the user's role to 'judge'","then":"An audit log entry is created with actionType ROLE_CHANGE and metadata containing beforeState 'participant' and afterState 'judge'"},{"description":"Sensitive data is excluded from audit log entries","given":"A user update operation includes fields: name, email, password, and apiToken","when":"The update operation completes and triggers audit logging","then":"The audit log metadata contains name and email but excludes password and apiToken fields"},{"description":"Audit logs are immutable and cannot be modified","given":"An existing audit log entry with id 'audit_123'","when":"Any attempt is made to update or delete the audit log entry via API or direct mutation","then":"The operation fails with an error indicating audit logs are immutable and the original entry remains unchanged"},{"description":"Failed authentication attempts are logged without exposing credentials","given":"A user attempts to login with email 'user@example.com' and an incorrect password","when":"The authentication fails","then":"An audit log entry is created with actionType AUTH_FAILURE, metadata containing email but no password field, and the source IP address"}]

#### US-060: Rate Limiting on API Endpoints
As a platform operator, I want all API endpoints rate-limited so that the platform remains stable and protected from abuse.

**Acceptance Criteria:**
- All Convex functions have rate limiting applied via Cloudflare Workers
- Standard endpoints limited to 100 requests per minute per user/IP
- File upload endpoints limited to 10 requests per minute per user
- Authentication endpoints limited to 10 attempts per minute per IP
- Rate-limited requests return HTTP 429 with Retry-After header
- Toast notification informs users when they've been rate-limited
- Rate limit counters reset after the specified time window
- Authenticated users tracked by user ID; unauthenticated by IP address

**Technical Notes:**
## Implementation Approach

Implement rate limiting at the Cloudflare Workers edge layer, intercepting requests before they reach Convex functions. This provides protection at the network edge and reduces load on the database.

### Architecture

**Edge Rate Limiter (Cloudflare Workers)**:
- Use Cloudflare's Rate Limiting API or implement custom solution with Workers KV/Durable Objects
- Durable Objects preferred for precise counting with atomic operations
- Extract user ID from Clerk JWT for authenticated requests; fall back to CF-Connecting-IP header
- Apply different rate limit tiers based on endpoint path patterns

**Endpoint Classification**:
```
/api/auth/* → 10 req/min (IP-based)
/api/upload/* → 10 req/min (user-based)
/api/* → 100 req/min (user/IP-based)
```

**Response Handling**:
- Return 429 status with `Retry-After` header (seconds until reset)
- Include `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers for client visibility
- Body should include machine-readable error code for frontend toast triggering

**Frontend Integration**:
- Create global fetch interceptor in TanStack Start to detect 429 responses
- Display toast via shared notification context with countdown from Retry-After
- Queue failed requests for automatic retry after limit resets

### Security Considerations
- Validate X-Forwarded-For chain to prevent IP spoofing
- Consider separate limits for suspicious patterns (failed auth attempts)
- Log rate limit events for abuse pattern analysis
- Implement gradual backoff for repeat offenders

**Test Cases:**
[{"description":"Standard endpoint allows requests within rate limit","given":"An authenticated user has made 50 requests to /api/hackathons in the current minute","when":"The user makes another GET request to /api/hackathons","then":"The request succeeds with HTTP 200 and X-RateLimit-Remaining header shows 49"},{"description":"Standard endpoint blocks requests exceeding rate limit","given":"An authenticated user has made 100 requests to /api/teams in the current minute","when":"The user attempts to make a 101st request to /api/teams","then":"The request is rejected with HTTP 429, Retry-After header indicates seconds until reset, and response body contains rate_limit_exceeded error code"},{"description":"File upload endpoint has stricter rate limit","given":"An authenticated user has uploaded 10 files via /api/upload in the current minute","when":"The user attempts to upload an 11th file","then":"The request is rejected with HTTP 429 and Retry-After header, and frontend displays toast notification explaining the upload limit"},{"description":"Authentication endpoint rate limits by IP address","given":"10 failed login attempts have been made from IP address 192.168.1.100 in the current minute","when":"An 11th login attempt is made from the same IP address with different credentials","then":"The request is rejected with HTTP 429 regardless of the user credentials provided"},{"description":"Rate limit counter resets after time window expires","given":"A user was rate-limited at timestamp T after making 100 requests and the Retry-After header indicated 45 seconds","when":"The user waits 45 seconds and makes a new request at timestamp T+45","then":"The request succeeds with HTTP 200 and X-RateLimit-Remaining shows 99"},{"description":"Unauthenticated requests are tracked by IP address","given":"An unauthenticated visitor from IP 10.0.0.50 has made 100 requests to public endpoints","when":"The same visitor makes another request without authentication","then":"The request is rejected with HTTP 429, while a different IP address can still make requests successfully"}]

#### US-061: Basic Platform Analytics Dashboard
As an organiser, I want to view analytics for my hackathon so that I can understand participation levels and track progress.

**Acceptance Criteria:**
- Dashboard displays total registrations count and registrations over time
- Dashboard shows number of teams formed and average team size
- Dashboard displays total submissions and submissions per problem/category
- Completion rate calculated as (submitted teams / registered teams) percentage
- Analytics update in real-time as data changes
- Data is scoped to the organiser's hackathon only
- Charts/visualizations are responsive and display correctly on desktop and tablet
- Export functionality for analytics data in CSV format

**Technical Notes:**
Implement analytics dashboard using Convex's real-time query capabilities for live data updates. Create a dedicated `analytics` module with aggregation queries that compute metrics server-side to minimize client-side processing.

**Architecture Approach:**
- Create Convex queries: `getRegistrationStats`, `getTeamStats`, `getSubmissionStats`, `getCompletionRate` - each scoped by hackathonId with organiser authorization check via Clerk
- Use Convex's reactive queries for automatic real-time updates without polling
- Implement time-series data using indexed queries on `createdAt` fields, aggregating by day/week buckets

**Visualization:**
- Use Recharts or Chart.js for responsive charts (line charts for time-series, bar charts for category breakdowns, gauge for completion rate)
- Implement responsive grid layout with TanStack Start, using CSS Grid with breakpoints for desktop (3-column) and tablet (2-column)

**CSV Export:**
- Create Convex action `exportAnalyticsCSV` that aggregates all metrics and generates CSV string
- Use client-side Blob/download for file generation to avoid R2 storage for temporary exports

**Security Considerations:**
- Verify organiser role and hackathon ownership in every query using Clerk session
- Avoid exposing participant PII in analytics - use counts and aggregates only

**Dependencies:** Requires US-012 (Team Formation) and submission stories for meaningful data. Consider caching expensive aggregations if performance degrades at scale.

**Test Cases:**
[{"description":"Dashboard displays accurate registration metrics for organiser's hackathon","given":"An organiser is authenticated and has a hackathon with 50 registrations spread across 7 days","when":"The organiser navigates to the analytics dashboard for their hackathon","then":"The dashboard displays total registrations as 50 and shows a time-series chart with correct daily registration counts"},{"description":"Analytics are scoped to prevent cross-hackathon data leakage","given":"Two hackathons exist: Hackathon A (owned by Organiser 1) with 30 teams and Hackathon B (owned by Organiser 2) with 15 teams","when":"Organiser 1 views analytics for Hackathon A","then":"Dashboard shows exactly 30 teams and no data from Hackathon B is visible or accessible"},{"description":"Completion rate calculates correctly with edge cases","given":"A hackathon has 20 registered teams, 8 teams have submitted solutions, and 2 teams have no members","when":"The completion rate metric is computed","then":"Completion rate displays as 40% (8/20) and handles zero-division gracefully if no teams exist"},{"description":"Real-time update reflects new submission immediately","given":"Organiser has analytics dashboard open showing 5 total submissions","when":"A participant submits a new solution to the hackathon","then":"The submission count updates to 6 without page refresh and submission-per-category chart reflects the change"},{"description":"CSV export generates valid file with all analytics data","given":"A hackathon has registration, team, and submission data available","when":"The organiser clicks the Export CSV button","then":"A CSV file downloads containing columns for metric name, value, and timestamp, with all dashboard metrics included and proper formatting"}]

#### US-062: Manual Hackathon Archival System
As an organiser, I want to manually archive completed hackathons so that they become read-only while remaining accessible for reference.

**Acceptance Criteria:**
- Archive action is available only to organisers after results are published
- Confirmation dialog warns that archival makes the hackathon read-only
- Archived hackathons display 'Archived' badge in all views
- All write operations are blocked on archived hackathons with clear error message
- Archived hackathons remain visible in organiser dashboard and public directory (if public)
- All data (submissions, teams, results, Q&A) remains viewable
- Archived hackathons are excluded from active analytics but retain historical data
- Archival action is logged in audit trail

**Technical Notes:**
Implement archival as a status transition in the hackathon lifecycle state machine. Add an `archivedAt` timestamp field and `archivedBy` reference to the hackathons table in Convex. Create a Convex mutation `archiveHackathon` that validates: (1) caller has organiser role, (2) hackathon status is 'results_published' or equivalent terminal state, (3) hackathon is not already archived. Use Convex's transactional guarantees to atomically update status and log the audit entry.

For write protection, implement a reusable middleware pattern or helper function `assertNotArchived(hackathonId)` that throws a structured error (e.g., `{ code: 'HACKATHON_ARCHIVED', message: 'This hackathon is archived and read-only' }`) to be called at the start of all write mutations affecting hackathon-related entities (submissions, teams, Q&A, etc.). This centralised check prevents scattered conditionals.

On the frontend, use TanStack Start loaders to fetch archival status and conditionally render the 'Archived' badge component across hackathon cards, detail pages, and dashboard views. Disable or hide edit/submit buttons when archived, showing tooltips explaining why. The confirmation dialog should use a modal component with explicit 'Archive' action button, clearly stating irreversibility.

For analytics exclusion, add a filter predicate `isArchived: false` to active metrics queries while ensuring historical/reporting queries include archived data. Consider adding an index on `(archivedAt, isPublic)` for efficient directory queries that may filter or sort by archival status.

**Test Cases:**
[{"description":"Organiser successfully archives a hackathon after results are published","given":"A hackathon with status 'results_published' and the user is an organiser of that hackathon","when":"The organiser confirms the archive action in the confirmation dialog","then":"The hackathon status changes to archived, archivedAt timestamp is set, an audit log entry is created, and the UI displays the 'Archived' badge"},{"description":"Archive action is blocked before results are published","given":"A hackathon with status 'judging_in_progress' and the user is an organiser","when":"The organiser attempts to access the archive action","then":"The archive button is disabled or hidden, and attempting the mutation via API returns an error stating results must be published first"},{"description":"Non-organiser cannot archive a hackathon","given":"A hackathon with status 'results_published' and the user is a participant but not an organiser","when":"The user attempts to call the archive mutation directly","then":"The system returns an authorisation error and the hackathon remains unarchived"},{"description":"Write operations are blocked on archived hackathons","given":"An archived hackathon with existing teams and submissions","when":"Any user attempts to create a submission, edit team details, or post a Q&A question","then":"The system returns error code 'HACKATHON_ARCHIVED' with message 'This hackathon is archived and read-only', and no data is modified"},{"description":"Archived hackathon remains visible and readable in public directory","given":"A public hackathon that has been archived with submissions, teams, and results data","when":"An anonymous user browses the public hackathon directory and views the archived hackathon detail page","then":"The hackathon appears in the directory with 'Archived' badge, and all historical data (submissions, teams, results, Q&A) is viewable but no edit controls are displayed"}]

#### US-063: Inline Form Validation Errors
As a user filling out forms, I want to see validation errors inline next to the relevant fields so that I can quickly identify and fix issues.

**Acceptance Criteria:**
- Required field errors appear below the field when user leaves it empty and moves focus
- Format validation (email, URL, date) shows errors immediately on blur
- Error messages are specific and actionable (not generic 'invalid input')
- Error styling uses consistent red color and error icon
- Errors clear automatically when user corrects the input
- Multiple errors on a form are all shown simultaneously
- Form submission is blocked until all inline errors are resolved
- Screen readers announce error messages for accessibility

**Technical Notes:**
## Implementation Approach

Build a reusable form validation system using **React Hook Form** with **Zod** schemas for type-safe validation. This integrates naturally with TanStack Start's server functions and provides excellent TypeScript support.

### Architecture

**Validation Layer:**
- Define Zod schemas per form (e.g., `hackathonSchema`, `submissionSchema`) with custom error messages
- Use `zodResolver` to connect schemas to React Hook Form
- Implement field-level validation on blur via `mode: 'onBlur'` with `reValidateMode: 'onChange'` for auto-clearing

**Component Structure:**
- Create `<FormField>` wrapper component handling error display, styling, and ARIA attributes
- Use `aria-describedby` linking input to error message `<span>`
- Implement `aria-invalid` and `role="alert"` for screen reader announcements
- Error icon from Lucide React (`AlertCircle`) with consistent sizing

**Styling:**
- Tailwind classes: `border-red-500`, `text-red-600`, `bg-red-50` for error states
- CSS variables for theming: `--error-color`, `--error-bg`
- Transition animations for error appearance/disappearance

### Dependencies
- Relies on US-023 (Design System) for consistent styling tokens
- Error messages should align with content guidelines from US-018 (if applicable)

### Security Considerations
- Never expose validation logic details that could aid exploitation
- Sanitize error messages to prevent XSS via user input reflection
- Server-side validation must mirror client-side (Zod schemas shared via `/shared` directory)

**Test Cases:**
[{"description":"Required field shows error on blur when empty","given":"User is on a form with a required 'Team Name' field","when":"User focuses the field, leaves it empty, and tabs to the next field","then":"Error message 'Team name is required' appears below the field with red styling and error icon"},{"description":"Email format validation shows specific error","given":"User is entering an email address in the contact email field","when":"User types 'invalid-email' and moves focus away","then":"Error message 'Please enter a valid email address' appears below the field"},{"description":"Error clears automatically when input is corrected","given":"User has triggered a validation error on a required field showing 'Hackathon title is required'","when":"User types a valid title into the field","then":"The error message disappears and field styling returns to normal state"},{"description":"Multiple errors display simultaneously on form","given":"User is on the hackathon creation form with multiple required fields","when":"User attempts to submit the form with 'Title' empty, 'Start Date' empty, and 'Description' under minimum length","then":"All three fields show their respective inline errors simultaneously and form does not submit"},{"description":"Screen reader announces error messages accessibly","given":"User with screen reader is filling out a form and focuses on the email field","when":"User enters 'not-an-email' and tabs away triggering validation error","then":"Screen reader announces 'Please enter a valid email address' and field is marked with aria-invalid='true'"}]

#### US-064: Toast Notifications for System Actions
As a user performing actions on the platform, I want toast notifications for system responses so that I receive clear feedback on action success or failure.

**Acceptance Criteria:**
- Success toasts appear for completed actions (save, submit, delete, etc.) in green styling
- Error toasts appear for system failures (network, server errors) in red styling
- Warning toasts appear for non-blocking issues in yellow styling
- Toasts auto-dismiss after 5 seconds for success, persist until dismissed for errors
- Toasts stack vertically when multiple appear, with newest on top
- Each toast has a manual dismiss button
- Toasts include relevant action context (e.g., 'Submission saved successfully')
- Toast position is consistent (top-right) and doesn't obstruct primary content

**Technical Notes:**
## Implementation Approach

Implement a centralized toast notification system using a React context provider with Zustand for lightweight state management. This approach enables toast triggering from anywhere in the app (components, API handlers, form submissions) without prop drilling.

### Architecture

**Toast Provider & Store:**
- Create `ToastContext` with Zustand store managing toast queue
- Each toast: `{ id, type: 'success' | 'error' | 'warning', message, context?, timestamp, autoDismiss }`
- Export `useToast()` hook returning `{ showSuccess, showError, showWarning, dismiss, dismissAll }`

**Toast Container Component:**
- Fixed position `top-4 right-4` with `z-50`, using `pointer-events-none` on container, `pointer-events-auto` on toasts
- Flexbox column-reverse for newest-on-top stacking
- CSS transitions for enter/exit animations (slide-in from right)

**Auto-dismiss Logic:**
- Success/warning: 5s timeout via `useEffect` with cleanup
- Errors: No auto-dismiss, require manual interaction
- Clear timeout on unmount or manual dismiss

### Integration Points

- Wrap app root in `ToastProvider`
- Create Convex mutation wrapper that auto-shows success/error toasts
- Integrate with TanStack Query's `onSuccess`/`onError` callbacks
- Handle Clerk auth errors with appropriate toasts

### Styling

Use Tailwind with semantic colors: `bg-green-50 border-green-500` (success), `bg-red-50 border-red-500` (error), `bg-yellow-50 border-yellow-500` (warning). Include appropriate icons (CheckCircle, XCircle, AlertTriangle) from Lucide.

**Test Cases:**
[{"description":"Success toast displays and auto-dismisses after action completion","given":"User is logged in and viewing a form","when":"User successfully submits a form and the server returns success","then":"A green success toast appears in top-right with message 'Submission saved successfully', auto-dismisses after 5 seconds"},{"description":"Error toast persists until manually dismissed","given":"User is performing an action that requires network connectivity","when":"The action fails due to a server error (500 response)","then":"A red error toast appears with descriptive message, remains visible indefinitely, and only disappears when user clicks dismiss button"},{"description":"Multiple toasts stack correctly with newest on top","given":"User has triggered one action that showed a success toast","when":"User triggers another action that also succeeds within 5 seconds","then":"Both toasts are visible, stacked vertically, with the newer toast positioned above the older one"},{"description":"Toast dismiss button removes individual toast","given":"Multiple toasts are displayed on screen","when":"User clicks the dismiss (X) button on the middle toast","then":"Only that specific toast is removed, other toasts remain visible and maintain their positions"},{"description":"Warning toast displays for non-critical issues","given":"User is uploading a file that exceeds recommended size but is still valid","when":"The system detects the oversized file during upload","then":"A yellow warning toast appears with message indicating file size concern, auto-dismisses after 5 seconds, and upload continues"}]

