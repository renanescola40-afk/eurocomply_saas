# Audit Chain Concurrency Runbook

This runbook defines the enterprise hardening path for making EuroComply audit-chain writes safe under concurrent event ingestion.

## Current Risk

The audit-chain implementation computes each event hash from the previous event hash. If multiple audit events are written for the same organization at nearly the same time, concurrent writers can read the same previous hash before either insert is committed.

That can create competing branches in the audit chain.

## Enterprise Target

Before enterprise procurement readiness, audit-chain append operations must be serialized per organization.

The target behavior is:

```txt
one organization
one append lock
one previous hash
one next hash
no competing branches
```

## Required Database Pattern

Use a PostgreSQL transaction with one of the following approaches:

```txt
pg_advisory_xact_lock(hashtext(organization_id::text))
```

or an organization-scoped lock row:

```txt
select * from audit_chain_locks where organization_id = $1 for update
```

The recommended approach is advisory transaction locking because it does not require a separate lock table.

## Required RPC Shape

Create a Supabase RPC that performs the full append operation inside the database transaction:

```txt
append_audit_event_chained(
  organization_id,
  actor_user_id,
  action,
  target_type,
  target_id,
  metadata,
  occurred_at
)
```

The RPC must:

```txt
1. acquire organization-scoped transaction lock
2. read latest event_hash for the organization
3. canonicalize the payload or accept a server-generated canonical payload
4. compute event_hash or accept a trusted server-computed hash with signed metadata
5. insert the new row
6. return the inserted event id, previous_hash, event_hash, and occurred_at
```

## Application Rule

The application layer must not perform read-previous-hash and insert as separate non-transactional operations for production enterprise mode.

The application layer may keep a fallback legacy append path only when explicitly running in advisory/non-enterprise mode.

## Required Evidence

Before enterprise release:

```txt
migration exists for append_audit_event_chained
application append path calls the RPC
security gate verifies RPC usage
concurrency test exists
manual verification has two concurrent appends for one organization
chain verifier passes after concurrent append test
```

## CI Gate Requirements

Security checks must fail when:

```txt
AUDIT_CHAIN_ENTERPRISE_MODE=true
append RPC is missing
application code does not call append_audit_event_chained
concurrency test is missing
legacy non-transactional append is used in enterprise mode
```

## Manual Verification

Run a script or test that creates two audit events concurrently for the same organization.

Expected result:

```txt
first event.previous_hash = latest prior hash
second event.previous_hash = first event.event_hash
chain verifier status = valid
no duplicate previous_hash branch for the same prior head
```

## Release Rule

Do not claim enterprise-grade audit integrity until concurrent audit append behavior is validated against the production Supabase project.
