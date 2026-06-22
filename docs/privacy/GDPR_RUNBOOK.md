# EuroComply GDPR Runbook

Status: production readiness control  
Owner: Privacy Engineering / Security Engineering  
Last reviewed: 2026-06-22

## Purpose

This runbook explains how EuroComply handles enterprise GDPR export and delete requests without breaking tenant isolation, billing/legal retention, or the immutable audit chain.

## Roles

- Requester: authenticated organization user initiating export/delete.
- Organization admin/owner: user with `export_data` or `manage_settings` permission.
- Privacy reviewer: approves delete completion after retention/legal checks.
- Security reviewer: validates audit-chain, step-up, and cross-tenant controls.
- Billing reviewer: confirms invoice, tax, chargeback, and subscription retention requirements.

## Export procedure

1. User opens the Privacy/GDPR admin flow.
2. User obtains a step-up token for `export_data` through the security step-up challenge flow.
3. User downloads `/api/gdpr/export` with the `x-eurocomply-step-up-token` header.
4. API checks authentication, current organization, RBAC `export_data`, entitlement, step-up, and tenant scope.
5. If `organizationId` query param is present and does not match the current organization, API returns `403 cross_tenant_export_denied` and writes an audit event.
6. API builds the export from `src/server/privacy/gdpr.ts` descriptors.
7. Response is a no-store JSON attachment.
8. API appends `gdpr_export_requested` to audit events and creates a notification.

## Delete request procedure

1. User opens the Privacy/GDPR admin flow.
2. User obtains a step-up token for `gdpr_delete`.
3. User submits `/api/gdpr/delete-request` with:
   - `x-eurocomply-step-up-token` header;
   - `confirmation` exactly equal to `DELETE ORGANIZATION DATA`;
   - optional `reason`.
4. API checks trusted origin, authentication, current organization, RBAC `manage_settings`, rate limit, entitlement, step-up, and explicit confirmation.
5. API returns a pending review plan with a 72-hour safety delay.
6. API appends `gdpr_delete_requested` and creates a notification.
7. Privacy reviewer checks:
   - customer contract and DPA;
   - legal hold or dispute status;
   - open invoices/chargebacks/tax retention;
   - audit-chain preservation requirements;
   - storage objects and derived data.
8. Approved completion deletes active customer data, anonymizes tenant/security references where needed, preserves billing/legal/audit records, and appends a completion audit event.

## Safety controls

- Cross-tenant export/delete is prevented by deriving organization from the authenticated user and rejecting mismatched explicit organization ids.
- GDPR export uses no-store download headers.
- GDPR delete is not immediate; it creates a pending review with a safety delay.
- Billing/legal retention records are preserved.
- Audit-chain entries are preserved; deletion is represented as new audit events.
- Raw step-up tokens are never stored in audit metadata; only signed token assessment metadata and token hashes are used.

## Customer response guidance

- Confirm receipt of delete requests without promising immediate erasure.
- Explain that billing, tax, legal, fraud-prevention, and immutable audit records may be retained.
- Provide export in machine-readable JSON.
- Confirm deletion completion only after privacy/security/billing reviewers sign off.

## Incident escalation

Escalate to Security and Legal if:

- a cross-tenant export/delete attempt occurs;
- step-up is bypassed or replayed;
- audit-chain write fails;
- customer disputes retained billing/legal records;
- exported data contains secrets, raw payment data, passwords, or unrelated tenant data.

## Validation commands

Run the focused privacy tests and security checks before release:

```bash
npm run test -- tests/privacy/gdpr.test.ts
npm run security:no-store
npm run security:authorization-bola
npm run security:audit-chain
```
