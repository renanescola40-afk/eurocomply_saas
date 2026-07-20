# Platform providers and revenue runtime megapack

- Status: Proposed
- Date: 2026-07-20
- Scope: Stripe, email, Sentry, distributed rate limiting and provider failure semantics

## Context

The platform scorecard requires runtime proof across independent providers. Repository configuration and mocked tests cannot prove production credentials, webhook verification, idempotency, event ingestion, source-map release binding, email delivery or distributed throttling.

## Decision

Create one protected exact-main workflow and a single redacted evidence contract covering the full provider domain. The workflow runs only through `workflow_dispatch` in the protected `production-platform-proof` environment.

Validation uses synthetic provider-proof operations. It records booleans only and excludes customer data, provider responses, addresses, URLs, secrets and payloads. Invalid Stripe signatures must be rejected, duplicate event delivery must remain successful without duplicate effects, and rate limiting must produce at least one 429 response under a bounded burst.

Provider failures are normalized into stable public categories: authentication, rate limit, provider unavailable, request rejected and unknown. Raw provider messages remain server-side and are not exposed as public API contracts.

## Evidence boundary

Merging the implementation does not promote platform controls. Promotion requires a successful protected run on the exact `main` SHA and acceptance by the strict evidence validator.

## Rollback

Revert the workflow, runner, classifier, validator, tests, runbook, evidence contract and this ADR as one unit.
