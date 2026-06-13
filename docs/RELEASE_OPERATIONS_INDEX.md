# Release Operations Index

This index is the single map of the EuroComply release operations package. It is intentionally short and points reviewers to the canonical controls that must be checked before a public or enterprise release.

## Required operational documents

| Area | Canonical document | Purpose |
| --- | --- | --- |
| Release candidate validation | `docs/RELEASE_CANDIDATE_VALIDATION.md` | Defines the Release Candidate decision model and required validation evidence. |
| Evidence package | `docs/RELEASE_EVIDENCE_CHECKLIST.md` | Lists evidence that must be attached before release approval. |
| Approval record | `docs/RELEASE_APPROVAL_RECORD.md` | Captures release owner, approver, promoted commit, exceptions, and final sign-off. |
| Approval linkage | `docs/RELEASE_APPROVAL_LINKAGE.md` | Links approval, evidence, and candidate validation into one release decision. |
| Go/No-Go | `docs/RELEASE_GO_NO_GO_CHECKLIST.md` | Defines Go, Conditional Go, No-Go, and automatic No-Go criteria. |
| Rollback | `docs/RELEASE_ROLLBACK_PLAN.md` | Defines application, database, configuration, and security rollback expectations. |
| Incident response | `docs/RELEASE_INCIDENT_RESPONSE_PLAN.md` | Defines incident severity, owners, triage, rollback decision, and closure rules. |
| Post-incident review | `docs/RELEASE_POST_INCIDENT_REVIEW.md` | Defines lessons learned, root cause, corrective actions, and recurrence prevention. |
| Customer communication | `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md` | Defines customer communication ownership, status page decision, and customer notice evidence. |
| Support readiness | `docs/RELEASE_SUPPORT_READINESS.md` | Defines support severity mapping, escalation owners, and support evidence requirements. |

## Required executable gates

The release operations package is validated through `npm run release:readiness`, which must include the following gates:

- `security:release-candidate`
- `security:release-evidence`
- `security:release-approval`
- `security:release-go-no-go`
- `security:release-rollback`
- `security:release-incident-response`
- `security:release-post-incident`
- `security:release-support-readiness`
- `security:release-operations`

## Release rule

A release cannot be promoted to public production or enterprise production unless:

1. `npm run release:readiness` passes.
2. `npm run security:ci` passes.
3. The promoted commit matches the approval record.
4. Evidence is attached or linked for every required release area.
5. Open exceptions have owners, expiry dates, and explicit approval.
6. Rollback, incident response, customer communication, and support ownership are assigned.

## Operational ownership

Before promotion, the release owner must confirm the following named owners exist in the approval record or evidence package:

- Release owner
- Final approver
- Rollback owner
- Incident commander
- Customer communication owner
- Support owner
- Security/compliance reviewer
- Evidence owner

## Enterprise rule

For enterprise procurement, missing operational ownership or missing evidence is treated as a No-Go unless a documented exception is approved with an expiry date and a compensating control.
