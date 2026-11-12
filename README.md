# Property Hub

Thai property listing manager hosted on Vercel with Supabase PostgreSQL.
Opens without login. Anyone with access shares the same collection and can
read, add, edit, delete and restore listings.

## Database setup

Run `supabase/migrations/202611120002_shared_listings.sql` in Supabase SQL Editor.
It is safe to run again. No Auth users or anonymous sign-in settings are needed.
The previous private `listings` table is preserved and is not automatically
published. Export and restore a backup to move old data into the shared app.
Restore replaces the entire shared collection in one database transaction.

## Deploy and verify

Vercel builds main using `npm run build` and serves `dist`. Public Supabase
defaults are in `build.mjs`. SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY can
override them. Never use a secret or service_role key. Requires Node.js 22+.
Run `npm run check` and `npm run build`. Serve dist with an HTTP server.
Check creating, editing, deleting, backup and restore in the shared workspace.
Photos are base64 in PostgreSQL (up to 20 photos of 5 MB each per listing).
Large libraries should move to Supabase Storage.
If database setup is incomplete, editing stays disabled and an error appears.
