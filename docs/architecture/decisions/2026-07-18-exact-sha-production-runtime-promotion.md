# Promote production response controls only from exact-SHA runtime evidence

Date: 2026-07-18
Status: Proposed

## Context

The repository already had a comprehensive manual public-production release workflow capable of checking headers, cache behavior, readiness, deployment smoke, providers and rollback. That workflow is intentionally broad and requires operator-supplied rollback evidence, so it is unsuitable as an automatic proof for every `main` deployment.

Repository inspection or localhost tests cannot prove that the canonical hostname serves the expected release SHA. Likewise, using the production URL itself as a fake rollback target would create misleading evidence.

## Decision

Add a focused protected `Production Runtime Proof` workflow for `https://risckcomply.com`.

The workflow:

- runs only from `main` push or an exact-current-main manual dispatch;
- uses the protected `Production` environment and read-only repository permissions;
- waits for the canonical hostname to expose the exact triggering SHA through `/api/ready/release`;
- validates security headers, health, protected readiness, secret redaction, anonymous protected-route redirects, and `no-store` behavior;
- stores no bearer token, cookie, response body, query string, customer data or raw secret;
- uploads immutable exact-SHA artifacts;
- allows the scorecard to import only a successful, non-expired artifact from the canonical workflow, repository, branch, host and SHA.

The resulting evidence may promote only SEC-05, SEC-06 and REL-02 through REL-06.

## Fail-closed behavior

Missing environment approval, missing health token, deployment lag beyond the retry window, wrong host, stale SHA, malformed runtime metadata, failed header or cache checks, failed health/readiness, artifact expiry, wrong workflow/run, or sensitive evidence leaves all seven controls `NOT_VERIFIED`.

Stale local evidence files are deleted before score generation.

## Evidence boundary

This proof does not validate authenticated tenant workflows, Supabase RLS, provider SLAs, Stripe behavior, Sentry delivery, malware scanning, rollback execution, backup/restore, DAST, penetration testing or external review.

## Rollback

Revert the focused runner, producer workflow, artifact fetcher, scorecard integration, evidence overrides, tests and this decision record together. Remove any imported production-runtime evidence and return the seven controls to their previous evidence paths or `NOT_VERIFIED` state.
