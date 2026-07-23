# ADR: Final Runtime Assurance Boundary

## Status

Accepted for implementation.

## Context

The canonical product registry reached 100% implementation and CI verification. The safe runtime lane proves 80 weighted points but intentionally excludes readiness scoring, vendor assurance, platform controls and legal-rule review.

## Decision

Create a separate read-only, exact-SHA campaign for the three machine-verifiable workstreams worth 16 points. Keep the four-point Legal Rules workstream outside automation because completion requires qualified human review.

## Controls

- immutable exact-SHA target;
- repository identity binding;
- SHA-256 integrity validation;
- read-only workflow permissions;
- synthetic-data declaration;
- retained artifacts;
- fail-closed assertions;
- maximum projected runtime claim of 96%.

## Consequences

Technical runtime coverage can advance without conflating automated proof with legal approval. The final four points remain explicitly dependent on qualified review.
