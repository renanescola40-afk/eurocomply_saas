-- Clerk/Supabase Auth compatibility hardening.
-- Supabase Auth subjects are UUIDs, while Clerk user subjects are text IDs such as user_xxx.
-- Never call auth.uid() for Clerk text subjects: auth.uid() casts sub to uuid and can fail before
-- RLS reaches the Clerk membership branch.

create or replace function public.current_jwt_subject()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ),
    ''
  );
$$;

create or replace function public.current_legacy_user_id()
returns uuid
language sql
stable
as $$
  select case
    when public.current_jwt_subject() ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then public.current_jwt_subject()::uuid
    else null
  end;
$$;

create or replace function public.current_clerk_user_id()
returns text
language sql
stable
as $$
  select case
    when public.current_jwt_subject() is null then null
    when public.current_jwt_subject() ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then null
    else public.current_jwt_subject()
  end;
$$;

revoke all on function public.current_jwt_subject() from public;
revoke all on function public.current_legacy_user_id() from public;
revoke all on function public.current_clerk_user_id() from public;
grant execute on function public.current_jwt_subject() to authenticated;
grant execute on function public.current_legacy_user_id() to authenticated;
grant execute on function public.current_clerk_user_id() to authenticated;

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and (
        (
          public.current_legacy_user_id() is not null
          and user_id = public.current_legacy_user_id()
        )
        or (
          public.current_clerk_user_id() is not null
          and clerk_user_id = public.current_clerk_user_id()
        )
      )
  );
$$;

create or replace function public.has_org_role(target_organization_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and role = any(allowed_roles)
      and (
        (
          public.current_legacy_user_id() is not null
          and user_id = public.current_legacy_user_id()
        )
        or (
          public.current_clerk_user_id() is not null
          and clerk_user_id = public.current_clerk_user_id()
        )
      )
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;

comment on function public.current_jwt_subject() is 'Raw JWT subject from request.jwt.claim.sub/request.jwt.claims.sub. Internal helper for mixed Supabase UUID and Clerk text identities.';
comment on function public.current_legacy_user_id() is 'UUID-safe Supabase Auth user ID resolver. Returns null instead of casting Clerk text subjects to uuid.';
comment on function public.current_clerk_user_id() is 'Clerk text user ID resolver. UUID Supabase Auth subjects return null so legacy UUID auth stays on user_id.';

-- Replace stale inline auth.uid() policies with UUID-safe helper based policies.
-- These policies existed before Clerk support and can throw invalid UUID casts for Clerk user_ subjects.

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles for select
using (
  public.current_legacy_user_id() is not null
  and id = public.current_legacy_user_id()
);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
using (
  public.current_legacy_user_id() is not null
  and id = public.current_legacy_user_id()
)
with check (
  public.current_legacy_user_id() is not null
  and id = public.current_legacy_user_id()
);

drop policy if exists "Members can view organizations" on public.organizations;
create policy "Members can view organizations"
on public.organizations for select
using (public.is_org_member(id));

drop policy if exists "Members can view memberships" on public.organization_members;
create policy "Members can view memberships"
on public.organization_members for select
using (public.is_org_member(organization_id));

drop policy if exists "Members can view subscriptions" on public.subscriptions;
create policy "Members can view subscriptions"
on public.subscriptions for select
using (public.is_org_member(organization_id));

drop policy if exists "Members can view audit logs" on public.audit_logs;
create policy "Members can view audit logs"
on public.audit_logs for select
using (public.is_org_member(organization_id));

alter table if exists public.audit_events enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.notifications enable row level security;

drop policy if exists live_rls_audit_events_select_member on public.audit_events;
create policy live_rls_audit_events_select_member on public.audit_events
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists live_rls_notifications_select_member on public.notifications;
create policy live_rls_notifications_select_member on public.notifications
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists live_rls_tasks_select_member on public.tasks;
drop policy if exists live_rls_tasks_insert_member on public.tasks;
drop policy if exists live_rls_tasks_update_member on public.tasks;
drop policy if exists live_rls_tasks_delete_member on public.tasks;

create policy live_rls_tasks_select_member on public.tasks
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy live_rls_tasks_insert_member on public.tasks
  for insert to authenticated
  with check (public.is_org_member(organization_id));

create policy live_rls_tasks_update_member on public.tasks
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy live_rls_tasks_delete_member on public.tasks
  for delete to authenticated
  using (public.is_org_member(organization_id));

notify pgrst, 'reload schema';
