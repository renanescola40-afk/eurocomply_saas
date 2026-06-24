-- Live validation table privileges.

grant select, insert, update, delete on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.documents to authenticated;
grant select, insert, update, delete on table public.audit_events to authenticated;
grant select, insert, update, delete on table public.risks to authenticated;
grant select, insert, update, delete on table public.vendors to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.notifications to authenticated;
grant select, insert, update, delete on table public.compliance_tasks to authenticated;
grant select, insert, update, delete on table public.audit_logs to authenticated;
grant select, insert, update, delete on table public.ai_systems to authenticated;
grant select, insert, update, delete on table public.ai_incidents to authenticated;

notify pgrst, 'reload schema';
