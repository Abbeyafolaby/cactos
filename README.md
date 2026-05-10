# Cactos

Simple choir member, rehearsal, and attendance tracker built with Next.js, Tailwind CSS, and Supabase.

## Local Development

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Supabase Setup

Run the SQL files in the Supabase SQL Editor:

1. `supabase/schema.sql` for a fresh database.
2. `supabase/restrict-to-authenticated.sql` for an existing database or after enabling Supabase Auth.

Create at least one admin user in Supabase Auth. The app uses email/password sign-in.

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Use the default Next.js settings:
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: `.next`
4. Add these environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy.

After deployment, add the Vercel production URL to your Supabase project:

- Supabase Dashboard > Authentication > URL Configuration
- Set Site URL to your Vercel production URL.
- Add any preview URLs you use to Redirect URLs.

## Checks

```bash
npm run lint
npm run build
```
