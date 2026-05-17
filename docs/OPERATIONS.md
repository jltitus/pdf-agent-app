# Local Development

cd ~/Documents/pdf-agent-project/pdf-agent-app
nvm use 24
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

## Responsive UI Testing

After UI changes, test the app at desktop and mobile widths.

Recommended browser widths:
- 360px Android
- 390px iPhone
- 768px tablet
- 1024px desktop

Run before deployment:

```bash
cd ~/Documents/pdf-agent-project/pdf-agent-app
nvm use 24
npm run build

## Phase 1 Responsive UI Testing

After responsive UI changes, test the following pages:

- `/dashboard`
- `/chat`
- `/publications`
- `/help`
- `/admin` or `/request-access`

Recommended viewport widths:

- 360px Android
- 375px iPhone SE
- 390px iPhone 12/13/14
- 430px iPhone Pro Max
- 768px tablet
- 1280px desktop

Before deployment, run:

```bash
cd ~/Documents/pdf-agent-project/pdf-agent-app
nvm use 24
npm run build

## Phase 2 Mobile Chat QA

After Phase 2 mobile chat updates, test the following before deployment:

### Mobile widths

Test at:

- 360px Android
- 390px iPhone
- 430px large iPhone
- 768px tablet

Verify:

- Header displays logo/title and hamburger menu only.
- Hamburger menu opens and closes.
- Mobile navigation links work.
- Search Options card is clearly tappable.
- Search Options expands and collapses correctly.
- Answer mode, category, and publication filters still update search behavior.
- “How to use this” hides after Send or while loading.
- “Ready for your question” hides after Send or while loading.
- Searching, Reviewing sources, and Generating answer states display while loading.
- Bottom mobile Send bar remains usable.

### Desktop widths

Test at:

- 1024px desktop
- 1280px desktop

Verify:

- Desktop navigation remains visible inline.
- Desktop filters remain visible inline.
- Empty-state card hides once a question is submitted.
- Source cards, feedback buttons, broader search, regenerate, trusted answer save, and suggest source workflows still work.

Before deployment, run:

```bash
cd ~/Documents/pdf-agent-project/pdf-agent-app
nvm use 24
npm run build

## Phase 3 Admin Review Operations

After admin workflow changes, test these production routes:

- `/admin`
- `/admin/feedback`
- `/admin/issues`
- `/admin/enhancements`

Recommended checks:

- Main admin dashboard loads.
- Feedback review page loads and filters work.
- Issue review page loads and status changes work.
- Enhancement page loads.
- Admin notes save and remain visible after refresh.
- Issues can be marked reviewed, resolved, reopened, or enhancement candidate.
- Enhancement requests can be created and updated.
- Mobile widths remain usable at 360px, 390px, 430px, 768px, and desktop widths.

Before deployment, run:

```bash
cd ~/Documents/pdf-agent-project/pdf-agent-app
nvm use 24
npm run build

## User Activity Tracking Operations

### Tracking Events

The application currently tracks:
- Login events
- Chat question submissions
- General activity events

### Validation Checklist

After deployment verify:

- `profiles.last_activity_at` updates
- `profiles.last_login_at` updates
- `profiles.last_chat_at` updates
- `profiles.total_questions_asked` increments
- Admin dashboard displays usage metrics
- Mobile admin layout remains responsive

### Troubleshooting

#### Activity fields remain null

Check:
1. Supabase RPC exists:
   - `track_profile_activity`
2. Authenticated users have matching `profiles.id`
3. `/api/track-user-activity` returns HTTP 200
4. Browser network requests succeed

#### Question counts incorrect

Check:
- Tracking calls occur only in primary chat submission flow
- Retry/regenerate flows are not double-counting

### Deployment Notes

After deploying:
1. Ask several chat questions
2. Verify activity fields in Supabase
3. Confirm Admin dashboard metrics update
4. Test responsive layouts on mobile devices

## Phase 5 PDF Processing Operations

### Admin Processing Checks

After uploading, replacing, or reprocessing a PDF, verify:

- Processing status reaches `processed`
- Processing progress reaches `100`
- Page count displays correctly
- `processing_error` is empty
- PDF opens from the Admin document list
- Chat can retrieve answers from the processed PDF

### Failed Processing Troubleshooting

If processing fails, check the Admin document card and Supabase `documents` row.

Common statuses:

| Status | Meaning | Admin Action |
|---|---|---|
| `encrypted` | PDF is password protected or encrypted | Upload an unlocked PDF |
| `invalid_pdf` | File is not a valid PDF | Re-export or replace the PDF |
| `failed` | Processing failed during parsing, upload, or indexing | Review `processing_error`, then retry |
| `processing` | PDF is currently being processed | Wait before retrying |
| `processed` | PDF is searchable | No action needed |

### Local Phase 5 Testing

Before deployment, run:

