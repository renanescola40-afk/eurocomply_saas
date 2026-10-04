-- Harden internal Sales Console tables with FORCE ROW LEVEL SECURITY.
-- Direct anon/authenticated access is already revoked; service_role has BYPASSRLS.
-- FORCE RLS adds defense in depth for table-owner execution paths without opening client access.

alter table public.sales_leads force row level security;
alter table public.sales_lead_activities force row level security;
alter table public.sales_lead_notes force row level security;
alter table public.sales_lead_activity_events force row level security;

-- Preserve backend-only authority explicitly.
revoke all on public.sales_leads from anon, authenticated;
revoke all on public.sales_lead_activities from anon, authenticated;
revoke all on public.sales_lead_notes from anon, authenticated;
revoke all on public.sales_lead_activity_events from anon, authenticated;

grant select, insert, update, delete on public.sales_leads to service_role;
grant select, insert, update, delete on public.sales_lead_activities to service_role;
grant select, insert, update, delete on public.sales_lead_notes to service_role;
grant select, insert, update, delete on public.sales_lead_activity_events to service_role;
