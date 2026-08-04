# P0 Branch Protection Runtime Promotion Runbook

## Purpose

Generate and consume durable, redacted and exact-SHA evidence for:

- Branch protection applied on `main`;
- Required status checks configured.

This runbook validates existing GitHub configuration. It does not create, weaken or modify branch protection or repository rulesets.

## Preconditions

- The assessed commit is the current 40-character `main` SHA.
- `Branch Protection Runtime Proof` exists on `main` with its stable workflow name.
- The `Production` GitHub environment permits the protected job to run.
- `BRANCH_PROTECTION_READ_TOKEN` is configured when the default GitHub Actions token cannot read classic branch protection or repository rulesets.
- Required checks in `scripts/enterprise/build-branch-protection-runtime-evidence.mjs` match the repository policy.

Never print or attach the read token. The evidence retains only the source mode, bounded control projection, numeric ruleset IDs when required and workflow run provenance.

## Normal execution

A push to `main` starts `Branch Protection Runtime Proof` automatically.

The producer:

1. verifies the requested SHA and exact checkout;
2. reads the current `main` head;
3. reads classic branch protection and, when necessary, active repository rulesets;
4. rejects rulesets that do not target `main` or contain bypass actors;
5. checks reviews, CODEOWNERS, stale-review dismissal, conversation resolution, strict status checks, force-push protection, deletion protection and direct-push restriction;
6. uploads `branch-protection-runtime-proof-<sha>`.

After successful producer completion, `P0 Runtime Evidence` is triggered through `workflow_run`. It retrieves both the branch-protection proof and any available scanner proof for the exact same SHA, validates them and uploads `p0-runtime-evidence-register-<sha>`.

## Manual retry

Use `workflow_dispatch` only with the exact current `main` SHA. A stale SHA fails with `exact_main_sha_mismatch` and must not be retried as if it were valid.

Do not edit the versioned P0 policy table or the legacy branch-protection JSON to simulate completion.

## Expected successful evidence

The branch artifact must report:

- `status: Complete`;
- `outcome: passed`;
- matching `targetSha`, `checkedOutSha` and `currentMainSha`;
- stable workflow and numeric run ID provenance;
- zero missing required checks;
- zero missing protection flags;
- no ruleset bypass actor;
- no tokens or raw API payloads stored.

The generated P0 artifact should move both branch-protection controls to `Complete`. Other P0 controls remain unchanged.

## Failure handling

### Missing or insufficient read token

Symptoms include `github_api_403`, `github_api_404` or platform-controls-unavailable evidence.

Action:

- confirm the secret exists in the `Production` environment or repository Actions secrets;
- confirm it has read-only access to repository administration/rulesets metadata;
- rerun against the current `main` SHA.

Do not broaden permissions beyond the minimum read scope and do not paste the token into logs or evidence.

### Missing required checks

Review `sourceDetails.missingRequiredChecks`. Reconcile the documented policy with the actual check contexts. Do not add aliases merely to hide a missing enforcement rule.

### Missing protection flags

Review `sourceDetails.missingProtectionFlags` and the redacted branch-protection projection. Configure the missing protection in GitHub before rerunning. This workflow does not change repository settings.

### Ruleset bypass actor present

Remove or formally redesign the bypass at the platform level. The ruleset contribution remains invalid while any bypass actor is present.

### Producer succeeds but P0 stays Open

Verify:

- the artifact name contains the same full SHA;
- the workflow run event is `push` or `workflow_dispatch` on `main`;
- exactly one nonexpired artifact exists;
- the P0 `workflow_run` was triggered after the producer;
- no later commit changed the current `main` head.

Rerun the producer for the latest current `main` SHA rather than copying an older artifact.

## Truth boundary

Passing this control proves GitHub branch protection and required checks at one exact `main` SHA. It does not prove production deployment health, tenant isolation, provider configuration, recovery, legal review or external penetration testing. Enterprise remains `NO_GO` until every canonical P0 control is complete.
