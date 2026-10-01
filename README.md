# Crous Alert

Private web application for automated monitoring of student accommodation published by CROUS.

Authorized users can create personalized monitoring requests based on city, postal code, housing type and price. When a new matching accommodation is detected, the application stores the alert and sends an email containing the relevant information and the official CROUS listing link.

## Features

- Account creation subject to manual administrator approval.
- Authentication, email confirmation, session management and logout.
- Multiple independent monitoring requests per user.
- Search by city and optional postal code.
- Housing type filtering: `room` or `studio`.
- Minimum and maximum price filtering.
- Create, edit, pause and delete monitoring requests.
- Real CROUS listings displayed in the application.
- New-match detection with duplicate prevention.
- Personalized HTML email notifications.
- Administration interface for users, access requests and worker status.
- Worker cycle counters and structured error monitoring.
- Responsive interface for desktop and mobile screens.

The application does not book accommodation or submit applications to CROUS. Users are redirected to the official website to continue their own application process.

## Architecture

```text
                         ┌────────────────────────┐
                         │   Next.js Frontend     │
                         │   Vercel               │
                         └───────────┬────────────┘
                                     │ Auth + API
                         ┌───────────▼────────────┐
                         │   Supabase              │
                         │ Auth · PostgreSQL · RLS │
                         └───────────┬────────────┘
                                     │ Supabase Cron
                         ┌───────────▼────────────┐
                         │ Edge Function           │
                         │ TypeScript / Deno       │
                         └──────┬──────────┬───────┘
                                │          │
                    ┌───────────▼───┐  ┌───▼────────────┐
                    │ CROUS website  │  │ Gmail API      │
                    │ and API        │  │ OAuth 2.0      │
                    └────────────────┘  └────────────────┘
```

### Frontend

- Next.js 16 with the App Router.
- React 19 and TypeScript.
- Responsive CSS and a deliberately minimal user interface.
- Supabase SSR for client-side and server-side authentication flows.
- Production deployment on Vercel.

### Backend and data layer

- Supabase Auth for accounts and sessions.
- PostgreSQL for profiles, monitoring requests, listings, alerts and worker runs.
- Versioned SQL migrations in `supabase/migrations`.
- Row Level Security policies to isolate user data.
- PostgreSQL RPC functions for distributed worker locking.
- Supabase Vault and Edge Function Secrets for sensitive credentials.

### Monitoring worker

The production worker is a TypeScript/Deno Edge Function located in `supabase/functions/crous-worker`.

For every cycle, it:

1. loads active monitoring requests;
2. geocodes the requested city and optional postal code;
3. queries CROUS search results;
4. retrieves and normalizes accommodation details;
5. identifies rooms, studios, T1 and T1 bis listings;
6. applies city, postal-code, type and price filters;
7. stores listings using a stable source identifier;
8. creates one alert per monitoring request and listing;
9. sends pending notifications;
10. records cycle counters, errors and results.

T2, T3 and other unrecognized housing types are currently ignored because the functional scope is limited to rooms and studios.

## Duplicate prevention and reliability

Deduplication is based on the monitoring request and the listing. A listing already associated with a request does not generate another alert on every subsequent cycle.

The worker also uses:

- a distributed PostgreSQL lock to prevent concurrent cycles;
- a `worker_runs` table for execution history;
- `completed`, `failed` and `skipped` statuses;
- per-monitoring-request technical error tracking;
- limited retry attempts for failed notifications;
- a distinction between CROUS outages and a genuine absence of listings.

## Email notifications

Emails are sent through the Gmail API using OAuth 2.0.

The Edge Function uses the following secrets:

