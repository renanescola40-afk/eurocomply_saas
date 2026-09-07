# Require explicit Vercel Production deployment authority

Date: 2026-09-07
Status: Accepted

## Context

The Enterprise 100 closure uses `scripts/release/write-github-vercel-production-deployment-evidence.mjs` to decide whether the exact current `main` SHA has been deployed to Vercel Production.

The verifier had two authority paths:

1. an explicit GitHub Deployment/Deployment Status whose SHA, ref and environment were bound to the current `main` and `Production`; and
2. a generic successful Vercel commit status attached to the exact SHA, followed by a health probe against the canonical Production origin.

The second path was not strong enough to establish Production authority. A Vercel Preview build can attach the generic `Vercel` success status to the same commit SHA. If canonical Production is healthy on an older deployment, combining those two independent facts can falsely produce a PASS for an exact-SHA Production deployment that never happened.

This failure mode was reproduced on `main@ba022ef28007613a2ea51b93b36456b69e617cf8`: an exact-SHA Preview created from `evidence/legal-rules-ba022-preview` produced a green generic Vercel commit status while `www.risckcomply.com` remained on an older Production deployment. The old verifier then credited `production-deployment` through `proofSource=github_commit_status`.

## Decision

Generic commit statuses are no longer Production deployment authority.

`production-deployment` may PASS only when all of the following are true:

- the target is the exact current protected `main` SHA;
- GitHub contains an explicit Deployment for that SHA;
- the Deployment ref is exactly `main`;
- the Deployment task is `deploy`;
- the Deployment environment is exactly `Production` (case-normalized);
- its successful Deployment Status was created by `vercel[bot]`;
- the status environment is also `Production`;
- the immutable Vercel deployment URL is within the expected project host namespace;
- `/api/health` on that immutable deployment returns HTTP 200, `{ status: "ok" }`, and `Cache-Control: no-store`;
- `main` is re-read immediately before PASS and still equals the target SHA.

The verifier never substitutes canonical Production health for failed or protected immutable deployment health. Preview deployments and generic `Vercel` commit statuses remain useful build signals but have zero authority for this control.

## Security and release impact

This closes a provenance-composition vulnerability in the release evidence plane. A healthy old Production deployment can no longer be combined with a successful Preview status to impersonate exact-SHA Production promotion.

The change is fail-closed. Existing legitimate Production evidence that is backed by explicit GitHub Deployment/Deployment Status objects continues to work. Installations that only publish generic Vercel commit statuses will remain OPEN until a canonical Production deployment event is available; that loss of permissiveness is intentional.

No application runtime, customer data, billing state, Supabase schema, Vercel project configuration, or Production deployment is changed by this decision.

## Compatibility

- Preview CI/build status remains unaffected.
- Enterprise closure may temporarily report fewer accepted controls than before because prior commit-status-derived Production PASS evidence is no longer creditable.
- Downstream evidence consumers retain the existing `risck-comply.production-deployment-evidence.v1` schema and core fields.
- `githubCommitStatusBound` remains in evidence integrity output for compatibility but is always false for new evidence.

## Verification

Regression coverage must prove at minimum:

- explicit exact-SHA Production Deployment Status can PASS;
- commit-status-only evidence remains OPEN even when canonical Production health is green;
- exact-SHA Preview deployments remain OPEN;
- canonical Production health cannot substitute for unhealthy/protected immutable deployment health;
- non-Vercel actors, wrong refs, wrong SHAs and non-no-store health fail closed;
- main advancing before PASS invalidates the evidence.

All repository-required checks must be green on the exact PR head before merge.

## Rollback

Before merge, revert this change normally.

After merge, do not restore the generic commit-status fallback without a new reviewed design that independently proves the referenced Vercel deployment is the canonical Production deployment for the exact SHA. Reintroducing the old inference would knowingly reopen the false-positive release authority path.

## Truth boundary

This decision strengthens evidence integrity only. It does not deploy the application, promote Supabase migrations, validate billing Live, provide legal acceptance, provide external pentest assurance, or authorize Production GO.