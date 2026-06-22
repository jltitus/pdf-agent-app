// Single source of truth for the displayed app version.
//
// Bump this with every production release so it matches the latest row in the
// `releases` table (shown on /whats-new). It is committed in code rather than
// read from NEXT_PUBLIC_APP_VERSION so the deployed header, What's New page, and
// update banner stay in sync without depending on a Vercel dashboard env var.
export const APP_VERSION = '3.2.0'
