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