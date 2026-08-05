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

## Post-merge verification correction

The first accepted implementation still allowed the production-runtime fetcher
to delete both shared outputs before it discovered whether an exact-SHA runtime
bundle existed. That cleanup made the canonical scorecard remain at 46% even
though the repository evidence builder had completed successfully.

The fetcher now removes only its production-owned aggregate during discovery.
When an exact-SHA runtime bundle exists, it still replaces the shared outputs
with stronger live evidence. When no bundle exists, the bounded repository
evidence remains available and is retained in the pre-fetch diagnostics
artifact. This preserves the evidence boundary and prevents an optional runtime
lookup from silently erasing valid exact-SHA repository proof.
