create or replace function public.live_rls_validation_has_column(table_name text, column_name text)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = $1
      and c.column_name = $2
  );
$$;

create or replace function public.live_rls_validation_is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and target_organization_id is not null
    and exists (
      select 1
      from public.organization_members om
      where om.organization_id = target_organization_id
        and om.user_id = auth.uid()
    );
$$;

grant execute on function public.live_rls_validation_is_org_member(uuid) to authenticated;

create or replace function public.live_rls_validation_apply_org_scoped(target_table_name text)
returns void language plpgsql set search_path = public as $$
begin
  if to_regclass(format('public.%I', target_table_name)) is null or not public.live_rls_validation_has_column(target_table_name, 'organization_id') then
    return;
  end if;
  execute format('alter table public.%I enable row level security', target_table_name);
  execute format('grant select, insert, update, delete on public.%I to authenticated', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_select_member', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_insert_member', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_update_member', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_delete_member', target_table_name);
  execute format('create policy %I on public.%I for select to authenticated using (public.live_rls_validation_is_org_member(organization_id))', 'live_rls_' || target_table_name || '_select_member', target_table_name);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.live_rls_validation_is_org_member(organization_id))', 'live_rls_' || target_table_name || '_insert_member', target_table_name);
  execute format('create policy %I on public.%I for update to authenticated using (public.live_rls_validation_is_org_member(organization_id)) with check (public.live_rls_validation_is_org_member(organization_id))', 'live_rls_' || target_table_name || '_update_member', target_table_name);
  execute format('create policy %I on public.%I for delete to authenticated using (public.live_rls_validation_is_org_member(organization_id))', 'live_rls_' || target_table_name || '_delete_member', target_table_name);
end;
$$;

create or replace function public.live_rls_validation_apply_backend_only(target_table_name text)
returns void language plpgsql set search_path = public as $$
begin
  if to_regclass(format('public.%I', target_table_name)) is null or not public.live_rls_validation_has_column(target_table_name, 'organization_id') then
    return;
  end if;
  execute format('alter table public.%I enable row level security', target_table_name);
  execute format('grant select, insert, update, delete on public.%I to authenticated', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_select_member', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_insert_deny', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_update_deny', target_table_name);
  execute format('drop policy if exists %I on public.%I', 'live_rls_' || target_table_name || '_delete_deny', target_table_name);
  execute format('create policy %I on public.%I for select to authenticated using (public.live_rls_validation_is_org_member(organization_id))', 'live_rls_' || target_table_name || '_select_member', target_table_name);
  execute format('create policy %I on public.%I for insert to authenticated with check (false)', 'live_rls_' || target_table_name || '_insert_deny', target_table_name);
  execute format('create policy %I on public.%I for update to authenticated using (false) with check (false)', 'live_rls_' || target_table_name || '_update_deny', target_table_name);
  execute format('create policy %I on public.%I for delete to authenticated using (false)', 'live_rls_' || target_table_name || '_delete_deny', target_table_name);
end;
$$;

create table if not exists public.onboarding_activation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  country text,
  company_type text,
  sector text,
  ai_usage_level text,
  first_ai_system_id uuid,
  initial_risk_level text,
  readiness_score integer,
  suggested_documents jsonb not null default '[]'::jsonb,
  created_tasks jsonb not null default '[]'::jsonb,
  invited_emails text[] not null default '{}',
  selected_plan text,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists public.monitoring_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  regulatory_change_alerts boolean not null default true,
  monthly_review_reminders boolean not null default true,
  low_score_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.regulatory_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  severity text not null default 'medium',
  source_url text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.live_rls_validation_apply_backend_only('audit_events');
select public.live_rls_validation_apply_org_scoped('tasks');
select public.live_rls_validation_apply_org_scoped('notifications');
select public.live_rls_validation_apply_org_scoped('onboarding_activation_runs');
select public.live_rls_validation_apply_org_scoped('monitoring_preferences');

alter table public.regulatory_updates enable row level security;
grant select, insert, update, delete on public.regulatory_updates to authenticated;
drop policy if exists live_rls_regulatory_updates_select_authenticated on public.regulatory_updates;
drop policy if exists live_rls_regulatory_updates_insert_deny on public.regulatory_updates;
drop policy if exists live_rls_regulatory_updates_update_deny on public.regulatory_updates;
drop policy if exists live_rls_regulatory_updates_delete_deny on public.regulatory_updates;
create policy live_rls_regulatory_updates_select_authenticated on public.regulatory_updates for select to authenticated using (auth.uid() is not null);
create policy live_rls_regulatory_updates_insert_deny on public.regulatory_updates for insert to authenticated with check (false);
create policy live_rls_regulatory_updates_update_deny on public.regulatory_updates for update to authenticated using (false) with check (false);
create policy live_rls_regulatory_updates_delete_deny on public.regulatory_updates for delete to authenticated using (false);

notify pgrst, 'reload schema';
