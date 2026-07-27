# Qualified Review Control Center Runbook

## Purpose

Operate the eight genuine qualified human reviews that represent 51 weighted completion points without crediting missing or synthetic assurance.

## Daily checks

1. Confirm the active campaign target SHA matches the release candidate.
2. Confirm exactly eight canonical workstreams exist and total 51 points.
3. Review overdue, blocked, expired and revoked assignments.
4. Confirm every accepted assignment has a current, non-superseded and unexpired submission.
5. Confirm decisions were made by an independent actor and retain a substantive reason.
6. Revoke stale invitations and sessions before reassignment.
7. Export evidence only after the control center reports technical readiness.

## Incident handling

- Cross-tenant data: stop promotion, revoke sessions, preserve logs and follow the security incident runbook.
- Wrong SHA: supersede the submission and issue a new assignment-bound invitation.
- Reviewer conflict: revoke the invitation and session, record the conflict, and reassign.
- Overdue review: escalate to the campaign owner; never auto-accept.
- Storage or rate-limit outage: fail closed and retry only after the control is restored.

## Completion boundary

The control center can prove that eight accepted review records total 51 points for one exact SHA. It cannot prove professional competence, legal correctness, certification, notified-body acceptance or regulator approval without genuine external evidence.