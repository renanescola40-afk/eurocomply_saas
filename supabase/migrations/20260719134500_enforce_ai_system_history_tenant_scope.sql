-- Enforce that every AI-system history row belongs to the same organization
-- as the AI system it references. The composite foreign key validates existing
-- rows during migration and applies to every future writer.

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
    where conname = 'ai_system_history_system_organization_fkey'
      and conrelid = 'public.ai_system_history'::regclass
  ) then
    alter table public.ai_system_history
      add constraint ai_system_history_system_organization_fkey
      foreign key (ai_system_id, organization_id)
      references public.ai_systems (id, organization_id)
      on delete cascade;
  end if;
end
$$;

comment on constraint ai_system_history_system_organization_fkey
  on public.ai_system_history is
  'Requires AI-system history records to use the referenced AI system tenant.';
