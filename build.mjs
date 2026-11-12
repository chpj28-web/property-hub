import { mkdir, copyFile, writeFile } from 'node:fs/promises';

// Public browser configuration; environment variables can override these defaults.
// Database permissions are enforced by Supabase Auth and row level security.
const url = process.env.SUPABASE_URL || 'https://wvyyuwtchjiqyoamgkyc.supabase.co';
const key = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_05jj5Hr16rRh4O0lw2-POA_amKs181c';
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in Vercel.');
if (!url.startsWith('https://')) throw new Error('SUPABASE_URL must use HTTPS.');
if (key.startsWith('sb_secret_')) throw new Error('Use a publishable key, never a secret key.');
if (key.split('.').length === 3) {
  const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url'));
  if (payload.role !== 'anon') throw new Error('Use the anon key, never service_role.');
}
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'cloud.js']) await copyFile(file, `dist/${file}`);
await writeFile('dist/config.js', `window.PROPERTY_HUB_CONFIG = ${JSON.stringify({ url, key })};\n`);
