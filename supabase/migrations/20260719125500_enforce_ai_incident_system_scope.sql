-- Enforce the AI-system/organization relationship at the database boundary.
-- The composite foreign key validates existing rows and uses PostgreSQL's
-- referential-integrity locking for concurrent incident links and tenant moves.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_systems_id_organization_id_key'
      and conrelid = 'public.ai_systems'::regclass
  ) then
    alter table public.ai_systems
      add constraint ai_systems_id_organization_id_key
      unique (id, organization_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_incidents_system_organization_fkey'
      and conrelid = 'public.ai_incidents'::regclass
  ) then
    alter table public.ai_incidents
      add constraint ai_incidents_system_organization_fkey
      foreign key (ai_system_id, organization_id)
      references public.ai_systems (id, organization_id);
  end if;
end
$$;

comment on constraint ai_incidents_system_organization_fkey
  on public.ai_incidents is
  'Requires linked AI incidents to use the referenced AI system tenant.';
