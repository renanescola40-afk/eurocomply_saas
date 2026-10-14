# Database, RLS and Tenant Isolation Evidence Index
Date: 2026-10-14 | RESTRICTED_LATE_STAGE
Review `supabase/migrations/`, `docs/trust/ACCESS_CONTROL.md`, `docs/security/SUPABASE_TENANT_ISOLATION_IMPLEMENTATION.md` and `src/server/security/rbac.ts` at a fixed Git SHA.
Code presence does not prove effective current production tenant isolation. Require reproducible non-production authorized negative/positive role tests and sealed evidence; do not conduct active production tenant-isolation testing during the DataGuard demo.
