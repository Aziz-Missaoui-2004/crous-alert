# Architecture and data flow

![Crous Alert architecture overview](<Architecture moderne d’une application web.png>)

## System overview

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

## Frontend

The frontend is a Next.js App Router application using React, TypeScript and responsive CSS. It contains:

- authentication and email-confirmation flows;
- user dashboard and monitoring management;
- real listing and alert views;
- account settings and session handling;
- administrator pages for access requests, users and worker status.

The browser only uses the Supabase URL and publishable key. Authorization is enforced by Supabase policies and server-side checks, not by hiding UI elements alone.

## Data model

The main entities are:

- `profiles`: application profile and approval state;
- `surveillances`: user criteria for a city, optional postal code, type and prices;
- `logements`: normalized CROUS listings with a stable source identifier;
- `alertes`: relationship between a surveillance and a matching listing, including notification state;
- `worker_runs`: execution history and counters;
- `worker_locks`: distributed lock used to prevent concurrent cycles.

The idempotency invariant is:

```text
one (surveillance_id, logement_id) pair => at most one alert
```

## Worker flow

1. Supabase Cron invokes the Edge Function every minute.
2. The function acquires the PostgreSQL worker lock.
3. A `worker_runs` row is created with status `running`.
4. Active surveillances are loaded using server-side credentials.
5. The city and optional postal code are geocoded.
6. CROUS search results and accommodation details are retrieved.
7. Listings are normalized and classified as `chambre` or `studio`.
8. City, postal-code, type and price criteria are applied.
9. Listings are upserted and new alerts are inserted idempotently.
10. Pending notifications are grouped by recipient and sent through Gmail OAuth 2.0.
11. The worker run is marked `completed` or `failed` and the lock is released.

## Failure behavior

- A CROUS request failure is recorded as a technical error and is not interpreted as zero availability.
- A stale worker lock can be replaced after its configured time-to-live.
- Notification failures are recorded and retried a limited number of times.
- A repeated listing does not create another alert.
- The admin page exposes the latest cycle state and errors.

## Historical Python implementation

`backend/app.py` is the original standalone bot. `backend/worker` contains the Python reference implementation used for business-logic validation during the migration. The production application uses the TypeScript/Deno Edge Function.
