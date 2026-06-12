# EuroComply Exports and Integrity Standard

This document defines the standard security model for enterprise-grade exports in EuroComply.

## Scope

The standard applies to all exports that can contain operational, compliance, procurement, audit, privacy or continuity evidence.

Current covered exports:

| Export | Route |
| --- | --- |
| Audit Evidence Pack | `src/app/api/audit/evidence-pack/route.ts` |
| Security Questionnaire | `src/app/api/security-questionnaire/export/route.ts` |
| Vendor Assurance | `src/app/api/vendor-assurance/export/route.ts` |
| Enterprise Readiness | `src/app/api/enterprise-readiness/export/route.ts` |
| Retention Policy | `src/app/api/retention-center/export/route.ts` |
| Continuity Center | `src/app/api/continuity-center/export/route.ts` |
| GDPR Export | `src/app/api/gdpr/export/route.ts` |

## Required Server-Side Controls

Every enterprise export should enforce the following controls server-side:

1. Authenticated user check.
2. Current organization resolution.
3. RBAC permission check using `export_data`.
4. Plan gate for Business+ unless the export has a stricter or domain-specific entitlement.
5. Distributed rate limit for repeated export attempts.
6. Audit event with actor, organization, export type and meaningful metadata.
7. Centralized `no-store` response headers.
8. Integrity metadata when the export is designed as a reusable evidence artefact.

## Export Envelope

Evidence-style exports should use this envelope shape:

```json
{
  "schemaVersion": "2026-06-12.export.v1",
  "exportType": "example_export",
  "payload": {},
  "integrity": {
    "algorithm": "sha256",
    "payloadHash": "...",
    "signature": "...",
    "signedAt": "..."
  }
}
```

The payload should include:

- `generatedAt`
- `generatedBy.userId`
- `generatedBy.email`
- `generatedBy.role`, when available
- `organization.id`
- `organization.name`
- current plan or entitlement context, when relevant
- export-specific summary and evidence sections

## Integrity Model

Integrity is implemented through:

```txt
src/server/security/evidence-pack-integrity.ts
```

The integrity helper provides:

- canonical JSON serialization
- SHA-256 payload hash
- optional HMAC signature when `EVIDENCE_PACK_SIGNING_SECRET` is configured
- verifier support for evidence pack validation

The payload hash should also be returned as a response header when practical:

```txt
X-EuroComply-Payload-Hash: <hash>
```

## Cache-Control Standard

Sensitive exports must never be cached by browsers, proxies, CDNs or surrogate caches.

Use:

```txt
src/server/security/no-store.ts
```

Required headers:

```txt
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, private
Pragma: no-cache
Expires: 0
Surrogate-Control: no-store
```

Prefer:

```ts
noStoreDownload(body, init)
```

for attachment responses and:

```ts
noStoreJson(body, init)
```

for JSON errors or non-download responses.

## Authorization Model

Enterprise evidence exports should require:

```txt
export_data
```

from:

```txt
src/server/security/rbac.ts
```

The default expected roles for exports are:

- `owner`
- `admin`
- `editor` where operational export rights are intentionally allowed

`viewer` and `member` should not export procurement-grade evidence.

## Rate Limit Model

Exports should use:

```txt
src/server/security/rate-limit.ts
```

Recommended baseline:

```txt
5 exports per organization/user/hour
```

The key should include the export type, organization ID and user ID.

Example:

```txt
continuity-export:<organizationId>:<userId>
```

## Audit Event Standard

Every successful export should create an audit event with:

- action name ending in `_exported`
- `entityType: organization` unless a more specific entity applies
- `entityId: organization.id`
- actor user ID
- actor role
- plan or entitlement context
- payload hash, when integrity is generated
- export-specific summary metadata

Example action names:

```txt
audit_evidence_pack_exported
security_questionnaire_exported
vendor_assurance_exported
enterprise_readiness_exported
retention_policy_exported
continuity_center_exported
```

## CI and Regression Gates

The following gates protect this standard:

| Gate | Command | Purpose |
| --- | --- | --- |
| API guard coverage | `npm run security:api-guards` | Checks sensitive exports for auth/RBAC/plan/rate-limit/audit/integrity/no-store tokens |
| No-store coverage | `npm run security:no-store` | Checks sensitive routes for no-store protections |
| Security responses | `npm run security:responses` | Checks no-store helper and RBAC/entitlement response safety |
| Public secrets | `npm run security:public-secrets` | Prevents secrets from being exposed in source or public envs |
| Full package | `npm run security:ci` | Runs all security gates, typecheck and unit tests |

## Operational Review Checklist

Before sharing an export with a customer, confirm:

1. The user has the right organization role.
2. The organization plan allows the export.
3. The exported file was generated from the production organization context.
4. The response includes no-store headers.
5. The audit event was written.
6. The payload hash is present in the envelope or response header.
7. If HMAC signing is expected, `EVIDENCE_PACK_SIGNING_SECRET` is configured.

## Open Hardening Items

- Add step-up authentication for high-risk exports.
- Add customer-facing verifier for all evidence-style exports, not only Evidence Pack.
- Add anomaly detection for export spikes and repeated denied export attempts.
- Add tenant-isolation integration tests using a seeded Supabase test project.
