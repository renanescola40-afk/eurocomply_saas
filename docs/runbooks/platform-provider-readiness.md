# Platform provider readiness runbook

## Purpose

Provide a reproducible, redacted check of the configuration contract required for GitHub, Vercel, Supabase/Auth, Stripe and Sentry. This control validates declared variables and protected-environment presence/shape. It does not claim that external provider dashboards, webhooks, OAuth consent screens, database migrations or production traffic are healthy.

## Automatic pull-request gate

The `Platform Provider Readiness / Provider configuration contract` job runs when the environment contract, validator, tests or workflow changes. It:

1. validates that required variable names exist in `.env.example`;
2. runs the platform contract test;
3. publishes `platform-provider-readiness-<sha>` for 30 days;
4. excludes every environment value from output.

## Protected runtime validation

1. Open **Actions → Platform Provider Readiness → Run workflow**.
2. Select the exact branch or SHA to validate.
3. Enable `strict_runtime`.
4. Run against the protected `production` GitHub Environment.
5. Download `protected-platform-provider-readiness-<sha>`.
6. Confirm `status: PASS`, the exact `commit_sha`, and `redaction`.

The production environment must contain the following names in the indicated store.

### GitHub environment variables

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `TRUSTED_ORIGINS`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_AUTH_SITE_URL`
- `SUPABASE_AUTH_REDIRECT_URLS`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

### GitHub environment secrets

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

`SUPABASE_SERVICE_ROLE_KEY`, provider client secrets and private API keys must never be moved to variables, repository files or `NEXT_PUBLIC_*` names.

## Failure handling

### Missing or malformed configuration

- Identify the provider and variable name from the artifact.
- Add or correct the value only in the appropriate protected store.
- Re-run the workflow on the same exact SHA.
- Do not paste values into a PR, issue, log or screenshot.

### Stripe mode mismatch

A `pk_test_` publishable key must be paired with an `sk_test_` secret key. A `pk_live_` key must be paired with an `sk_live_` key. The validator fails closed when both are present but their modes differ.

### Vercel build-rate limit

The repository cannot remediate an account-level Vercel quota. In Vercel:

1. open the connected `eurocomply-saas` project;
2. verify the Git repository and production branch `main`;
3. inspect Usage/Billing and the failed deployment reason;
4. wait for quota reset or change the account plan if commercially approved;
5. redeploy the exact blocked commit;
6. retain the deployment URL and Git commit SHA as evidence.

Do not remove the Vercel check or weaken required checks to work around quota.

## External dashboard proof still required

A PASS artifact is necessary but not sufficient. Complete provider proof requires redacted evidence from:

- GitHub ruleset/branch protection and Actions permissions;
- Vercel project linkage, environment scopes, build SHA and deployment URL;
- Supabase project reference, Auth Site URL, redirects, enabled Google provider and migration state;
- Stripe test/live mode, endpoint URL, subscribed events and webhook delivery;
- Sentry organization/project, environment, release and source-map processing.

## Completion boundary

This workstream may report platform configuration as repository-ready after both jobs pass and external dashboard evidence is retained. It must not use this result to declare the SaaS Enterprise Ready or to close product/compliance controls.
