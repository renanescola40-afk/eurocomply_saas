# Enterprise membership with mixed Clerk/UUID identities

**Date:** 2026-11-03  
**Decision:** Forward-only identity compatibility correction; no production change authorized.  
**Owner issue:** #2518  
**Scope:** SEC-01 / SEC-02 / SEC-03, gates A-01 / A-02 / A-03 (none marked PASS).

## Direct evidence

Read-only live QA catalog inspection found private Enterprise functions using `auth.uid()` on a Clerk-style text subject. Executing `app_private.enterprise_member_can_read(uuid)` in an authenticated-role QA SQL session with that text subject reproduced PostgreSQL `22P02` (invalid UUID syntax). The same function bodies are present in PROD and QA by SQL-definition MD5, but no production end-user execution was attempted.

QA contains two synthetic organizations and five active Clerk test memberships; both tenants have `require_mfa_for_all_users = true`. With synthetic `request.jwt.claim.sub` and `request.jwt.claims.aal` session settings, `app_private.is_org_member(uuid)` and `app_private.has_org_role(uuid,text[])` passed ten out of ten read-only role/tenant/MFA assertions across owner, admin and member roles, including cross-tenant denials.

Those SQL exercises do not validate cryptographic JWT signatures, PostgREST, browser sessions, Storage RLS, uploads, or the deployed application's identity-provider contract.

## Chosen solution

A **new** migration `20261103080000_enterprise_clerk_text_subject_mfa_reconciliation.sql` changes the two private Enterprise wrappers to delegate to the existing canonical Clerk/UUID-safe `app_private.is_org_member` and `app_private.has_org_role` functions. The latter already require active membership, the current request subject and tenant-wide MFA. Management retains the existing owner/admin/editor/compliance_manager allowlist.

The migration refuses missing or unsafe prerequisites, preserves `SECURITY DEFINER`, explicit `search_path = pg_catalog`, private schema, and existing authenticated/service-role grants, and asserts that `anon` has no EXECUTE. It performs no RLS-policy changes, tenant-table changes, customer-data changes or new Identity authority. The historical applied MFA migration is unchanged.

## Rejected alternatives

- **Keep `auth.uid()` and catch error:** the cast error may happen during RLS evaluation and is avoidable.
- **Cast Clerk subjects into UUIDs:** unsafe identity translation.
- **Disable tenant MFA / grant generic public access:** unacceptable weakening of authorization.
- **Change existing migration history:** violates canonical replay and production ledger provenance.

## Verification strategy

The native PostgreSQL 17 synthetic fixture extends the existing P0 regression suite:

- The historical migration remains in the ordered replay, followed by the new forward migration.
- Existing UUID/legacy MFA cases must continue passing.
- **14 additional authenticated-role Clerk cases** check MFA aal1/aal2, owner/admin/editor/compliance_manager/viewer/suspended roles and both tenant directions.
- An original `auth.uid()`-based implementation must raise `22P02` on the Clerk test subject, while the new wrappers must return fail-closed booleans. Explicit postconditions validate ACL and private-schema requirements.
- Run `node scripts/security/verify-p0-postgres-isolated.mjs` only against its **loopback-only synthetic** database fixture with PostgreSQL 17; never point it at PROD or QA.
- After a clean exact-SHA CI run, replay the canonical migration in isolated QA by the authorized database integration owner. Use valid signed test sessions for A/B/MFA E2E. Obtain qualified independent review before merging.

## Residual risks and gate status

The migration is only source code until replayed/validated on an isolated database. The synthetic suite has not been run in this conversation, and hosted CI is unavailable at the current observed budget/runner admission state. No production data, credentials, settings, RLS grants, or deployments have been modified. RTO/RPO, DAT-01 migration ledger and CI still block formal Enterprise closure.

**Status:** IMPLEMENTED_IN_DRAFT_BRANCH / REQUIRES_NATIVE_PG_TEST_AND_QA_REPLAY / A-01,A-02,A-03=NOT_VERIFIED.
