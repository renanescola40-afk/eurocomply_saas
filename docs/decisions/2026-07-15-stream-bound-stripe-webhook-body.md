# Decision: stream-bound Stripe webhook request bodies

## Status

Proposed. Repository implementation and test evidence only. This record does not claim production deployment, exploitation, incident occurrence, external audit, penetration testing, or runtime provider validation.

## Context

`POST /api/stripe/webhook` limits accepted payloads to 1,000,000 bytes and rejects an oversized declared `Content-Length` before body processing. When the header is absent or unreliable, the route previously called `request.text()` and measured the encoded result afterwards.

That post-read check correctly rejected an oversized payload, but only after the runtime had buffered and decoded the complete attacker-controlled body. A client using chunked transfer or an omitted content length could therefore make application memory consumption exceed the route's intended one-megabyte bound before rejection.

Stripe signature verification requires the exact request payload. The route must therefore preserve the complete bounded payload without JSON parsing or normalization.

## Decision

Read the request body through its `ReadableStream` reader, count bytes as chunks arrive, and cancel the stream immediately when the cumulative size exceeds `MAX_STRIPE_WEBHOOK_BYTES`.

Retain the existing declared `Content-Length` fast rejection. For accepted bodies, concatenate the retained byte chunks and decode once before passing the payload to Stripe's signature verifier.

## Impact

- Undeclared or chunked oversized bodies are rejected while streaming rather than after full buffering.
- Accepted webhook payloads retain the existing string input to Stripe signature verification.
- Existing rate limiting, signature tolerance, audit actions, recovery handling, response codes, and `no-store` behavior remain unchanged.
- No migration, dependency, secret, provider configuration, RBAC, RLS, entitlement, or public API expansion is introduced.

## Risks and trade-offs

- The route retains up to one megabyte of chunks plus one final contiguous byte array during bounded payload assembly.
- Stream read failures retain the existing failure behavior and are not reclassified by this narrow change.
- `TextDecoder` preserves the previous string-oriented signature-verification contract, but production validation remains dependent on GitHub CI and deployment smoke evidence.
- The focused regression test is a source contract; it does not simulate network backpressure or prove edge-proxy enforcement.

## Evidence boundary

The evidence for this decision is limited to the repository diff, existing route tests, the focused security contract, and GitHub checks on the exact pull-request head. No runtime evidence file is created, modified, simulated, or upgraded.

## Rollback

Revert the implementation, test, and this record. The route will return to reading the complete body with `request.text()` before checking the encoded size. No schema rollback, data repair, credential rotation, provider action, or customer-data migration is required.
