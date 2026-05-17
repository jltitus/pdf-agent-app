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

# Release Governance Architecture

The application includes an internal release governance system supporting:

- Release planning
- Deployment tracking
- Smoke test verification
- Public release communication
- Enhancement and issue association

## Core Components

### Releases
Used to group enhancements, fixes, and operational deployments into versioned releases.

### Deployment History
Tracks deployment activity across:
- production
- preview
- local

### Smoke Testing
Provides structured verification records for key application routes after deployment.

### Public Release Notes
The `/whats-new` route exposes production-ready release summaries to end users.

## Operational Workflow

1. Create release
2. Associate enhancements/issues
3. Deploy to environment
4. Log deployment
5. Execute smoke tests
6. Publish release notes
7. Communicate changes to users

## Release Communication Experience

The application includes a lightweight release communication system designed to surface new functionality to users after deployments.

### Components
- `app/components/WhatsNewBanner.tsx`
- `app/whats-new/page.tsx`

### Behavior
- Displays release update banner after application version changes
- Uses `NEXT_PUBLIC_APP_VERSION`
- Stores dismissal state in browser local storage
- Automatically redisplays after future version changes

### Persistence
Current implementation uses:
- `localStorage.mfpDismissedVersion`

Future enhancement options:
- per-user server-side tracking
- release acknowledgment analytics
- forced-read release notices

## Smoke Test Automation Architecture

The deployment verification system supports reusable smoke-test templates for standardized operational validation.

### Features
- Bulk smoke-test creation
- Route verification templates
- Duplicate prevention
- Deployment-linked operational validation

### Standard Verification Routes
- `/dashboard`
- `/chat`
- `/publications`
- `/whats-new`
- `/admin`
- `/admin/releases`

### Workflow
1. Deployment logged
2. Standard smoke tests generated
3. Operational verification executed
4. Deployment readiness confirmed

## Admin Analytics Architecture

The application includes an operational analytics dashboard for release governance and deployment monitoring.

### Route
- `/admin/analytics`

### Reporting Areas
- Release metrics
- Deployment metrics
- Smoke-test health
- Enhancement backlog
- Issue backlog
- Operational readiness indicators

### Data Sources
- `releases`
- `deployment_history`
- `deployment_smoke_tests`
- `enhancement_requests`
- `issue_reports`

### Purpose
Provides centralized operational visibility for:
- deployment readiness
- release velocity
- operational quality
- backlog monitoring
- admin governance

## Public Roadmap Architecture

The application includes a user-facing roadmap system providing transparency into planned and released features.

### Public Route
- `/roadmap`

### Public API
- `/api/public-roadmap`

### Visibility Model
Enhancements are only displayed publicly when:
- `enhancement_requests.is_public = true`

### Roadmap Sections
- Planned
- In Progress
- Released

### Purpose
Provides:
- feature transparency
- user communication
- release visibility
- roadmap governance
- operational trust

# Phase 9 Architecture Updates

## User Profile System

The application now includes a profile-centric user experience layer.

### Components
- Profile dashboard
- Profile editing workflow
- Community directory
- Saved publication system
- Saved answer system
- Avatar storage integration

---

## Saved Content Architecture

### Saved Publications
Flow:
1. User saves publication from `/publications`
2. Client calls `/api/favorites`
3. API persists favorite relationship
4. Profile dashboard loads saved publications

### Saved Answers
Flow:
1. User saves answer from `/chat`
2. Client calls `/api/saved-chats`
3. API stores question/answer snapshot
4. Profile dashboard displays saved answers

---

## Avatar Storage Architecture

Supabase Storage bucket:
- `profile-avatars`

Storage path convention:
- `{user_id}/{filename}`

Security:
- RLS enforced ownership rules
- Public read access for displayed avatars

---

## Navigation Architecture

Desktop:
- Single-row responsive nav tabs
- Active route highlighting
- Lightweight scalable layout

Mobile:
- Hamburger menu navigation
- Responsive card-based layout preserved

# Phase 10A Retrieval & Evidence Architecture

## Retrieval Ranking Improvements

The chat retrieval workflow now includes semantic source ranking and weighted evidence scoring.

### Ranking Signals
Sources are ranked using:
- matching page counts
- supporting excerpt counts
- semantic similarity to:
  - publication title
  - filename
  - retrieved excerpts
- category alignment

### Evidence Scoring
Evidence strength now considers:
- supporting page density
- supporting excerpt density
- number of corroborating publications
- overall source relevance score

Evidence levels:
- Strong
- Moderate
- Limited
- Not found

### Conversation Context Optimization

Follow-up conversation context is now compacted before being sent to OpenAI to reduce token usage while preserving conversational continuity.

Improvements include:
- reduced retained turn count
- compacted answer summaries
- reduced prompt payload size

### Retrieval Depth

OpenAI Responses API file search retrieval depth increased from:
- 5 results
to:
- 7 results

to improve grounding and citation quality.