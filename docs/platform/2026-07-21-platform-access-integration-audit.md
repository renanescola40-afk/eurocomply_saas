# Platform Access and Integration Audit

Date: 2026-07-21
Repository: `renanescola40-afk/eurocomply_saas`
Scope: GitHub access, CI/CD enablement, provider connectivity and environment configuration only.

## Executive status

Platform access is partially validated. The connected GitHub identity can read the repository and has administrative, maintain, push, pull and triage permissions. Creating this branch and commit provides direct write evidence.

The repository is not declared platform-unblocked yet because branch-protection evidence is expired and external provider panel configuration remains unverified.

## GitHub access

- Authenticated identity: `renanescola40-afk`.
- Repository visibility: public.
- Default branch: `main`.
- Connector permissions reported: admin, maintain, push, pull and triage.
- Branch creation: validated with `agent/platform-access-integration-audit`.
- Commit publication: validated by this document.
- Main was read before this change.

## Open pull requests and overlap boundary

Two open enterprise pull requests were identified:

- PR #1268, branch `agent/enterprise-runtime-closeout-megapack`.
- PR #1270, branch `agent/enterprise-integrations-platform-megapack`.

This audit does not modify any file changed by either pull request. PR #1270 was created from an older main base SHA than the current main and should be refreshed or otherwise revalidated against the latest main before merge.

## Checks and GitHub Actions

At the inspected PR head SHAs:

- `CI / quality`: passing.
- `Scan repository for accidental secret exposure`: passing.
- `Enterprise merge/deploy gate`: passing.
- `Vercel`: failing because the account/project build rate limit was reached.

The repository CI uses Node 22 and npm 10, aligned with `package.json` (`node >=22 <23`, `npm >=10 <11`). The main CI workflow runs deterministic install, lockfile alignment, required-check drift validation, lint, typecheck, unit tests, optional E2E, build, npm audit and security gates.

## Branch protection evidence blocker

The committed branch-protection evidence remains in `Exception` state. Its temporary exception expired on 2026-07-20 at 23:59:59 +01:00. Repository-side workflow-name validation does not prove the live GitHub ruleset or branch-protection UI configuration.

Required owner action:

1. Open GitHub repository settings.
2. Open `Settings > Rules > Rulesets` or `Settings > Branches`.
3. Inspect the rule targeting `main`.
4. Confirm pull request requirement, one approval, CODEOWNERS review, stale-review dismissal, conversation resolution, up-to-date branch requirement, required status checks, force-push blocking, deletion blocking and restricted direct pushes.
5. Capture a redacted durable screenshot or export the configuration through an administrator-capable GitHub API workflow.
6. Run `.github/workflows/p0-branch-protection-evidence.yml`.
7. Replace the expired exception only after the generated evidence matches the live configuration.

Do not remove required checks or weaken branch protection to make a PR mergeable.

## Environment-variable inventory

The repository documents the following provider groups without committing values:

- Supabase: public URL and anon key, server-side service role and access token, auth site URL and redirect allowlist.
- Google OAuth: client ID and server-side client secret.
- Stripe: publishable key, server secret, webhook signing secret and price IDs.
- Sentry: public DSN, server DSN, organization, project and auth token.
- Vercel/GitHub CI: Vercel token, organization ID and project ID.
- Application/security: app URLs, trusted origins, release target, healthcheck token, cron secrets, signing secrets and rate-limit provider configuration.

Presence in `.env.example` is documentation only and is not evidence that values exist in Vercel, GitHub environments, Supabase, Stripe or Sentry.

## External-provider status

### Vercel

- GitHub status integration is present because Vercel publishes a check on PR commits.
- Current PR deployments are blocked by the Vercel build rate limit.
- Project identity, environment mappings, domains, deployment protection, production SHA and rollback target are not yet verified from the Vercel dashboard/API.

Owner action: resolve or wait for the build allowance reset, then confirm that the Vercel project is linked to `renanescola40-afk/eurocomply_saas`, production branch is `main`, Node is 22, framework is Next.js, root directory is correct and production/preview/development variables are intentionally scoped.

### Supabase

- Repository-side variable and callback expectations are documented.
- Correct project identity, provider enablement, redirect URLs, migration state and live connectivity are not yet verified from the Supabase dashboard/API.

Owner action: confirm the project reference matches `NEXT_PUBLIC_SUPABASE_URL`, Google provider is enabled, Site URL is the production URL, exact local/preview/production callback URLs are allowed and no service-role key is exposed to client-side variables.

### Stripe

- Repository-side publishable, server, webhook and price variable expectations are documented.
- Test/live mode consistency, endpoint status and webhook signing configuration are not yet verified from Stripe.

Owner action: confirm environment mode, endpoint `/api/stripe/webhook`, enabled events and corresponding signing secret in the matching Vercel environment.

### Sentry

- Repository-side DSN, organization, project and auth-token expectations are documented.
- Project identity, release environment and source-map upload status are not yet verified from Sentry/Vercel build evidence.

Owner action: confirm DSN/project mapping, production environment name, release metadata and that `SENTRY_AUTH_TOKEN` is server/build-only.

## Current conclusion

- GitHub read access: validated.
- GitHub write access: validated.
- Branch creation: validated.
- Commit publication: validated.
- PR creation: pending this audit branch publication step.
- Internal PR CI: passing at inspected heads.
- Vercel PR checks: externally rate-limited.
- Live branch protection: blocked pending durable administrator evidence.
- Supabase, OAuth, Stripe and Sentry: configuration inventory available; live provider verification pending.

This document does not declare the SaaS Enterprise Ready. It records platform access and integration status only.
