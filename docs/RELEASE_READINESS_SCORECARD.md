# Release Readiness Scorecard

This scorecard converts release readiness into an explicit checklist for EuroComply.
It does not replace live CI, build, Supabase, Stripe, or security testing evidence.
It is used to summarize whether the release is moving toward public production or enterprise procurement.

## Scoring model

Each area is scored as one of:

- `0` — missing or not started
- `1` — documented only
- `2` — implemented but not validated in a live environment
- `3` — validated with evidence attached

A release cannot be considered enterprise-ready only because this scorecard is complete.
The evidence package and approval record remain authoritative.

## Required areas

| Area | Expected evidence | Score |
| --- | --- | --- |
| Build and Security CI | latest successful build and security run | 0 / 1 / 2 / 3 |
| Supply-chain | lockfile committed and audit triage attached | 0 / 1 / 2 / 3 |
| Supabase RLS | live validation evidence attached | 0 / 1 / 2 / 3 |
| Audit-chain | transactional RPC applied and verified | 0 / 1 / 2 / 3 |
| Step-up auth | sensitive actions protected and provider verified | 0 / 1 / 2 / 3 |
| Upload security | content scan provider verified or exception approved | 0 / 1 / 2 / 3 |
| Billing | Stripe checkout, portal, and webhook evidence | 0 / 1 / 2 / 3 |
| Observability | release monitoring and alert ownership confirmed | 0 / 1 / 2 / 3 |
| Rollback | rollback owner and rollback path verified | 0 / 1 / 2 / 3 |
| Incident response | incident response and post-incident review owners assigned | 0 / 1 / 2 / 3 |
| Customer communication | support/status/customer communication owners assigned | 0 / 1 / 2 / 3 |
| External review | pentest or security review status attached | 0 / 1 / 2 / 3 |

## Readiness thresholds

- `0-17`: No-Go
- `18-26`: private beta only
- `27-32`: production candidate with explicit exceptions
- `33-36`: enterprise candidate, pending final approval

## Automatic No-Go conditions

The scorecard is overridden by No-Go when any of the following is true:

- promoted commit does not match the approved commit
- evidence package is missing
- release owner or approver is missing
- rollback owner is missing
- live database authorization evidence is missing for an enterprise release
- audit-chain transactional write path is not applied for enterprise release
- high or critical dependency risk is untriaged
- customer-impacting incident process has no owner

## Required linkage

This scorecard must be reviewed together with:

- `docs/RELEASE_CANDIDATE_VALIDATION.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`
- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
- `docs/RELEASE_ROLLBACK_PLAN.md`
- `docs/RELEASE_INCIDENT_RESPONSE_PLAN.md`
- `docs/RELEASE_POST_INCIDENT_REVIEW.md`
- `docs/RELEASE_CUSTOMER_COMMUNICATION_PLAN.md`
- `docs/RELEASE_SUPPORT_READINESS.md`
- `docs/RELEASE_OPERATIONS_INDEX.md`

## Final rule

A release may only be promoted when the scorecard result, evidence checklist, approval record, and Go/No-Go decision all agree.
If they conflict, the strictest result wins.
