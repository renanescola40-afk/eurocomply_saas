# CI/CD and branch protection runbook

This runbook defines the required GitHub, Vercel and Supabase release controls for EuroComply.

## GitHub Secrets and Variables

Configure these values in GitHub Environments, not in workflow YAML files.

### Environment: `security-ci`

Use this environment for security checks that need live service configuration.

Secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `HEALTHCHECK_TOKEN`
- `EVIDENCE_PACK_SIGNING_SECRET`
- `AUDIT_CHAIN_SIGNING_SECRET`
- `STEP_UP_SIGNING_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_AUTH_TOKEN`

Variables:

- `NEXT_PUBLIC_APP_URL`
- `TRUSTED_ORIGINS`
- `STRIPE_PRICE_ESSENTIAL_MONTHLY`
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY`
- `STRIPE_PRICE_BUSINESS_MONTHLY`

### Environment: `production`

Use this environment for production deploys only. Require approval before jobs can access these secrets.

Additional production deploy secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Production deploys must run:

1. `npm run preflight`
2. `npm run security:ci`
3. `npm run build`
4. Vercel pull/build/deploy with `--prod`

## Vercel

Store runtime values in Vercel Project Settings > Environment Variables for Production and Preview as appropriate. Do not paste production values into GitHub workflow YAML.

Required production values:

- Supabase URL and anon key
- Supabase service role key, server-side only
- Stripe secret and webhook secret
- Signing secrets for audit evidence, audit chain and step-up auth
- Trusted origins
- Upstash Redis credentials before public traffic
- Sentry token only when source map upload is enabled

## Supabase

Use Supabase project settings for auth/session controls and database/storage policies.

- Keep service role usage server-side only.
- Keep sensitive buckets private.
- Apply RLS policies for `storage.objects` and application tables.
- Keep `SUPABASE_ACCESS_TOKEN` in GitHub Secrets only for management API checks.

## Branch protection

Protect `main` and any production release branch.

Recommended branch protection rules:

- Require pull request before merging.
- Require at least one approving review.
- Dismiss stale approvals when new commits are pushed.
- Require review from Code Owners for security-sensitive paths.
- Require status checks to pass before merge:
  - `CI / quality`
  - `EuroComply Security CI / Run security gates, typecheck and tests`
  - CodeQL
  - Dependency Review
- Require branches to be up to date before merging.
- Restrict who can push to matching branches.
- Block force pushes.
- Block branch deletion.
- Require conversation resolution before merge.
- Require signed commits where feasible.

## Production environment protection

For GitHub Environment `production`:

- Require reviewer approval before deployment.
- Restrict deployment branches to `main` only.
- Do not allow arbitrary branches to access production secrets.
- Keep deployment history and audit logs enabled.

## Emergency process

If a production secret is exposed:

1. Revoke/rotate the secret at the provider.
2. Update GitHub Environment Secret and Vercel Environment Variable.
3. Re-run `npm run security:ci`.
4. Review audit logs for suspicious deploys or data access.
5. Document the incident in the incident response log.
