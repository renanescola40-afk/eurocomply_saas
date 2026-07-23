# ADR: Exact-SHA safe runtime artifact promotion

- **Date:** 2026-07-23
- **Status:** Proposed

## Context

Product implementation and CI coverage reached 100%, while runtime coverage remained at 4%. The product scorecard previously looked only for evidence files inside the repository. Runtime proof is ephemeral and SHA-bound, so committing generated proof files would make them stale immediately after the next merge and would blur source code with execution evidence.

## Decision

Runtime evidence may be supplied through one or more read-only artifact roots. The product coverage generator accepts an artifact only when the document:

- uses the canonical runtime evidence schema;
- identifies the canonical repository;
- matches the exact assessed SHA;
- has an accepted terminal status;
- declares synthetic data;
- records explicit limitations.

A safe workflow executes non-destructive contract suites for twelve product workstreams, writes evidence only into the job workspace, and recalculates the product score using that evidence root. The artifact is retained for audit but never committed automatically.

## Safety boundary

Safe evidence proves isolated application and contract behavior. It does not prove production provider configuration, customer data behavior, qualified legal review, certification or regulator acceptance. The workflow enforces a runtime score below 100% and a final `NO_GO` decision.

## Consequences

- exact-SHA runtime progress can be measured without repository churn;
- stale or cross-SHA evidence cannot promote coverage;
- production/provider evidence and human review remain separate blockers;
- the default scorecard remains fail-closed when no artifact root is supplied.
