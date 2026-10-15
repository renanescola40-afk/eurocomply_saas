# Supabase Security Closure — Phase 2, 2026-10-15

Status: READ-ONLY METADATA VERIFIED. DATABASE_SECURITY_100=NO_PASS.

## Production checks

- public tables: 115/115 RLS enabled and FORCE RLS enabled.
- pg_policies: 227 policies on 82 distinct public tables.
- All 33 public tables without explicit RLS policies: has_table_privilege returned FALSE for anon SELECT and authenticated SELECT, INSERT, UPDATE, DELETE. This verifies a narrow direct privilege matrix, NOT indirect access via RPC, views, service-role or app endpoints.
- SECURITY DEFINER functions in public and app_private: 138 of 138 have a function-level search_path configuration. Correctness of path values, ownership, EXECUTE grants, tenant authorization and behavior has NOT been verified.
- Previous Supabase Advisor scan: 33 INFO RLS no-policy alerts and 1 WARN leaked-password protection disabled. Recheck before closure.

## Disposition

The 33 no-policy findings are METADATA_CHECKED_DIRECT_DENIAL, but **not closed**. Do not add permissive policies to clear INFO alerts. Trace all app access paths, privileged RPC and views before formal disposition.

## Safe engineering next steps

1. Review owners and effective EXECUTE ACLs for 138 SECURITY DEFINER functions, including PUBLIC.
2. Review views, schema USAGE privileges, role inheritance and service-role server endpoints.
3. Test RLS permissive/restrictive policy combinations, USING and WITH CHECK in a no-cost isolated environment.
4. Build synthetic tenant isolation test matrix across protected CRUD operations.
5. Investigate Auth leaked-password setting cost and compatibility; production change requires specific approval.
6. Triage performance advisor unindexed foreign keys independently (111 INFO in earlier scan).

## Integrity

No production SQL writes, no Auth changes, no billing operations, no messages, no main merges or DataGuard demo changes. Source code is not yet modified for this phase.

Inventory and direct grants metadata passed; effective authorization, real tenant isolation and production runtime security are NOT VERIFIED.
