# Dependabot policy hardening

Date: 2026-06-13

## Context

The repository already had a Dependabot configuration, but its policy was not yet covered by the GitHub security workflow regression gate. This made it possible to weaken or remove dependency-update automation without `npm run security:ci` detecting the regression.

## Implemented controls

- Keep weekly npm update checks on Monday morning in `Europe/Lisbon`.
- Keep npm Dependabot PR volume intentionally low with `open-pull-requests-limit: 1`.
- Keep major updates for critical framework/test packages ignored by default so they can be planned manually.
- Keep grouped update PRs for Next.js/React, Sentry, Supabase and test tooling.
- Keep weekly GitHub Actions update checks.
- Use scoped commit-message prefixes:
  - `deps` for npm updates
  - `ci` for GitHub Actions updates
- Validate the Dependabot policy through `scripts/security/check-github-security-workflows.mjs`.

## Why this is warning-friendly

Dependabot does not resolve the current npm audit findings by itself. It creates reviewable update PRs that can be evaluated with Dependency Review, CodeQL, Security CI, the npm audit triage artifact and the floating dependency triage script.

## Next validation

Once GitHub Actions runs again, confirm:

1. `npm run security:github-workflows` passes.
2. Dependabot PRs keep the expected labels and commit prefixes.
3. Dependency PRs are reviewed with the dependency operational checklist before merge.
