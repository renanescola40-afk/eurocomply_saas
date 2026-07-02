-- Apply invitations RLS validation policies to existing environments.
-- This must live in a new migration because already-applied historical
-- migrations are not replayed by Supabase on staging/production projects.

-- Older environments may still have the original permissive invitation policy
-- from 20260605211500_invitations.sql. Drop it before applying the backend-only
-- validation policy because permissive RLS policies are ORed together.
drop policy if exists "Admins can manage invitations" on public.invitations;

select public.live_rls_validation_apply_backend_only('invitations');

notify pgrst, 'reload schema';
