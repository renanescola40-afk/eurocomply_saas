-- Live RLS validation compatibility patch.
-- Some deployed projects have audit entity_id columns as uuid, while the live
-- validator writes synthetic fixture identifiers. Store audit entity references
-- as text for the live proof so UUID and non-UUID identifiers are both accepted.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'entity_id'
      and udt_name = 'uuid'
  ) then
    alter table public.audit_logs
      alter column entity_id type text using entity_id::text;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_events'
      and column_name = 'entity_id'
      and udt_name = 'uuid'
  ) then
    alter table public.audit_events
      alter column entity_id type text using entity_id::text;
  end if;
end $$;

notify pgrst, 'reload schema';
