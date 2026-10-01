# Crous Alert

Crous Alert is a production-deployed private web application that monitors CROUS student-housing listings and sends personalized email alerts when a new matching accommodation becomes available.

Users can create several monitoring requests based on:

- city;
- optional postal code;
- room or studio type;
- minimum and maximum price.

The application evolved from a single-purpose Python monitoring bot into a multi-user serverless platform with authentication, persistent data, database-level authorization, scheduled workers, duplicate-safe notifications and production monitoring.

## Why this project matters

The project solves a real timing and availability problem: CROUS listings can appear and disappear quickly, while users need alerts that match their personal criteria. The application automates the monitoring process without booking accommodation or submitting applications on behalf of users.

## Engineering highlights

- Migrated a legacy Python bot to a multi-user serverless architecture.
- Designed per-user data isolation with PostgreSQL Row Level Security.
- Implemented idempotent alert generation to prevent duplicate notifications.
- Added distributed worker locking to prevent concurrent monitoring cycles.
- Built resilient processing for unreliable and changing external data.
- Integrated Gmail OAuth 2.0 for secure email delivery.
- Deployed the frontend on Vercel and the worker on Supabase Edge Functions.
- Added execution tracking, structured errors and administrator monitoring.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js, React, TypeScript, responsive CSS |
| Authentication | Supabase Auth, email confirmation, session management |
| Database | PostgreSQL, SQL migrations, Row Level Security |
| Worker | TypeScript, Deno, Supabase Edge Functions |
| Scheduling | Supabase Cron, `pg_cron`, `pg_net` |
| Email | Gmail API, OAuth 2.0, responsive HTML templates |
| Deployment | Vercel, Supabase, GitHub |
| Validation | Python unit tests, TypeScript checks, production tests |

## Production

Live application: [crous-alert.vercel.app](https://crous-alert.vercel.app)

The production worker runs every minute. Each cycle records the number of active watches, listings seen, matches, alerts created and errors. A `(monitoring request, listing)` pair can produce at most one alert.

## Project documentation

Detailed technical documentation is available in [`docs/`](docs/README.md):

- [Architecture and data flow](docs/architecture.md)
- [Installation and deployment](docs/deployment.md)
- [Testing, security and operations](docs/testing-security.md)

## Historical implementation

The original Python bot is preserved in `backend/app.py` and related modules. It remains available as a reference and rollback path, while the production web application uses the Supabase Edge worker.

## Scope and limitations

- Private, non-commercial application.
- Accounts are manually approved by an administrator.
- The current functional scope covers rooms and studios.
- The application depends on the availability and structure of the CROUS website.
- It does not book accommodation or submit applications to CROUS.

## What this project demonstrates

End-to-end product ownership, backend and cloud architecture, authentication and authorization, database design, resilient data ingestion, idempotent processing, concurrent-worker control, secure secret management, OAuth integration, production deployment and operational debugging.

## Usage

Private project. Crous Alert redirects users to the official CROUS website and is not affiliated with CROUS.
