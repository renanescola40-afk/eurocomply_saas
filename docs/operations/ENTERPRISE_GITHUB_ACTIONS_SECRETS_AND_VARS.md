# Enterprise GitHub Actions Secrets and Variables

This checklist defines the GitHub Actions configuration required for the RISCK COMPLY Enterprise Production Gate.

## Status

Implementation hardening is **99.5%**. Enterprise Go remains **No-Go** until the workflow runs against the real production runtime and `release-go-no-go.json` records `finalDecision: Go`.

## Why the gate can fail before release validation

The `Production release validation` job intentionally starts with a fail-closed environment preflight. If required provider configuration is missing from the GitHub Actions runner, the job stops before running the final release gate.

The preflight records only grouped presence checks. It must not print tokens, secret values, cookies, authorization headers, DSNs or raw private URLs.

If values are stored as **Environment secrets** under `Production`, the GitHub Actions job must bind to `environment: Production`; otherwise GitHub will not inject those values into the runner.

## Required GitHub Secrets

Configure these as **Repository secrets** or **Environment secrets** for the production environment:

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

For the Cloudmersive malware scanner adapter, configure these as **secrets only**, not variables:

```text
CLOUDMERSIVE_API_KEY
MALWARE_SCANNER_API_KEY
```

`CLOUDMERSIVE_API_KEY` is the external vendor key. `MALWARE_SCANNER_API_KEY` is the internal bearer token used by RISCK COMPLY when calling `/api/internal/malware/cloudmersive`.

If either value was ever pasted into chat, screenshots, logs or a GitHub variable field, rotate it before using production.

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

Enterprise release requires upload malware scanning. The recommended managed provider path is the Cloudmersive adapter route:

```text
MALWARE_SCANNER_PROVIDER=http
MALWARE_SCANNER_URL=https://<production-domain>/api/internal/malware/cloudmersive
MALWARE_SCANNER_ALLOWED_HOSTS=<production-domain>
```

Example:

```text
MALWARE_SCANNER_PROVIDER=http
MALWARE_SCANNER_URL=https://risckcomply.com/api/internal/malware/cloudmersive
MALWARE_SCANNER_ALLOWED_HOSTS=risckcomply.com
```

The production deployment also needs the same `CLOUDMERSIVE_API_KEY` and `MALWARE_SCANNER_API_KEY` values configured in the runtime host, such as Vercel production environment variables, because the adapter runs inside the deployed application.

### Alternative HTTP scanner

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

### Alternative ClamAV scanner

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
