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