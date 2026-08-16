# Protected runtime environment governance

Sensitive production evidence workflows must prove GitHub Environment governance **before** any job is allowed to reference environment secrets.

## Required controls

Every production secret-bearing environment used by the release proof plane must satisfy all of the following:

- administrator bypass is disabled;
- at least one required deployment reviewer is configured;
- deployment is restricted to protected branches only;
- the workflow is dispatched from `main` and bound to the exact current `main` SHA before the governance lookup;
- the governance preflight itself contains no `secrets.*` references.

The canonical validator is `scripts/security/check-github-environment-governance.mjs`.

## Environments

### `Production`

Used by Production Runtime Proof, Production Provider Runtime Proof, Audit Chain Runtime Proof and Step-Up Runtime Proof. It must be hardened before those jobs may load healthcheck, Supabase, Vercel, Stripe, Sentry or signing credentials.

### `production-recovery`

Used only by Recovery Resilience Proof. This environment must be created and hardened explicitly before a recovery exercise is dispatched. Do not rely on workflow execution to create the environment implicitly.

For `full` and `production-rollback` exercises the existing explicit confirmation phrase `EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK` remains mandatory in addition to environment governance.

## Fail-closed behavior

If an environment is missing or does not satisfy governance, the secret-bearing job is skipped because its governance dependency fails. Missing runtime evidence remains blocking; the workflow must not synthesize PASS evidence or fall back to repository-level secrets.

This control does not configure GitHub Environments automatically. Environment creation, reviewers, administrator-bypass policy, branch policy and credential rotation remain provider-administration actions.
