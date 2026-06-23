# Profile runtime proof patch requirement

The final Supabase live tenant-isolation runner patch still needs to be applied to `scripts/security/run-supabase-live-tenant-isolation-v2.mjs`.

Required implementation:

1. Add a `profiles` table spec using the existing owner B user as the seeded profile and viewer A as the denied cross-user insert target.
2. Stop skipping `profiles` during fixture setup.
3. Run the existing live runner so it emits `profiles` runtime cases for RLS enablement, cross-tenant read/insert/update/delete denial, and same-tenant read.
4. Commit only real `Complete/passed` evidence after the live Supabase run succeeds.

This note is intentionally not completion evidence.
