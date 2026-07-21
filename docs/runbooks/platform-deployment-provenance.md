# Platform deployment provenance and rollback proof

## Purpose

Prove that the currently published production deployment corresponds to an exact `main` commit and that a distinct last-known-good deployment remains reachable for rollback.

This runbook does not perform a deployment or rollback. It creates redacted evidence only.

## Protected GitHub environment

Create or verify the GitHub environment:

`production-deployment-proof`

Configure these environment variables:

- `PRODUCTION_DEPLOYMENT_URL`: immutable HTTPS deployment URL currently serving production;
- `LAST_KNOWN_GOOD_DEPLOYMENT_URL`: distinct immutable HTTPS deployment selected for rollback.

Configure this environment secret:

- `HEALTHCHECK_TOKEN`: token accepted by protected readiness endpoints, when required.

Do not store deployment tokens, Supabase service-role keys, Stripe secrets or Sentry auth tokens in the variables above.

## Required application metadata

At least one health or readiness response must expose the exact deployment commit using one of:

- response header `x-build-sha`;
- response header `x-commit-sha`;
- response header `x-vercel-git-commit-sha`;
- JSON field `buildSha`, `build_sha`, `commitSha`, `commit_sha`, `releaseSha` or `release_sha`.

The value must be a complete 40-character Git commit SHA. A deployment that is reachable but cannot prove its SHA remains unverified.

## Execution

1. Confirm the intended commit is the current `main` head.
2. Open **Actions → Platform Deployment Provenance → Run workflow**.
3. Enter the full lowercase SHA.
4. Set `strict_runtime` to `true`.
5. Approve the protected environment when prompted.
6. Download `platform-deployment-provenance-<sha>`.
7. Retain the JSON with the release evidence package.

## PASS conditions

- requested SHA is the exact current `main` SHA;
- both URLs are valid HTTPS origins without embedded credentials;
- production and rollback origins are distinct;
- production health or readiness is reachable;
- production reports the requested exact SHA;
- rollback health or readiness is reachable;
- no secret value is written to the artifact.

## Common failures

### Vercel build rate limit

This workflow cannot bypass account build limits. Resolve the limit in Vercel, wait for quota reset, or use an already-created immutable deployment. Never remove the Vercel check or weaken required checks.

### SHA is not exposed

Add release metadata to the existing health or readiness response in the relevant observability workstream. Do not infer the SHA from a mutable production alias.

### Rollback URL equals production URL

Select a previous immutable deployment URL and verify that it is healthy. A mutable alias is not a reliable last-known-good target.

### Protected deployment

If Vercel deployment protection blocks GitHub-hosted runners, configure a scoped machine-access mechanism in the provider panel. Keep it in the protected environment and never commit it.

## Evidence boundary

A PASS proves HTTP reachability and deployment-reported commit provenance for the tested URLs at execution time. It does not prove database correctness, Stripe webhook delivery, OAuth interoperability, Sentry ingestion, rollback execution success, or long-term availability.
