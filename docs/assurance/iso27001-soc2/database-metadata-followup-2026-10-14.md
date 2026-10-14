# Database security metadata follow-up — 2026-10-14
Status: READ-ONLY VERIFIED METADATA. Not an effectiveness test, external certification, or SOC 2 report.

## Table coverage
| Schema | Tables | RLS enabled | FORCE RLS |
|---|---:|---:|---:|
| auth | 27 | 16 | 0 |
| extensions | 1 | 0 | 0 |
| public | 115 | 115 | 115 |
| realtime | 3 | 1 | 0 |
| storage | 8 | 8 | 0 |
| supabase_migrations | 1 | 0 | 0 |
| vault | 1 | 0 | 0 |

Other schemas include managed internal tables. Do not automatically modify platform-managed RLS settings.

## Public schema checks
- 115/115 public tables have RLS and FORCE RLS enabled.
- 227 policy rows apply to 82 tables; 33 public tables have no explicit policy.
- All 33 names were retrieved. Examples include billing_checkout_attempts, enterprise_api_keys, organization_entitlements, platform_admin_users, stripe_webhook_events and waitlist_leads. Check server-side purpose and deny-by-default intent for each before changing anything.
- 125/125 SECURITY DEFINER functions declare a function-level search_path setting (0 missing according to pg_proc.proconfig metadata). The path VALUES, EXECUTE grants, authorization checks and owners were not evaluated.
- information_schema.role_table_grants: authenticated has SELECT privileges on 64 tables, INSERT on 3, UPDATE on 5, DELETE on 2. This is metadata only; no table data accessed. No rows appeared for anon or PUBLIC in this filtered information_schema query. This does NOT prove absence of all indirect access.
- Non-public schema counts: auth 27/16 RLS, storage 8/8 RLS, realtime 3/1 RLS, extensions 1/0, supabase_migrations 1/0, vault 1/0. These are potentially provider-managed schemas with distinct access controls.

## Follow-up control tests (isolated, not on demo or production customer data)
1. Review no-policy tables' exposure, grant paths, service-role usage and intended server-only pattern.
2. Verify each SECURITY DEFINER function's search_path value, ownership, permissions and organization binding.
3. Inspect policy USING/WITH CHECK, permissive/restrictive combination and tenant-id membership path.
4. Review storage.objects policies and grants, especially private evidence storage.
5. Perform synthetic tenant separation tests in isolated environment before claiming tested effective isolation.

## Metric integrity
- Metadata discovery and inventory completed for 33/33 no-policy public tables, not security approval of them.
- Configuration coverage: 115/115 public FORCE RLS; 8/8 storage RLS; 125/125 definer functions have explicit search_path.
- ISO 27001 overall readiness: NOT YET MEASURABLE.
- SOC 2 Type I/II readiness: NOT YET MEASURABLE.
- No data, emails, production settings, DataGuard accounts or payment records modified.
