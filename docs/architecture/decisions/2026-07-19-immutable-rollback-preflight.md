# Require immutable preflight before protected rollback mutation

## Status

Proposed

## Context

The protected rollback proof accepted deployment URLs, SHA formats and a literal
confirmation before invoking `vercel rollback`. It did not prove that the target
URL served the requested rollback SHA or that the restoration URL served the
current SHA until after production traffic had moved. The implementation also
looked for release identity on `/api/health`, whose public contract intentionally
contains no SHA, and restored only when the CLI reported success. A provider
timeout after an effective mutation could therefore skip restoration.

## Decision

All checks that do not require traffic mutation run before the first provider
write. The protected workflow and runner must:

- bind the requested release to the exact current GitHub `main` and require the
  rollback commit to be an ancestor;
- accept only origin-only HTTPS Vercel deployment URLs and the canonical
  production hostname;
- verify public health and exact runtime identity through the protected
  `/api/ready/release` contract;
- query the read-only Vercel deployment API and require the expected owner,
  project, production target, `READY` state, immutable URL and GitHub SHA;
- re-read `main` immediately before mutation;
- use a literally pinned Vercel CLI;
- attempt idempotent restoration after every rollback attempt, including an
  ambiguous non-zero CLI result.

Only redacted booleans and failure identifiers are persisted. Tokens, deployment
URLs, provider payloads and mismatched observed SHAs are not written to evidence.

## Consequences

- A stale, cross-project, preview, unready or SHA-mismatched deployment fails
  before production traffic changes.
- A protected endpoint, provider API or fresh-main check outage blocks the
  exercise rather than weakening it.
- The workflow requires existing `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
  `VERCEL_TOKEN` and `HEALTHCHECK_TOKEN` protected-environment secrets.
- Repository checks prove code and ordering, not a real rollback. Runtime evidence
  remains `NOT_VERIFIED` until an owner-approved protected production exercise.

## Rollback

Revert the workflow, runner, contract, tests, runbook and this decision record
together before any production exercise. Do not weaken individual preflight checks
to obtain a passing proof; an unavailable check is a blocked rollback exercise.

