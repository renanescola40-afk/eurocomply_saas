-- Enterprise backend-only RLS explicit lock.
-- Uses literal policies so static RLS evidence can prove backend-only write denial per table.

do $$
begin
  if to_regclass('public.audit_events') is not null then
    alter table public.audit_events enable row level security;
    drop policy if exists "rls_audit_events_insert_backend_only" on public.audit_events;
    drop policy if exists "rls_audit_events_update_backend_only" on public.audit_events;
    drop policy if exists "rls_audit_events_delete_backend_only" on public.audit_events;

    create policy "rls_audit_events_insert_backend_only"
      on public.audit_events
      for insert
      to authenticated
      with check (false);

    create policy "rls_audit_events_update_backend_only"
      on public.audit_events
      for update
      to authenticated
      using (false)
      with check (false);

    create policy "rls_audit_events_delete_backend_only"
      on public.audit_events
      for delete
      to authenticated
      using (false);
  end if;

  if to_regclass('public.subscriptions') is not null then
    alter table public.subscriptions enable row level security;
    drop policy if exists "rls_subscriptions_insert_backend_only" on public.subscriptions;
    drop policy if exists "rls_subscriptions_update_backend_only" on public.subscriptions;
    drop policy if exists "rls_subscriptions_delete_backend_only" on public.subscriptions;

    create policy "rls_subscriptions_insert_backend_only"
      on public.subscriptions
      for insert
      to authenticated
      with check (false);

    create policy "rls_subscriptions_update_backend_only"
      on public.subscriptions
      for update
      to authenticated
      using (false)
      with check (false);

    create policy "rls_subscriptions_delete_backend_only"
      on public.subscriptions
      for delete
      to authenticated
      using (false);
  end if;

  if to_regclass('public.audit_logs') is not null then
    alter table public.audit_logs enable row level security;
    drop policy if exists "rls_audit_logs_insert_backend_only" on public.audit_logs;
    drop policy if exists "rls_audit_logs_update_backend_only" on public.audit_logs;
    drop policy if exists "rls_audit_logs_delete_backend_only" on public.audit_logs;

    create policy "rls_audit_logs_insert_backend_only"
      on public.audit_logs
      for insert
      to authenticated
      with check (false);

    create policy "rls_audit_logs_update_backend_only"
      on public.audit_logs
      for update
      to authenticated
      using (false)
      with check (false);

    create policy "rls_audit_logs_delete_backend_only"
      on public.audit_logs
      for delete
      to authenticated
      using (false);
  end if;

  if to_regclass('public.organization_invites') is not null then
    alter table public.organization_invites enable row level security;
    drop policy if exists "rls_organization_invites_insert_backend_only" on public.organization_invites;
    drop policy if exists "rls_organization_invites_update_backend_only" on public.organization_invites;
    drop policy if exists "rls_organization_invites_delete_backend_only" on public.organization_invites;

    create policy "rls_organization_invites_insert_backend_only"
      on public.organization_invites
      for insert
      to authenticated
      with check (false);

    create policy "rls_organization_invites_update_backend_only"
      on public.organization_invites
      for update
      to authenticated
      using (false)
      with check (false);

    create policy "rls_organization_invites_delete_backend_only"
      on public.organization_invites
      for delete
      to authenticated
      using (false);
  end if;

  if to_regclass('public.invitations') is not null then
    alter table public.invitations enable row level security;
    drop policy if exists "rls_invitations_insert_backend_only" on public.invitations;
    drop policy if exists "rls_invitations_update_backend_only" on public.invitations;
    drop policy if exists "rls_invitations_delete_backend_only" on public.invitations;

    create policy "rls_invitations_insert_backend_only"
      on public.invitations
      for insert
      to authenticated
      with check (false);

    create policy "rls_invitations_update_backend_only"
      on public.invitations
      for update
      to authenticated
      using (false)
      with check (false);

    create policy "rls_invitations_delete_backend_only"
      on public.invitations
      for delete
      to authenticated
      using (false);
  end if;
end $$;
