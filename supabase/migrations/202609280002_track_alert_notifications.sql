-- Le champ sent_at indique la création de l'alerte (détection).
-- Ces champs suivent séparément l'envoi de la notification e-mail.
alter table public.alertes
  add column notification_status text not null default 'pending',
  add column notification_sent_at timestamptz,
  add column notification_attempts integer not null default 0,
  add column notification_error text,
  add constraint alertes_notification_status_check
    check (notification_status in ('pending', 'sent', 'failed')),
  add constraint alertes_notification_attempts_check
    check (notification_attempts >= 0);

create index alertes_notification_pending_idx
  on public.alertes (notification_status, created_at)
  where notification_status in ('pending', 'failed');
