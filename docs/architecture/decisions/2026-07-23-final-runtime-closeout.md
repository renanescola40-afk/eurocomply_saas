# ADR: Final EU AI Act runtime closeout

- Status: Accepted
- Date: 2026-07-23

## Context

The canonical product score reached 100% implementation, 100% CI verification and 84% runtime evidence. The remaining runtime weight was split across readiness-score coherence, provider-failure behavior and protected repository controls.

Runtime files committed to the repository become stale immediately after a new commit. The closeout therefore needs exact-SHA artefact overlays rather than permanent generated JSON in `main`.

## Decision

Create one final closeout workflow that:

1. regenerates all safe runtime evidence for the assessed SHA;
2. proves product-score coherence;
3. executes provider-failure contracts;
4. reads GitHub branch-protection configuration;
5. emits exact-SHA evidence for each independently passing workstream;
6. recalculates the canonical product score from artefact roots;
7. permits partial promotion only on pull requests;
8. requires all runtime controls on `main` and protected manual runs;
9. retains `NO_GO` until qualified human reviews are accepted.

## Consequences

- Pull requests can expose a blocked platform control without discarding valid readiness or provider evidence.
- Strict runs cannot reach 100% runtime when branch protection is unreadable or incomplete.
- Human review remains outside automation.
- No generated evidence is committed to the repository.
- Runtime coverage can reach 100% while completed coverage remains lower, accurately showing the remaining assurance boundary.
