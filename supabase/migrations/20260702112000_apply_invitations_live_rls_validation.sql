-- Apply invitations RLS validation policies to existing environments.
-- This must live in a new migration because already-applied historical
-- migrations are not replayed by Supabase on staging/production projects.

select public.live_rls_validation_apply_backend_only('invitations');

notify pgrst, 'reload schema';
