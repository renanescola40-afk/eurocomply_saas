# Incident response

Status: enterprise review note. This is an operational readiness document, not a guarantee of a mature audited incident program.

## Intake

Security reports and urgent trust issues should currently be sent privately to `comercial@risckcomply.com`. This reachable corporate mailbox is the canonical private intake path while a dedicated security alias is re-verified for external delivery. Do not create public GitHub issues for private security reports.

Reports should identify the affected component, expected impact, relevant context or evidence, and whether authentication, organization isolation, billing, storage, audit logs, or customer data may be affected.

## Current workflow

1. Triage the report and determine affected component, severity, customer impact, data sensitivity, and whether exploitation is plausible.
2. Contain the issue through configuration, access control, release rollback, provider action, or code patch as appropriate.
3. Preserve relevant logs, audit events, deployment records, provider evidence, and customer-impact notes.
4. Validate the fix with focused tests or manual reproduction evidence.
5. Communicate with affected customers according to legal and contractual obligations.
6. Complete a post-incident review with root cause, timeline, corrective actions, owner, due date, and evidence links.
7. Update trust documentation if the incident changes a public claim, subprocessor disclosure, retention position, or operational commitment.

## Severity model

| Severity | Examples | Current operating target |
| --- | --- | --- |
| Critical | Active compromise, cross-tenant exposure, authentication bypass, payment-impacting security failure | Initial triage target: 24 hours |
| High | Material data exposure risk, privilege escalation, exploitable upload or webhook weakness | Initial triage target: 2 business days |
| Medium | Limited-impact security defect or defense-in-depth gap | Initial triage target: 5 business days |
| Low | Hardening item, documentation issue, low-risk misconfiguration | Next planned maintenance window |

These are operational targets, not contractual SLAs unless separately agreed in writing.

## Customer communication

Customer communication should be based on verified impact. Avoid premature public claims. Communication records should identify affected customers, data categories, timeline, containment status, corrective actions, and whether regulatory or contractual notice is required.

Public incident communication is published through the verified RISCK COMPLY Statuspage authority at `https://risckcomplystatus1.statuspage.io/`. Public updates must not expose sensitive customer, session, credential, exploit, or investigative details.

## Evidence boundaries

RISCK COMPLY does not currently claim 24/7 staffed monitoring, external incident-response retainer, completed tabletop exercise, or contractual notification timing unless a signed customer agreement says otherwise.

## Customer-safe answer

RISCK COMPLY maintains a documented incident response workflow designed to support intake, triage, containment, evidence preservation, customer communication, and post-incident review. Program maturity evidence should be reviewed during procurement.
