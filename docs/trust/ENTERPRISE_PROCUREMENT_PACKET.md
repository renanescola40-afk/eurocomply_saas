# Enterprise procurement packet

Status: procurement response packet. Use this as the starting point for enterprise security reviews, RFPs, vendor assessments, and buyer enablement. Do not treat it as legal advice or external assurance.

## Packet contents

| Document | Purpose |
| --- | --- |
| `docs/trust/SECURITY_OVERVIEW.md` | Current security posture and non-claims. |
| `docs/trust/ARCHITECTURE_OVERVIEW.md` | Architecture, trust boundaries, and data flow. |
| `docs/trust/DATA_PROTECTION.md` | Data categories, retention posture, deletion/export language. |
| `docs/trust/ACCESS_CONTROL.md` | Authentication, RBAC, RLS, SSO/MFA gaps. |
| `docs/trust/ENCRYPTION.md` | Encryption and integrity controls with non-claims. |
| `docs/trust/INCIDENT_RESPONSE.md` | Severity model, response process, disclosure contact. |
| `docs/trust/BACKUP_AND_RECOVERY.md` | Backup/restore posture and pending evidence. |
| `docs/trust/SUBPROCESSORS.md` | Draft subprocessor register and review process. |
| `docs/trust/SECURITY_FAQ.md` | Customer-safe answers for common questionnaires. |
| `docs/trust/ENTERPRISE_SECURITY_QUESTIONNAIRE.md` | Existing questionnaire response guardrails. |
| `docs/RELEASE_EVIDENCE_CHECKLIST.md` | Evidence required before production/enterprise release. |

## Procurement checklist

Before answering an enterprise buyer, complete this checklist:

### 1. Confirm buyer scope

- Product edition and plan under evaluation.
- Target deployment environment.
- Customer data categories.
- Whether regulated data, special-category personal data, payment data, or production credentials are in scope.
- Required jurisdictions and data residency expectations.
- Required contractual documents: DPA, SLA, security addendum, subprocessors notice, support terms.

### 2. Confirm current implementation evidence

- Public Trust Center route is live and linked from the footer and commercial pages.
- `npm run security:trust-package` passes on the reviewed commit.
- RLS live evidence is current for the target Supabase project or the limitation is disclosed.
- RBAC matrix matches `src/server/security/rbac.ts`.
- Audit-chain evidence is current and indicates whether transactional append is enabled.
- Backup restore and DR status are disclosed honestly.
- Subprocessor list is reviewed for actual enabled providers.
- Release evidence checklist includes Trust Center readiness.

### 3. Classify every answer

Use one of these answer statuses:

| Status | Meaning |
| --- | --- |
| Implemented | Code exists and evidence is attached. |
| Implemented, evidence pending | Code exists but runtime/customer evidence is not complete. |
| Designed to support | Architecture supports the control but final implementation/evidence is incomplete. |
| Planned | Roadmap item only. Do not answer yes. |
| Not available | Not implemented and not committed for this buyer. |
| Requires legal review | Contract, DPA, privacy, retention, or SLA language requires counsel approval. |

### 4. Banned procurement claims unless evidence exists

Do not claim:

- SOC 2 compliance or SOC 2 report availability.
- ISO 27001 certification.
- Completed third-party penetration test.
- End-to-end encryption.
- Customer-managed encryption keys or BYOK.
- Immutable/WORM audit logs.
- 24/7 staffed monitoring.
- Tested disaster recovery.
- Tested backup restore.
- Guaranteed RTO/RPO.
- EU-only data residency.
- Fully automated GDPR deletion across all subprocessors.

### 5. Customer-safe baseline answer

"EuroComply is designed to support enterprise compliance operations with authenticated workspaces, organization-scoped RBAC, Supabase RLS migrations, audit events with integrity controls, controlled document workflows, release security gates, and transparent trust documentation. Current certifications, external reviews, backup restore exercises, and contractual commitments are disclosed separately and must be supported by evidence before being represented as complete."

## Evidence attachment checklist

- Commit SHA reviewed.
- Trust Center URL.
- Security overview PDF or markdown export.
- Architecture overview.
- RBAC matrix.
- RLS validation artifact or exception.
- Audit-chain validation artifact or exception.
- Backup restore status.
- Incident-response contact.
- Subprocessor register version.
- Release evidence checklist.
- Open gaps and owners.

## Final review rule

A procurement response is not ready to send until every claim maps to either code evidence, runtime evidence, provider evidence, legal-approved contract language, or a clearly disclosed limitation.
