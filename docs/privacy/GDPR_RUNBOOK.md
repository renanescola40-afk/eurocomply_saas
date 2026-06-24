# EuroComply GDPR Runbook

Status: production readiness control  
Owner: Privacy Engineering / Security Engineering  
Last reviewed: 2026-06-24

This runbook is the operating index for enterprise privacy review. It keeps product, support, security and billing teams aligned without making legal promises beyond the customer agreement, DPA and approved subprocessors list.

## Operating principles

- Use authenticated organization context for every privacy operation.
- Require organization membership and the appropriate RBAC permission.
- Require action-scoped step-up verification for export and delete-request flows.
- Reject cross-tenant organization identifiers before data access.
- Return no-store responses for privacy payloads and downloads.
- Record request, denial and review events for auditability.
- Preserve records that must remain for billing, legal, fraud-prevention or immutable audit-chain reasons.
- Keep customer-facing statements aligned with implemented evidence.

## Roles and permissions

| Action | Required permission | Intended roles | Step-up action | Notes |
| --- | --- | --- | --- | --- |
| Organization GDPR export | `export_data` | owner, admin, editor | `export_data` | Returns tenant-scoped JSON download with no-store headers. |
| GDPR delete request intake | `manage_settings` | owner, admin | `gdpr_delete` | Creates a pending review plan; does not silently hard-delete retained records. |
| Manual completion after review | privacy/security operator | designated internal approver | out-of-band approval | Must check billing/legal retention and append completion evidence. |

## Export runbook

1. Confirm the requester is authenticated and belongs to the active organization.
2. Validate `organizationId` query parameter when supplied. If it is malformed or different from the active organization, deny and audit `gdpr_export_denied`.
3. Enforce `export_data` through `assertOrganizationPermission`.
4. Enforce plan entitlement with `assertGdprSelfServiceEnabled`.
5. Enforce action-scoped step-up with `requireStepUpForRequest({ action: 'export_data' })`.
6. Collect tenant-scoped records through `collectOrganizationDataExport` descriptors.
7. Record `gdpr_export_requested` with table keys, unavailable table markers, role, plan and step-up summary. Do not record raw step-up token material.
8. Return a JSON attachment using no-store headers, content-type hardening and a sanitized filename.

## Delete-request runbook

1. Confirm the requester is authenticated and belongs to the active organization.
2. Enforce trusted origin before reading JSON body.
3. Enforce `manage_settings` through `assertOrganizationPermission`.
4. Enforce rate limiting and plan entitlement.
5. Enforce action-scoped step-up with `requireStepUpForRequest({ action: 'gdpr_delete' })`.
6. Require the literal confirmation text `DELETE ORGANIZATION DATA`.
7. Build the delete plan from `buildGdprDeletePlan`. The plan must include the 72-hour safety delay and preserve billing/legal/audit-chain datasets.
8. Record `gdpr_delete_requested` with sanitized reason, role, plan, delete plan and step-up summary. Do not record raw step-up token material.
9. Notify the requester that the request was received and moved to compliance review.
10. Before manual completion, check legal hold, billing/tax retention, open disputes, customer contract terms and processor-specific deletion requirements.
11. Append completion/denial evidence to the audit chain. Never hard-delete historical audit-chain entries.

## Evidence to review

- `docs/privacy/DATA_INVENTORY.md`
- `docs/privacy/DATA_RETENTION_POLICY.md`
- `docs/privacy/DATA_PROCESSING_OVERVIEW.md`
- `src/server/privacy/gdpr.ts`
- `src/app/api/gdpr/export/route.ts`
- `src/app/api/gdpr/delete-request/route.ts`
- `tests/privacy/gdpr.test.ts`
- `docs/security/evidence/runtime/gdpr-privacy-validation.json`

## Customer-facing claim checklist

Before shipping a release or enterprise sales claim, verify these statements are still accurate:

- Export is authenticated, RBAC-protected, action-step-up protected, tenant-scoped and no-store.
- Delete request intake is authenticated, RBAC-protected, action-step-up protected, confirmation-gated, audit-logged and retention-aware.
- Legal/billing and audit-chain records are preserved when required.
- Cross-tenant export is explicitly denied.
- No claim says all downstream processor data or immutable audit events are automatically hard-deleted.

Review this runbook whenever privacy scope, data model, providers, customer agreements or evidence gates change.
