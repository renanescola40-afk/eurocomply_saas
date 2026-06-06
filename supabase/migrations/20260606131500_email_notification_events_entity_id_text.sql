alter table public.email_notification_events
  alter column entity_id type text using entity_id::text;
