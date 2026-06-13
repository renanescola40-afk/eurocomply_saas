# Release Post-Incident Review

This document defines the post-incident review process for release-related incidents in EuroComply.

It complements:

- `docs/RELEASE_INCIDENT_RESPONSE_PLAN.md`
- `docs/RELEASE_ROLLBACK_PLAN.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`

## Purpose

Every SEV-1 or SEV-2 incident after a release must produce a written post-incident review before the next production promotion. SEV-3 incidents require review when they expose a control gap, compliance issue, customer-visible regression, or repeated operational weakness.

The review must answer:

1. What happened?
2. What was the customer or compliance impact?
3. Which control failed or was missing?
4. Which evidence was preserved?
5. Was rollback required or considered?
6. What must change before the next release?
7. Which owner is accountable for each corrective action?

## Required fields

Each post-incident review must include:

- Incident identifier
- Release identifier
- Promoted commit SHA
- Environment
- Severity
- Detection time
- Acknowledgement time
- Mitigation time
- Resolution time
- Incident commander
- Engineering owner
- Security/compliance owner
- Customer communication owner
- Root cause summary
- Contributing factors
- Customer impact
- Compliance impact
- Data exposure assessment
- Audit-chain impact
- RLS / authorization impact
- Billing impact
- Upload/security scanning impact
- Rollback decision
- Evidence links
- Corrective actions
- Preventive actions
- Follow-up owner
- Due date
- Final reviewer

## Severity review requirements

### SEV-1

A SEV-1 post-incident review must be completed before any new production release. The release owner must explicitly sign off that all mandatory corrective actions are closed or formally accepted as exceptions.

### SEV-2

A SEV-2 post-incident review must be completed before the next production release unless the release owner and security/compliance owner approve a documented exception.

### SEV-3

A SEV-3 review is required when the incident reveals a repeatable defect, missing monitoring, missing release evidence, incomplete rollback ownership, or a security/compliance control gap.

## Corrective action policy

Corrective actions must be specific, owned, and time-bound. They should not be written as vague intentions.

Good examples:

- Add an automated gate for the failed control.
- Add missing alerting for the failed release signal.
- Add a regression test for the incident path.
- Update rollback instructions with the missing step.
- Add evidence requirements to the release checklist.

Bad examples:

- Improve monitoring.
- Be more careful.
- Review later.
- Investigate more.

## Release readiness impact

A release is not considered enterprise-ready when:

- An unresolved SEV-1 post-incident review exists.
- A SEV-2 review has open mandatory corrective actions without accepted exception.
- The same incident class repeats without a preventive control.
- The release evidence package does not include incident follow-up status.
- Rollback failed and no corrective action was completed.

## Evidence requirements

The post-incident review should link to:

- Incident timeline
- Logs or monitoring screenshots
- Relevant commit or deployment SHA
- Rollback decision record
- Customer communication record when applicable
- Security/compliance assessment
- Follow-up issues or PRs
- Final sign-off

## Template

```md
# Post-Incident Review: <incident-id>

## Summary

- Release identifier:
- Promoted commit SHA:
- Environment:
- Severity:
- Incident commander:
- Engineering owner:
- Security/compliance owner:
- Customer communication owner:

## Timeline

- Detected at:
- Acknowledged at:
- Mitigated at:
- Resolved at:

## Impact

- Customer impact:
- Compliance impact:
- Data exposure assessment:
- Audit-chain impact:
- Authorization/RLS impact:
- Billing impact:
- Upload/security scanning impact:

## Root cause

## Contributing factors

## What went well

## What did not go well

## Rollback decision

- Rollback required: yes/no
- Reason:
- Owner:

## Evidence

- Logs:
- Deployment:
- Monitoring:
- Communications:

## Corrective actions

| Action | Owner | Due date | Mandatory before next release? | Status |
| --- | --- | --- | --- | --- |
| | | | | |

## Exceptions

| Exception | Approver | Expiration | Compensating control |
| --- | --- | --- | --- |
| | | | |

## Final review

- Final reviewer:
- Date:
- Decision: closed / follow-up required / release blocked
```

## Enterprise rule

For enterprise release, post-incident reviews are part of the release evidence package. Open mandatory corrective actions must block release unless a named approver accepts the risk with a due date and compensating control.
