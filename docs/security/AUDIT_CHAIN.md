# EuroComply Audit Chain Standard

This document defines the tamper-evidence model for EuroComply audit events.

## Purpose

Audit events are used to reconstruct security-sensitive activity such as exports, uploads, billing operations, AI governance changes, GDPR requests and administrative actions.

The audit chain adds integrity evidence so reviewers can detect whether event content or event ordering was changed after creation.

## Current Implementation

| Layer | Location |
| --- | --- |
| Hash-chain helper | `src/server/security/audit-chain.ts` |
| Helper tests | `src/server/security/audit-chain.test.ts` |
| Persistence integration | `src/server/queries/audit-events.ts` |
| Schema migration | `supabase/migrations/20260612_audit_event_hash_chain.sql` |
| Transactional append RPC migration | `supabase/migrations/20260613_audit_event_chained_rpc.sql` |
| Concurrency runbook | `docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md` |
| Regression gate | `scripts/security/check-audit-chain.mjs` |

## Stored Fields

The audit chain migration adds these optional fields to `public.audit_events`:

| Column | Purpose |
| --- | --- |
| `actor_user_id` | Canonical actor column for new audit events |
| `previous_hash` | Hash of the previous audit event in the organization-scoped chain |
| `event_hash` | Deterministic SHA-256 hash for the current event |
| `hash_algorithm` | Hash algorithm identifier, defaulting to `sha256` |
| `hash_signature` | Optional HMAC signature of the event hash |

The columns are nullable to support phased rollout and compatibility with older rows.

## Canonical Event Input

The event hash is built from a canonical representation of:

- event id
- organization id
- actor user id
- action
- entity type
- entity id
- metadata
- creation timestamp
- previous hash

Object keys are sorted recursively before hashing. Undefined values are removed. This keeps hashes stable when metadata field order changes.

## Enterprise Write Flow

`createAuditEvent()` should prefer the transactional RPC path when the enterprise schema is available:

1. Resolve the last known `event_hash` for the organization.
2. Generate the next audit event id and timestamp.
3. Build a canonical audit payload.
4. Compute `event_hash` with SHA-256.
5. Optionally compute `hash_signature` when signing is configured.
6. Call `append_audit_event_chained(...)` with the calculated `previous_hash`, `event_hash`, `hash_algorithm` and `hash_signature`.
7. Let the database function acquire `pg_advisory_xact_lock(hashtext(p_organization_id::text))` and validate that `p_previous_hash` still matches the latest committed event hash.
8. If the database reports a `previous_hash` mismatch, retry the append with the new latest hash.

This protects organization-scoped chains from concurrent writes creating forks.

## Compatibility Write Flow

If the transactional RPC is not yet available, the helper may fall back to the direct hash-chain insert path while migrations are rolling out.

If the hash-chain columns are not yet available, the helper falls back to the legacy audit event insert path. This keeps production safe during phased migration rollout.

Enterprise deployments should treat the fallback as temporary and should complete the migration to `append_audit_event_chained(...)` before final release approval.

## Verification Model

`verifyAuditChain()` validates:

- each event points to the prior event hash
- each event hash matches the canonical event payload
- each signature matches when signing is configured

Failure reasons are structured as:

- `previous_hash_mismatch`
- `event_hash_mismatch`
- `signature_mismatch`

## Regression Protection

`npm run security:audit-chain` checks that the following remain present:

- canonicalization
- SHA-256 hashing
- optional HMAC signing
- previous hash linkage
- event hash verification
- base schema migration
- transactional RPC migration
- `append_audit_event_chained(...)`
- `pg_advisory_xact_lock`
- persistence integration in `createAuditEvent()`
- legacy fallback
- concurrency runbook
- unit tests

The full security package includes this gate through:

```txt
npm run security:ci
```

## Operational Notes

- Apply `supabase/migrations/20260612_audit_event_hash_chain.sql` before relying on persisted chain fields.
- Apply `supabase/migrations/20260613_audit_event_chained_rpc.sql` before relying on concurrency-safe appends.
- Configure `AUDIT_CHAIN_SIGNING_SECRET` when signed audit hashes are required.
- Existing legacy events remain valid but may not have chain fields.
- Chain validation should be organization-scoped and ordered by event creation time.
- Enterprise release candidates should attach evidence that the transactional RPC exists in the target Supabase project.

## Future Work

- Add a reviewer-facing audit-chain export.
- Add an audit-chain verification API for authorized security reviewers.
- Backfill hashes for legacy events when a stable ordering policy is approved.
- Add anomaly detection for gaps, repeated denied actions and export spikes.
