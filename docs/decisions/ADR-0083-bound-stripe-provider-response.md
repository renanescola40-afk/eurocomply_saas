# ADR-0083: Bound Stripe provider-proof responses

- Status: Accepted
- Date: 2026-07-16
- Scope: Stripe provider configuration proof

## Context

`scripts/security/probe-stripe-provider-config.mjs` validates test-mode Stripe account state, configured recurring prices, and webhook event coverage for exact-SHA release evidence.

The probe already required a test-mode key, rejected redirects, applied a 15-second timeout, and failed closed when Stripe returned an unsuccessful status. However, each successful Stripe response was parsed with `Response.json()` without an application byte limit. The probe performs five requests in parallel, so malformed or unexpectedly large remote responses could be buffered before parsing inside a release-evidence workflow.

This finding is based on repository source. It does not assert a Stripe incident, provider compromise, production outage, customer impact, external audit finding, or penetration-test result.

## Decision

Every successful Stripe API response used by the proof is read through one bounded JSON reader before parsing.

The reader:

- rejects declared `Content-Length` values above 64 KiB;
- counts bytes for chunked or undeclared responses;
- cancels the stream when the limit is exceeded;
- rejects missing bodies and invalid UTF-8;
- calls `JSON.parse` only after the complete bounded response is available.

The existing 15-second timeout, redirect rejection, test-mode requirement, endpoint set, validation semantics, evidence writer, and workflow permissions remain unchanged.

## Risks and trade-offs

- The 64 KiB limit is intentionally conservative for the Stripe objects consumed by this proof. A future legitimate provider response larger than the limit will fail closed until the contract is reviewed and deliberately adjusted.
- Stream cancellation is best effort. It limits application buffering but does not prove that an upstream server or network intermediary stopped transmitting immediately.
- The bounded response is still held in memory before JSON parsing, but the retained allocation is capped at 64 KiB per request.
- Five requests remain parallel. This change bounds each response independently and does not alter provider concurrency or timeout behavior.
- The contract test verifies source-level safeguards. GitHub Actions and an explicitly executed protected provider-proof workflow remain authoritative for exact-SHA validation.

## Validation

Repository validation should include:

- `npm test -- tests/security/stripe-provider-proof-contract.test.ts`
- standard lint, typecheck, security, and release gates on the pull-request SHA
- protected Stripe provider proof only when authorized credentials and an exact eligible SHA are supplied

No runtime evidence is created or claimed by this ADR or its source-level tests.

## Rollback

Revert the commits that introduce the bounded reader and contract assertion. The probe will return to unbounded `Response.json()` parsing; no schema, secret, provider configuration, billing state, or production data rollback is required.
