# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js Version Warning

This project uses **Next.js 16**, which has breaking changes from earlier versions. Before writing any Next.js-specific code, check `node_modules/next/dist/docs/` for the authoritative API reference. Do not assume conventions from older versions.

## Commands

All commands must be run from inside `pdf-agent-app/` with Node 24 active:

```bash
nvm use 24
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev   # local dev server
npm run build                                 # production build (run before every deploy)
npm run lint                                  # ESLint
```

The `NODE_TLS_REJECT_UNAUTHORIZED=0` flag is required locally due to SSL certificate behavior in this environment.

## Architecture Overview

**MFP Publication Reference System** — a document-grounded AI chat application for querying food preservation publications (PDFs). Users ask questions; the system retrieves cited answers from indexed PDFs via the OpenAI Responses API.

**Stack**: Next.js 16 App Router · TypeScript · Tailwind CSS v4 · Supabase (auth + DB + storage) · OpenAI · Resend · Vercel

### Auth & Route Protection

Route protection is in `proxy.ts` (root of the app), **not** `middleware.ts`. Next.js 16 uses the `proxy` export convention. Authenticated sessions are managed via Supabase SSR cookies using `@supabase/ssr`.

- Unauthenticated users hitting protected routes → redirected to `/session-expired?redirectTo=...`
- Authenticated users hitting auth routes (`/login`, `/forgot-password`, etc.) → redirected to `/dashboard`
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/server.ts` — server-side Supabase client (for API routes and Server Components)

### Core Chat Flow (`app/api/chat/route.ts`)

1. User submits a question with optional publication/category filters
2. API detects whether the question is a follow-up using heuristics (length, pronoun references, conversational phrases)
3. Prior conversation context is compacted before being sent to OpenAI to reduce token usage
4. OpenAI Responses API performs file search (retrieval depth: 7 results) against indexed PDF page files
5. Sources are ranked using semantic similarity, topic clusters, page/excerpt density, and category alignment
6. Evidence strength is classified as Strong / Moderate / Limited / Not found
7. Response returns answer + citations with relevance explanations

Grounding safeguard: prior AI-generated answers are never used as retrieval evidence.

### PDF Processing Flow (`app/api/process-document/route.ts`)

PDFs go through a tracked lifecycle: `pending → validating → processing → processed` (or `failed`, `encrypted`, `invalid_pdf`).

Processing uses database-backed locks (`documents.processing_locked_until`) to prevent duplicate runs — intentionally lightweight and Vercel-compatible (no Redis/BullMQ). Replacement PDFs (`app/api/replace-document/route.ts`) are validated before the existing active document is archived.

### Key Shared Libraries

- `lib/rate-limit.ts` — in-memory rate limiting (best-effort per Vercel instance, resets on cold start)
- `lib/audit/logAuditEvent.ts` — centralized audit logging for admin document operations
- `lib/auth/generateTempPassword.ts` — temp password generation for user invites

### Shared Navigation

`app/components/HeaderBar.tsx` handles all navigation. Desktop: inline single-row tabs. Mobile: hamburger menu. The `AppShell.tsx` wraps authenticated pages.

### Supabase RPC

User activity is tracked via the `track_profile_activity(p_activity_type text)` RPC function rather than direct table updates. This uses `SECURITY DEFINER` to enforce RLS without exposing direct profile writes from the client.

### Admin Area

`/admin` — main dashboard including audit log review, user management, and AI quality analytics (confidence aggregation from chat retrieval metadata).

Admin-only authorization is enforced by profile role checks in the admin UI and API routes (not in `proxy.ts`, which only handles authentication).

## Database

Primary tables: `profiles`, `documents`, `document_pages`, `chat_history`, `feedback`, `issue_reports`, `trusted_answers`, `admin_notes`, `enhancement_requests`, `access_requests`, `audit_logs`, `releases`, `deployment_history`, `deployment_smoke_tests`, `favorite_publications`, `saved_chats`.

Supabase Storage bucket: `profile-avatars` (path convention: `{user_id}/{filename}`, public read, owner-restricted write).

## Environment Variables

Required in `.env.local` and Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- OpenAI API key
- Resend API key
- `NEXT_PUBLIC_APP_VERSION` (controls the What's New banner)

## Deployment

1. `npm run build` — must pass cleanly
2. Push to git → Vercel auto-deploys
3. Log deployment in `/admin/releases`
4. Run standard smoke tests from `/admin/releases` → "Create standard smoke tests"
5. Update `NEXT_PUBLIC_APP_VERSION` to trigger the What's New banner

## Detailed Docs

- `docs/ARCHITECTURE.md` — phase-by-phase architecture decisions
- `docs/DATABASE.md` — full table/column reference
- `docs/ROUTES.md` — all pages and API routes
- `docs/OPERATIONS.md` — deployment runbook, QA checklists, troubleshooting
