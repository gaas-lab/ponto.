# App Ponto online

## Supabase

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project's API settings. The legacy anon key is also accepted as `VITE_SUPABASE_ANON_KEY`.
3. Run `supabase/setup.sql` in the Supabase SQL Editor to create the profile photo bucket and its per-user access policy.
4. In Supabase Authentication URL Configuration, set the production Vercel domain as the Site URL. Add `http://localhost:5173/**`, the exact production URL, and your Vercel preview pattern (for example, `https://*-your-team.vercel.app/**`) to Redirect URLs.
5. In Vercel Project Settings → Environment Variables, add the same URL and publishable key for Preview and Production, then redeploy.

The app uses Supabase Auth for email/password accounts. Profile pictures are stored in a private Supabase Storage bucket and served through short-lived signed URLs. Attendance records remain in browser storage, isolated by the signed-in user's ID. They do not sync between browsers or devices yet.

Run locally with `npm install` and `npm run dev`. The signup flow follows the email confirmation setting in Supabase; users return to the login screen after registration.
