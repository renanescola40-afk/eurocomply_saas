# Establish application-owned request correlation

Date: 2026-07-15  
Status: Proposed

## Context

The central logger already accepts and sanitizes `requestId`, the observability smoke endpoint returns one, and audit logging captures request metadata. However, the middleware did not establish an application-owned identifier before forwarding application requests.

Consequently, request correlation could depend on provider-specific headers, remain `req_unavailable`, or use a syntactically valid `x-request-id` supplied by the caller. A caller-controlled identifier is unsuitable as the authoritative correlation key for support, security investigation, and chained audit evidence because unrelated requests can intentionally reuse the same value.

This finding is based on repository control flow. No production investigation failure, spoofing incident, audit failure, outage, external review, or penetration test is claimed.

## Decision

Generate a new request identifier in middleware for every non-static application request.

The identifier:

- is created with `crypto.randomUUID()`;
- uses the existing safe `req_` prefix;
- overwrites any inbound `x-request-id` before an API request is forwarded;
- is returned in the `x-request-id` response header;
- is available to existing route code through `request.headers`;
- is added to legacy and chained audit metadata through the shared audit writer;
- is included in audit persistence failure reports.

Static assets and the Sentry tunnel remain outside this application correlation layer. Redirects receive a response request ID for the current hop; the redirected request receives a new ID.

## Architecture

`src/lib/observability/request-correlation.ts` is edge-safe and owns request ID generation and header application.

`src/middleware.ts` is the trust boundary. It does not preserve a client-provided `x-request-id`. API and legacy API paths receive an overridden request header through `NextResponse.next`. Localized application responses and redirects expose the generated response header.

`src/lib/security/audit-log.ts` reads the trusted header through the existing logger sanitizer and stores it under `metadata.requestContext.requestId` together with the already pseudonymized IP address and bounded user agent.

The logger's existing validation and fallback semantics remain unchanged.

## Security and privacy

The identifier is random and contains no customer, tenant, user, email, IP, token, secret, session, payment, document, or AI-governance data.

Overwriting the inbound header prevents a caller from choosing the authoritative application request ID. Provider correlation headers remain available to infrastructure tooling but are not promoted to the application-owned identifier by middleware.

The change does not weaken authentication, authorization, RLS, rate limiting, origin checks, no-store behavior, audit-chain hashing, Sentry redaction, or secret handling.

## Operational impact

Support and incident responders can return the response `x-request-id` to locate the same identifier in audit metadata for requests that write audit events.

API routes that already call `requestIdFromHeaders` now receive a stable application-owned value without individual route changes.

This change does not automatically add request IDs to every log statement. Existing log calls must still pass a request ID unless they are emitted by code that already extracts it. Expanding implicit logger context would require a separate request-scoped execution design.

## Performance

The request path adds one UUID generation, one request-header clone for forwarded application requests, and one response-header write.

No database query, network round trip, dependency, migration, cache operation, provider call, or customer-data read is added. Runtime latency was not measured in this execution environment.

## Alternatives considered

### Trust inbound `x-request-id`

Rejected because external callers can reuse or choose values and undermine correlation integrity.

### Use only `cf-ray` or `x-vercel-id`

Rejected as the application contract because those values are provider-specific and may be unavailable in local, test, alternate-hosting, or internal execution paths.

### Add request ID extraction independently to every route

Rejected because it duplicates logic and does not establish a trust boundary before route execution.

### Introduce distributed tracing infrastructure now

Deferred. OpenTelemetry or another tracing backend is broader, adds operational cost, and does not remove the need for a safe support-visible request identifier.

## Verification

Focused tests verify:

- generated IDs use the expected UUID format;
- a caller-supplied `x-request-id` is overwritten;
- response headers expose the generated value;
- middleware forwards the generated header rather than reading an inbound value;
- audit metadata and audit failure reports include the request ID.

GitHub Actions remains authoritative for lint, typecheck, unit tests, build, CodeQL, Semgrep, Gitleaks, dependency review, security suites, and release gates on the exact PR head.

No deployment, runtime smoke, support lookup, Sentry event, production audit query, load test, external audit, or penetration test is claimed.

## Risks and trade-offs

- Localized middleware behavior depends on `next-intl` preserving the headers of the correlated `NextRequest` during rewrite handling.
- Redirect chains intentionally receive a new ID per HTTP request rather than one ID for the entire browser journey.
- Responses from static assets and the Sentry tunnel do not receive the application header.
- Audit records created outside an HTTP request continue to use `req_unavailable`.
- Client applications must treat the identifier as diagnostic metadata, not as an authorization or idempotency token.

## Rollback

Revert this pull request.

Middleware will stop overriding and returning `x-request-id`, and audit metadata will return to IP-pseudonym and user-agent context only.

No migration, data repair, secret rotation, provider configuration, deployment setting, or customer-data rollback is required. Existing audit rows containing request IDs remain valid non-sensitive metadata.
