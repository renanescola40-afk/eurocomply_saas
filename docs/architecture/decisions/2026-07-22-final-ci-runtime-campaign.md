# ADR: Final CI verification and unified runtime evidence campaign

Date: 2026-07-22

## Context

The exact-SHA product coverage report reached 100% implementation but only 77% CI verification and 4% runtime evidence. Four expected contract files were absent, while runtime evidence remained distributed across multiple workflows and paths.

## Decision

1. Add the four missing fail-closed CI contracts for Prohibited Practices, FRIA, Post-market/Incidents and Platform Controls.
2. Maintain one canonical registry of the 15 remaining runtime evidence entries.
3. Validate evidence only when it is valid JSON, reports an accepted status and references the exact current `main` SHA.
4. Run the campaign manually through a protected environment with read-only permissions.
5. Produce a sanitized gap report rather than manufacturing missing evidence or auto-declaring GO.

## Consequences

- CI coverage can advance independently and honestly toward 100%.
- Runtime gaps become machine-readable and prioritized by weight.
- Stale or cross-SHA evidence cannot increase the score.
- Human and qualified reviews remain outside this workflow.
- Product Coverage and Enterprise Readiness remain separate release authorities.
