# Changelog

## 2026-05-16
- Fixed password reset flow
- Added branded email sender
- Added Publications page
- Improved shared header navigation for mobile-first responsive use.
- Replaced the Chat navigation emoji with `public/chat-icon.png`.
- Improved Publications page spacing and layout for iPhone, Android, tablet, and desktop.
- Converted Publications page to mobile card layout and desktop table layout.
- Added visible publication category, version, date, filename, and Open PDF action.
- Fixed Publications page PDF links to use the existing `/api/view-source?file=` route.
- Continued Phase 2 chat experience improvements.
- Improved mobile chat usability by collapsing answer mode, category, and publication filters into a clearer tappable Search Options card.
- Updated chat empty-state behavior so “How to use this” and “Ready for your question” hide once a question is submitted or the agent is loading.
- Added a mobile hamburger navigation menu to reduce vertical space used by the shared header on phone and tablet widths.
- Preserved desktop navigation and desktop chat filter behavior.
## 2026-05-16
- Completed Phase 3 admin improvements.
- Improved admin mobile responsiveness and usability.
- Converted admin access request, user invite, feedback, issue, and enhancement workflows to mobile-friendly card layouts.
- Added detailed admin review pages for feedback and issue reports.
- Added admin notes/comments for feedback, issue reports, and enhancement requests.
- Added enhancement tracking workflow with a dedicated `/admin/enhancements` page.
- Added issue status workflow support for `new`, `reviewed`, `resolved`, and `enhancement_candidate`.
- Added direct admin navigation link to enhancement tracking.
## Phase 4 — User Activity Tracking & Admin Analytics

### Added
- User activity tracking for:
  - Last activity timestamp
  - Last login timestamp
  - Last chat timestamp
  - Total questions asked
- Secure Supabase RPC function for profile activity updates
- Admin dashboard user activity metrics
- Mobile-friendly usage analytics display
- Desktop usage analytics table column
- Activity tracking API endpoint:
  - `/api/track-user-activity`

### Improved
- More efficient profile analytics loading in Admin
- Better visibility into user engagement and usage
- Responsive admin analytics cards and user metrics

### Security
- Activity updates now use a Supabase `SECURITY DEFINER` RPC function
- Tracking updates safely respect Row Level Security (RLS)

### Database
Added columns to `profiles`:
- `last_activity_at`
- `last_login_at`
- `last_chat_at`
- `total_questions_asked`
## Phase 5 — PDF Processing Reliability

### Added
- Added document processing lifecycle tracking for PDF validation, processing, success, failure, encrypted PDFs, and invalid PDFs.
- Added persistent processing progress, retry count, processing timestamps, file size, last processed page, and processing error visibility.
- Added encrypted/password-protected PDF detection before processing.
- Added validation for invalid, empty, unreadable, or image-only PDFs.
- Added retry-safe processing that clears old page records before reprocessing.

### Improved
- Improved `/api/process-document` error handling with clearer admin-facing messages.
- Improved replacement workflow so invalid or encrypted replacement PDFs do not archive the existing working document.
- Improved Admin document visibility with processing status, progress, retry details, and error messages.

## Phase 6 — Next.js Proxy Migration & Auth Compatibility

### Updated
- Replaced deprecated `middleware.ts` with Next.js 16 `proxy.ts`
- Preserved Supabase SSR auth/session handling during framework migration
- Maintained protected route behavior for authenticated and admin-only pages
- Verified password reset and invitation setup flows continue working
- Confirmed Vercel deployment compatibility with Next.js proxy routing

### Improved
- Removed Next.js build deprecation warning for middleware
- Modernized request/session interception for future Next.js compatibility
- Preserved existing cookie/session refresh behavior used by Supabase SSR auth

## Phase 6B — Cleanup

### Updated
- Updated file tree documentation to replace deprecated `middleware.ts` with `proxy.ts`
- Confirmed Phase 6 proxy migration documentation is synchronized with the current project structure

## Phase 7 — Authentication & Session Hardening

### Improved
- Added centralized protected-route handling through `proxy.ts`.
- Improved logged-out and expired-session experience with `/session-expired`.
- Preserved Supabase SSR session refresh behavior.
- Improved admin access-denied messaging.
- Confirmed password reset and invitation setup flows continue to work.

### Security
- Protected authenticated app routes from logged-out access.
- Preserved admin-only route protection for `/admin` and admin subroutes.


Documentation updates needed:

`docs/CHANGELOG.md`

```md
## 2026-05-16 — Operational Playbook

### Added
- Created a professional operational playbook covering architecture, folder structure, Supabase, Resend, Vercel, OpenAI workflow, PDF processing, authentication, admin operations, troubleshooting, backup/recovery, local development, environment variables, mobile testing, and deployment checklist.

### Notes
- Documentation-only update.
- No application code or database schema changes required.

# Version 1.8.x

## Release Management System
- Added admin release management
- Added release planning workflow
- Added release status tracking:
  - planned
  - development
  - qa
  - production
  - archived
- Added release editing
- Added release delete/archive handling
- Added release-to-enhancement mapping
- Added release-to-issue mapping

## Deployment Management
- Added deployment history tracking
- Added deployment environment logging
- Added deployment notes support
- Added deployment edit/delete controls

## Smoke Test Tracking
- Added deployment smoke test workflow
- Added smoke test statuses:
  - pending
  - pass
  - fail
  - blocked
- Added route-level verification tracking
- Added smoke test notes and timestamps

## User Experience
- Added public “What’s New” page
- Added version display in header/footer
- Added responsive mobile hamburger navigation
- Improved iPhone/mobile header usability

## Admin Improvements
- Added centralized release governance workflow
- Added operational deployment verification process

## Version 1.8.x

### Release Communication Improvements
- Added first-login “What’s New” experience
- Added dismissible release update banner
- Added automatic version-aware update notifications
- Added persistent dismissal state using browser local storage
- Added direct navigation to `/whats-new`
- Improved release communication visibility for users

## Version 1.8.x

### Deployment Smoke Test Automation
- Added reusable standard smoke-test templates
- Added one-click smoke-test generation
- Added duplicate smoke-test prevention
- Added standardized deployment verification workflow
- Added route-based smoke-test automation for:
  - `/dashboard`
  - `/chat`
  - `/publications`
  - `/whats-new`
  - `/admin`
  - `/admin/releases`

### Deployment Operations
- Improved deployment governance workflow
- Improved production verification consistency
- Added operational deployment readiness validation

## Version 1.8.x

### Admin Analytics Dashboard
- Added `/admin/analytics`
- Added operational reporting dashboard
- Added release lifecycle metrics
- Added deployment metrics
- Added smoke-test health reporting
- Added enhancement backlog visibility
- Added issue backlog visibility
- Added deployment readiness indicators
- Added operational status summaries

## Version 1.8.x

### Public Product Roadmap
- Added public `/roadmap` page
- Added roadmap visibility controls for enhancements
- Added admin public/internal enhancement toggle
- Added roadmap navigation link
- Added user-visible feature planning transparency
- Added roadmap grouping:
  - Planned
  - In Progress
  - Released

### Enhancement Governance
- Added `is_public` enhancement visibility control
- Improved enhancement lifecycle transparency
- Improved communication of upcoming features