# Installation and deployment

## Frontend local setup

Requirements: recent Node.js and npm.

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Never place a Supabase secret key in the frontend environment.

## Frontend Vercel deployment

Import the GitHub repository into Vercel and configure:

```text
Root Directory: frontend
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install
```

Add the two `NEXT_PUBLIC_*` variables for Production, Preview and Development. After deployment, configure Supabase Auth:

```text
Site URL: https://your-production-domain
Redirect URL: https://your-production-domain/auth/callback
```

## Edge Function deployment

From the repository root:

```bash
npx supabase functions deploy crous-worker \
  --project-ref your-project-ref
```

## Edge Function secrets

Configure these in Supabase Edge Function Secrets:

```text
EDGE_EMAIL_ENABLED=true
EMAIL_SENDER=your-sender@gmail.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

Do not commit these values or place them in the frontend.

## Supabase Cron

Enable the `pg_cron` and `pg_net` extensions. Store these Vault secrets:

```text
crous_worker_url=https://your-project.supabase.co
crous_worker_key=<secret Supabase key>
```

The reproducible schedule is documented in:

```text
supabase/migrations/202610010001_schedule_crous_worker.sql
```

It invokes the worker every minute with `{"mode":"active"}`.

## SQL migrations

Apply migrations in `supabase/migrations` through the Supabase SQL Editor or the Supabase CLI. Never paste a filename alone into the SQL Editor; execute the SQL contents.

## Production checklist

- frontend environment variables configured;
- Supabase Auth site and callback URLs configured;
- RLS enabled and policies verified;
- Edge Function deployed;
- Gmail OAuth secrets configured;
- Cron extensions enabled;
- Vault URL and secret key configured;
- Cron job active;
- recent `worker_runs` rows show `completed` with no error;
- a real email test completed;
- a second cycle creates no duplicate alert.
