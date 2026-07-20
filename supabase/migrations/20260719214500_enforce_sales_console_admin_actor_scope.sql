-- Prevent internal Sales Console records from attributing ownership or activity
-- to arbitrary authenticated users who are not enabled platform administrators.

create or replace function public.enforce_sales_console_admin_actor_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  scoped_user_id uuid;
begin
  if tg_table_name = 'sales_leads' then
    if tg_argv[0] = 'owner_user_id' then
      scoped_user_id := new.owner_user_id;
    elsif tg_argv[0] = 'updated_by' then
      scoped_user_id := new.updated_by;
    else
      raise exception 'unsupported_sales_lead_actor_column'
        using errcode = 'check_violation';
    end if;
  elsif tg_table_name = 'sales_lead_activities' then
    scoped_user_id := new.created_by;
  elsif tg_table_name = 'sales_lead_notes' then
    scoped_user_id := new.created_by;
  elsif tg_table_name = 'sales_lead_activity_events' then
    scoped_user_id := new.actor_user_id;
  else
    raise exception 'unsupported_sales_console_actor_table'
      using errcode = 'check_violation';
  end if;

  if scoped_user_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.platform_admin_users platform_admin
    where platform_admin.user_id = scoped_user_id
      and platform_admin.enabled = true
  ) then
    raise exception 'sales_console_actor_not_enabled_platform_admin'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_sales_console_admin_actor_scope() from public;
revoke all on function public.enforce_sales_console_admin_actor_scope() from anon;
revoke all on function public.enforce_sales_console_admin_actor_scope() from authenticated;

drop trigger if exists enforce_sales_lead_owner_admin_scope on public.sales_leads;
create trigger enforce_sales_lead_owner_admin_scope
before insert or update of owner_user_id
on public.sales_leads
for each row
execute function public.enforce_sales_console_admin_actor_scope('owner_user_id');

drop trigger if exists enforce_sales_lead_updater_admin_scope on public.sales_leads;
create trigger enforce_sales_lead_updater_admin_scope
before insert or update of updated_by
on public.sales_leads
for each row
execute function public.enforce_sales_console_admin_actor_scope('updated_by');

drop trigger if exists enforce_sales_lead_activity_creator_admin_scope
  on public.sales_lead_activities;
create trigger enforce_sales_lead_activity_creator_admin_scope
before insert or update of created_by
on public.sales_lead_activities
for each row
execute function public.enforce_sales_console_admin_actor_scope();

drop trigger if exists enforce_sales_lead_note_creator_admin_scope
  on public.sales_lead_notes;
create trigger enforce_sales_lead_note_creator_admin_scope
before insert or update of created_by
on public.sales_lead_notes
for each row
execute function public.enforce_sales_console_admin_actor_scope();

drop trigger if exists enforce_sales_lead_event_actor_admin_scope
  on public.sales_lead_activity_events;
create trigger enforce_sales_lead_event_actor_admin_scope
before insert or update of actor_user_id
on public.sales_lead_activity_events
for each row
execute function public.enforce_sales_console_admin_actor_scope();
