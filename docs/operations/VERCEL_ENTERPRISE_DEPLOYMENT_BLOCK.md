# Vercel Enterprise Deployment Block

## Objective

Establish a controlled, evidence-producing path from GitHub commit to Vercel preview or production deployment without treating a successful build alone as release proof.

## Scope delivered in the repository

The canonical `Deployment Health Proof` workflow now validates:

1. the selected target is HTTPS;
2. `/api/health` returns the expected public health response;
3. production `/api/ready` is called with `HEALTHCHECK_TOKEN`;
4. the Vercel API returns deployment metadata for the target URL;
5. the observed Vercel commit SHA equals the exact expected GitHub commit SHA;
6. evidence is written even when validation fails;
7. production failures block promotion;
8. the workflow executes with Node.js 22, matching `package.json`;
9. the job is bound to the selected GitHub environment;
10. the evidence artifact is retained for 30 days.

## GitHub environments

Create exactly these deployment environments in repository settings and keep them protected. Environment names are case-insensitive in GitHub, but repository documentation uses the canonical names below.

### `preview`

Purpose:

- validate PR deployments;
- use non-production Supabase, Stripe and external-service credentials;
- permit automated deployment assurance without production approval.

Required configuration:

- secret `HEALTHCHECK_TOKEN` when preview readiness is enabled;
- secret `VERCEL_TOKEN` for deployment provenance verification;
- variable `VERCEL_TEAM_ID` when the Vercel project belongs to a team;
- no production credentials;
- deployment branch policy allowing pull-request branches.

Preview may skip readiness or Vercel metadata verification when the corresponding secret is absent, but the evidence records the verification as skipped or not verified. Preview evidence must never be reused as production evidence.

### `Production`

Purpose:

- validate the exact deployment candidate before promotion;
- enforce human approval and production-only secrets;
- fail closed when readiness or provenance cannot be verified.

Required configuration:

- at least one required reviewer;
- administrator bypass disabled;
- deployment branch policy set to **Protected branches only**;
- `main` protected by the repository ruleset;
- secret `HEALTHCHECK_TOKEN` matching the production runtime;
- secret `VERCEL_TOKEN` with the minimum read/write scope required by the protected production deployment workflow;
- `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` scoped to the canonical production project;
- a dedicated Enterprise Step-Up signing secret provided as `STEP_UP_ASSERTION_SIGNING_SECRET` or `STEP_UP_SIGNING_SECRET`;
- the Step-Up signing secret must be distinct from `AUDIT_CHAIN_SIGNING_SECRET`;
- variable `VERCEL_TEAM_ID` when applicable;
- prevent self-review when a second trusted deployment reviewer is available.

### `enterprise-production-closeout`

Purpose:

- gate the secrets-bearing exact-SHA runtime closeout workflow;
- require an explicit deployment approval before live tenant isolation, authenticated smoke and observability validation run with production credentials.

Required configuration:

- environment must be created explicitly before any closeout dispatch;
- at least one required reviewer;
- administrator bypass disabled;
- deployment branch policy set to **Protected branches only**;
- only the minimum runtime-closeout secrets/variables documented by `.github/workflows/enterprise-runtime-evidence-closeout.yml` may be present.

Do not rely on GitHub implicitly creating a missing environment when a workflow first references it. An implicitly created environment has no accepted protection evidence and is not valid for enterprise production closeout.

## Fail-closed environment governance gate

The required `CI / quality` context executes `scripts/security/check-github-environment-governance.mjs` against both `Production` and `enterprise-production-closeout`. The gate uses only the workflow `GITHUB_TOKEN` with read-only Actions permission; it does not load production secrets and cannot mutate repository administration settings.

The gate fails unless each secrets-bearing environment:

- already exists;
- has administrator bypass disabled;
- has at least one required deployment reviewer;
- allows deployment from protected branches only.

This deliberately converts missing GitHub administration into a merge/release blocker instead of silently treating an unprotected environment as production approval.

### Current administrative blocker

The latest repository governance inspection found:

- `Production` exists, but administrator bypass is enabled, no required reviewer rule is configured and no deployment branch policy is configured;
- `enterprise-production-closeout` does not exist.

