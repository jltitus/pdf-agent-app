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