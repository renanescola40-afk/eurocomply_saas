# EuroComply Audit Chain Standard

This document defines the tamper-evidence model for EuroComply audit events. The enterprise acceptance model is maintained in `docs/security/AUDIT_CHAIN_MODEL.md`.

## Purpose

Audit events are used to reconstruct security-sensitive activity such as authentication, RBAC denied decisions, step-up authorization, exports, uploads/downloads, billing operations, AI governance changes, GDPR requests, security settings changes, webhook failures and administrative actions.

The audit chain adds integrity evidence so reviewers can detect whether event content or event ordering was changed after creation.

## Current Implementation

| Layer | Location |
| --- | --- |
| Enterprise audit-chain model | `docs/security/AUDIT_CHAIN_MODEL.md` |
| Hash-chain helper | `src/server/security/audit-chain.ts` |
| Helper tests | `src/server/security/audit-chain.test.ts` |
| Persistence integration | `src/server/queries/audit-events.ts` |
| Request-context sanitization tests | `src/server/queries/audit-events.test.ts` |
| Verification API | `src/app/api/audit/chain/verify/route.ts` |
| Evidence-pack export API | `src/app/api/audit/evidence-pack/route.ts` |
| Offline verifier CLI | `scripts/security/verify-audit-chain.mjs` |
| Schema migration | `supabase/migrations/20260612_audit_event_hash_chain.sql` |
| Transactional append RPC migration | `supabase/migrations/20260613_audit_event_chained_rpc.sql` |
| Enterprise RPC hardening migration | `supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql` |
| Concurrency runbook | `docs/security/AUDIT_CHAIN_CONCURRENCY_RUNBOOK.md` |
| Runtime evidence | `docs/security/evidence/runtime/audit-chain-live-validation.json` |
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
- sanitized metadata
- sanitized request context inside metadata
- server-side creation timestamp
- previous hash

Object keys are sorted recursively before hashing. Undefined values are removed. Timestamps are normalized before verification. This keeps hashes stable when metadata field order or Postgres timestamp formatting changes.

## Enterprise Write Flow

`createAuditEvent()` prefers the transactional RPC path when the enterprise schema is available:

1. Normalize required payload fields: `organizationId`, `actorUserId`, `action`, `entityType`, `entityId`, sanitized metadata and sanitized request context.
2. Resolve the last known `event_hash` for the organization.
3. Generate the next audit event id and server-side timestamp.
4. Build a canonical audit payload.
5. Compute `event_hash` with SHA-256.
6. Optionally compute `hash_signature` when `AUDIT_CHAIN_SIGNING_SECRET` is configured.
7. Call `append_audit_event_chained(...)` with the calculated `previous_hash`, `event_hash`, `hash_algorithm` and `hash_signature`.
8. Let the database function acquire `pg_advisory_xact_lock(hashtext(p_organization_id::text))` and validate that `p_previous_hash` still matches the latest committed event hash.
9. If the database reports a `previous_hash` mismatch, retry the append with the new latest hash.

This protects organization-scoped chains from concurrent writes creating forks.

## Compatibility Write Flow

Enterprise deployments fail closed by default when the transactional RPC is unavailable.

Temporary non-enterprise compatibility paths exist only when explicitly enabled:

- `AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK=true` allows direct chained insert during rollout.
- `AUDIT_CHAIN_ALLOW_LEGACY_FALLBACK=true` allows legacy insert during migration windows.

Enterprise production must not enable non-transactional fallback.

## Critical Event Coverage

Enterprise evidence tracks coverage for:

- auth
- RBAC denied
- step-up
- billing
- uploads/downloads
- exports
- team changes
- document changes
- risk/vendor/task changes
- GDPR
- security settings
- webhook failures

The static coverage gate is `scripts/security/check-audit-critical-coverage.mjs`, executed through `npm run security:audit-chain`.

## Verification Model

`verifyAuditChain()` validates:

- each event points to the prior event hash
- each event hash matches the canonical event payload
- each signature matches when signing is configured

Failure reasons are structured as:

- `previous_hash_mismatch`
- `event_hash_mismatch`
- `signature_mismatch`

The offline CLI additionally reports `missing_previous_hash` when a bounded segment should link to a trusted previous hash but the record omits it.

## Protected Verification API

`GET /api/audit/chain/verify` is protected by:

- authenticated user
- organization context
- `read_audit` RBAC
- business entitlement
- distributed rate limiting
- `audit_chain_verify` step-up

Successful verification appends `audit_chain.verified` with sanitized request context.

## Signed Evidence Pack Export

`GET /api/audit/evidence-pack` is protected by:

- organization context
- `export_data` RBAC
- business entitlement
- `audit_chain_export` step-up
- distributed rate limiting

The export payload includes integrity metadata from `buildEvidencePackIntegrity()`. The route fails closed with `audit_evidence_pack_signing_unavailable` when signing material is unavailable and records `security.failure`.

## Offline CLI Verification

Reviewers can verify exported JSON evidence without the application runtime:

```bash
node scripts/security/verify-audit-chain.mjs --input audit-events.json --expected-previous-hash <trusted-anchor>
```

The CLI accepts arrays or objects containing `events`/`auditEvents`, supports snake_case and camelCase fields, validates HMAC signatures when `AUDIT_CHAIN_SIGNING_SECRET` is set, and exits non-zero on tamper detection.

## Regression Protection

`npm run security:audit-chain` checks that the following remain present:

- canonicalization
- SHA-256 hashing
- optional HMAC signing
- previous hash linkage
- event hash verification
- request context sanitization
- base schema migration
- transactional RPC migration
- enterprise RPC hardening migration
- `append_audit_event_chained(...)`
- `pg_advisory_xact_lock`
- persistence integration in `createAuditEvent()`
- offline verifier CLI
- protected verification endpoint
- signed evidence-pack export
- runtime evidence
- release gate linkage
- concurrency runbook
- unit tests

The full security package includes this gate through:

```txt
npm run security:ci
```

## Release Gate

Enterprise release is blocked unless:

- `npm run security:audit-chain` passes.
- `docs/security/evidence/runtime/audit-chain-live-validation.json` exists and has status `Complete`.
- Runtime evidence confirms tamper detection, transactional append, concurrency-safe append, signed export, RBAC denial, verify-without-step-up denial, verify-with-step-up success, request-context sanitization and release-gate linkage.
- `AUDIT_CHAIN_SIGNING_SECRET` and `EVIDENCE_PACK_SIGNING_SECRET` are configured for production.

## Operational Notes

- Apply `supabase/migrations/20260612_audit_event_hash_chain.sql` before relying on persisted chain fields.
- Apply `supabase/migrations/20260613_audit_event_chained_rpc.sql` before relying on concurrency-safe appends.
- Apply `supabase/migrations/20260621120000_audit_chain_enterprise_hardening.sql` before enterprise release approval.
- Configure `AUDIT_CHAIN_SIGNING_SECRET` when signed audit hashes are required.
- Configure `EVIDENCE_PACK_SIGNING_SECRET` before signed evidence exports are enabled.
- Existing legacy events remain valid but may not have chain fields.
- Chain validation should be organization-scoped and ordered by event creation time.
- Enterprise release candidates must attach runtime evidence that the transactional RPC exists in the target Supabase project and that verification/export require RBAC plus step-up.

## Future Work

- Backfill hashes for legacy events when a stable ordering policy is approved.
- Add anomaly detection for gaps, repeated denied actions and export spikes.
