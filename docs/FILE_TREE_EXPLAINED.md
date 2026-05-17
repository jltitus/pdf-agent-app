# File Tree Explained

## /app
Contains all Next.js App Router pages and API routes.

## /app/api
Server-side API endpoints.

### /app/api/chat
Handles OpenAI Responses API calls and document retrieval.

### /app/api/process-document
Processes uploaded PDFs and stores embeddings.

## /app/admin
Admin dashboard UI.

## /public
Static assets such as icons, logos, and images.

## /docs
Operational and architectural documentation.

## Activity Tracking

### app/api/track-user-activity/route.ts
Tracks authenticated user activity including:
- last activity
- login tracking
- chat tracking
- total questions asked

Uses secure Supabase RPC updates.

### Admin Analytics Enhancements
The Admin dashboard now displays:
- last login
- last activity
- last chat
- question counts
- mobile-friendly usage metrics

### app/components/WhatsNewBanner.tsx
Displays version-aware release communication banner after deployments.

Features:
- dismissible banner
- automatic version detection
- local storage persistence
- links to release notes page

## Phase 9 Added Routes & Components

### `app/profile/page.tsx`
Authenticated user profile dashboard.

Displays:
- profile details
- saved publications
- saved answers
- activity summaries

---

### `app/profile/edit/page.tsx`
Profile editing interface.

Supports:
- avatar upload
- public/private controls
- MFP metadata
- external links

---

### `app/community/page.tsx`
Public community directory.

Supports:
- user discovery
- search/filtering
- public profile browsing

---

### `app/api/favorites/route.ts`
API route for publication favorites.

Methods:
- GET
- POST
- DELETE

---

### `app/api/saved-chats/route.ts`
API route for saved answers.

Methods:
- GET
- POST

---

### `app/components/HeaderBar.tsx`
Responsive application navigation/header.

Features:
- desktop nav tabs
- mobile hamburger menu
- active route highlighting
- auth-aware navigation

## Phase 10A Chat Retrieval Improvements

### `app/api/chat/route.ts`
Enhanced AI retrieval workflow for:
- semantic source ranking
- weighted evidence scoring
- improved trusted-answer matching
- retrieval deduplication
- compacted conversation memory
- safer unsupported-answer detection
- improved OpenAI token efficiency

### `app/chat/page.tsx`
Updated mobile chat input behavior to prevent horizontal overflow and mobile Send button drift while typing.

## Phase 10A Step 2 Citation UX Improvements

### `app/chat/page.tsx`
Enhanced chat citation rendering for:
- expandable supporting excerpts
- source metadata formatting
- semantic relevance explanations
- confidence indicator improvements
- mobile citation readability
- responsive source-card layouts
- backward compatibility rendering guards for older stored chat history

## Phase 10A Step 3 Admin AI Analytics

### `app/admin/page.tsx`
Enhanced admin dashboard overview with:
- AI confidence analytics cards
- retrieval quality visibility
- unsupported-answer monitoring
- responsive analytics card layouts

### `app/api/admin-analytics/route.ts`
Enhanced analytics aggregation workflow for:
- evidence strength parsing
- AI confidence aggregation
- backward-compatible metadata handling
- retrieval quality monitoring

## Phase 10A Step 4 Conversational Memory Improvements

### `app/api/chat/route.ts`
Enhanced conversational orchestration workflow for:
- follow-up question detection
- conversational continuity handling
- contextual pronoun resolution
- compacted conversation summaries
- token-efficient memory handling
- grounded retrieval continuity safeguards