# ADR-0075: Stream-bound the public evidence-pack verifier

- Status: Proposed
- Date: 2026-07-16
- Priority: P1 security and availability

## Context

`POST /api/audit/evidence-pack/verify` accepts an exported evidence pack and enforces a one-megabyte policy. It rejected oversized declared `Content-Length` values, but then used `Request.text()` and measured the body only after the entire request had been buffered.

A chunked request, a request without `Content-Length`, or a misleading length could therefore consume memory beyond the intended limit before rejection. This finding is based on repository source only; no production exploitation, outage, external audit finding, or penetration test is claimed.

## Decision

Read the request body through its stream reader, count raw bytes before decoding, cancel the reader immediately after the one-megabyte boundary is exceeded, and parse JSON only after bounded reading completes. Keep the existing early `Content-Length` rejection.

Invalid UTF-8, stream failures, missing bodies, oversized bodies, and malformed exports continue to fail closed through the verifier's existing invalid-request response.

## Consequences

The endpoint no longer needs to fully buffer an unbounded chunked body before enforcing its limit. The public API shape, integrity algorithm, rate limiting, no-store behavior, and verification semantics remain unchanged.

## Risks and trade-offs

Stream cancellation is best-effort after the runtime has delivered a chunk, so upstream connection and platform request limits remain part of the availability boundary. The implementation retains at most the accepted one-megabyte body in memory before JSON parsing, and invalid UTF-8 now fails closed instead of reaching the JSON parser. Legitimate evidence exports above the existing threshold remain rejected; changing that threshold requires evidence about real export sizes and memory impact.

## Validation

Focused regression coverage requires stream-reader use, byte counting, cancellation on overflow, preservation of the declared-length fast rejection, and absence of `Request.text()` in this route. GitHub Actions remains authoritative for lint, typecheck, tests, build, and security gates on the exact PR head.

## Rollback

Revert this ADR and the associated code and test changes. The verifier will again buffer the complete body before applying the post-read size check. No migration, dependency rollback, secret rotation, provider action, or data repair is required.
