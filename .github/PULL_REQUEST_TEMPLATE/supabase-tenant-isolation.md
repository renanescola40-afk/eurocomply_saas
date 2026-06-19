## Supabase tenant isolation checklist

- [ ] All tenant-scoped tables have RLS enabled.
- [ ] Policies include organization-aware SELECT/INSERT/UPDATE/DELETE guards where client mutations are allowed.
- [ ] Backend-only/admin tables deny authenticated client mutations.
- [ ] `docs/security/evidence/runtime/supabase-live-rls-validation.json` remains `Open` unless the live script passed.
- [ ] Public production remains blocked while live RLS evidence is `Open`.
