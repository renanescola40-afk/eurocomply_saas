-- The live RLS policy patch recreates helper functions with current parameter names.
-- PostgreSQL does not allow CREATE OR REPLACE FUNCTION to rename input parameters,
-- so previous failed/partial workflow attempts can leave same-signature helpers with
-- stale parameter names. Drop only the unreferenced apply_* helpers before the patch
-- migration recreates them.

drop function if exists public.live_rls_validation_apply_org_scoped(text);
drop function if exists public.live_rls_validation_apply_backend_only(text);
