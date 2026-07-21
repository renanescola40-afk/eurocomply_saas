# ADR: Prohibited Practices Governance Boundary

## Status

Accepted for repository implementation. Production, legal and authority validation remain pending.

## Context

The repository already contained a useful tri-state Article 5 screening helper. It mapped eight signal families, failed closed on positive answers and requested review for unknown answers.

That helper was intentionally lightweight and in-memory. It did not provide:

- versioned organization-scoped reviews;
- signal-level evidence and legal conclusions;
- governed exception claims;
- review freshness after material changes;
- separation of duties;
- immutable evidence and decision history;
- a persistent boundary that downstream Annex IV, QMS and conformity workflows can reference.

Treating a simple questionnaire result as deployment clearance would create a serious evidence and legal-truth gap.

## Decision

Preserve `assessProhibitedPractices` for backwards compatibility and add a separate governed boundary, `decideProhibitedPracticesGovernance`.

The governed domain includes:

- 18 cross-cutting controls and eight signal controls;
- explicit applicability states;
- versioned system reviews;
- one assessment per Article 5 signal family;
- evidence-backed legal conclusions;
- separately governed exception claims;
- owner, independent reviewer, legal reviewer and approver roles;
- material-change freshness checks;
- high and critical finding blocks;
- SHA-256 integrity digests;
- forced RLS and composite tenant relationships;
- immutable evidence and append-only decisions.

## Fail-closed policy

A positive signal blocks production use unless accountable review concludes that the described system behavior does not trigger the prohibition or that a narrowly documented exception is supported.

A claimed exception is not accepted from a checkbox. It requires legal basis, scope, safeguards, authorization, necessity, proportionality, independent legal review, approval, evidence digest and validity dates.

Unknown answers, stale reviews, unresolved severe findings, invalid digests and missing approvals also block progression.

## Consequences

### Positive

- The legacy screen remains stable for current callers.
- Downstream workflows receive a versioned decision instead of a free-floating boolean.
- Positive signals cannot silently become clear.
- Exception evidence is tied to the exact signal and review.
- Material changes invalidate stale review evidence.
- Cross-tenant attachment and direct client mutation are constrained.
- Evidence and decision history cannot be rewritten after the fact.

### Costs

- APIs and UI must support a larger lifecycle.
- Counts and review states must be maintained transactionally.
- Qualified legal and domain review remain necessary.
- Live authority or law-enforcement authorizations cannot be proven by repository code.

## Alternatives rejected

### Replace the existing helper

Rejected because it would break existing callers and tests. The governed boundary is additive.

### Automatically clear every negative questionnaire answer

Rejected because negative answers still need context, rationale, evidence and independent review for enterprise use.

### Automatically validate exceptions

Rejected because exception applicability depends on facts, authorization, proportionality, sector context and legal analysis that the product cannot determine autonomously.

### Store only free-form legal memos

Rejected because free-form documents do not enforce versions, tenant relationships, actor separation, review freshness or append-only decision history.

### Allow authenticated PostgREST writes

Rejected because direct writes could bypass application permissions, trusted-origin checks, bounded validation, rate limits and fail-closed audit persistence.

## Validation required

Before scorecard promotion:

- exact-head lint, typecheck, tests and build;
- isolated migration execution;
- live two-organization RLS proof;
- transactional count and approval-state validation;
- privileged API authorization and audit tests;
- customer-facing UI, accessibility and localization review;
- legal methodology review of Article 5 distinctions and exception handling;
- integration with inventory, FRIA, Annex IV, QMS and conformity workflows;
- exact-SHA evidence manifest and canonical scorecard promotion.

## Rollback

Before migration execution, revert the domain files together.

After production migration, disable mutations in the service layer and use a reviewed forward migration. Do not destructively erase reviews, evidence, exception claims or decisions.
