# ADR: Contract-backed tenant licensing and serialized seats

- **Date:** 2026-07-21
- **Status:** Proposed for review
- **Decision owners:** Platform, Security, Backend and Product Engineering

## Context

Risck Comply already uses one Next.js application and organization-scoped Postgres records. Existing subscription logic identifies a plan and calculates some usage at read time, but it cannot safely support negotiated Enterprise contracts with independent full, participant, viewer and administrator limits.

The previous shape also creates several risks:

- role and paid-seat consumption are the same concept;
- concurrent membership operations may oversubscribe the final seat;
- invitations promise access without reserving capacity;
- SCIM, SSO, CSV, API and admin paths could implement different checks;
- platform operators lack a contract authority and controlled lifecycle;
- checking only a plan name cannot represent negotiated entitlements.

## Decision

### Keep one application and one tenant model

An Enterprise customer remains an `organizations` row. Product data continues to use `organization_id`. We will not create separate repositories, deployments or manually copied pages for each customer.

### Separate authorization from licensing

`organization_members.role` defines permissions. `organization_members.seat_type` defines contractual seat consumption.

### Make the database the concurrency authority

Every seat consumer must use a PostgreSQL RPC that serializes on the organization usage row, validates contract and entitlement state, recounts real usage, includes pending invitations and performs the write atomically.

### Use contract-backed entitlements

The effective authorization layer is represented by `enterprise_contracts` and `organization_entitlements`. Missing, unknown or inconsistent licensing state fails closed.

### Keep an idempotency ledger

Every reserve, release or change operation records an organization-scoped idempotency key in `enterprise_seat_operations`.

### Consolidate global administration

New platform roles use the existing `platform_admin_users` authority and its AAL2 MFA guard. Organization roles do not grant platform access.

### Preserve existing tenants during rollout

Existing organizations receive a permissive compatibility contract. A safe provisioning RPC validates real current usage before replacing it with the first negotiated contract.

## Consequences

### Positive

- two concurrent requests cannot both consume the last seat;
- invitations, reactivation and seat changes share one authority;
- negotiated contracts can represent customer-specific limits and features;
- platform and organization authorization remain separate;
- existing customers are not blocked by an additive migration;
- future SCIM, SSO, CSV and API entrypoints have one adapter contract;
- contract transitions are explicit, reasoned and auditable.

### Costs

- seat-affecting writes must go through service-role backend RPCs;
- usage counters require reconciliation and monitoring;
- generated Supabase database types must be refreshed after migration;
- direct legacy writes to membership tables must be removed or guarded;
- contract billing automation remains a separate integration effort;
- runtime load and concurrency evidence is still required before production capacity claims.

## Alternatives considered

### One application or database per Enterprise customer

Rejected. It increases deployment drift, operational cost, security variance and manual customer setup without improving the logical tenant model.

### Read the member count and then insert in application code

Rejected. A count followed by a write is vulnerable to race conditions and cannot guarantee the last-seat invariant.

### Check only `plan === "enterprise"`

Rejected. Enterprise contracts differ by seat mix, administrators, storage, integrations, retention and commercial state.

### Trust optimized counters without recounting

Rejected. Counters can diverge due to historic or emergency writes. Critical allocations recount the real state beneath the same lock.

### Create a second platform-admin table

Rejected after repository audit. `platform_admin_users` already exists and enforces MFA AAL2. The Enterprise roles are consolidated into that authority.

## Invariants

1. Every active member consumes exactly one seat type.
2. Active members equal full users plus participants plus viewers.
3. No operation may exceed total, seat-type or administrator limits.
4. Pending invitations reserve capacity.
5. Only an active contract may accept new seats.
6. Customer data is not deleted automatically due to contract status.
7. Platform access is independent from organization membership.
8. Browser state is never an authorization source.
9. Integration paths must call the shared provisioning adapter.
10. Critical writes produce sanitized audit evidence.

## Rollout requirements

- apply migrations in timestamp order;
- regenerate Supabase types after migration;
- verify compatibility contracts and usage reconciliation;
- assign global roles only through an authorized operational process;
- test draft-to-active and active-to-suspended transitions in a non-production database;
- test two concurrent requests for the final seat;
- verify invitation creation, acceptance, compensation and expiration;
- run lint, typecheck, Vitest, build and security gates;
- collect live runtime evidence before advertising a supported organization size.
