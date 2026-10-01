# Testing, security and operations

## Automated tests

Run the Python tests from the `backend` directory:

```bash
python3 -m unittest \
  worker.test_matching \
  worker.test_repository \
  worker.test_source \
  worker.test_orchestrator \
  worker.test_notifications
```

Validate the frontend from `frontend`:

```bash
npm run lint
./node_modules/.bin/tsc --noEmit -p tsconfig.json
npm run build -- --webpack
```

The automated Python suite covers matching, repository behavior, CROUS normalization, orchestration and notification formatting. Production validation covers authentication, approval flows, RLS isolation, real CROUS detection, Cron execution, duplicate prevention, responsive layouts and email delivery.

Planned additional automated coverage:

- RLS integration tests with two users;
- worker-lock contention tests;
- network-failure and malformed-response fixtures;
- notification retry and Gmail failure tests.

## Security model

Trust boundaries are explicit:

- the browser is untrusted;
- Supabase Auth identifies the user;
- PostgreSQL RLS enforces row-level access;
- Edge Functions use server-side credentials for worker operations;
- Gmail and Cron credentials remain in Supabase Secrets or Vault.

Security rules:

- publishable keys may be used by the frontend only with RLS enabled;
- secret keys must never be exposed to the browser or committed to Git;
- passwords are managed by Supabase Auth;
- administrator access is separated from normal user access;
- logs must not contain passwords, OAuth tokens or secret keys;
- production testing must use test accounts and controlled data whenever possible.

## Authorized security testing

An authorized reviewer may test the application, its Supabase project components and its deployed Edge Function within a written scope. Testing must not include other Supabase projects, cross-tenant activity, DoS, DDoS, flooding, destructive actions or unauthorized access to real user accounts.

If a finding appears to concern Supabase’s own platform rather than the project configuration, stop the test and report it to Supabase Security according to their security-testing policy.

## Operational monitoring

Inspect the latest worker cycles with:

```sql
SELECT
  started_at,
  status,
  watches,
  listings_seen,
  listings_matched,
  alerts_created,
  error
FROM worker_runs
ORDER BY started_at DESC
LIMIT 10;
```

Expected healthy state:

```text
status = completed
error = null
```

`alerts_created = 0` is not automatically an error. It can mean that no new listing matched or that all matching listings had already generated an alert. A CROUS request error must be interpreted separately from a genuine zero-result response.

## Historical bot and rollback

The original Python bot and its GitHub workflow remain in the repository for diagnosis and rollback. The production schedule uses Supabase Cron. Any rollback should be deliberate, avoid running both production paths simultaneously and verify notification deduplication before changing the schedule.
