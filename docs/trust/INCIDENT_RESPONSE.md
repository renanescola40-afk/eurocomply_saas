# Incident response

Status: operational incident-response documentation for enterprise review. This is a readiness document, not proof of a completed incident exercise or a contractual SLA.

## Objectives

EuroComply incident response is designed to protect customer data, preserve evidence, restore service safely, and communicate clearly. The process covers security events, privacy events, tenant-isolation concerns, billing integrity issues, data integrity issues, availability events, and operational misconfigurations.

## Severity model

| Severity | Examples | Initial target |
| --- | --- | --- |
| SEV-1 / Critical | Confirmed cross-tenant data exposure, active compromise, destructive data loss, payment integrity compromise. | Triage within 24 hours. |
| SEV-2 / High | Authentication bypass, serious authorization defect, sensitive data exposed to an unauthorized authenticated user, exploitable upload path. | Triage within 2 business days. |
| SEV-3 / Medium | Limited impact security regression, non-sensitive information disclosure, contained operational outage. | Triage within 5 business days. |
| SEV-4 / Low | Hardening issue, documentation gap, low-risk misconfiguration. | Next planned maintenance window. |

These targets are operational goals. They are not a contractual SLA unless signed separately.

## Process

1. Receive report through private disclosure contact, monitoring, logs, customer report, or internal review.
2. Assign incident owner, customer communication owner, and technical lead.
3. Preserve evidence: timestamps, affected routes/endpoints, logs, audit events, deployment SHA, reproduction steps, and screenshots where safe.
4. Contain: disable affected feature, rotate relevant secrets, revoke sessions, block affected route, or roll back deployment when needed.
5. Investigate: identify affected tenants, data categories, systems, and root cause.
6. Eradicate and recover: patch, test, deploy, validate RLS/RBAC/audit/billing/data integrity controls, and monitor for recurrence.
7. Communicate: provide customer updates when customer data, service availability, security posture, or contractual obligations are affected.
8. Close: write post-incident summary, remediation owners, due dates, and evidence links.

## Evidence to collect

- Incident timeline.
- Deployment SHA and rollback decision.
- Affected systems, tenants, and data categories.
- Audit log excerpts and application logs with secrets redacted.
- Customer impact assessment.
- Containment and remediation actions.
- Customer communication decision.
- Follow-up controls and owners.

## Responsible disclosure

Security reports should be sent to `renansilva2002@gmail.com` until a dedicated security inbox is provisioned. Do not open public GitHub issues for vulnerabilities.

## Non-claims

Do not claim 24/7 staffed monitoring, guaranteed response SLA, completed tabletop exercises, or audited incident response unless evidence and signed commitments exist.
