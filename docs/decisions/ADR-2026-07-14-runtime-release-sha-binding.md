# Decision: Bind release evidence to the deployed runtime SHA

- **Status:** Proposed
- **Date:** 2026-07-14
- **Owners:** Platform Engineering, Security, Release Operations
- **Related issue/PR:** #1037
- **Priority:** P0

## Context

The production release workflow records the commit and build SHA supplied by GitHub Actions. The existing deployment smoke validates pages, security headers, protected readiness, providers, no-store behavior, and rollback availability, but it does not independently prove that the hostname under test is serving that exact commit.

A stale or different deployment could therefore be healthy while release evidence incorrectly implies that the requested SHA was validated.

Repository checks and workflow metadata are not sufficient proof of deployed runtime identity.

## Evidence

- `.github/workflows/public-production-final.yml` sets `RELEASE_COMMIT_SHA` and `RELEASE_BUILD_SHA` to the workflow SHA.
- `scripts/release/run-deployment-smoke.mjs` previously verified only that commit/build metadata was present.
- `/api/health` intentionally remains public and minimal.
- `/api/ready` is protected, rate-limited, no-store, and already serves operational readiness details.

## Candidate options

### Option A — Expose the SHA from public health

- Benefits: simple smoke lookup.
- Risks: expands the public fingerprinting surface and weakens the minimal-health contract.
- Reversibility: easy.

### Option B — Add a protected release-metadata readiness endpoint

- Benefits: preserves minimal public health, reuses the protected operational boundary, supports exact runtime binding, and avoids exposing secrets.
- Risks: adds one protected endpoint and another release gate dependency.
- Reversibility: easy.

### Option C — Trust only GitHub/Vercel deployment statuses

- Benefits: no application change.
- Risks: does not prove the tested hostname is serving the expected SHA and cannot detect stale aliases.
- Reversibility: not applicable.

## Decision framework

Option B provides the strongest release-integrity improvement with low application risk. It preserves the public health contract, keeps release metadata behind the existing health token and distributed limiter, and makes runtime identity independently testable.

## Decision

Add `/api/ready/release` as a protected, no-store endpoint that returns only:

- whether runtime release metadata is available;
- the normalized full commit SHA;
- a coarse provenance category (`vercel`, `build-env`, or `unavailable`).

Add a final release verifier that requires:

- valid full expected commit and build SHAs;
- exact equality between expected commit and build SHA;
- a successful protected metadata response;
- no-store response semantics;
- a valid observed runtime SHA;
- exact equality between observed and expected SHA.

When validation fails, the verifier must fail the command and downgrade generated final evidence to `Open` / `failed` rather than allowing a misleading `Complete` result to remain.

## Scope

### Included

- protected runtime metadata endpoint;
- exact SHA comparison;
- sanitized evidence artifact;
- public and enterprise final release profiles;
- regression tests.

### Excluded

- automatic deployment or rollback;
- provider-console access;
- changes to public `/api/health`;
- claims of current production health;
- manually completing runtime evidence.

## Consequences

### Positive

- prevents stale deployment aliases from satisfying release evidence;
- binds runtime validation to one exact commit;
- makes evidence inconsistencies fail closed;
- preserves a minimal public health response.

### Negative or trade-offs

- deployments must expose a trustworthy full commit SHA through supported runtime/build metadata;
- release validation will fail when platform metadata is absent or malformed;
- another protected request is added to the final gate.

### Residual risks

- environment metadata can be misconfigured by an operator with deployment access;
- this control proves runtime identity, not complete application correctness;
- fresh production, provider, tenant-isolation, recovery, and external-security evidence remain separate requirements.

## Compatibility and migration

The new endpoint is additive. Existing health and readiness response contracts remain unchanged. Public and enterprise final release commands gain a stricter post-validation step.

Deployments outside Vercel must provide `RELEASE_BUILD_SHA` or `NEXT_PUBLIC_BUILD_SHA` as a full commit SHA.

## Validation and measurement

- unit tests for valid, malformed, missing, matching, and mismatching SHAs;
- route tests for authorization, no-store, rate-limit ordering, and unavailable metadata;
- source contract tests for both release profiles and evidence downgrade behavior;
- required CI and security checks on the exact PR head;
- real runtime validation only after deployment.

> Measurement unavailable in the current execution environment.

## Operational impact

Release operators must ensure the deployment runtime contains the expected commit metadata. A mismatch indicates a stale alias, wrong deployment target, or incorrect workflow SHA and must remain No-Go.

The verifier stores only sanitized SHA values, hostname, coarse provenance, status, and check results. It never stores the bearer token or raw response body.

## Rollback

1. Stop final release execution.
2. Revert the PR that introduced the endpoint and verifier.
3. Remove the runtime SHA evidence path from workflow artifacts.
4. Restore the previous release wrapper.
5. Keep the release No-Go until an alternative exact deployment-binding mechanism is reviewed.

## Evidence limitations

This decision and its tests are repository evidence only. They do not prove that the current production hostname serves the expected SHA, that providers are healthy, or that the release is Enterprise GO.

## Follow-up review

- **Review trigger:** first successful real production validation and any deployment-platform migration.
- **Owner:** Platform Engineering and Security.
- **Superseding condition:** a stronger provider-native signed deployment attestation bound to the exact production hostname and release SHA.
