# Local-only synthetic tenant read-isolation validation

Status: PREPARED. The live tenant A/B check has **not** been executed against a real local Supabase in this work session.

## Scope

`scripts/security/local-tenant-read-proof.mjs` is an isolated, read-only alternative to the governed production validation workflow. It does not modify that workflow, create users or perform writes.

The local proof checks ten positive/negative observations across two distinct synthetic tenant accounts:
- Each user can read their own active membership.
- Each user cannot read the other tenant's membership row.
- Each user can read their own seeded document.
- Each user cannot read the other tenant's seeded document.
- Anonymous access to either document is denied.

This is **only a SELECT/membership subset** of the enterprise tenant isolation gate. INSERT, UPDATE, DELETE, Storage, privileged APIs and all other tenant tables still need separate proof.

## Prerequisites

1. An already available, isolated, zero-new-cost **local Supabase** instance running on loopback (default API port 54321).
2. The project's migrations successfully applied to that local instance.
3. Two distinct synthetic auth users at `example.test` or `example.com`, with two distinct active memberships, organizations, and document fixtures.
4. Any commercial entitlement required by the current app's payment-first RLS must be synthetic and present **only locally**.
5. No production data, keys or service-role credentials in this testing process.

The command intentionally fails rather than becoming advisory PASS if any prerequisite is missing.

## First run the offline unit tests

```sh
node --test tests/security/local-tenant-read-proof.test.mjs
```

## Then provide only local fixture values in the shell

```sh
export RISCK_LOCAL_TEST_CONFIRMATION=LOCAL_SYNTHETIC_ONLY
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export LOCAL_RLS_ANON_KEY='<LOCAL_ANON_KEY_ONLY>'
export LOCAL_RLS_A_EMAIL='tenant-a@example.test'
export LOCAL_RLS_A_PASSWORD='<SYNTHETIC_A_PASSWORD>'
export LOCAL_RLS_B_EMAIL='tenant-b@example.test'
export LOCAL_RLS_B_PASSWORD='<SYNTHETIC_B_PASSWORD>'
export LOCAL_RLS_A_ORG_ID='<UUID_A>'
export LOCAL_RLS_B_ORG_ID='<UUID_B>'
export LOCAL_RLS_A_DOCUMENT_ID='<DOCUMENT_UUID_A>'
export LOCAL_RLS_B_DOCUMENT_ID='<DOCUMENT_UUID_B>'
node scripts/security/local-tenant-read-proof.mjs
```

If the local API is configured to a custom port, set `SUPABASE_LOCAL_API_PORT` accordingly.

Do not use production keys. The runner rejects any `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY` or `SUPABASE_ACCESS_TOKEN` in its process environment.

Successful output reports only the scope, count, labels and timestamp; it does not print fixture credentials.

## Evidence interpretation

- `node --test` PASS = mocked control-flow regression, **not** database authorization evidence.
- Local proof PASS = real local SELECT behavior for the ten tested observations, bound to that local schema and fixture.
- Production verification = **NOT DONE** until separately authorized and safely reconciled.
- `DATABASE_SECURITY_100` remains **NO_PASS** until all required tests and approval gates are satisfied.

**Never point the governed production runner at temporary synthetic test fixtures. Never merge or deploy as a side effect of this runbook.**
