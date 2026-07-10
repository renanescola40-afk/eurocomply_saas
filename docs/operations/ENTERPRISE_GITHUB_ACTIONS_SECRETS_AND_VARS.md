# Enterprise GitHub Actions Secrets and Variables

This checklist defines the GitHub Actions configuration required for the RISCK COMPLY Enterprise Production Gate.

## Status

Implementation hardening is **99%**. Enterprise Go remains **No-Go** until the workflow runs against the real production runtime and `release-go-no-go.json` records `finalDecision: Go`.

## Why the gate can fail before release validation

The `Production release validation` job intentionally starts with a fail-closed environment preflight. If required provider configuration is missing from the GitHub Actions runner, the job stops before running the final release gate.

The preflight records only grouped presence checks. It must not print tokens, secret values, cookies, authorization headers, DSNs or raw private URLs.

## Repository secrets versus environment secrets

GitHub Actions treats **repository secrets** and **environment secrets** differently.

- Repository secrets are available to any eligible workflow job in the repository.
- Environment secrets are available only when the job declares the matching `environment`.

If secrets are stored under the `Production` environment, the production validation job must run with:

```yaml
environment: Production
```

Without that environment binding, those `Production` secrets will appear empty in the runner even though they exist in GitHub Settings.

For the current Enterprise Production Gate, use one consistent approach:

1. Add the required runtime values as repository secrets/variables; or
2. Keep them under the `Production` environment and ensure the workflow job binds to `environment: Production`.

Do not split required production values across unrelated environments such as `staging`, `security-ci` or `supabase-live-rls-validation` unless the job explicitly targets that environment.

## Required GitHub Secrets

Configure these as **Repository secrets** or as **Environment secrets** for the `Production` environment when the job is bound to that environment:

```text
HEALTHCHECK_TOKEN
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

For Sentry source map upload in enterprise release:

```text
SENTRY_AUTH_TOKEN
```

For observability/runtime reporting, configure at least one Sentry DSN source:

```text
NEXT_PUBLIC_SENTRY_DSN
SENTRY_DSN
```

## Required GitHub Variables or Secrets

These values are not raw application secrets. Prefer **Repository variables** or **Environment variables**. Secrets are also accepted when needed by your process.

```text
RELEASE_DEPLOYMENT_URL
RELEASE_PRODUCTION_URL
RELEASE_ROLLBACK_TARGET
LAST_KNOWN_GOOD_DEPLOYMENT_URL
RELEASE_ROLLBACK_TARGET_SHA
LAST_KNOWN_GOOD_COMMIT_SHA
RELEASE_ROLLBACK_TARGET_VALIDATED=true
RELEASE_RUN_OBSERVABILITY_SMOKE=true
SENTRY_ORG
SENTRY_PROJECT
STRIPE_PRICE_STARTER_MONTHLY
STRIPE_PRICE_GROWTH_MONTHLY
STRIPE_PRICE_ENTERPRISE_MONTHLY
```

Legacy Stripe price variable names are accepted as fallbacks:

```text
STRIPE_PRICE_ESSENTIAL_MONTHLY
STRIPE_PRICE_PROFESSIONAL_MONTHLY
STRIPE_PRICE_BUSINESS_MONTHLY
STRIPE_PRICE_BUSINESS_ENTERPRISE_MONTHLY
```

## Enterprise upload scanner

Enterprise release requires upload malware scanning. Configure one of these transports.

### HTTP scanner

```text
MALWARE_SCANNER_PROVIDER=http
MALWARE_SCANNER_URL
MALWARE_SCANNER_ALLOWED_HOSTS
```

or:

```text
MALWARE_SCANNER_PROVIDER=http
MALWARE_SCANNER_ENDPOINT
MALWARE_SCANNER_ALLOWED_HOSTS
```

### ClamAV scanner

```text
MALWARE_SCANNER_PROVIDER=clamav
MALWARE_SCANNER_CLAMAV_HOST
MALWARE_SCANNER_CLAMAV_PORT
```

## Final command

After configuration, rerun the workflow manually:

```text
Actions -> Enterprise Production Gate -> Run workflow -> release_target: enterprise
```

The release is not enterprise-ready until all runtime evidence is `Complete/passed` and `docs/security/evidence/runtime/release-go-no-go.json` records `finalDecision: Go`.
