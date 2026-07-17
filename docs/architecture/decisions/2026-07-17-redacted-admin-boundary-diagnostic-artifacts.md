# Retain redacted administrative-boundary diagnostic artifacts

- Date: 2026-07-17
- Status: Proposed
- Scope: Enterprise Readiness Scorecard administrative-client boundary gate
- Priority: scorecard reliability and security diagnostics

## Context

The scorecard executes two independent repository controls before building administrative-client boundary evidence:

1. the Supabase service-role boundary scanner;
2. the strict browser/client import boundary scanner.

When either control failed, its console output was visible only inside the full GitHub Actions job log. Repository evidence generation was correctly skipped and the existing diagnostic upload then failed because no repository-control documents had been produced. This preserved fail-closed behavior, but made the root cause difficult to retrieve through artifacts and slowed remediation.

## Decision

The administrative-boundary runner now writes a dedicated exact-SHA diagnostic document before returning a failing exit status.

The document records:

- one result per control;
- pass/fail status, exit code, bounded redacted stdout and stderr;
- a SHA-256 digest of the retained output;
- target and observed commit SHAs;
- failed control identifiers;
- explicit evidence-integrity boundaries.

Credential-like values, JWTs, common provider-key prefixes, passwords, secrets, tokens, API keys and service-role values are redacted. Each output channel is bounded to 24,000 characters.

The scorecard workflow uploads this diagnostic document with `if: always()` immediately after the gate. The diagnostic command itself remains fail closed: a failed control or failed exact-SHA binding returns a non-zero process status, skips downstream evidence generation and keeps the scorecard red.

## Consequences

Operators can download a small dedicated artifact and identify the exact scanner and file finding without searching a large workflow log. The artifact is diagnostic only and cannot satisfy the administrative-client control by itself.

The change does not:

- ignore or override either scanner;
- use `continue-on-error`;
- allow downstream scorecard generation after failure;
- store environment variables, raw credentials, provider payloads or customer data;
- convert a failed control into a passing result.

## Evidence boundary

This document and its tests prove repository diagnostic behavior only. They do not prove that administrative clients remain server-only in a deployed bundle, that Supabase service-role credentials are correctly configured, or that runtime tenant isolation is effective.

## Rollback

Revert the script, workflow upload step, regression tests and this decision record. The boundary gate will remain fail closed, but root-cause information will again exist only in the full workflow job log.
