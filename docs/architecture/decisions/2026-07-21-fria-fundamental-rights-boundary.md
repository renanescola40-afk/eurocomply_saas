# ADR: FRIA and Fundamental-Rights Governance Boundary

## Status

Accepted for repository implementation; runtime and legal validation pending.

## Context

The product scorecard recorded only partial FRIA coverage. A boolean indicating that a FRIA existed was insufficient for enterprise governance, affected-group analysis, mitigation review, separation of duties, evidence integrity and reassessment.

## Decision

Create a dedicated FRIA domain with:

- deterministic fail-closed lifecycle;
- explicit applicability states;
- rights, groups, impacts, mitigations, oversight and redress records;
- versioned assessments and evidence;
- append-oriented decisions;
- owner/reviewer/approver separation;
- severe-residual-impact legal-review boundary;
- tenant-scoped references and forced RLS.

## Consequences

Uncertain applicability and severe unresolved residual impacts cannot silently pass. The product can organize assessment evidence without claiming a legal conclusion. Additional API/UI work and protected runtime evidence remain necessary.

## Alternatives rejected

- single completion checkbox: no evidence quality or lifecycle;
- automatic legal applicability determination: unsafe and overclaims certainty;
- mutable decision history: weak auditability;
- shared cross-tenant evidence identifiers: unacceptable isolation risk.

## Validation required

- exact-head lint, typecheck, tests and build;
- isolated migration application;
- positive and negative two-organization RLS proof;
- human review of Article 27 mapping;
- stakeholder and accessibility review of customer-facing workflow;
- scorecard promotion only after accepted exact-SHA evidence.

## Rollback

Before migration, revert the domain files together. After migration, disable the workflow and use a reviewed forward migration; do not delete governance history destructively.
