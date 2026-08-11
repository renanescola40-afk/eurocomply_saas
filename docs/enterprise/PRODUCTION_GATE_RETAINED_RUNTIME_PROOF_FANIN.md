# Enterprise Production Gate retained runtime-proof fan-in

## Purpose

The Enterprise Production Gate must decide against evidence produced for the exact release SHA, not against stale repository snapshots.

Several protected runtime proofs execute as independent GitHub Actions workflows because they need dedicated production credentials, disposable fixtures, provider APIs, or a deliberate operator action. Their evidence is retained as immutable GitHub Actions artifacts. A clean checkout of `main` cannot see those artifacts by itself.

The production gate therefore performs a read-only exact-SHA fan-in before `npm run release:production-final`.

## Approved producers

Only these producer workflows can feed the production release workspace:

- `Auth RBAC Tenant Proof`;
- `Supabase Live RLS Validation`;
- `RISCK COMPLY Upload Security CI`;
- `Audit Chain Runtime Proof`;
- `Production Provider Runtime Proof`;
- `Branch Protection Runtime Proof`;
- `Step-Up Runtime Proof`;
- `Stripe Runtime Evidence Promotion`.

The `workflow_run` re-evaluation list must remain exactly equal to the hydrator allowlist. CI enforces that parity so a retained producer cannot become fetchable while remaining unable to wake the Production Gate after its exact-SHA artifact becomes available.

Each producer keeps its own artifact-name, workflow-path, schema, provenance and semantic validator. The fan-in does not replace those validators.

## Re-evaluation model

`Enterprise Production Gate` still runs directly for pull requests, pushes to `main`, and manual dispatches.

It also listens to completion of every approved proof producer on `main`. A successful producer completion causes the gate to re-evaluate the producer's exact `head_sha`.

This is intentionally important for producers that run concurrently with the initial `main` push. The initial Production Gate may execute before a sibling proof artifact exists. When `Supabase Live RLS Validation`, `RISCK COMPLY Upload Security CI`, or any other allowlisted producer later completes successfully for that same SHA, its `workflow_run` event wakes the gate again and removes that timing race.

The gate:

1. checks out the exact target SHA;
2. verifies it is still the current `main` before production validation;
3. removes repository snapshot copies of the retained proof paths from the ephemeral runner;
4. calls the dedicated exact-SHA fetcher for every approved producer;
5. requires the triggering producer's exact workflow run and artifact to validate when a successful producer triggered the re-evaluation;
6. keeps sibling producers optional during hydration so genuinely missing proofs remain missing;
7. runs the existing enterprise environment validation, production-final runner and evidence-bundle validation unchanged;
8. uploads the final evidence bundle plus the fan-in manifest.

A failed producer completion is isolated from the active successful exact-SHA gate concurrency group and does not cancel a productive evaluation.

## Scorecard selection of Production Gate runs

A failed retained-proof producer still creates a GitHub `workflow_run` record for `Enterprise Production Gate`, but all gate jobs are intentionally skipped because only successful producers are allowed to trigger retained-proof hydration. GitHub reports that orchestration-only record with conclusion `skipped`.

That skipped record is **not** a release evaluation. The enterprise GitHub-check collector therefore ignores only this precise no-op shape when choosing the latest Production Gate evidence:

- workflow name is `Enterprise Production Gate`;
- event is `workflow_run`;
- conclusion is `skipped`.

The latest real Production Gate evaluation for the same exact SHA remains authoritative. A newer real `failure`, `cancelled`, `timed_out`, `action_required`, or successful gate evaluation is never ignored. Skipped results from other required workflows are also not globally ignored.

This prevents a failed sibling producer from downgrading repository evidence from 21/21 to 19/21 merely by creating a newer no-op gate record, while preserving fail-closed behavior for every actual gate execution.

## Fail-closed boundary

The fan-in never promotes a status by itself.

A producer fetcher may restore evidence only after it validates:

- canonical repository and workflow provenance;
- exact release SHA;
- approved artifact identity;
- non-expired artifact state;
- producer-specific schema and integrity rules;
- successful proof semantics where that producer requires them.

If GitHub API access, artifact identity, source-run provenance or evidence validation fails, the fan-in fails rather than falling back to a repository placeholder.

If there is simply no successful exact-SHA proof for an optional sibling producer, that proof remains missing. The downstream enterprise runtime evidence writer and Go/No-Go validators remain authoritative and keep the release blocked.

## Manifest

Every production-gate hydration writes:

```text
release-validation/retained-runtime-evidence-hydration.json
```

The manifest records:

- exact target SHA;
- triggering producer workflow/run when applicable;
- approved producer inventory;
- which producer evidence was hydrated;
- which producer evidence remained unavailable;
- cleared repository snapshot paths;
- evidence-integrity boundaries.

It stores no provider secret, credential, raw Authorization header, customer identifier or decrypted provider value.

## Production safety

This fan-in is read-only with respect to production systems. It does not:

- execute Supabase reconciliation SQL;
- mutate tenant data;
- change GitHub rulesets or branch protection;
- configure Vercel or Sentry;
- create Stripe products, prices or events;
- create Step-Up factors;
- approve legal or external-security evidence;
- turn failed or absent proof into `PASS`/`GO`.

The existing protected proof workflows remain responsible for any production-side validation they perform, and workflows that require explicit operator confirmation remain manual.

## Remaining external blockers

This orchestration fixes evidence visibility and timing only. It does not close real external blockers. Examples include an absent Vercel management-plane token in GitHub Actions, provider API authorization problems, insufficient branch-governance settings, a missing successful Step-Up proof, a missing promoted Stripe runtime proof, a real external security review/pentest, or required legal/human acceptance.
