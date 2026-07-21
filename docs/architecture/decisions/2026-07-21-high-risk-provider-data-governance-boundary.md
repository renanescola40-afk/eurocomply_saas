# ADR: High-Risk Provider Data-Governance Boundary

## Status

Accepted for repository implementation; runtime, statistical and legal validation remain pending.

## Context

The general AI-governance lifecycle represented Article 10 data governance as one boolean. That was insufficient for enterprise evidence, dataset versioning, provenance, training/validation/test separation, quality assessment, bias analysis, mitigation verification, drift monitoring and separation of duties.

A single completion flag could be satisfied without proving which datasets were assessed, which version was reviewed, what evidence supported the decision, whether findings remained open or whether material changes invalidated the review.

## Decision

Create a dedicated high-risk provider data-governance domain with:

- a deterministic 34-control fail-closed decision engine;
- explicit applicability and provider-role states;
- versioned organization-scoped programs and datasets;
- quality, statistical, protected-group, bias, gap and leakage assessments;
- mitigation and independent effectiveness verification;
- immutable SHA-256-backed evidence;
- dataset version and material-change controls;
- drift monitoring and post-deployment feedback linkage;
- owner, reviewer, approver, assessor and verifier separation;
- forced RLS and composite tenant relationships;
- append-only material decisions;
- explicit legal and statistical review boundaries.

## Consequences

### Positive

- Dataset release cannot be represented as ready from a single boolean.
- Evidence is tied to a specific organization, program, dataset and source version.
- Severe findings and unknown residual risk block progression.
- Bias mitigations require evidence and independent verification.
- Special-category data requires explicit review.
- Material changes can invalidate previous review freshness.
- Conformity and Annex IV workflows gain a dedicated evidence source.

### Costs

- Application APIs and UI must manage a larger lifecycle.
- Dataset counts and approved-assessment counts must be maintained transactionally.
- Statistical methodology still requires qualified human review.
- Production validation requires isolated migration and live tenant tests.

## Alternatives rejected

### Keep the general boolean

Rejected because it provides no dataset-level traceability, evidence integrity or lifecycle governance.

### Store assessments as free-form documents only

Rejected because documents alone do not enforce tenant relationships, versions, severe-finding blocks or separation of duties.

### Automatically determine whether data is unbiased or legally usable

Rejected because this would overclaim technical and legal certainty. The platform can organize evidence and decisions but cannot prove universal fairness, lawful processing or regulatory acceptance.

### Permit direct authenticated writes

Rejected because direct PostgREST mutation could bypass workflow permissions, trusted-origin checks, bounded validation, rate limits and durable audit behavior.

## Validation required

Before scorecard promotion:

- exact-head lint, typecheck, unit tests and build;
- isolated application of the migration;
- positive and negative two-organization RLS proof;
- transactional count and approval-state validation;
- API authorization and audit tests;
- customer UI and accessibility review;
- statistical methodology review;
- legal review of Article 10 and special-category data boundaries;
- exact-SHA evidence manifest and scorecard promotion.

## Rollback

Before migration execution, revert the domain files together.

After production migration, disable mutations at the application layer and use a reviewed forward migration. Do not destructively delete dataset, assessment, mitigation, evidence or decision history.
