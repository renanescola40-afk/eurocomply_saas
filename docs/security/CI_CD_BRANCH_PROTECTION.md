# CI/CD and branch protection runbook

This runbook defines the required GitHub, Vercel and Supabase release controls for EuroComply.

For the canonical required-branch-protection checklist, use `docs/security/BRANCH_PROTECTION_REQUIRED_RULES.md`.

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

1. `npm ci`
2. `npm run preflight`
3. `npm run security:ci`
4. `npm run build`
5. Vercel pull/build/deploy with `--prod`

Production release is blocked unless the Full Security Suite is green for the commit being deployed.

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

Required branch protection rules:

- Require pull request before merging.
- Require at least one approving review.
- Dismiss stale approvals when new commits are pushed.
- Require review from Code Owners for security-sensitive paths.
- Require status checks to pass before merge.
- Require branches to be up to date before merging.
- Restrict who can push to matching branches.
- Block force pushes.
- Block branch deletion.
- Require conversation resolution before merge.
- Require signed commits where feasible.

### Required status checks

Configure the following status checks as required:

- `Full Security Suite / Core CI, build and npm audit`
- `Full Security Suite / Actionlint`
- `Full Security Suite / Secret scanning (Gitleaks)`
- `Full Security Suite / Semgrep SAST`
- `Full Security Suite / CodeQL`
- `Full Security Suite / Dependency Review`
- `Full Security Suite / OSSF Scorecard`
- `Full Security Suite / Enterprise merge/deploy gate`
- `CI / quality`
- `EuroComply Security CI / Run security gates, typecheck and tests`
- `Secret Scanning / Gitleaks repository and history scan`
- `Secret Scanning / Production secret readiness gate`

The `Full Security Suite / Enterprise merge/deploy gate` check is the final enterprise blocker. It must remain required because it fails unless lint, typecheck, tests, build, npm audit, application security CI, route quality, Actionlint, Gitleaks, Semgrep, CodeQL, Dependency Review and OSSF Scorecard are all green.

## Branch protection evidence

Required evidence file:

```text
docs/security/evidence/runtime/branch-protection-required-checks.json
```

Required validation command:

```bash
node scripts/security/check-branch-protection-evidence.mjs
```

Do not mark a PR or release as enterprise-ready when this evidence is missing, stale, or inconsistent with GitHub branch protection settings.

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
3. Re-run `npm run security:ci` and the Full Security Suite.
4. Review audit logs for suspicious deploys or data access.
5. Document the incident in the incident response log.
