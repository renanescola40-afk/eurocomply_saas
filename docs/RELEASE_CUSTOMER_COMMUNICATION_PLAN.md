# Release Customer Communication Plan

## Purpose

This plan defines how EuroComply communicates release-related incidents, degraded service, security-impacting changes, rollback events, and customer-facing follow-up.

It complements:

- `docs/RELEASE_INCIDENT_RESPONSE_PLAN.md`
- `docs/RELEASE_ROLLBACK_PLAN.md`
- `docs/RELEASE_POST_INCIDENT_REVIEW.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`

A release is not enterprise-ready unless customer communication ownership, timing, message approval, and follow-up evidence are defined before promotion.

## Communication owners

Every production release must identify the following owners before Go/No-Go approval:

| Role | Responsibility | Required before Go |
| --- | --- | --- |
| Customer communication owner | Drafts and coordinates customer-facing messages | Yes |
| Incident commander | Confirms incident severity and communication trigger | Yes |
| Release owner | Confirms release scope, promoted commit, and rollback state | Yes |
| Security/compliance owner | Reviews security, privacy, or compliance language | Required for security/privacy incidents |
| Customer support owner | Prepares support macros and customer-specific responses | Yes |
| Executive approver | Approves SEV-1 or broad customer communications | Required for SEV-1 |

## Communication triggers

Customer communication is required when any of the following occur:

- SEV-1 incident after release.
- SEV-2 incident with customer-visible impact.
- Security or privacy-relevant event.
- Data integrity risk.
- Failed or partial rollback with customer impact.
- Billing, subscription, or invoice disruption.
- Document upload, audit evidence, RLS, or authorization issue affecting customers.
- External status page update is needed.
- Customer SLA or contractual notice obligation is triggered.

Internal-only communication may be sufficient for SEV-3 events with no customer impact, but the release owner must document the decision.

## Timing targets

| Event | Target communication window |
| --- | --- |
| SEV-1 acknowledgement | Within 30 minutes of confirmation |
| SEV-2 acknowledgement | Within 60 minutes of confirmation |
| Status update cadence | Every 60 minutes for active SEV-1, every 120 minutes for active SEV-2 |
| Resolution notice | Within 2 hours of confirmed resolution |
| Post-incident customer summary | Within 5 business days for material SEV-1/SEV-2 events |

These are targets, not legal commitments, unless a customer contract states otherwise.

## Message approval rules

Before publication, customer-facing messages must be reviewed by:

- Incident commander.
- Customer communication owner.
- Security/compliance owner when security, privacy, audit-chain, RLS, authorization, or data integrity is involved.
- Executive approver for SEV-1 or broad-impact notices.

Messages must avoid speculation. They should clearly separate confirmed facts, current impact, mitigation, next update, and customer action required.

## Required message structure

Each customer-facing message should include:

1. Current status.
2. Impacted service area.
3. Who is affected, if known.
4. Start time, if known.
5. Customer impact.
6. Mitigation or rollback status.
7. Customer action required, if any.
8. Next update time.
9. Support contact or escalation path.

## Status page rules

A status page update is required when:

- More than one customer is affected.
- Any customer-facing service degradation is ongoing.
- Customer support would otherwise need to answer repeated incident status questions.
- The issue affects authentication, billing, document processing, evidence export, audit verification, or security controls.

Status page entries must be preserved as incident evidence.

## Security and privacy language

For security/privacy-impacting incidents:

- Do not state that data was not accessed unless confirmed.
- Do not state root cause until confirmed.
- Do not name affected customers in broad communications.
- Coordinate with legal/compliance before contractual or regulatory statements.
- Preserve all investigation and audit evidence.

## Customer support readiness

Before release promotion, support must have:

- Release summary.
- Known limitations.
- Rollback contact path.
- Incident escalation path.
- Support macros for degraded service, rollback, and resolved incident.
- FAQ for security, evidence, billing, and document upload issues.

## Communication evidence

For any customer-impacting incident, attach evidence to the release record:

- Initial customer message.
- Status page updates.
- Support macro used.
- Customer-specific notices, when applicable.
- Resolution notice.
- Post-incident customer summary, if required.
- Approval record for each published message.

## Release readiness rule

A release cannot be classified as enterprise-ready unless:

- A customer communication owner is assigned.
- SEV-1 and SEV-2 communication triggers are understood.
- Status page ownership is defined.
- Support macros or response templates are prepared.
- Security/privacy message review ownership is defined.
- Communication evidence is linked to the Release Approval Record after any customer-impacting incident.
