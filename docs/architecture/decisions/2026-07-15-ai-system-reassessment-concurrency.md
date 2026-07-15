# Serialize AI-system reassessment with atomic history persistence

Date: 2026-07-15  
Status: Proposed

## Context

`PATCH /api/ai-systems/[id]` loads the current tenant-scoped AI-system record, recalculates its EU AI Act classification, updates the record, writes a reassessment history snapshot, and then appends success audit evidence containing the previously loaded risk and lifecycle state.

The update previously matched only the AI-system ID and organization ID. Two authorized reassessments could therefore load the same state, submit different answers, and both update successfully. The last database write would win, while both requests could create history and audit records describing a transition from the same stale previous state.

An initial optimistic compare-and-set prevented the stale write, but the system update and history insert were still separate operations. A database or history-table error after the update could leave a changed classification without its required reassessment snapshot.

These behaviors weaken the integrity of the AI-governance evidence lifecycle. The findings are based on repository control flow only. No production race, missing customer history, incorrect classification, regulatory impact, external audit finding, or penetration test is claimed.

## Decision

Use a backend-only PostgreSQL RPC, `public.reassess_ai_system_atomic`, as the final transition boundary.

The RPC receives:

- AI-system ID;
- organization ID;
- the exact server-loaded `updated_at` value;
- authenticated actor user ID;
- the already validated and classified reassessment payload.

Inside one transaction the function:

1. validates required identifiers and payload types;
2. locks the tenant-scoped AI-system row with `FOR UPDATE`;
3. compares the locked `updated_at` with the expected server-loaded value;
4. updates the classification and governance fields;
5. relies on the existing trigger to advance `updated_at`;
6. inserts one `ai_system_history` reassessment snapshot;
7. returns the confirmed row only after both writes succeed.

The possible outcomes are:

- `updated`: system and history committed;
- `state_changed`: the expected version is stale;
- `not_found`: the tenant-scoped record no longer exists;
- `invalid_input`: the backend-only payload contract was violated.

`state_changed` and `not_found` become HTTP 409 `ai_system_state_changed`. Invalid or malformed RPC responses fail closed through the secure API error path.

Only after the RPC returns `updated` does the route append `ai_system_reassessed` chained audit evidence and return success.

## Security and tenant boundary

The function is `SECURITY DEFINER` with a fixed `public, pg_temp` search path. Execute permission is revoked from `public`, `anon`, and `authenticated` and granted only to `service_role`.

The Next.js route remains responsible for authentication, organization resolution, `manage_ai_governance`, trusted-origin validation, distributed rate limiting, body bounds, schema validation, and classification before invoking the RPC.

The organization predicate and system ID are enforced both in the row lock and final update. The expected version is loaded by the server from the tenant-scoped record and is never accepted from the request body.

The conflict response contains no classification payload, tenant data, timestamps, internal database details, or competing actor information.

## Audit and evidence integrity

A losing request cannot create:

- a system update;
- an `ai_system_history` reassessment snapshot;
- an `ai_system_reassessed` success audit event;
- a response claiming the submitted classification became current.

A successful RPC cannot commit the system update without the reassessment history insert. If the history insert fails, PostgreSQL rolls back the entire RPC transaction.

The chained audit append remains a separate post-transaction operation because its existing evidence-chain persistence path is broader than the AI inventory tables. It is invoked only after the system and history transaction confirms. Its persistence result remains exposed through the existing API response behavior.

## Performance

The RPC adds a tenant-scoped row lock and one history insert to the same database round trip. It removes the separate application-side history insert from the reassessment path.

No provider call, dependency, background job, external network request, or customer-data copy is added. Runtime latency, lock wait duration, and database execution plans were not measured.

Measurement unavailable in the current execution environment.

## Alternatives considered

### Last-write-wins

Rejected because the evidence trail can describe mutually incompatible successful transitions from stale state.

### Application-side compare-and-set only

Improves stale-write behavior but leaves the system update and history snapshot non-atomic.

### Compare only the previous risk level

Rejected because ownership, lifecycle, role, use case, risk-domain inputs, obligations, and other classification fields can change without changing the risk level.

### Client-provided version

Rejected. The server already loads the authoritative tenant-scoped version.

### Integer version column

Viable but unnecessary for this rollout. The existing non-null `updated_at` is advanced by a database trigger and can serve as the optimistic version while the row lock serializes concurrent transitions.

## Verification

Repository contracts require:

- the route to pass `existing.updated_at` and authenticated actor ID;
- the query layer to invoke the atomic RPC instead of a direct update;
- backend-only execute privileges;
- tenant-scoped `FOR UPDATE` locking;
- exact version comparison before mutation;
- a conditional final update;
- history insertion before the RPC returns `updated`;
- no application-side history insert in the reassessment function;
- HTTP 409 for stale or concurrently removed state;
- the conflict guard to precede success audit creation.

GitHub Actions is authoritative for migration checks, lint, typecheck, unit tests, build, E2E, CodeQL, Semgrep, Gitleaks, dependency review, security suites, and enterprise gates on the exact PR head.

No live Supabase migration, production concurrency test, database load test, customer record mutation, external assessment, or runtime evidence is claimed.

## Risks and trade-offs

- row locks can make concurrent reassessments wait briefly before one receives a conflict;
- direct database writers must continue to use the trigger-managed `updated_at` contract;
- the RPC accepts a JSONB patch from trusted backend code and independently validates required field types, while table constraints remain the final domain validation;
- the migration must be deployed before the application code that invokes the RPC;
- audit-chain persistence remains post-transaction and is not claimed to be atomic with the AI-system tables.

## Rollback

Revert the application commits and the migration by removing/revoking the RPC after the old application code is restored. Reassessment returns to the previous direct-update behavior.

No backfill, data rewrite, secret rotation, provider configuration, or customer-data rollback is required. Existing atomic history snapshots remain valid.
