# ADR-0066: Create enterprise evidence packs atomically

- Status: Accepted
- Date: 2026-07-15
- Scope: AI-governance evidence integrity

## Context

The evidence-pack workflow created the parent pack first and inserted its required seed items in a second database statement. When item persistence failed, the API attempted a compensating delete.

That compensation was best-effort. A database, network, or permission failure during cleanup could leave a durable draft pack without its required item set. The API did not return success in that path, but the partial record could still be mistaken later for a complete generated pack.

This is a repository control-flow finding. It is not evidence that production data was affected, and it is not an external audit or penetration-test result.

## Decision

Create the evidence-pack parent and every required seed item inside one PostgreSQL `SECURITY DEFINER` function:

- the API keeps authentication, trusted-origin, tenant RBAC, validation, and rate limiting;
- the service-role client invokes the backend-only RPC only after those guards pass;
- the function inserts the pack, executive-report item, and either current tenant AI-system items or one missing-baseline item in a single transaction;
- any statement failure rolls back the whole function invocation;
- execution is revoked from `public`, `anon`, and `authenticated` and granted only to `service_role`;
- the API validates the returned shape before writing the success audit event.

## Consequences

Positive:

- no orphan parent pack can be committed by this workflow when required item creation fails;
- audit success remains downstream of a confirmed atomic result;
- tenant item selection is performed in the same database transaction as pack creation.

Trade-offs:

- deployment must apply the migration before the updated API is promoted;
- the function is a privileged backend boundary and must remain narrowly granted;
- this does not make later edits, approvals, or exports atomic with creation.

## Rollback

Revert the API commit and migration together before deployment, or deploy the prior application version while leaving the additive function unused. After confirming no deployed code calls it, a later migration may drop `public.create_enterprise_evidence_pack_atomic(uuid, uuid, text, text[], integer)`.