```text
EDGE_EMAIL_ENABLED=true
EMAIL_SENDER=crous.alerte.sender@gmail.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

These values must be stored in Supabase Edge Function Secrets. They must never be committed to Git, exposed to the frontend or printed in logs.

Each notification includes:

- residence name;
- city and postal code;
- housing type;
- available price and surface information;
- detection timestamp;
- a link to the official CROUS listing;
- a clear statement that Crous Alert is not affiliated with CROUS.

## Automated execution

Supabase Cron invokes the Edge Function every minute.

The SQL configuration is documented in:

```text
supabase/migrations/202610010001_schedule_crous_worker.sql
```

Prerequisites:

- `pg_cron` and `pg_net` enabled;
- a Vault secret named `crous_worker_url`;
- a Vault secret named `crous_worker_key`;
- the `crous-worker` function deployed;
- Gmail secrets configured in Supabase Edge Functions.

The key used by Cron must be a secret Supabase key stored in Vault and must never be a frontend variable.

## Local setup

### Frontend

Requirements: a recent Node.js version and npm.

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

The publishable key may be used by the frontend when Row Level Security is correctly enabled. Never place a Supabase secret key in the frontend environment.

### Python reference worker

The Python reference worker is located in `backend/worker`.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m worker.run
```

Runtime credentials must be provided through the local environment and must never be committed.

## Tests and validation

Run the Python unit tests from the `backend` directory:

```bash
cd backend
python3 -m unittest \
  worker.test_matching \
  worker.test_repository \
  worker.test_source \
  worker.test_orchestrator \
  worker.test_notifications
```

Validate the frontend with:

```bash
cd frontend
npm run lint
./node_modules/.bin/tsc --noEmit -p tsconfig.json
npm run build -- --webpack
```

The production validation process covers:

- account creation and login;
- manual account approval;
- monitoring creation and editing;
- user-data isolation;
- real listing detection;
- HTML email delivery;
- one-minute Cron execution;
- duplicate prevention across consecutive cycles;
- responsive desktop and mobile layouts;
- Vercel deployment and Supabase Auth redirects.

## Deployment

### Vercel frontend

Import the GitHub repository into Vercel and configure:

```text
Root Directory: frontend
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install
```

Production variables:

```text
NEXT_PUBLIC_SUPABASE_URL=https://dtqesulcdfgztqaecpat.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

After the first deployment, configure Supabase Auth with the Vercel URL:

```text
Authentication → URL Configuration → Site URL
https://crous-alert.vercel.app
```

Add the callback URL:

```text
https://crous-alert.vercel.app/auth/callback
```

### Edge Function

From the repository root:

```bash
npx supabase functions deploy crous-worker \
  --project-ref dtqesulcdfgztqaecpat
```

## Historical Python bot

The original bot is preserved in `backend/app.py` and its related modules.

It remains available for diagnostics and rollback, but its scheduled GitHub Actions execution has been replaced by Supabase Cron for the web application. The historical workflow is kept as a manual workflow so the previous implementation is not lost.

## Repository structure

```text
crous-alert/
├── backend/
│   ├── app.py                         # Historical Python bot
│   ├── worker/                        # Python reference worker
│   └── requirements.txt
├── frontend/
│   ├── src/app/                       # Next.js pages
│   ├── src/components/                # Shared components
│   └── src/lib/supabase/              # Supabase clients
├── supabase/
│   ├── functions/crous-worker/        # Production Edge Function
│   └── migrations/                    # SQL schema and automation
├── email_template.html                # Reference email template
├── PRODUCT_SPEC.md                    # Product specification
└── ROADMAP.md                         # Development roadmap
```

## Security and limitations

- Private, non-public application.
- Manually approved accounts.
- RLS required on tables containing user data.
- Secrets excluded from the repository and frontend.
- User passwords are managed by Supabase Auth and are not stored by the application.
- No access to CROUS pages requiring authentication.
- No automated booking, payment or application submission.
- Security testing must remain limited to the controlled project and must not include DoS, DDoS, flooding or access to other projects.
- Data quality depends on the availability and structure of the CROUS source website.

## Future improvements

- configurable reminder policies;
- retention and cleanup of old listings;
- broader regression tests against CROUS responses;
- more detailed administrator alerts;
- documented backup and restoration procedures;
- support for additional housing formats after validating the product need.

## License and usage

Private, non-commercial project. Crous Alert redirects users to the official CROUS website and is not affiliated with CROUS.
