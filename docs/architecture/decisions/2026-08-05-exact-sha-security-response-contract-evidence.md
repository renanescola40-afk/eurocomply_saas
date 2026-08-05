# Exact-SHA security response contract evidence

## Status

Accepted for implementation on 2026-08-05.

## Context

The Enterprise Readiness Scorecard expects evidence for security-header
configuration and `no-store` coverage, but the exact-SHA scorecard workflow did
not build those documents unless a separate production-runtime artifact was
available. The same workflow already executes the full security suite and
captures its exact-SHA GitHub result, while repository-owned scanners validate
the header configuration and every sensitive API route.

This mismatch left `SEC-05` and `SEC-06` unverified even when their bounded
repository contracts had executed successfully for the assessed SHA.

## Decision

The canonical repository-control evidence builder will generate:

- `security-headers-validation.json` from the explicit Next.js/proxy
  configuration, the fail-closed header scanner and exact-SHA security checks;
- `no-store-validation.json` from the sensitive-route inventory, the fail-closed
  no-store scanner and exact-SHA security checks.

Both documents require canonical repository provenance, exact checked-out SHA,
focused executable validation and the applicable aggregate checks. Missing
source contracts, a mismatched SHA or any failed scanner leaves the document
`Open`.

## Evidence boundary

These artifacts prove repository configuration and regression execution for one
exact SHA. They do not claim that a production CDN or deployment returned the
headers. Production deployment, hostname, readiness and smoke controls remain
separate and `NOT_VERIFIED` until provider-backed evidence is accepted.

## Rollback

Remove the two outputs from the repository-control builder and restore their
production-runtime-only cleanup behavior. No database, provider or customer data
is changed by this decision.
