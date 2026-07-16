# ADR-0084: Bound Supabase RLS Management API responses

- Status: Accepted
- Date: 2026-07-16
- Decision owners: Engineering / Security / SRE

## Context

`scripts/security/check-rls.mjs` is a release and security gate that queries the Supabase Management API for table and policy metadata. Before this decision, its provider calls had no application-level timeout, followed redirects, and used `Response.text()` / `Response.json()` without bounding response bytes.

A stalled provider call could therefore hold the gate until an external runner timeout. A malformed, proxied, or unexpectedly large response could also be buffered before rejection. Because this script evaluates tenant-isolation controls, its own provider boundary should fail predictably and conservatively.

## Decision

The RLS metadata probe will:

- apply a 15-second timeout to each Management API request;
- reject redirects;
- reject a declared response larger than 256 KiB;
- stream and count undeclared or chunked response bodies;
- cancel the stream immediately after the byte limit is exceeded;
- decode UTF-8 strictly and parse JSON only after bounded reading;
- apply the same bound to successful and error responses.

The existing evidence semantics remain unchanged. When previously captured runtime evidence is truthfully marked `Complete` and `passed`, Management API availability remains advisory as already designed. This change creates no runtime evidence and does not alter that decision.

## Motivation

This is a low-risk P1 reliability and security hardening change. It prevents a security gate from becoming an unbounded provider client while preserving the gate's existing RLS evaluation logic, environment requirements, and failure policy.

## Impact

Positive effects:

- deterministic provider-call deadlines;
- bounded memory use for Management API responses;
- redirect rejection prevents silently following an unexpected provider location;
- malformed UTF-8 and invalid JSON fail closed.

No database schema, RLS policy, application route, secret, dependency, or production runtime behavior is changed.

## Risks and trade-offs

- A legitimate Management API payload larger than 256 KiB will be rejected. The current table and policy metadata expected by this repository should remain well below that limit; the limit can be raised through a reviewed change if measured evidence justifies it.
- A slow but eventually successful Management API response taking more than 15 seconds will fail this probe. Existing completed/passed evidence handling remains available for provider unavailability, but no new evidence is inferred or fabricated.
- The contract test validates the boundary implementation statically; live provider behavior is still validated only when the required protected credentials are supplied by the existing workflow.

## Tests and evidence

Added `tests/security/supabase-rls-management-api-boundary.test.ts`, which verifies that the probe:

- configures the timeout and redirect rejection;
- checks `Content-Length` and streams the response;
- cancels oversized streams;
- uses strict UTF-8 decoding;
- does not regress to `response.text()` or `response.json()`.

GitHub Actions results for the exact PR commit are the authoritative CI evidence. This ADR is a design record, not evidence of a live Supabase audit or pentest.

## Rollback

Revert the commits in this pull request. That restores the previous provider-call behavior without requiring a migration, secret rotation, data repair, or deployment coordination.
