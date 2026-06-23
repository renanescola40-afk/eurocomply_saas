# Release Incident Response Plan

This plan defines how EuroComply handles production or enterprise-release incidents after a deployment is promoted.

It complements:

- `docs/RELEASE_CANDIDATE_VALIDATION.md`
- `docs/RELEASE_EVIDENCE_CHECKLIST.md`
- `docs/RELEASE_APPROVAL_RECORD.md`
- `docs/RELEASE_GO_NO_GO_CHECKLIST.md`
- `docs/RELEASE_ROLLBACK_PLAN.md`

## Purpose

A release is not considered production-ready unless the team can detect, classify, communicate, mitigate, and close incidents with evidence.

This document focuses on release-related incidents, including:

- failed deployment promotion
- degraded application availability
- authentication or authorization regression
- billing or webhook regression
- document upload or scanning regression
- audit-chain verification regression
- data isolation or RLS concern
- privacy or GDPR workflow concern
- suspicious security event after release

## Incident severity

### SEV-1 — Critical

Use SEV-1 when there is confirmed or strongly suspected impact to confidentiality, integrity, availability, billing integrity, tenant isolation, or audit-chain trust.

Examples:

- cross-tenant data exposure
- production authentication bypass
- audit-chain tamper evidence
- payment or billing misrouting
- critical RLS policy failure
- material customer data loss

Required response:

- declare incident immediately
- assign incident commander
- freeze non-emergency deployments
- evaluate rollback immediately
- preserve audit logs and deployment evidence
- notify customer-facing owner
- open post-incident review

### SEV-2 — High

Use SEV-2 when production is materially degraded or a security control is partially impaired, but no confirmed critical exposure exists.

Examples:

- major feature unavailable
- upload scanning unavailable in required mode
- step-up enforcement regression on non-critical action
- billing portal unavailable
- evidence export unavailable

Required response:

- assign owner
- define mitigation timeline
- evaluate rollback or hotfix
- preserve logs
- create follow-up issue

### SEV-3 — Moderate

Use SEV-3 for limited impact, degraded non-critical workflows, or documentation/evidence gaps discovered after release.

Examples:

- release evidence missing attachment
- non-critical admin dashboard issue
- minor audit metadata omission
- documentation mismatch

Required response:

- assign owner
- document timeline
- resolve in normal priority unless it blocks compliance reporting

## Response roles

Every incident must identify:

- Incident commander
- Engineering owner
- Security/compliance owner
- Customer communication owner
- Release owner
- Rollback owner
- Evidence owner

## Operational owner acknowledgement

For this release candidate, the named accountable operational owners are recorded in `docs/RELEASE_APPROVAL_RECORD.md`:

| Role | Owner |
| --- | --- |
| Incident commander / incident owner | @renansilva2002 / renanescola40-afk |
| Rollback owner | @renansilva2002 / renanescola40-afk |
| Customer communication owner | @renansilva2002 / renanescola40-afk |
| Support owner | @renansilva2002 / renanescola40-afk |
| Security/compliance owner | @renansilva2002 / renanescola40-afk |
| Evidence owner | @renansilva2002 / renanescola40-afk |

This acknowledgement only closes the missing-owner gap. It does not approve release promotion and does not satisfy missing deployment, Supabase live RLS, Stripe runtime, MFA/IdP provider, rollback target, or external security review evidence.

## Initial triage checklist

When an incident is declared, capture:

- incident ID
- release version
- promoted commit SHA
- deployment target
- first detection time
- reporter or monitoring source
- impacted organizations, if known
- affected feature area
- suspected severity
- immediate containment action
- rollback decision

## Required evidence preservation

Preserve before making destructive changes where possible:

- deployment logs
- application logs
- audit events
- relevant request IDs
- security gate output
- release readiness output
- rollback decision record
- customer communication timestamps
- affected configuration snapshot

## Rollback decision

Use `docs/RELEASE_ROLLBACK_PLAN.md` for rollback procedure.

Rollback must be considered immediately for:

- authentication regression
- tenant isolation concern
- audit-chain regression
- billing integrity regression
- upload scanning fail-open in required mode
- material availability incident

Rollback may be deferred only when a documented hotfix is safer and faster than rollback.

## Communication rules

For SEV-1 and SEV-2 incidents, document:

- internal status update cadence
- customer communication owner
- whether customer notification is required
- whether regulator/legal review is required
- final customer-facing incident summary, if applicable

## Closure criteria

An incident cannot be closed until:

- severity is confirmed
- root cause is documented
- customer impact is documented
- mitigation is complete
- rollback or hotfix result is verified
- evidence is attached
- follow-up actions are created
- release readiness impact is assessed

## Post-incident review

The post-incident review must include:

- timeline
- root cause
- detection gap
- prevention gap
- what worked
- what failed
- action items
- owners
- due dates
- whether release gates need changes

## Release readiness impact

Any SEV-1 or unresolved SEV-2 after release automatically blocks enterprise promotion until:

- post-incident review is completed
- corrective actions are accepted
- release owner signs off
- security/compliance owner signs off

## Enterprise rule

A production or enterprise release must have a usable incident response plan before promotion. If this plan is incomplete, the release decision is No-Go unless an explicit, time-bound exception is recorded in `docs/RELEASE_APPROVAL_RECORD.md`.
