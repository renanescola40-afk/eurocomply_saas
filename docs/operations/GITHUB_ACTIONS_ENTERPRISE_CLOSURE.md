# GitHub Actions Enterprise Closure

## Purpose

This is the supported execution path when a local machine or Codespace cannot run the full release suite. GitHub Actions is the controlled runner; protected `Production` environment secrets provide runtime credentials without exposing them to pull requests.

## What runs automatically

### Pull requests to `main`

- deterministic install;
- package-lock alignment;
- lint;
- typecheck;
- unit tests;
- production build;
- npm audit;
- security CI;
- route quality;
- focused production-like Playwright E2E;
- release-script syntax and fail-closed workflow contract.

A pull request can prove repository readiness, but it cannot claim Enterprise Go because protected production secrets are intentionally unavailable.

### Pushes to `main`

After merge, the same workflow runs the protected `Production runtime validation` job. It:

1. validates required environment variables without printing values;
2. runs `npm run release:production-final`;
3. validates the complete evidence bundle against the promoted `github.sha`;
4. uploads a 90-day evidence artifact named with the commit SHA;
5. fails the `Enterprise closure status` check when runtime validation is skipped, blocked or incomplete.

## Required GitHub configuration

Configure these in **Settings → Environments → Production → Environment secrets**. Do not commit values.

Minimum runtime groups:

- production URL and health token;
- Supabase project URL, anon key and service-role key;
- Stripe secret, webhook secret and active price IDs;
- Sentry runtime/project credentials required by the smoke runner;
- Upstash credentials when distributed rate limiting is mandatory;
- rollback URL/SHA and validated marker;
- upload scanner provider configuration.

The exact variable names are defined in `.github/workflows/enterprise-production-gate.yml` and validated by `scripts/release/check-enterprise-release-env.mjs`.

## Required check

Branch protection should require:

- `Enterprise closure status`;
- the repository's normal CI and security required checks.

Do not require the main-only `Production runtime validation` job directly on pull requests. `Enterprise closure status` evaluates the correct required result for each event and prevents a skipped runtime job from appearing as Enterprise Go.

## Evidence acceptance

Enterprise Go requires all files checked by `scripts/release/verify-enterprise-evidence-bundle.mjs` to:

- exist and contain valid JSON;
- contain explicit successful status/outcome fields;
- contain no pending, blocked, failed, expired or No-Go decision;
- be tied to the promoted commit SHA when runtime-specific;
- contain an explicit final Go/approved decision for the release decision record.

The verifier always writes `enterprise-evidence-bundle-verification.json` and exits non-zero on any missing or inconsistent evidence.

## Operational decision

A green PR means the candidate is repository-ready. Only a green main/manual runtime run for the same SHA can support Enterprise Go. External review, scanner and provider-backed controls cannot be replaced by generated placeholders.
