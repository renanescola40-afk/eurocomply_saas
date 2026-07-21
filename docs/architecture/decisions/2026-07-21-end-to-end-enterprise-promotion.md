# ADR: End-to-End Enterprise Evidence Promotion

Date: 2026-07-21
Status: Proposed

## Context

Runtime proof orchestration, evidence-manifest assembly and canonical scorecard promotion existed as separate capabilities. Their standalone workflows did not materialize each other's required inputs, so a successful runtime campaign could not automatically produce an evidence-backed completion percentage.

## Decision

Extend the protected Enterprise Runtime Closeout workflow so one exact current `main` SHA flows through campaign execution, exact-SHA repository-check capture, canonical baseline generation, runtime evidence selection, sanitized manifest assembly and final scorecard promotion.

Baseline controls are promoted only when the canonical scorecard already reports them `PASS` with an eligible evidence reason. Runtime controls are promoted only from child-run evidence whose repository, run ID, target SHA and observed SHA match the protected campaign. All ten lanes must expose scorecard-readable evidence.

## Security boundary

Secret-shaped metadata is rejected rather than silently removed. Staging documents contain bounded scorecard metadata only. Raw provider payloads, credentials, cookies, signed URLs, database URLs and customer data are excluded. A missing lane, stale SHA, mismatched child run, duplicate evidence identity or open critical control keeps the closeout `NO_GO`.

## Consequences

The retained closeout bundle can now report the previous percentage, promoted percentage, delta, remaining percentage and final decision for one immutable SHA. The workflow remains unable to self-prove legal approval, external assurance, customer acceptance or human operational sign-off.

## Rollback

Revert the workflow integration, closeout scripts, tests, runbook and this ADR together. Existing child workflows, standalone manifest tooling and standalone promotion tooling remain available. Do not rewrite historical evidence artifacts.
