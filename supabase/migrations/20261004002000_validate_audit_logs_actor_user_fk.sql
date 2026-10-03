-- Validate the reconciled audit_logs actor foreign key now that production
-- integrity has been verified (276 rows, 0 orphan actor_user_id values).
-- VALIDATE CONSTRAINT does not rewrite existing rows.
alter table public.audit_logs
  validate constraint audit_logs_actor_user_id_fkey;
