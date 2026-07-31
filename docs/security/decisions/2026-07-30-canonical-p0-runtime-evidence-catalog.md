# ADR — Canonical P0 Runtime Evidence Catalog

- **Date:** 2026-07-30
- **Status:** Accepted
- **Decision owner:** Release Engineering / Security Engineering

## Context

The P0 release controls were represented in multiple independent hardcoded lists:

- `docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md`;
- `scripts/security/check-p0-runtime-evidence-register.mjs`;
- `scripts/security/report-p0-runtime-evidence-gap.mjs`;
- enterprise runtime evidence validators.

Those lists had drifted. In particular, the register contained `Auth/RBAC final runtime validation`, while the strict P0 gap report did not require it. The report also applied the canonical evidence validator only to Supabase RLS and treated most other evidence primarily according to the literal `Complete` status.

This could allow a stale, malformed, wrong-SHA or incomplete evidence document to be represented more favourably than the canonical validator permits.

## Decision

Use `scripts/security/p0-runtime-evidence-catalog.mjs` as the canonical inventory of P0 controls.

The catalog records, for every control:

- exact register label;
- aliases needed for backwards-compatible register parsing;
- whether the control is repository-controlled or runtime-controlled;
- runtime evidence filename;
- canonical validator;
- whether the final-runner control is temporarily omitted while that runner is executing.

The following rules are enforced:

1. The register checker requires exactly the 16 catalog controls and rejects unknown rows.
2. The runtime gap report derives its inventory from the catalog.
3. Every runtime item must have a JSON evidence path and canonical validator.
4. Auth/RBAC is always part of the strict runtime inventory.
5. `Complete` is insufficient by itself. A control is satisfied only when:
   - the register status is `Complete`;
   - the evidence file exists and parses;
   - the evidence is not a placeholder;
   - the outcome is passing where applicable;
   - the canonical validator returns no failures.
6. Validators receive the expected repository, branch, release SHA and validation clock when supported.
7. Missing validators fail closed.
8. Runtime evidence is not rewritten or promoted by this catalog change.

## Consequences

### Positive

- A P0 control cannot silently disappear from one gate while remaining in another.
- Stale or malformed evidence cannot pass solely because its status says `Complete`.
- Existing specialist validators remain the source of truth for freshness, SHA binding, provenance and evidence integrity.
- The gap report becomes a trustworthy diagnostic for release owners.

### Trade-offs

- Previously tolerated stale evidence can now appear as a blocker.
- Adding or removing a P0 control requires updating the single catalog and its tests.
- The strict gate remains blocked until real target-runtime evidence satisfies every validator; this is intentional.

## Non-goals

This decision does not:

- generate runtime evidence;
- change any evidence document from `Open` to `Complete`;
- replace independent security review, founder facts or legal counsel;
- declare production or enterprise Go.

## Validation

The P0 workflow runs focused catalog, gap-report and strict-mode tests before register and evidence validation. General CI continues to run the full repository test, lint, typecheck, build and security suites.
