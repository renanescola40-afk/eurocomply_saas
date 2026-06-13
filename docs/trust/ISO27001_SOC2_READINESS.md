# ISO 27001 and SOC 2 readiness plan

Status: roadmap. EuroComply is not currently ISO 27001 certified and does not currently have a SOC 2 Type I or Type II report.

## Purpose

Define the evidence EuroComply must collect before starting formal ISO 27001 or SOC 2 audit work.

## Current position

| Framework | Current status | Allowed customer claim |
| --- | --- | --- |
| ISO 27001 | Not certified | Not ISO 27001 certified. Readiness work is in progress. |
| SOC 2 Type I | Not audited | No SOC 2 Type I report currently available. |
| SOC 2 Type II | Not audited | No SOC 2 Type II report currently available. |

## Readiness domains

| Domain | Required evidence |
| --- | --- |
| Security governance | Security policy, risk register, asset inventory, control owner list |
| Access control | Joiner/mover/leaver process, privileged access review, MFA policy |
| Change management | PR review, CI gates, deployment logs, emergency change process |
| Vulnerability management | Dependency audit, SAST/SCA evidence, remediation SLA, pentest report |
| Incident response | Incident response plan, escalation contacts, incident log, tabletop exercise |
| Business continuity | DR plan, backup restore test, RTO/RPO evidence |
| Vendor management | Subprocessor register, provider DPA/security review evidence |
| Data protection | DPA, retention policy, deletion workflow, encryption and tenant isolation evidence |
| Logging and monitoring | Audit log design, alerting, retention, export and tamper-evidence plan |
| Risk management | Risk assessment, treatment plan, accepted risks, review cadence |

## Minimum sequence

1. Finalize policies and registers in this trust package.
2. Complete package-lock and dependency vulnerability remediation.
3. Execute RLS/tenant isolation evidence collection in production-like environment.
4. Execute backup restore test and DR tabletop.
5. Implement SSO/SAML and tenant-enforced MFA for enterprise customers.
6. Complete independent penetration test and remediation.
7. Select auditor and scope SOC 2 Type I or ISO 27001 readiness assessment.
8. Start audit only after evidence is complete enough to avoid a failed assessment.

## Customer-safe answer

EuroComply is not currently ISO 27001 certified and does not currently have a SOC 2 report. We maintain a documented security readiness program and can share current technical controls and roadmap items under NDA where appropriate.
