-- Drop legacy permissive policies that can survive as OR-ed grants in existing projects.
-- This migration is defensive and idempotent: it removes known broad policies before the
-- stricter tenant-isolation policies from earlier migrations are relied on for production.

do $$
begin
  if to_regclass('public.notifications') is not null then
    drop policy if exists "Users can read own notifications" on public.notifications;
    drop policy if exists "Users can update own notifications" on public.notifications;
    drop policy if exists "Organization members can read notifications" on public.notifications;
    drop policy if exists "Organization members can manage notifications" on public.notifications;
  end if;

  if to_regclass('public.ai_systems') is not null then
    drop policy if exists "Organization members can insert ai systems" on public.ai_systems;
    drop policy if exists "Organization members can update ai systems" on public.ai_systems;
    drop policy if exists "Organization members can delete ai systems" on public.ai_systems;
    drop policy if exists "Organization members can manage ai systems" on public.ai_systems;
  end if;

  if to_regclass('public.ai_incidents') is not null then
    drop policy if exists "Organization members can insert ai incidents" on public.ai_incidents;
    drop policy if exists "Organization members can update ai incidents" on public.ai_incidents;
    drop policy if exists "Organization members can delete ai incidents" on public.ai_incidents;
    drop policy if exists "Organization members can manage ai incidents" on public.ai_incidents;
  end if;

  if to_regclass('public.organization_invites') is not null then
    drop policy if exists "Organization members can create invites" on public.organization_invites;
    drop policy if exists "Organization members can update invites" on public.organization_invites;
    drop policy if exists "Organization members can delete invites" on public.organization_invites;
    drop policy if exists "Organization admins can manage invites" on public.organization_invites;
  end if;

  if to_regclass('public.invitations') is not null then
    drop policy if exists "Organization members can create invitations" on public.invitations;
    drop policy if exists "Organization members can update invitations" on public.invitations;
    drop policy if exists "Organization members can delete invitations" on public.invitations;
    drop policy if exists "Organization admins can manage invitations" on public.invitations;
  end if;
end $$;
