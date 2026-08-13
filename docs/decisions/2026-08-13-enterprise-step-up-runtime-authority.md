# ADR: Enterprise Step-Up production configuration authority

- Date: 2026-08-13
- Status: Proposed
- Decision owners: repository owner and production release owner

## Context

Enterprise Step-Up readiness depends on two server-side runtime settings in the canonical Vercel Production project: a dedicated signing secret and the supported provider mode. A production deployment can be otherwise healthy while `/api/ready` remains fail-closed when those settings are absent or inconsistent.

Manual configuration directly in Vercel creates drift from the protected GitHub release authority, weakens repeatability, and makes exact-SHA deployment evidence harder to reproduce. Conversely, allowing an ordinary pull-request workflow to mutate Vercel or GitHub Environment administration would give untrusted or review-stage code production authority.

The repository also requires protected GitHub deployment environments. Their live administrative state is mutable independently of a PR, so it must not determine whether ordinary code-quality checks can complete. It must, however, be verified before a secrets-bearing production job starts.

## Decision

1. The protected GitHub `Production` environment is the authoritative source for the Enterprise Step-Up signing secret used by production deployment automation. The preferred secret name is `STEP_UP_ASSERTION_SIGNING_SECRET`; `STEP_UP_SIGNING_SECRET` remains a compatibility fallback.
2. `STEP_UP_PROVIDER_MODE` is release-controlled and fixed to `supabase_mfa` by the production deployment workflow while that provider remains the supported production implementation.
3. `Vercel Production Deploy` synchronizes the signing secret to Vercel as sensitive configuration and the provider mode as non-sensitive configuration immediately before the production build.
4. The workflow rejects a missing Step-Up secret and rejects reuse of `AUDIT_CHAIN_SIGNING_SECRET` as the Step-Up key.
5. The exact current `main` SHA is verified before environment mutation and again before production deployment.
6. GitHub Environment governance is checked in a read-only preflight job before any job bound to a secrets-bearing environment can start. PR CI validates code and contracts but does not depend on mutable live environment state.
7. `enterprise-production-closeout` uses the same preflight pattern before runtime-closeout credentials can load.
8. No workflow may print, persist in artifacts, or pass the Step-Up signing value as a command-line argument.

## Configuration ownership

- Repository owner: approves changes to this authority model and GitHub Environment governance.
- Production release owner: maintains the protected `Production` environment values, rotates the dedicated signing secret, and dispatches exact-SHA production releases.
- Vercel project configuration: treated as a deployment target, not the source of truth for these Step-Up settings.
- Application code: consumes the synchronized values but does not have authority to rotate or rewrite them at runtime.

## Rotation procedure

1. Generate a new dedicated Step-Up signing secret using the approved secret-management process.
2. Update only the protected GitHub `Production` environment secret (`STEP_UP_ASSERTION_SIGNING_SECRET` preferred).
3. Confirm it is distinct from `AUDIT_CHAIN_SIGNING_SECRET`.
4. Dispatch `Vercel Production Deploy` for the exact current `main` SHA.
5. The workflow must pass environment-governance preflight, synchronize both Step-Up settings, refresh the Vercel environment, build, and deploy the exact SHA.
6. Validate `/api/ready` and the production runtime proof before treating the rotation as complete.
7. Retire the old secret only after the new deployment and evidence are successful.

Secret values must not be copied into issues, pull requests, logs, evidence JSON, or documentation.

## Partial mutation and failure recovery

The two Vercel environment writes are sequential. A provider outage or CLI failure can therefore leave project configuration partially updated even though no new production deployment has occurred.

Fail-closed behavior:

- any failed synchronization step aborts before the production build/deploy;
- the currently running Vercel deployment remains unchanged because configuration mutation alone does not rebuild the existing deployment;
- the failed run is not production evidence and must not be represented as successful synchronization.

Recovery:

1. Do not deploy from a partially mutated run.
2. Correct the provider/credential/quota failure without weakening validation.
3. Re-run `Vercel Production Deploy` for the exact current `main` SHA; both values are written again with `--force`, making the synchronization idempotent at the intended values.
4. Require the post-sync Vercel pull, production build, exact-main revalidation, deployment, readiness, and runtime evidence to pass.
5. If the authoritative GitHub secret itself is suspected compromised, rotate it before rerunning rather than restoring an unknown Vercel value.

## Rollback

For a code or deployment regression, use the existing production rollback procedure and last-known-good deployment evidence. A rollback deployment does not make a compromised or intentionally rotated signing key valid again.

For a configuration-authority regression introduced by this decision:

1. stop new production dispatches;
2. revert the workflow/contract/ADR changes through the normal reviewed PR path;
3. restore an approved dedicated Step-Up secret in the protected GitHub environment from the organization secret-management source;
4. perform a protected exact-SHA deployment and readiness validation;
5. preserve failed-run metadata without preserving secret values.

Direct ad-hoc Vercel edits are emergency-only and must be reconciled back to the protected GitHub authority before the next normal release.

## Security rationale

This model separates code review authority from production configuration authority. Pull requests can prove lint, type safety, tests, build, and workflow contracts without receiving production access. Production configuration changes happen only inside explicitly dispatched, exact-SHA workflows after live environment governance is verified.

Dedicated key separation prevents one signing key from becoming a shared failure domain for audit-chain integrity and Step-Up assertions. Read-only governance preflights prevent an unprotected or implicitly created GitHub Environment from silently exposing production secrets to a job.

## Rejected alternatives

- **Manual Vercel configuration as the primary source of truth:** creates unreviewed drift and non-repeatable deployments.
- **Synchronize from pull-request CI:** gives review-stage code production configuration authority.
- **Make PR mergeability depend on live GitHub Environment settings:** conflates code correctness with mutable external administration and can prevent the rest of CI from running.
- **Reuse the audit-chain signing secret:** creates unnecessary key coupling and expands compromise impact.
- **Continue after one failed Vercel mutation:** permits ambiguous production configuration and weakens evidence integrity.
- **Automatic rollback of secret values from logs/artifacts:** would require retaining sensitive material in unsafe evidence channels.

## Consequences

- Production deployment remains blocked until `Production` is correctly governed and contains a dedicated Step-Up secret.
- Enterprise runtime closeout remains blocked until `enterprise-production-closeout` is correctly governed.
- Ordinary PRs can complete required code-quality checks even while those administrative blockers exist.
- Rotations become repeatable through protected deployment automation.
- A partial provider-side mutation requires a rerun before deployment, but does not change the currently running production deployment by itself.

## Validation

Required validation includes:

- TypeScript compatibility for the environment-governance module and tests;
- unit tests for administrator bypass, required reviewers, branch policy, missing environment, and API request secrecy;
- workflow contract tests proving governance preflight occurs before secrets-bearing jobs;
- workflow contract tests proving exact-SHA revalidation and Step-Up key separation;
- Actionlint and normal repository required CI on the exact PR head;
- protected production deployment and runtime evidence after administrative environment configuration is complete.

Repository CI does not by itself prove that the live GitHub environments or Vercel production runtime are correctly configured.
