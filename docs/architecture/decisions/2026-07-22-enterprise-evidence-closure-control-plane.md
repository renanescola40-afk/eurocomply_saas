# ADR: Enterprise evidence closure control plane

Date: 2026-07-22

## Decision

Introduce one canonical registry and fail-closed validation pipeline for runtime evidence and qualified human review packages required by the EU AI Act product coverage model.

## Context

Implementation coverage reached the point where remaining completion credit depends primarily on production-like runtime proof and accountable review. Manual checklists could become stale, count placeholders, mix SHAs or silently accept expired evidence.

## Consequences

- evidence requirements are machine-readable;
- gap reports are prioritized by product weight;
- pull requests run report mode without falsely claiming completion;
- strict closure is manual and protected by an environment;
- evidence packages must match the exact evaluated SHA;
- templates are intentionally rejected until fully replaced;
- promotion preparation does not mutate the repository;
- accepted evidence remains reviewable through dedicated pull requests.

## Rejected alternatives

- Committing synthetic `passed` JSON files: rejected because it fabricates proof.
- Treating green CI as runtime evidence: rejected because CI does not prove production-like tenant, provider or operational behavior.
- Allowing repository maintainers to self-attest every legal review: rejected because several workstreams require relevant independent qualification.

## Rollback

Revert the registry, scripts, schemas, workflow, tests and documentation together. Existing evidence files remain untouched.
