# ADR-0082: Bound the Google OAuth provider proof response

- Status: Proposed
- Date: 2026-07-16
- Decision owners: Security and Release Engineering

## Context

The exact-SHA Google OAuth provider proof queries the Supabase Management API to confirm that Google authentication is enabled and that the production site URL and callback allowlist match the expected production origin.

The probe already used HTTPS-only URL validation, rejected redirects, applied a 15-second application timeout, avoided storing provider configuration, and kept unexecuted evidence in a pending state. However, it parsed a successful provider response with `Response.json()` without a byte boundary.

A malformed, compromised, or unexpectedly large provider response could therefore be buffered completely before parsing. Because this probe is part of a production release-evidence workflow, its remote input handling should be deterministic and fail closed.

This finding is based on repository source. It does not assert a provider compromise, production incident, external audit result, or penetration test.

## Decision

Limit the Supabase Management API response to 64 KiB before JSON parsing.

The probe will:

1. reject a declared `Content-Length` above the limit before reading;
2. read chunked or undeclared responses through the response stream;
3. count raw bytes and cancel the reader immediately on overflow;
4. decode UTF-8 with fatal error handling;
5. parse JSON only after the bounded read completes;
6. preserve the existing 15-second timeout and fail-closed exit behavior.

The evidence writer remains network-isolated and no runtime evidence file is added or modified by this change.

## Consequences

### Positive

- Release proof cannot buffer an arbitrarily large successful provider response.
- Declared and streamed response bodies are governed by the same byte limit.
- Invalid UTF-8 and malformed JSON continue to fail the proof closed.
- Existing token minimization, exact-origin checks, timeout, and evidence boundaries are preserved.

### Risks and trade-offs

- A legitimate provider response above 64 KiB will fail the proof.
- Accepted responses remain buffered up to the configured limit for JSON parsing.
- Stream cancellation is best effort and does not replace network or runner-level resource controls.
- The threshold should only be changed using observed provider-response evidence.

## Validation

A focused source contract verifies the byte constant, early declared-length rejection, streamed byte counting, cancellation, fatal UTF-8 decoding, bounded JSON parsing, preservation of the timeout, and removal of the former `await response.json()` call.

GitHub Actions on the exact pull-request head remains authoritative for lint, typecheck, tests, build, security suites, CodeQL, Semgrep, Gitleaks, dependency review, enterprise gates, and release checks.

No runtime execution, production deployment, audit, pentest, certification, or provider behavior is claimed by this ADR.

## Rollback

Revert the pull request containing this ADR. The probe will again parse successful Supabase Management API responses without an application-level byte boundary. No migration, schema rollback, credential rotation, provider configuration change, or customer-data repair is required.
