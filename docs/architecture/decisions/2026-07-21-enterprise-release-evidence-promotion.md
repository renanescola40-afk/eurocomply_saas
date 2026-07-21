# ADR: Fail-closed enterprise release evidence promotion

- Date: 2026-07-21
- Status: Accepted

## Context

The repository contains many specialized implementation and runtime-evidence workflows. The P0 release register nevertheless remains No-Go because evidence is fragmented across files and workflows, and there is no single exact-SHA promotion boundary that refuses stale, partial or mismatched proof.

Counting implemented controls as completed would overstate readiness. Manually updating a scorecard can also accidentally accept evidence produced for another branch, another commit or an expired validation window.

## Decision

Introduce a manifest-driven release decision builder and a protected manual workflow.

The builder:

1. requires a full release SHA and the canonical release branch;
2. loads every required control from a versioned manifest;
3. validates passing outcome, exact SHA, branch, timestamp and freshness;
4. rejects secret-bearing keys recursively;
5. requires independent-review metadata for external assurance controls;
6. emits only bounded status metadata and evidence digests;
7. returns a non-zero exit code unless every control is complete.

The workflow checks out the requested SHA, verifies that it is the current `origin/main`, runs contract tests, builds the decision and uploads immutable 90-day artifacts from a protected environment.

## Consequences

### Positive

- one authoritative Go/No-Go boundary;
- stale and cross-commit evidence cannot silently promote controls;
- external review stays distinct from self-attestation;
- evidence payloads are not copied into the aggregate artifact;
- the remaining enterprise gap becomes measurable and explicit.

### Trade-offs

- the workflow intentionally fails until every runtime file exists and passes;
- exact-main verification prevents assessing an older release candidate after `main` moves;
- evidence producers must use the canonical SHA, branch and timestamp fields;
- the manifest must be reviewed whenever enterprise scope changes.

## Rejected alternatives

- Treat merged code as runtime evidence: rejected because implementation does not prove production behavior.
- Accept short SHAs: rejected because they weaken provenance.
- Allow partial Go decisions: rejected because the P0 policy requires all release blockers complete.
- Embed source evidence in the decision artifact: rejected to reduce sensitive-data propagation and artifact size.

## Rollback

Revert the workflow, builder, manifest, tests and documentation together. Keep the release decision No-Go until an equivalent reviewed promotion boundary exists.
