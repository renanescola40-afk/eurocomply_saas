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

Create exactly these environments in repository settings.

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

### `production`

Purpose:

- validate the exact deployment candidate before promotion;
- enforce human approval and production-only secrets;
- fail closed when readiness or provenance cannot be verified.

Required configuration:

- at least one required reviewer;
- deployment branch policy restricted to `main`;
- secret `HEALTHCHECK_TOKEN` matching the production runtime;
- secret `VERCEL_TOKEN` with the minimum read scope required to retrieve deployment metadata;
- variable `VERCEL_TEAM_ID` when applicable;
- no bypass for ordinary contributors;
- prevent self-review when the GitHub plan supports it.

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

- `preview` environment exists;
- `production` environment exists;
- production has a required reviewer;
- production permits deployment only from `main`;
- Vercel environment variables are scoped correctly;
- GitHub contains only the minimum required deployment-assurance secret and variable values;
- the workflow produces a successful preview artifact;
- the workflow produces a successful production artifact for the exact promoted commit;
- rollback target and owner are documented.
