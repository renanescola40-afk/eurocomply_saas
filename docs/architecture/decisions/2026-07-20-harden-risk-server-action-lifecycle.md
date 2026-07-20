# Harden the risk server-action lifecycle

- Status: Proposed
- Date: 2026-07-20
- Priority: P1 security and governance integrity

## Context

The canonical risk server actions supported creation and deletion but no reviewed update workflow. Mutation paths also selected every database column. Once direct authenticated table writes are removed, the product needs a server-owned update boundary that preserves tenant scope, authorization, validation, throttling, concurrency safety and durable audit evidence.

## Decision

- Add a bounded `updateRisk` server action requiring `risks:write`.
- Require the caller to provide the last observed `updated_at` value and enforce it on both the pre-update read and mutation.
- Scope every read, update, delete and compensation operation by `riskId` and `organizationId`.
- Apply the existing distributed limiter with explicit fail-closed behavior to create, update and delete.
- Replace broad mutation selections with an explicit allowlist.
- Require durable `risk.update` audit persistence before returning success.
- If audit persistence fails, restore the prior row only when the newly written `updated_at` value still matches, avoiding overwriting a later concurrent change.

## Consequences

Risk updates now have a reviewed backend path suitable for use after direct client DML is denied. Stale clients fail closed instead of silently overwriting newer changes. Successful responses imply that the mutation and its audit event both persisted.

The compensation model remains cross-system best effort rather than a single database transaction. A compensation failure is reported and the caller still receives failure. A future database RPC may provide stronger atomicity.

## Evidence boundary

Repository tests verify authorization, fail-closed throttling, tenant selectors, optimistic concurrency, explicit selections, durable audit ordering and scoped compensation. They do not prove production Supabase behavior, live RLS, deployed migrations, provider availability or absence of all race conditions.

## Rollback

Revert the action, tests and this decision record together. Do not restore direct browser mutation as a substitute for the reviewed update boundary without documented security acceptance.
