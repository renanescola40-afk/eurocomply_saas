# Enterprise Runtime Evidence Closeout

## Purpose

Produce one immutable, exact-SHA runtime evidence bundle for the final production and Enterprise GO decision.

This workflow consolidates existing production checks. It does not replace their underlying validation logic, does not convert repository CI into runtime proof, and does not promote a provider assertion that has not been observed in the real runtime.

## Protected environment

Create and protect the GitHub environment:

`enterprise-production-closeout`

Require at least one independent environment approver and protected-branch deployment policy. The workflow verifies environment governance before the protected job is admitted.

The closeout environment historically stores a compact set of aliases. The workflow translates those aliases into the canonical names consumed by the production validators so operators do not need to duplicate secret values.

### Existing closeout aliases

Configure:

- variable `PRODUCTION_URL`;
- secret `READINESS_TOKEN`;
- secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`;
- secrets `TEST_USER_A_EMAIL`, `TEST_USER_A_PASSWORD`, `TEST_USER_B_EMAIL`, `TEST_USER_B_PASSWORD`;
- secret `SENTRY_AUTH_TOKEN` and variables `SENTRY_ORG`, `SENTRY_PROJECT`.

The workflow maps these to `RELEASE_PRODUCTION_URL`, `RELEASE_DEPLOYMENT_URL`, `HEALTHCHECK_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` where required by the existing release scripts.

### Additional production inputs required by Public Production Final

The protected environment also needs the production-scoped inputs already required by the canonical public production release profile:

Secrets:

- `STRIPE_SECRET_KEY`;
- `STRIPE_WEBHOOK_SECRET`;
- `UPSTASH_REDIS_REST_URL`;
- `UPSTASH_REDIS_REST_TOKEN`;
- at least one Sentry runtime DSN source: `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN`.

Variables:

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` when the build requires it;
- `STRIPE_PRICE_STARTER_MONTHLY`;
- `STRIPE_PRICE_GROWTH_MONTHLY`;
- `STRIPE_PRICE_ENTERPRISE_MONTHLY`;
- `RELEASE_ROLLBACK_TARGET` or `RELEASE_ROLLBACK_TARGET_URL`;
- `RELEASE_ROLLBACK_TARGET_SHA`;
- `RELEASE_ROLLBACK_TARGET_VALIDATED=true`;
- optional last-known-good aliases when the release process uses them.

Legacy Stripe price variable names remain wired as compatibility fallbacks. Do not place secret values in GitHub variables merely to satisfy a preflight.

## Exact-SHA contract

A manual dispatch accepts one full 40-character `release_sha`. Before any protected secrets are admitted, the workflow proves that value is the exact current `main` SHA. Inside the protected job it sets both `RELEASE_COMMIT_SHA` and `RELEASE_BUILD_SHA` to that same input.

A new commit on `main` invalidates the previous closeout run for final release credit. Do not reuse an older artifact after a merge.

## Execution sequence

1. Confirm the intended release SHA is the exact current `main` SHA and is deployed to the production hostname.
2. Confirm migration reconciliation and the migration release control plane are complete for the same SHA.
3. Run **Enterprise Runtime Evidence Closeout** manually with the full 40-character SHA.
4. Approve `enterprise-production-closeout` only after confirming the target hostname and provider project identities.
5. The workflow runs **Public Production Final** once. That canonical runner already produces deployment smoke, live Supabase RLS evidence, authenticated observability smoke, rollback dry-run evidence, and `production-final-validation.json`; the closeout does not repeat the live RLS mutation pass.
6. `run-authenticated-production-smoke.mjs` then proves the deployed SHA via the protected `/api/ready/release` endpoint and executes two isolated real browser journeys: login -> dashboard for test user A and test user B.
7. `run-production-observability-validation.mjs` validates and promotes the exact-SHA `observability-smoke-validation.json` into the filename required by the consolidated closeout. If Public Production Final already produced valid evidence, it is reused so the closeout does not emit a duplicate Sentry smoke event. Invalid or stale source evidence is regenerated once and still fails closed if the canonical validator rejects it.
8. Common workflow provenance is stamped into all six runtime documents.
9. `validate-enterprise-runtime-closeout.mjs` verifies the consolidated bundle and the workflow retains the 90-day artifact `enterprise-runtime-closeout-<sha>`.

## Authenticated production smoke safety

The authenticated smoke intentionally exercises the real application rather than only calling Supabase Auth directly. It checks the production login page and authenticated dashboard in two separate browser contexts after verifying the deployed runtime SHA.

The evidence file stores only safe control outcomes such as HTTP status codes, booleans, a hostname, and the expected release SHA. It does not store:

- usernames or passwords;
- cookies;
- access or refresh tokens;
- Authorization headers;
- page body content;
- screenshots;
- raw readiness responses;
- a mismatched observed runtime SHA.

The browser contexts are closed after each run.

## Observability scope

`observability-production-validation.json` is a promoted form of the canonical authenticated runtime smoke evidence. It proves that the deployed application is configured for Sentry, that the protected smoke endpoint emitted through the application instrumentation path, and that the deployed runtime was bound to the expected SHA.

It **does not claim downstream Sentry ingestion merely because `captureException()` was called**. Actual Sentry project reachability/client-key proof and any provider-side event/release/source-map evidence remain separate provider controls. Do not upgrade those controls without real provider evidence.

## Acceptance

The consolidated result is accepted only when all six evidence documents:

- exist and parse as JSON;
- report `status: Complete`;
- report `outcome: passed`;
- reference the exact requested SHA;
- include workflow run ID and URL;
- have distinct content digests.

The six documents are:

- `deployment-smoke-validation.json`;
- `rollback-dry-run-validation.json`;
- `production-final-validation.json`;
- `supabase-live-rls-validation.json`;
- `authenticated-production-smoke.json`;
- `observability-production-validation.json`.

The accepted artifact still does not independently grant Enterprise GO. Legal reviews, external approvals, provider configuration, recovery drills and other owner-controlled blockers remain separate.

## Failure handling

- Never manually edit a failed evidence file to make it pass.
- Fix the underlying runtime, provider configuration or validator defect and rerun against the exact current `main` SHA.
- Missing production credentials or environment approval is `BLOCKED`, not `PASS`.
- A failed authenticated journey is not replaced with a Supabase-only login check.
- A successful local Sentry emission is not relabeled as downstream provider ingestion.

## Issue linkage

After an accepted run, record the workflow URL, artifact name, release SHA and consolidated digest in:

- #198 for Supabase live RLS;
- #778 for public production runtime closure;
- #1032 for the Enterprise GO evidence index.
