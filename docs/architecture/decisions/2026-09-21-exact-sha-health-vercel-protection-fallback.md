# 2026-09-21 — Exact-SHA production health under Vercel deployment protection

## Context

RISCK COMPLY binds Production authority to an explicit GitHub Deployment created by the Vercel integration for the exact current `main` SHA. The terminal Enterprise closure then probes `/api/health` on the immutable Vercel deployment URL.

The immutable deployment URL may be protected by Vercel authentication even while the canonical Production domain is public and healthy. In that case the exact-SHA deployment authority is already proven, but the immutable health probe returns the Vercel protection redirect and the closure incorrectly reports `production_deployment_health_unproven`.

## Decision

Keep the exact-SHA GitHub Deployment requirement unchanged.

When, and only when:

1. the exact current `main` SHA has an explicit successful Vercel Production deployment status;
2. the immutable deployment health probe is blocked specifically by Vercel protection; and
3. no authorized automation bypass secret is available;

the proof may use `https://www.risckcomply.com/api/health` as the health target.

The canonical fallback must still return HTTP 200, body `status=ok`, and `Cache-Control: no-store`.

## Fail-closed boundaries

The canonical domain is never accepted as deployment authority by itself.

No fallback is allowed when:
- no exact-SHA Production deployment exists;
- the deployment is Preview;
- the immutable deployment is unhealthy (for example HTTP 5xx);
- the immutable response is an arbitrary redirect;
- current `main` no longer equals the target SHA.

## Consequences

This separates release identity from health reachability without weakening either:
- release identity remains exact-SHA and Vercel/GitHub-bound;
- health may use the canonical Production route only for the narrow Vercel-protection case;
- actual unhealthy immutable deployments remain blockers.

Rollback is a direct revert of the proof-script and test changes.
