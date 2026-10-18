# P0 membership acceptance in native PostgreSQL

The CircleCI `p0-postgres-synthetic` job runs the actual six forward SQL migrations, manual RPC retirement and bounded two-row repair against a fresh PostgreSQL 17.6 service. Its sole database is `risck_synthetic` on loopback with disposable, public fixture credentials. The verifier refuses a nonempty public schema and checks database, user, server address and PostgreSQL major version before creating synthetic tables. It does not read provider secrets, accept a remote connection string or contact Supabase.

The minimal baseline fixture reproduces the relevant columns, read-only production SQL function definitions and ACLs needed to test P0-B/C/D/E/F and Enterprise MFA. It contains no tenant records, passwords, tokens or customer information. The function definitions were read from production catalog metadata on 2026-10-18; their owners become the isolated test superuser. The seat-release migration's existing fingerprint guard remains unchanged and must pass naturally.

The job runs success/denial, stale state, active-owner guards, administrator quota (including pending invitations), transaction rollback on signed and legacy audit failure, usage-counter reconciliation, MFA role/AAL combinations, service-role ACL cutover and synthetic repair. Multi-session tests hold the first transaction open, prove the second is waiting on a real PostgreSQL lock, then commit the first and assert the second result. They cover owner removal/demotion/suspension/SCIM, concurrent admin promotions, audit-head CAS rollback and retry, duplicate seat idempotency, and tenant-independent lock progress.

Evidence is written to `artifacts/p0-postgres/acceptance.json`, bound to the actual checked-out Git SHA, and retained by CircleCI. A failed assertion exits nonzero. No skipped case can claim PASS. The separate existing source-quality job is preserved unchanged.

## Evidence limits and rollback

This is native multi-session SQL validation on a synthetic **minimal** schema. It does not prove complete Supabase schema/trigger/FK/extension compatibility, API authentication/Step-Up, production RLS/Storage isolation, HMAC signing, deployment, recovery, external review, or Enterprise acceptance. Production execution still requires the bounded migration/recovery/release prerequisites. Never execute the fixture against production.

The test client is isolated in `tests/fixtures/p0-postgres-runtime`, pinned and locked; npm lifecycle scripts are disabled. No application dependency changes. Included CircleCI Free quota was visibly verified before activating the job; no paid resource or provider capacity is created. Rollback is reverting the test/fixture/doc files and new CircleCI job. No application or production database rollback is involved.
