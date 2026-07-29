# Enterprise Scorecard Promotion Runbook

## Purpose

Promote enterprise controls only when exact-SHA evidence proves them. Repository implementation, merged pull requests and green advisory checks are not sufficient by themselves.

## Inputs

The protected workflow requires:

1. an exact 40-character integrated `main` SHA;
2. a canonical JSON scorecard containing exactly 100 unique controls;
3. an evidence manifest containing sanitized runtime evidence items.

Each control must contain `id`, `critical` and `status`. Each evidence item must contain matching `targetSha` and `observedSha`, `Complete/passed`, a valid generation time, repository/run provenance, a non-empty `controlsVerified` list and the explicit assertion `evidenceIntegrity.containsSensitiveValues: false`.

## Fail-closed rules

Evidence is rejected when it is stale, SHA-mismatched, malformed, incomplete, references an unknown control, lacks provenance, lacks the sensitive-value assertion or contains secret-shaped fields. A previous `PASS` without accepted evidence is downgraded to `NOT_VERIFIED`.

The release decision is `GO` only when all 100 controls are `PASS`, no critical control remains open and no evidence item was rejected. Every other state is `NO_GO`.

## Workflow

Run **Enterprise scorecard promotion** manually against the exact integrated `main` SHA. The workflow checks out a detached immutable commit, installs locked dependencies, executes contract tests, writes a sanitized JSON report and uploads it as a retained artifact.

The workflow intentionally fails when the report is `NO_GO`. This is expected behavior and must not be weakened, converted to advisory or bypassed.

## Output

`artifacts/enterprise-readiness/scorecard-promotion-report.json` contains:

- exact target SHA;
- official complete and remaining percentages;
- counts by control status;
- open critical control IDs;
- rejected evidence with bounded reasons;
- per-control accepted evidence references;
- deterministic SHA-256 integrity digest;
- final `GO` or `NO_GO` decision.

The report must not contain secrets, provider payloads, customer data, cookies, authorization headers, connection strings, private keys or signed URLs.

## Rollback

This package does not mutate production or the database. Rollback consists of reverting the workflow, script, tests and runbook. Previously generated evidence artifacts remain historical records and must not be rewritten.

## Current progress boundary

The last accepted baseline remains **45% complete / 55% remaining** until the promotion workflow is executed against the current integrated `main` SHA with complete accepted evidence. This implementation prepares deterministic promotion but does not itself promote any control.
