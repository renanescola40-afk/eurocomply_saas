# ADR — Derived P0 Runtime Evidence Register

- **Date:** 2026-07-30
- **Status:** Accepted
- **Decision owner:** Release Engineering / Security Engineering

## Context

The P0 evidence register is a useful human-readable release checklist, but its status column was maintained manually. A manual `Open`/`Complete` edit can drift from the evidence documents and their specialist validators.

The canonical catalog introduced by the preceding change prevents inventory drift. A second control is needed to prevent status drift:

- a stale evidence document must not remain represented as `Complete`;
- a valid exact-SHA proof should be visible without a manual interpretation step;
- CI must never mutate or promote repository evidence silently;
- release owners need a reviewable proposed register before opening an evidence-promotion PR.

## Decision

Add a shared runtime evaluator and deterministic derived-register renderer.

### Shared evaluator

`scripts/security/evaluate-p0-runtime-evidence.mjs` owns:

- register parsing and alias resolution;
- exact SHA resolution;
- evidence file loading and JSON failure handling;
- placeholder detection;
- canonical validator execution;
- evidence satisfaction and committed-register satisfaction results.

The gap report and derived register consume the same evaluator.

### Derived register

`scripts/security/derive-p0-runtime-evidence-register.mjs` generates:

- `artifacts/security/p0-runtime-evidence-register-derived.json`;
- `artifacts/security/p0-runtime-evidence-register-derived.md`.

Runtime rows are derived as follows:

- `Complete` only when the evidence document is complete, passing, non-placeholder and accepted by its canonical validator;
- `Open` otherwise.

Repository-only rows retain their committed repository-control status.

The renderer reports:

- exact assessed SHA;
- derived Go/No-Go decision;
- complete/runtime-complete counts;
- overclaims, where the committed register says `Complete` but validation does not;
- underclaims, where valid evidence exists but the committed register still says `Open`.

## Enforcement

- `--check-overclaim` fails when the committed register is more favourable than canonical validation.
- `--require-synchronised` fails on either overclaim or underclaim.
- `--write-artifacts` writes reviewable outputs only.
- `--write-register` is available for an intentional evidence-promotion branch and requires an exact 40-character SHA.
- Normal CI never commits or pushes the generated register.

## Workflow behavior

`P0 Runtime Evidence` now:

1. installs deterministic dependencies;
2. runs catalog, evaluator, renderer and strict-contract tests;
3. validates register and evidence hygiene;
4. derives the register and blocks overclaims;
5. uploads Markdown and JSON artifacts for review.

`P0 Final Release Gate` also blocks overclaims before running its strict gap enforcement.

## Operational verification

The review workflow must validate the combined catalog and derived-register stack against `main`. After the catalog PR is integrated, the derived-register PR is rebuilt or retargeted so its final diff contains only the evaluator, renderer, workflow, tests and this decision record.

## Consequences

### Positive

- The human-readable register cannot safely overstate machine-validated evidence.
- Gap reporting and register rendering use one evaluation implementation.
- Evidence-promotion PRs can be generated from deterministic artifacts instead of manual status editing.
- Existing genuine evidence remains unchanged.

### Trade-offs

- Underclaims remain visible until an intentional evidence-promotion PR updates the committed register.
- Repository-only controls remain governed by their repository checks rather than runtime validators.
- A valid external review or other human evidence must still be supplied genuinely; generation cannot manufacture it.

## Non-goals

This decision does not:

- execute production proofs;
- add provider credentials;
- mark current runtime evidence complete;
- open or merge an evidence-promotion PR automatically;
- declare Enterprise Go.
