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