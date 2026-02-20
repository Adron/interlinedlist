---
title: Local Testing
---

# Testing the CLI Against a Local Server

Use a local InterlinedList dev server instead of production to test the CLI without affecting live data.

## Prerequisites

1. **Start the local server**: Run `npm run dev` in the project root. Next.js will serve at http://localhost:3000.

2. **Database**: Ensure `.env` or `.env.local` has `DATABASE_URL` pointing to a local or dev database. Run migrations if needed: `npm run db:migrate:deploy`.

3. **Vercel Blob** (for image sync): Image upload requires `BLOB_READ_WRITE_TOKEN`. Add it to `.env.local` (create a token at [vercel.com/dashboard/stores](https://vercel.com/dashboard/stores)). Without it, document sync works but image uploads will fail.

## Steps

1. **Create a test user**: Register or log in at http://localhost:3000.

2. **Create an API key**: Go to **Settings** → **Document Sync (CLI)** → **Create API key**. Copy the key (it is shown only once).

3. **Configure the CLI**: Run `il-sync sync init` and enter:
   - **Sync root path**: e.g. `~/test-sync-docs` (create this folder first)
   - **Server URL**: `http://localhost:3000`
   - **API key**: Paste the key from step 2

4. **Run the daemon**: Run `il-sync` in the foreground. It will watch your sync folder and push/pull changes. Press Ctrl+C to stop.

5. **Verify**: Add a `.md` file to your sync root, save it, and wait a few seconds. Check the Documents page at http://localhost:3000 to confirm it appeared.

## Switching Back to Production

Re-run `il-sync sync init` and enter your production server URL and API key. The config is overwritten; there is one config per machine.
