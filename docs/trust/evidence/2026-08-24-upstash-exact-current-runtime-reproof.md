# Upstash exact-current Production runtime reproof — 2026-08-24

**Status:** `RETAINED_RUNTIME_EVIDENCE`  
**Capture date:** 2026-08-24  
**Purpose:** External Assurance provider factual evidence only. This artifact does not establish DPA acceptance, legal role, region, retention, transfer sufficiency or counsel approval.

## Production authority observed

At capture time, the connected Vercel project reported the current Production deployment as:

- deployment: `dpl_HjY8HsY874YjSDzUs9m1z9yxqWpC`
- target: `production`
- state: `READY`
- GitHub ref: `main`
- GitHub commit: `7c5f344d3049ddb3e65003e5f7e7eaae670f0538`

No deployment or provider configuration was changed as part of this proof.

## Safe runtime probe

A read-only request was made to the canonical public endpoint:

```text
GET https://www.risckcomply.com/api/billing/catalog
```

Observed result:

```text
HTTP 200 OK
content-type: application/json
cache-control: no-store, no-cache, must-revalidate, proxy-revalidate, private
x-matched-path: /api/billing/catalog
x-vercel-cache: MISS
capture response date: Mon, 24 Aug 2026 21:48:03 GMT
```

The response contained only the public billing catalogue. No credentials, tokens, customer records, Redis keys, Redis endpoint, Redis token or user-level data were retained.

## Why this proves the Redis-backed execution path

The retained application source for the Production subject establishes the following execution contract:

1. `GET /api/billing/catalog` calls `checkDistributedRateLimit(...)` before producing the catalogue response.
2. The legacy key contains `billing`, which resolves to the `billing-checkout` policy.
3. `billing-checkout` is a high-risk policy configured as fail-closed.
4. In Production, high-risk policies are forced to fail-closed.
5. `incrementUpstash(...)` returns a configured/ok result only after a successful Upstash REST pipeline response with a valid increment result.
6. In Production, Redis not configured, Redis request failure, or Redis unavailability returns a rate-limit result with `allowed=false` for this policy.
7. The catalogue route returns its normal `200` catalogue only when the rate-limit result is allowed.

Therefore the observed canonical `HTTP 200` on the Production deployment is attributable evidence that the request traversed the Redis-backed rate-limit path and received a successful Upstash response for that request.

## Evidence boundary

This proof establishes only:

```text
UPSTASH_CURRENT_PRODUCTION_RUNTIME_BINDING: PROVEN
PRODUCTION_SUBJECT: 7c5f344d3049ddb3e65003e5f7e7eaae670f0538
PRODUCTION_DEPLOYMENT: dpl_HjY8HsY874YjSDzUs9m1z9yxqWpC
PROBE: /api/billing/catalog
PROBE_HTTP_STATUS: 200
```

It does **not** establish:

- Upstash account owner or plan;
- Upstash database/region;
- account-specific DPA acceptance actor or timestamp;
- final retention/deletion interpretation;
- SCC/transfer sufficiency;
- controller/processor/subprocessor legal role;
- qualified legal approval.

Those remain separate provider-account or qualified-counsel facts.

## Redaction / minimization

No secret value was requested or retained. No Redis REST URL/token, billing customer data, user identity, IP address, request identifier, cookies or authentication material are included in this artifact.
