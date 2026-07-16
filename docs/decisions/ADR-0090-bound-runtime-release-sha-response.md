# ADR-0090: Bound the runtime release SHA verifier response

- Status: Accepted
- Date: 2026-07-16
- Scope: Release engineering, SRE, security evidence integrity

## Context

`scripts/release/verify-runtime-release-sha.mjs` calls the protected `/api/ready/release` endpoint to prove that the validated deployment serves the exact expected release and build SHA. The request already used an application timeout and rejected redirects, but a successful response was parsed with `Response.json()` without an application-level byte limit.

`Content-Length` may be absent or inaccurate, including for chunked responses. An unexpectedly large response from the deployment, an intermediary, or a faulty route could therefore be buffered in memory before the release gate rejected it. Because this verifier participates in production Go/No-Go evidence, its remote-input boundary must fail closed and remain resource bounded.

## Decision

Limit the protected readiness response to 64 KiB before UTF-8 decoding or JSON parsing.

The verifier now:

- rejects a declared `Content-Length` above the limit;
- reads the response body incrementally with a stream reader;
- counts raw bytes, including chunked responses;
- cancels the reader when the limit is exceeded;
- decodes UTF-8 in fatal mode;
- parses JSON only after the bounded read completes;
- treats missing, oversized, malformed, or unreadable bodies as request failure;
- preserves the existing timeout, redirect rejection, response sanitization, exact-SHA comparison, and evidence redaction behavior.

## Consequences

### Positive

- The release gate cannot buffer an unbounded remote payload before evaluation.
- Oversized and malformed responses fail closed and keep the release decision No-Go.
- No raw response body, bearer token, remote error text, or untrusted mismatched SHA is persisted.
- The change is local to the verifier and does not change runtime API behavior.

### Risks and trade-offs

- A legitimate readiness response larger than 64 KiB will be rejected. The current contract is small metadata and should remain far below this threshold.
- The implementation buffers at most 64 KiB after enforcing the stream limit; it is not intended as a general-purpose streaming JSON parser.
- This change does not prove the health of a production deployment. It only strengthens the verifier used when authorized runtime validation is actually executed.

## Validation

A Vitest security contract asserts the presence of the byte limit, declared-length check, stream reader, cancellation path, strict UTF-8 decoding, bounded JSON parse, existing timeout and redirect protection, and absence of `Response.json()`.

Runtime evidence is not created or modified by this change. Exact deployment evidence remains valid only when the protected release workflow executes against the intended hostname and SHA.

## Rollback

Revert the commits in the pull request. No database migration, dependency change, environment variable change, API schema change, or runtime data rollback is required.
