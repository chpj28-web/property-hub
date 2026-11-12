# Property Hub

Thai property listing manager. Vercel hosts the static frontend; Supabase Auth and PostgreSQL store listings separately for each signed-in user. Photos are stored as base64 inside the listing JSON, so backups include photos. This is suitable for a small collection; large photo libraries should move to Supabase Storage.

## Supabase setup

1. Choose a Supabase project and run `supabase/migrations/202611120001_listings.sql` once in its SQL Editor.
2. Enable email/password authentication and create the intended users in Authentication → Users. The app does not offer public signup.
3. Copy the project URL and publishable key (legacy `anon` also works). Never use a secret or `service_role` key in this app.

## GitHub → Vercel

1. Push the files in this directory to the chosen GitHub repository. If uploading the outer folder, set Vercel Root Directory to `property-hub`.
2. Import that repository in Vercel. Use framework `Other`, build command `npm run build`, output directory `dist`.
3. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for Production and Preview. These are public client configuration; database access is restricted by RLS.
4. Deploy. Commits to the connected production branch trigger new deployments.
5. Sign in and verify creating, editing, deleting, backup and restore. A second user must not see the first user's data.

## Local verification

Requires Node.js 22+. No npm dependencies are required.

```powershell
$env:SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
$env:SUPABASE_PUBLISHABLE_KEY = 'YOUR_PUBLISHABLE_KEY'
npm run check
npm run build
python -m http.server 3000 --directory dist
```

Open http://localhost:3000. Source files must be built before serving; `config.js` is generated from the environment. `.env` is only a template convention and is not loaded automatically.

## Existing browser data

Export Backup JSON from the original app before switching domains. Then sign in to the deployed app and Restore that file. The original localStorage data is not deleted or automatically uploaded. Restore replaces only the signed-in user's collection in one database transaction.

## References

- https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://vercel.com/docs/builds/configure-a-build
- https://vercel.com/docs/git/vercel-for-github
