# Sentry exact-current Production runtime reproof — 2026-08-24

**Status:** `RETAINED_RUNTIME_EVIDENCE`  
**Capture date:** 2026-08-24  
**Purpose:** External Assurance provider factual evidence only. This artifact does not establish account DPA acceptance, organization storage region, retention, transfer sufficiency or qualified legal approval.

## Production authority observed

At capture time, the connected Vercel project reported:

- deployment: `dpl_HjY8HsY874YjSDzUs9m1z9yxqWpC`
- target: `production`
- state: `READY`
- GitHub ref: `main`
- GitHub commit: `7c5f344d3049ddb3e65003e5f7e7eaae670f0538`

No deployment or provider configuration was changed as part of this proof.

## Safe runtime observation

A read-only request was made to the canonical public Trust Center:

```text
GET https://www.risckcomply.com/pt/trust
```

Observed result:

```text
HTTP 200 OK
capture response date: Mon, 24 Aug 2026 21:48:50 GMT
```

The returned application metadata contained:

```text
sentry-environment=production
sentry-release=7c5f344d3049ddb3e65003e5f7e7eaae670f0538
```

The served application assets were bound to Production deployment `dpl_HjY8HsY874YjSDzUs9m1z9yxqWpC`.

## Evidence boundary

This proof establishes only:

```text
SENTRY_CURRENT_PRODUCTION_RUNTIME_BINDING: PROVEN
SENTRY_ENVIRONMENT: production
SENTRY_RELEASE: 7c5f344d3049ddb3e65003e5f7e7eaae670f0538
PRODUCTION_DEPLOYMENT: dpl_HjY8HsY874YjSDzUs9m1z9yxqWpC
```

It does **not** establish:

- Sentry organization plan;
- organization-specific storage region;
- DPA acceptance actor or timestamp;
- retention configuration;
- SCC/transfer sufficiency;
- final controller/processor/subprocessor role;
- qualified legal approval.

Those remain separate account or counsel facts.

## Redaction / minimization

The retained evidence intentionally excludes Sentry public keys, trace identifiers, organization identifiers, request identifiers, cookies, tokens, user data and diagnostic payloads. Only the environment/release binding and deployment subject required for auditability are retained.
