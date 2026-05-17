# MFP Publication Agent Architecture

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS
- Supabase
- OpenAI
- Resend
- Vercel

## Major Areas

- Authentication
- Chat
- Publications
- Admin
- PDF Processing

## UI Responsiveness

- Shared navigation is handled by `app/components/HeaderBar.tsx`.
- The header uses a mobile-first layout with wrapped navigation buttons for small screens.
- The Publications page uses `app/publications/page.tsx` for server-side document loading and `app/publications/PublicationsTable.tsx` for responsive display.
- Publications render as cards on mobile and as a table on medium and larger screens.

## Responsive Publications UI

The Publications page uses a mobile-first responsive layout.

- `app/publications/page.tsx` loads active publication records from Supabase.
- `app/publications/PublicationsTable.tsx` displays publications as cards on mobile and tablet widths.
- On large desktop screens, publications display in a table.
- Publication cards and table rows show title, filename, category, version, date, and an Open PDF action.
- PDF links use the existing `/api/view-source?file=` route.
- Shared navigation is handled by `app/components/HeaderBar.tsx`.
- The Chat navigation item uses `public/chat-icon.png`.

## Phase 2 Mobile Chat and Navigation UX

The chat experience continues to use `app/chat/page.tsx` for the client-side chat interface and `app/components/HeaderBar.tsx` for shared navigation.

Phase 2 mobile refinements include:

- Mobile chat filters are collapsed into a tappable Search Options card.
- Desktop chat filters remain visible inline.
- The mobile-only “How to use this” guidance hides after a question is submitted or while the agent is loading.
- The empty “Ready for your question” state hides after a question is submitted or while the agent is loading.
- Shared navigation now uses a hamburger menu on mobile and tablet widths to reduce vertical space.
- Desktop navigation remains visible inline at large screen widths.

## Phase 3 Admin Review Architecture

Phase 3 expands the admin area into a more maintainable review workflow.

- `app/admin/page.tsx` remains the main admin dashboard.
- `app/admin/feedback/page.tsx` provides detailed feedback review.
- `app/admin/issues/page.tsx` provides detailed issue review.
- `app/admin/enhancements/page.tsx` provides enhancement request tracking.
- `app/api/admin-notes/route.ts` supports admin notes/comments.
- `app/api/enhancement-requests/route.ts` supports enhancement request creation and updates.

The admin interface uses mobile-first card layouts for smaller screens while preserving larger-screen review workflows.


---

## User Activity Tracking Architecture

### Overview

Phase 4 introduced centralized user activity tracking for engagement analytics and admin reporting.

Tracked metrics include:
- Last activity
- Last login
- Last chat interaction
- Total questions asked

### Flow

1. User logs in or submits a chat question
2. Frontend calls:
   - `/api/track-user-activity`
3. API validates authenticated session
4. API invokes Supabase RPC:
   - `track_profile_activity`
5. RPC updates `profiles` activity fields securely using `auth.uid()`

### Security Model

The architecture uses:
- Supabase Auth
- Row Level Security (RLS)
- `SECURITY DEFINER` RPC function

This avoids exposing direct profile updates from the client while preserving secure authenticated ownership checks.

### Admin Dashboard Integration

The Admin dashboard now surfaces:
- Last activity timestamps
- Last login timestamps
- Last chat timestamps
- Total questions asked

Both mobile card layouts and desktop table layouts support activity visibility.

## Phase 5 PDF Processing Reliability

Phase 5 improves reliability and admin visibility for PDF ingestion.

### Processing Lifecycle

PDFs now move through a tracked lifecycle:

- `pending`
- `validating`
- `processing`
- `processed`
- `failed`
- `encrypted`
- `invalid_pdf`

### Processing Flow

1. Admin uploads or replaces a PDF.
2. The app validates that the file is a readable PDF.
3. Encrypted/password-protected PDFs are blocked before processing.
4. Existing page records are cleared before retry/reprocessing.
5. Page-level text files are generated and uploaded to OpenAI.
6. Page records are saved in `document_pages`.
7. The document row is updated with processing status, progress, retry count, timestamps, and errors.

### Replacement Safety

Replacement PDFs are validated before the existing active document is archived. If the replacement PDF is invalid or encrypted, the original document remains active.

---

## Phase 6 Proxy Architecture Migration

### Overview

The application migrated from the deprecated Next.js `middleware.ts` convention to the new `proxy.ts` convention introduced in newer Next.js releases.

This preserves long-term compatibility with:
- Next.js 16+
- Supabase SSR authentication
- Vercel Edge runtime behavior

### Authentication Flow

The root-level `proxy.ts` file now:

1. Intercepts incoming requests
2. Initializes the Supabase SSR server client
3. Refreshes authenticated sessions when needed
4. Synchronizes auth cookies between request and response
5. Preserves authenticated route protection

### Protected Route Compatibility

The migration preserves behavior for:
- `/dashboard`
- `/chat`
- `/publications`
- `/admin`
- Admin review routes
- Password reset/update flows

### Deployment Compatibility

The proxy implementation was validated against:
- Local Next.js development
- Production Vercel deployment
- Supabase SSR cookie handling
- Edge runtime request forwarding

## Phase 7 Authentication & Session Architecture

Phase 7 centralizes authenticated route protection in `proxy.ts`.

The proxy:
- Uses Supabase SSR auth cookies.
- Refreshes sessions through `createServerClient`.
- Redirects logged-out users away from protected routes.
- Sends expired or missing sessions to `/session-expired`.
- Allows password setup/reset routes to continue working.

Admin-only authorization remains enforced by admin profile checks in the admin UI and supporting API routes.

## Operational Playbook Reference

The operational playbook in `docs/OPERATIONS.md` is now the primary runbook for maintaining the MFP Publication Agent. It includes architecture overview, deployment workflow, authentication flow, PDF processing workflow, OpenAI workflow, admin operations, troubleshooting, backup/recovery, and mobile testing.