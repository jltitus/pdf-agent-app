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