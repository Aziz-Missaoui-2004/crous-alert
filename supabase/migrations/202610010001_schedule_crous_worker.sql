-- Prérequis : les extensions pg_cron et pg_net doivent être activées,
-- et les secrets Vault `crous_worker_url` et `crous_worker_key` doivent exister.

do $$
declare
  existing_job_id bigint;
begin
  select jobid
    into existing_job_id
    from cron.job
   where jobname = 'crous-worker-every-minute';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
end
$$;

select cron.schedule(
  'crous-worker-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret
        from vault.decrypted_secrets
       where name = 'crous_worker_url'
    ) || '/functions/v1/crous-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'crous_worker_key'
      ),
      'Authorization', 'Bearer ' || (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'crous_worker_key'
      ),
      'x-worker-mode', 'active'
    ),
    body := '{"mode":"active"}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);
