# ADR: Retained Provenance for Enterprise Closeout Retrieval

- Status: Accepted
- Date: 2026-08-04
- Decision owners: Release Engineering, Security Engineering, Enterprise Readiness

## Context

The final Enterprise conversation closeout consumes artifacts produced by protected GitHub Actions workflows. The previous implementation correctly required exact-SHA successful runs and exact artifact names, but an absent artifact caused the fetch step to terminate before the assessor and artifact upload steps.

That behavior was fail-closed, but operationally incomplete:

- the runbook instructed operators to inspect `blockers`, while no blocker result was retained for early retrieval failures;
- the final artifact did not independently prove which workflow run and artifact IDs were selected;
- a failed closeout could lose the durable remediation trail;
- retrieval success was implicit in the existence of copied files rather than an explicit validated control.

## Decision

The final closeout must produce and validate a dedicated retrieval provenance manifest.

The manifest records only bounded, non-secret metadata:

- canonical repository;
- exact current `main` SHA;
- fixed workflow file name;
- fixed SHA-derived artifact name;
- numeric workflow run ID;
- numeric artifact ID;
- trusted event enum;
- normalized timestamps;
- fixed expected and extracted paths;
- bounded failure code;
- final retrieval status and blockers.

Per-source retrieval failures are converted into `Open/blocked` manifest entries rather than uncaught workflow termination. The assessor treats an incomplete retrieval manifest as a release blocker. The workflow uploads diagnostics and checksums before executing its final fail-closed completion enforcement.

## Trusted run policy

Only successful exact-SHA runs on `main` triggered by `push` or `workflow_dispatch` are eligible. Pull-request events are excluded even when metadata appears to match the target SHA.

## Archive policy

Artifacts are read in memory. The implementation requires:

- approved ZIP content type and signature;
- bounded compressed archive size;
- bounded entry count and total uncompressed size;
- exactly one match for every canonical path;
- no symlink, directory, encrypted, empty, oversized, or suspiciously compressed entry;
- valid UTF-8 JSON.

Arbitrary first-file discovery and full archive extraction are prohibited.

## Consequences

### Positive

- every failed closeout produces actionable, durable evidence;
- source run/artifact selection is independently reviewable;
- missing evidence cannot be confused with a passing validator;
- artifact handling is more resistant to decoys, path tricks, ZIP bombs, and malformed evidence;
- the workflow remains read-only.

### Negative

- the final closeout now requires one additional manifest validator;
- producer workflow or artifact naming drift becomes an explicit blocker;
- old closeout fixtures without provenance must be updated;
- a successful source workflow must retain the exact expected artifact structure.

## Rejected alternatives

### Continue failing immediately on the first missing artifact

Rejected because it loses the promised blocker artifact and makes operations depend on raw runner logs.

### Accept manual workflow run IDs as closeout inputs

Rejected because manual IDs increase operator error and weaken exact-SHA automatic discovery.

### Download an artifact and copy the first JSON file found

Rejected because archive order is not provenance and decoy files could be selected.

### Grant `actions: write` and automatically rerun missing workflows

Rejected because the closeout assessor must remain read-only and must not modify the system it assesses.

### Store raw GitHub API responses for auditability

Rejected because raw payloads create unnecessary retention and leakage risk. Bounded identifiers and fixed metadata are sufficient for reproducibility.
