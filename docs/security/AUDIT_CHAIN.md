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

## Write Flow

`createAuditEvent()` performs the following sequence when the new schema is available:

1. Resolve the last known `event_hash` for the organization.
2. Generate the next audit event id and timestamp.
3. Build a canonical audit payload.
4. Compute `event_hash` with SHA-256.
5. Optionally compute `hash_signature` when signing is configured.
6. Insert the audit event with hash-chain fields.

If the hash-chain columns are not yet available, the helper falls back to the legacy audit event insert path. This keeps production safe during migration rollout.

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
- schema migration
- persistence integration in `createAuditEvent()`
- legacy fallback
- unit tests

The full security package includes this gate through:

```txt
npm run security:ci
```

## Operational Notes

- Apply `supabase/migrations/20260612_audit_event_hash_chain.sql` before relying on persisted chain fields.
- Configure `AUDIT_CHAIN_SIGNING_SECRET` when signed audit hashes are required.
- Existing legacy events remain valid but may not have chain fields.
- Chain validation should be organization-scoped and ordered by event creation time.

## Future Work

- Add a reviewer-facing audit-chain export.
- Add an audit-chain verification API for authorized security reviewers.
- Backfill hashes for legacy events when a stable ordering policy is approved.
- Add anomaly detection for gaps, repeated denied actions and export spikes.
