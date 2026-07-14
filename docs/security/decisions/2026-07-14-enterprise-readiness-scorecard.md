# ADR: Evidence-backed Enterprise Readiness Scorecard

- Date: 2026-07-14
- Status: Proposed
- Decision owner: Enterprise GO Command Center

## Context

Enterprise readiness percentages were previously communicated through manual assessments. Those assessments were useful for prioritization but were not reproducible, commit-bound, or mechanically tied to evidence files. A percentage could therefore drift from the repository state or be interpreted as production health.

## Decision

Introduce one versioned registry of 100 equally weighted controls across 10 domains, plus a deterministic generator that derives control states from repository evidence JSON.

The scorecard is fail-closed:

- missing evidence is `NOT_VERIFIED`;
- malformed evidence is `FAIL`;
- an `Open` evidence document is not success;
- named checks must explicitly pass;
- Enterprise GO requires 100% and zero critical controls outside `PASS`.

The generated scorecard is published as a GitHub Actions artifact and job summary. It is not committed as a manually editable progress file.

## Consequences

Positive:

- percentages become reproducible;
- every score points to an evidence path;
- missing runtime proof cannot be hidden by repository CI;
- domain scores and blockers are consistently calculated;
- future agents can report deltas from artifacts rather than memory.

Trade-offs:

- initial scores may be lower than narrative assessments;
- evidence filenames and named checks become contracts;
- controls need maintenance when architecture or evidence schemas change;
- the framework does not create missing production evidence.

## Security and privacy

The scorecard stores status, control metadata, and repository-relative evidence paths only. It must not copy secrets, tokens, raw provider payloads, customer data, emails, tenant identifiers, or authorization headers into generated artifacts.

## Rollback

Revert the workflow, generator, tests, registry, and documentation. Existing release and security gates remain unaffected. Removing the scorecard must not be represented as improving readiness.
