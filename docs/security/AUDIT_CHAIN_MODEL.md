# Enterprise Audit Chain Model

This model defines the enterprise-grade audit logging contract for EuroComply. It complements `docs/security/AUDIT_CHAIN.md` with the runtime controls required before an enterprise release can be approved.

## Acceptance Contract

Every security-relevant audit event must be append-only, organization-scoped, canonicalized, hash-linked, optionally signed, and verifiable after export. Enterprise release gates fail closed unless runtime evidence confirms the chain is live and validated.

## Required Event Payload

`createAuditEvent()` is the canonical append API. It must normalize and persist:

| Field | Requirement |
| --- | --- |
| `organizationId` | Required. Chain scope and concurrency lock scope. |
| `actorUserId` | Nullable only for system or pre-auth events. |
| `action` | Required dotted action name, for example `document.upload` or `audit_chain.verified`. |
| `entityType` | Required; defaults to `system` only when the caller has no narrower entity. |
| `entityId` | Nullable, but required whenever a stable target exists. |
| `metadata` | Sanitized recursively. Secrets, tokens, cookies, passwords, private keys and authorization material are dropped. |
| `timestamp` | Server-side only. The caller must not supply trusted timestamps. |
| `requestContext` | Sanitized request context only: IP, user agent, request id, origin, method and path. No cookies, auth headers or tokens. |

## Critical Event Coverage

The audit chain must receive events for these flow families:

- Auth: `auth.login_attempt`, `auth.login_success`, `auth.login_failure`, `auth.logout`, OAuth start/callback.
- RBAC denied: `security.failure` with `securityEvent: rbac.denied`.
- Step-up: requested, approved, denied and expired step-up outcomes.
- Billing: checkout, customer portal, webhook receipt, subscription mutation and webhook failure.
- Uploads/downloads: document upload and document download.
- Exports: report export, GDPR export and audit evidence-pack export.
- Team changes: invite created/cancelled, member removed and role changed.
- Document changes: update, delete and approval changes.
- Risk/vendor/task changes: create, update and delete.
- GDPR: export and delete request.
- Security settings: provider/policy changes for high-risk controls.
- Webhook failures: Stripe verification/processing failures recorded as `security.failure`.

## Hash Chain

Each canonical record is serialized with sorted object keys and normalized timestamps. The event hash is:

```txt
sha256(canonical_payload_with_previous_hash)
```

When `AUDIT_CHAIN_SIGNING_SECRET` is configured, `hash_signature` is:

```txt
hmac-sha256(event_hash, AUDIT_CHAIN_SIGNING_SECRET)
```

The chain stores:

- `previous_hash`
- `event_hash`
- `hash_algorithm = sha256`
- `hash_signature`

## Transactional Append

Enterprise writes must use `append_audit_event_chained`.

The RPC must:

1. Acquire `pg_advisory_xact_lock(hashtext(p_organization_id::text))`.
2. Re-read the latest committed event hash for the same organization inside the transaction.
3. Reject the append when `p_previous_hash` does not match the latest committed hash.
4. Insert the pre-hashed payload using the same `p_id` and `p_created_at` that were included in the canonical payload.
5. Run as `security definer` and be callable only through the service role path.

The application may retry a `previous_hash_mismatch` a bounded number of times. Enterprise production must not enable `AUDIT_CHAIN_ALLOW_NON_TRANSACTIONAL_FALLBACK`.

## Verification

Verification exists in two forms:

| Verifier | Location | Guard |
| --- | --- | --- |
| API | `GET /api/audit/chain/verify` | Authenticated user, organization context, `read_audit` RBAC, business entitlement, rate limit and `audit_chain_verify` step-up. |
| CLI | `scripts/security/verify-audit-chain.mjs` | Offline verifier for exported JSON evidence. Supports `--expected-previous-hash` and `AUDIT_CHAIN_SIGNING_SECRET`. |

Verification fails if any event has:

- missing expected `previous_hash`
- mismatched `previous_hash`
- mismatched `event_hash`
- mismatched HMAC signature when signing is enabled

The API records `audit_chain.verified` after each verification attempt.

## Evidence Pack Export

`GET /api/audit/evidence-pack` is protected by `export_data` RBAC and `audit_chain_export` step-up. The response includes integrity metadata from `buildEvidencePackIntegrity()`. Exports fail closed with `audit_evidence_pack_signing_unavailable` when signing material is unavailable.

## Release Gate

Enterprise release gates must block unless all are true:

- `npm run security:audit-chain` passes.
- `docs/security/evidence/runtime/audit-chain-live-validation.json` exists.
- Runtime evidence status is `Complete`.
- Runtime evidence confirms tamper detection, transactional append, concurrency-safe append, signed export, RBAC denial, verify-without-step-up denial and verify-with-step-up success.
- `AUDIT_CHAIN_SIGNING_SECRET` and `EVIDENCE_PACK_SIGNING_SECRET` are configured for production.

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run test
npm run security:audit-chain
npm run build
```
