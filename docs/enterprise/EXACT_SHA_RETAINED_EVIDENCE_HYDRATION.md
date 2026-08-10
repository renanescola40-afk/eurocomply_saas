# Exact-SHA Retained Evidence Hydration

## Purpose

The Enterprise Final Closeout Dashboard must measure evidence already produced by GitHub Actions without copying stale proof into the repository or treating a successful workflow as proof by itself.

Before this control, the push dashboard evaluated only the clean repository checkout. Runtime evidence retained as GitHub Actions artifacts was invisible, so a release could report `0%` runtime evidence even when exact-SHA proofs existed.

## Trust model

The hydrator is intentionally fail-closed.

For a runtime evidence file to be exposed to the dashboard it must:

1. come from a non-expired GitHub Actions artifact whose `workflow_run.head_sha` is the exact target SHA;
2. be valid JSON;
3. map unambiguously to a runtime evidence path declared by `docs/compliance/eu-ai-act-product-coverage-registry.json`;
4. contain an embedded SHA that is exactly the target SHA;
5. not declare `containsSensitiveValues=true` or `evidenceIntegrity.containsSensitiveValues=true`.

The hydrator does **not** require a passing evidence status. A SHA-bound `BLOCKED`, `OPEN` or failed proof may be hydrated so the dashboard can truthfully retain the blocker. Status acceptance remains the dashboard's responsibility.

## Duplicate handling

GitHub Actions can retain the same evidence document in more than one artifact.

- Byte-identical exact-SHA copies are deduplicated.
- Different exact-SHA documents that map to the same expected evidence path are `AMBIGUOUS` and are not hydrated.
- Stale-SHA documents are `STALE` and are not hydrated.
- Sensitive-marked documents are `REJECTED_SENSITIVE` and are not hydrated.
- Missing evidence remains `MISSING`.

No fallback chooses the newest or most favorable result.

## Runtime dashboard behavior

`Enterprise Final Closeout Dashboard` now has read-only `actions: read` permission and can run after key proof producers complete.

It downloads retained artifacts for the exact target SHA into an isolated directory, then runs:

```bash
node scripts/enterprise/hydrate-exact-sha-evidence.mjs \
  artifacts/exact-sha-retained-artifacts \
  artifacts/exact-sha-evidence-root \
  <target-sha>
```

The dashboard consumes only the hydrated overlay through:

```text
ENTERPRISE_EVIDENCE_ROOTS=artifacts/exact-sha-evidence-root
```

Repository evidence remains the first evidence root. The overlay never overwrites repository files.

## SHA lineage rule

Push, workflow-run and manual dashboard executions accept only a target SHA that is either:

- current `main`; or
- an ancestor of current `main` according to the GitHub compare API.

An arbitrary branch SHA cannot be promoted as retained main-line evidence.

## Status and SHA compatibility

The dashboard accepts runtime `PASS` in addition to the previously recognized textual success forms. It also recognizes the exact-SHA fields already used across RISCK COMPLY runtime proofs, including:

- `targetSha`;
- `observedSha`;
- `commitSha`;
- `releaseSha`;
- `deploymentSha`;
- `sourceSha`;
- `productSha`;
- `sha`;
- `provenance.commitSha`;
- `reviewBinding.productSha`.

A runtime evidence document with an accepted status but the wrong or missing required SHA remains rejected.

## Retained manifest

Every hydration run emits:

```text
artifacts/exact-sha-evidence-root/exact-sha-evidence-hydration.json
```

The manifest records counts and SHA-256 digests, but does not contain provider secrets or raw sensitive values.

## Current external blockers remain external

This hydration control does not close external prerequisites discovered on the current release line, including:

- GitHub branch protection requiring at least one approving review;
- Vercel CI credentials/provider identifiers in the protected production environment;
- Sentry public DSN/runtime configuration;
- the current pricing-ladder Stripe Price IDs where not yet configured;
- isolated restore database credentials for the recovery drill;
- a genuine distinct rollback/last-known-good target;
- qualified legal or independent human approvals.

Those controls must remain open until their real evidence exists.

## Production safety boundary

This control is read-only with respect to production systems. It does not:

- deploy to Vercel;
- alter Vercel environment variables;
- create Stripe products or prices;
- execute Supabase SQL or migrations;
- run a production restore;
- mutate customer data;
- change GitHub branch protection;
- manufacture a human or legal approval;
- convert missing proof into PASS.
