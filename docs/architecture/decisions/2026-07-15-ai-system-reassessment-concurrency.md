# Guard AI-system reassessment with optimistic concurrency

Date: 2026-07-15  
Status: Proposed

## Context

`PATCH /api/ai-systems/[id]` loads the current tenant-scoped AI-system record, recalculates its EU AI Act classification, updates the record, writes a reassessment history snapshot, and then appends success audit evidence containing the previously loaded risk and lifecycle state.

The update previously matched only the AI-system ID and organization ID. Two authorized reassessments could therefore load the same state, submit different answers, and both update successfully. The last database write would win, while both requests could create history and audit records describing a transition from the same stale previous state.

That behavior weakens the integrity of the AI governance evidence lifecycle. The finding is based on repository control flow only. No production race, incorrect customer classification, regulatory impact, external audit finding, or penetration test is claimed.

## Decision

Use the `updated_at` value loaded before classification as an optimistic compare-and-set predicate.

The reassessment query now requires all three values to match:

- AI-system ID;
- organization ID;
- the exact `updated_at` value loaded by the request.

The update returns at most one row through `maybeSingle()`.

When no row is returned, another write has changed the system since it was loaded. The API responds with HTTP 409 and `ai_system_state_changed`. It does not write reassessment history or success audit evidence for the losing request.

When the compare-and-set succeeds, the query updates `last_reassessed_at` and `updated_at` to one shared timestamp, persists one history snapshot, and returns the confirmed row. Only then does the route append `ai_system_reassessed` audit evidence.

## Why `updated_at`

The table already exposes `updated_at` in the canonical AI-system record and the update path already changes it. Using the existing value avoids a schema migration while protecting every field involved in classification, ownership, vendor context, role, lifecycle state, obligations, and next actions.

A dedicated integer version column would also work, but would require a migration, backfill, generated client updates, and broader rollout risk for a narrowly scoped concurrency defect.

## Security and tenant boundary

The existing organization predicate remains mandatory. The compare-and-set is an additional condition and does not replace tenant isolation, RBAC, trusted-origin validation, authentication, rate limiting, or RLS.

No user input is trusted as the expected version. The route obtains `expectedUpdatedAt` from the tenant-scoped record loaded by the server.

The conflict response contains no classification payload, tenant data, timestamps, internal database details, or competing actor information.

## Audit and evidence integrity

A losing request cannot create:

- an `ai_system_history` reassessment snapshot;
- an `ai_system_reassessed` success audit event;
- a response claiming the submitted classification became current.

The client must reload the current record, review the new state, and deliberately submit a new reassessment.

The history write remains best effort after a successful database update, as it was before this change. Making the system update, history insertion, and chained audit append one database transaction would require a broader transactional RPC and is outside this small package.

## Performance

The update adds one indexed row predicate on the already selected record. It adds no network round trip, preflight query, dependency, migration, background job, or provider call.

Runtime latency and database execution plans were not measured.

Measurement unavailable in the current execution environment.

## Alternatives considered

### Last-write-wins

Rejected because the resulting audit trail can describe mutually incompatible successful transitions from stale state.

### Compare only the previous risk level

Rejected because ownership, lifecycle, role, use case, risk-domain inputs, obligations, and other classification fields can change without changing the risk level.

### Accept a client-provided version

Rejected as unnecessary. The server already loads the authoritative tenant-scoped record before updating it.

### Database transaction or RPC

Desirable for fully atomic update, history, and audit persistence, but deferred because it requires schema-level rollout and broader evidence-chain design. Optimistic concurrency closes the stale-success defect without that migration.

## Verification

Repository contracts require:

- the route to pass `existing.updated_at` to the query;
- the update to include an `updated_at` equality predicate;
- affected-row verification through `maybeSingle()`;
- HTTP 409 for stale state;
- the conflict guard to precede success audit creation;
- the conflict result to precede history persistence.

GitHub Actions is authoritative for lint, typecheck, tests, build, E2E, CodeQL, Semgrep, Gitleaks, dependency review, security suites, and enterprise gates on the exact PR head.

No production concurrency test, database load test, customer record mutation, external assessment, or runtime evidence is claimed.

## Risks and trade-offs

- timestamp equality depends on the database returning and comparing the canonical `updated_at` representation consistently;
- clients now receive a conflict instead of silent last-write-wins behavior and must reload before retrying;
- direct database writes that fail to change `updated_at` would not participate correctly in optimistic concurrency and should not be used for application reassessment updates;
- history and chained audit persistence are not made transactionally atomic with the system update in this change.

## Rollback

Revert this change. Reassessment returns to last-write-wins behavior and the API no longer returns `ai_system_state_changed` conflicts.

No migration, backfill, data rewrite, secret rotation, provider configuration, or customer-data rollback is required.