Repository code cannot safely correct those settings with the ordinary `GITHUB_TOKEN`: environment creation/update requires repository Administration write permission. Until an administrator configures both environments as specified above, the enterprise deployment path remains **No-Go** by design.

## Enterprise Step-Up runtime synchronization

Enterprise readiness intentionally fails closed when the canonical Vercel runtime does not have both a dedicated Step-Up signing key and a supported provider mode. A successful Vercel build alone is not evidence that these server-side runtime settings exist.

The protected `Vercel Production Deploy` workflow therefore owns the synchronization boundary for these two settings:

- GitHub protected secret `STEP_UP_ASSERTION_SIGNING_SECRET` or `STEP_UP_SIGNING_SECRET` is written to the canonical Vercel Production variable `STEP_UP_SIGNING_SECRET` as **sensitive**;
- `STEP_UP_PROVIDER_MODE` is written as `supabase_mfa`, matching the live Step-Up provider proof;
- the exact release SHA is revalidated against the current `main` tip immediately before the Vercel environment mutation;
- the Vercel production environment is pulled again after synchronization and before the prebuilt production build;
- the signing-secret value is never printed, stored in an evidence artifact, or passed as a command-line argument;
- the workflow fails before mutation when the Step-Up secret is missing or when it equals the audit-chain signing secret.

Changing the Vercel project configuration does not make the already-running deployment ready by itself. A new protected production deployment of the exact current `main` SHA is required before `/api/ready` and the production runtime evidence can become authoritative for the new configuration.

## Vercel project separation

At minimum, keep Vercel environment-variable scopes separated:

| Scope | Allowed data |
| --- | --- |
| Development | local or disposable test values only |
| Preview | staging/test Supabase, Stripe test mode, non-production webhooks and observability |
| Production | production Supabase, Stripe live mode, production webhooks and production observability |

A preview deployment must not receive production service-role keys, Stripe live secrets, production webhook secrets or unrestricted internal tokens.

For stronger enterprise isolation, use a separate staging Supabase project and separate Stripe test-mode resources. A separate Vercel project is optional initially, but becomes recommended when customers require hard administrative separation or when preview credentials cannot be safely scoped.

## How to run the proof

From GitHub Actions:

1. Open `Deployment Health Proof`.
2. Select `Run workflow`.
3. Provide the exact HTTPS deployment URL.
4. Select `preview` or `production`.
5. Paste the full expected GitHub commit SHA.
6. Enable register promotion only after reviewing the deployment and evidence scope.

The workflow uploads `deployment-health-validation-<environment>`.

## Evidence semantics

A production result is `Complete` only when:

- health returns the expected response;
- readiness returns `status: ready` using the protected bearer token;
- Vercel metadata is reachable;
- Vercel metadata includes a commit SHA;
- that SHA exactly matches the expected GitHub SHA.

Any missing production token, API failure, readiness failure or SHA mismatch produces `Blocked` evidence and a failing workflow.

## Rollback

Deployment assurance does not perform an automatic rollback. Automatic rollback is intentionally avoided until rollback ownership, data-migration compatibility and incident criteria are accepted.

Before production promotion, record:

- the last known-good deployment URL;
- its matching GitHub commit SHA;
- whether database migrations are backward compatible;
- the rollback owner;
- the incident trigger that authorizes rollback.

Use `docs/operations/ROLLBACK_RUNBOOK.md` and the existing rollback validation scripts for the separate rollback proof.

## Administrative closeout

The block is repository-complete only after the following GitHub/Vercel settings are verified with durable redacted evidence:

- `preview` environment exists and contains no production credentials;
- `Production` exists with administrator bypass disabled, a required reviewer and protected-branches-only deployment policy;
- `enterprise-production-closeout` exists with the same governance protections before runtime-closeout secrets are used;
- Vercel environment variables are scoped correctly;
- GitHub contains only the minimum required deployment-assurance secret and variable values;
- the workflow produces a successful preview artifact;
- the workflow produces a successful production artifact for the exact promoted commit;
- rollback target and owner are documented.
