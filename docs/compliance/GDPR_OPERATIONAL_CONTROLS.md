# GDPR Operational Controls

Status: operational control specification. This is not legal advice, certification or proof of compliance.

## Scope

Applies to personal data processed by RISCK COMPLY in authentication, organization membership, support, billing metadata, analytics, audit logs, generated documents and operational telemetry.

## Core controls

- Data minimization: collect only fields required for the documented product purpose.
- Purpose limitation: do not reuse customer content for unrelated analytics or training without a separate lawful basis and clear disclosure.
- Access control: tenant membership, server-side RBAC and RLS are mandatory.
- Encryption: TLS in transit and provider-managed encryption at rest must be documented with provider evidence.
- Logging: security logs must avoid secrets and unnecessary PII; access to logs is restricted and auditable.
- Analytics consent: non-essential analytics/PostHog must remain disabled until valid consent where required. Consent state must be versioned and revocable.
- Processor governance: maintain current subprocessors, purpose, data categories, region and notification process.

## Data subject operations

### Export

- Require authenticated session and recent step-up for high-risk export.
- Rate-limit export requests.
- Export only data belonging to the authenticated subject/authorized organization.
- Record request, approval, generation and download in audit logs without storing exported content in the audit event.
- Use expiring download links and no-store responses.

### Deletion

- Require recent step-up authentication.
- Confirm scope and warn about legal/contractual retention.
- Separate user deletion from organization deletion and ownership transfer.
- Use a queued/idempotent workflow with a durable audit trail.
- Remove or anonymize personal data unless retention is legally required.
- Record completion, partial completion and provider failures.

### Rectification and restriction

Provide support/admin workflows to correct identity/profile data and restrict processing where operationally applicable. Restrictions must propagate to downstream processors when required.

## Retention baseline

Retention periods must be approved by the data controller and reflected in Privacy, DPA and internal schedules. Until approved, no document should claim fixed retention guarantees. Recommended categories to define explicitly: authentication records, audit/security logs, billing records, support tickets, analytics events, deleted-account backups and generated documents.

## Incident and breach handling

Suspected exposure triggers the data-exposure/security incident runbook. Preserve evidence, stop further exposure, identify affected tenants/data, involve legal/privacy owners, document decision timing and notify regulators/data subjects only through the approved process.

## Evidence required

Enterprise release evidence should include: consent behavior test, export authorization test, delete step-up/rate-limit test, tenant-isolation test, subprocessor review date, retention approval, incident tabletop record and a sample sanitized audit trail.