```bash
cd ~/Documents/pdf-agent-project/pdf-agent-app
nvm use 24
npm run build
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev

## Phase 6 Proxy & Authentication Validation

After authentication or framework-routing changes, validate the following:

### Authentication Validation

Verify:

- Login succeeds
- Session persists after refresh
- Logout clears session correctly
- Protected pages redirect correctly when logged out
- Admin-only routes remain protected
- Supabase auth cookies refresh correctly

### Password Reset Validation

Verify:

- `/forgot-password` sends reset/setup email
- Password reset link opens correctly
- `/update-password` updates credentials successfully
- User can log in after password update

### Next.js Proxy Validation

The application now uses:

- `proxy.ts` (Next.js 16+ convention)

instead of:

- `middleware.ts` (deprecated)

Verify after upgrades:

- No middleware deprecation warnings during `npm run build`
- Vercel deployments complete successfully
- Edge request handling continues functioning normally

### Deployment Validation

Before production deployment:

```bash
cd ~/Documents/pdf-agent-project/pdf-agent-app
nvm use 24
npm run build

## Phase 7 Auth QA

After auth/session changes, verify:

- Logged-out users visiting protected routes redirect to `/session-expired`.
- Signing in again returns the user to the intended route.
- Admin users can access `/admin`.
- Non-admin users see access denied on `/admin`.
- `/forgot-password` works.
- Invitation setup links to `/update-password` work.
- Supabase SSR auth cookies refresh correctly through `proxy.ts`.

Before deployment, run:

```bash
cd ~/Documents/pdf-agent-project/pdf-agent-app
nvm use 24
npm run build

# MFP Publication Agent Operational Playbook

## 1. Architecture Overview

The MFP Publication Agent is a Next.js 16 App Router application using TypeScript, Tailwind CSS, Supabase, OpenAI, Resend, and Vercel. Core areas include authentication, chat, publications, admin, and PDF processing. The current architecture documentation identifies these as the major app areas. :contentReference[oaicite:0]{index=0}

Primary user workflows:
- Users sign in through Supabase Auth.
- Users ask publication questions in `/chat`.
- The app retrieves relevant publication content and returns cited answers.
- Admins manage PDFs, access requests, feedback, issues, analytics, trusted answers, and enhancements.
- Uploaded PDFs are processed into searchable page-level records.

## 2. Folder Structure Explanation

The app uses the Next.js App Router structure. The current file tree includes `/app`, `/app/api`, `/app/admin`, `/app/chat`, `/app/publications`, `/docs`, `/lib/supabase`, and `/public`. :contentReference[oaicite:1]{index=1}

Key folders:
- `/app` — pages, layouts, and route groups
- `/app/api` — server-side API routes
- `/app/admin` — admin dashboard and admin review pages
- `/app/chat` — main AI chat interface
- `/app/publications` — active publication library
- `/lib/supabase` — Supabase browser/server clients
- `/public` — icons, logos, screenshots, and static assets
- `/docs` — architecture, database, routes, changelog, and operations documentation

## 3. Supabase Setup

Supabase supports:
- Authentication
- User profiles
- Access requests
- Documents
- Document pages
- Chat history
- Feedback
- Issue reports
- Trusted answers
- Admin notes
- Enhancement requests
- Storage bucket for PDFs

Important tables currently documented include `profiles`, `access_requests`, `admin_notes`, `enhancement_requests`, and `issue_reports`. The `profiles` table also includes activity tracking fields such as `last_activity_at`, `last_login_at`, `last_chat_at`, and `total_questions_asked`. :contentReference[oaicite:2]{index=2}

## 4. Resend Setup

Resend is used for branded app emails, including:
- User invitation emails
- Resent setup links
- Access approval messages
- Issue notifications

Operational checks:
- Confirm Resend API key is present in Vercel and `.env.local`.
- Confirm sender domain is verified.
- Confirm invitation emails are delivered after access approval.
- Confirm password setup/reset links route users to `/update-password`.

## 5. Vercel Deployment

Deployment is handled through Vercel.

Standard deployment process:
```bash
cd ~/Documents/pdf-agent-project/pdf-agent-app
nvm use 24
npm run build
git status
git add .
git commit -m "Update operational playbook"
git push

# Deployment Operations Workflow

## Standard Deployment Process

### 1. Local Validation
Run:

```bash
npm run build

## Release Communication Workflow

After production deployment:

1. Update:
   - `NEXT_PUBLIC_APP_VERSION`
   - release notes
   - `/whats-new`

2. Verify:
   - release banner appears
   - dismiss behavior works
   - mobile responsiveness remains intact

3. Smoke test:
   - `/dashboard`
   - `/chat`
   - `/publications`
   - `/whats-new`

4. Confirm release communication visibility before announcing deployment.

## Standard Smoke Test Workflow

After deployment logging:

1. Open:
   - `/admin/releases`

2. Locate deployment record

3. Select:
   - `Create standard smoke tests`

4. Validate:
   - dashboard
   - chat
   - publications
   - release notes
   - admin pages

5. Mark:
   - pass
   - fail
   - blocked

6. Add operational notes where needed

7. Confirm deployment readiness before final release communication