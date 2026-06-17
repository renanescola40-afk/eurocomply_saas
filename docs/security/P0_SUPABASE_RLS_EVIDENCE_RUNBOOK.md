# P0 Supabase Live RLS Evidence Runbook

This runbook closes the `supabase-live-rls-validation` P0 runtime evidence item only after live row-level security behavior is validated against the production-like Supabase project.

## Scope

Evidence must prove tenant isolation at the database boundary, not only in the application UI.

Minimum validation scope:

- Cross-tenant read attempts are denied.
- Cross-tenant write attempts are denied.
- Same-tenant access works where expected.
- Anonymous access is denied for tenant-scoped tables unless explicitly public by design.
- Service-role paths are reviewed separately and are not used by client-side code.
- RLS policies are enabled on tenant-scoped tables.

## Evidence rules

Do not commit live credentials, database URLs, tokens, JWTs, cookie values, or raw production rows.

Allowed evidence examples:

- Redacted test output proving allow/deny behavior by test case id
- Redacted SQL policy listing showing RLS enabled and policy names
- Release approval comment linking to private evidence storage
- Issue created from the P0 Runtime Evidence template with redacted attachments

## Required table coverage

Create a table coverage list before marking this item complete. Each tenant-scoped table should have one of these statuses:

- `validated`: read/write isolation tested
- `service_role_only`: no client access path; service role path reviewed
- `not_applicable`: table is public or not tenant scoped, with rationale

## Fill the JSON evidence file

Copy `docs/security/evidence/templates/supabase-live-rls-validation.template.json` to:

```text
docs/security/evidence/runtime/supabase-live-rls-validation.json
```

Then replace every placeholder with real reviewed evidence.

The file is only valid when:

- `status` is `Complete` or `Exception`
- `redactionConfirmation` exactly equals `All secrets, tokens, credentials, connection strings, and access-granting values are redacted.`
- test cases include cross-tenant read denial, cross-tenant write denial, same-tenant allowed behavior, and service-role review
- table coverage includes at least one reviewed table entry

## Go/no-go

Do not mark this P0 item as `Complete` until live Supabase behavior has been validated against the production-like project.

If Supabase production is not ready, use `Exception` only for a documented private beta exception with owner, rationale, expiry date, compensating controls, and approval reference.
