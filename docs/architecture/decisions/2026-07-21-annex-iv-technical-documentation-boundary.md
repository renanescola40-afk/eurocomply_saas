# ADR: Annex IV Technical Documentation Governance Boundary

## Status

Accepted for repository implementation; runtime, technical and legal validation pending.

## Context

The repository contained a useful compatibility helper that checked whether twelve documentation sections had a summary, evidence reference, owner and review timestamp. That was insufficient for enterprise technical-documentation governance because it did not provide persistence, version control, evidence integrity, independent review, lifecycle change history, tenant boundaries or a release decision.

## Decision

Evolve the existing Annex IV module instead of creating a parallel implementation.

The existing `assessAnnexIv` entrypoint remains available for compatibility. A new `decideAnnexIvPackage` boundary owns governed readiness decisions and requires:

- explicit applicability and provider-role review;
- versioned AI-system and documentation identity;
- twelve independently approved sections;
- SHA-256 content and evidence digests;
- source-version and material-change traceability;
- risk, data, validation, instructions, conformity and post-market links;
- high and critical finding closure;
- owner, reviewer and approver accountability;
- legal review for uncertain or severe cases;
- organization-scoped persistence and forced RLS;
- append-only evidence, changes and decisions.

## Consequences

A presence-only package can no longer be treated as publication ready. Missing review, stale review after a material change, self-review, invalid evidence integrity, severe findings or incomplete conformity linkage fail closed.

Legacy callers continue to receive their original completeness assessment while new application flows can migrate to the governed decision engine.

## Alternatives rejected

### Keep the presence-only helper

Rejected because field presence does not demonstrate controlled documentation, evidence quality, independent review or lifecycle maintenance.

### Create a second Annex IV module

Rejected because two decision engines would drift and create conflicting readiness outcomes.

### Automatically validate technical truth

Rejected because repository logic cannot establish the truth, adequacy or legal sufficiency of engineering evidence.

### Permit mutable evidence history

Rejected because silent evidence replacement weakens traceability and auditability.

## Security and tenancy

- all records include `organization_id`;
- package, section and evidence relationships use organization-scoped composite keys;
- RLS is enabled and forced;
- authenticated clients receive read-only tenant access;
- privileged server APIs own mutations;
- every accountable user reference is checked against organization membership;
- evidence, changes and decisions are append-only.

## Validation required

- exact-head lint, typecheck, tests and build;
- isolated Supabase migration application;
- positive and negative RLS proof with two organizations;
- privileged API authorization tests;
- customer-facing workflow and accessibility review;
- engineering review of section templates and evidence expectations;
- legal review of applicability and substantial-modification methodology;
- canonical scorecard promotion only from accepted exact-SHA evidence.

## Rollback

Before migration execution, revert the seven-file package together. After production migration, disable mutations at the service layer and use a reviewed forward migration. Do not destructively delete technical-documentation history.
