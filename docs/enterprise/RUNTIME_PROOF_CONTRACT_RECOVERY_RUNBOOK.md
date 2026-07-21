# Runtime Proof Contract and Recovery Closeout Runbook

## Purpose

Run ten protected runtime proof lanes against one exact current `main` SHA, collect only allowlisted artifacts, normalize validated legacy evidence into the canonical promotion contract, and calculate the evidence-backed enterprise percentage.

## Preconditions

- All implementation PRs are merged and the target is the full lowercase current `main` SHA.
- Protected environments and required secrets/variables are configured.
- Recovery source and isolated database URLs are distinct.
- The isolated database may be cleaned and restored.
- The last-known-good Vercel deployment and commit are verified and differ from the target release.
- The operator accepts that full closeout performs a real protected rollback.

## Procedure

1. Open **Actions → Enterprise Runtime Closeout**.
2. Enter the exact `main` SHA.
3. Enter `RUN_ENTERPRISE_RUNTIME_CLOSEOUT`.
4. Enter `EXECUTE_CONTROLLED_PRODUCTION_ROLLBACK`.
5. Approve the parent and child protected environments.
6. Wait for all ten lanes.
7. Review `enterprise-runtime-campaign.json`, `evidence-manifest.json`, `scorecard-promotion-report.json`, and `enterprise-promotion-closeout.json`.
8. Use `promoted.completePercent` and `promoted.remainingPercent` only for that exact SHA.

## Fail-closed conditions

The result remains `NO_GO` for input-contract drift, stale SHA, failed child workflow, missing artifact prefix or required file, malformed/oversized/secret-shaped evidence, run/repository/SHA mismatch, incomplete recovery evidence, rejected evidence, or any open critical control.

## Normalization boundary

Legacy artifacts do not choose control IDs. The versioned lane registry owns workflow names, inputs, artifact prefixes, required files and promotion scope. Normalization occurs only after the protected child workflow and its domain validator pass.

## Recovery safety

Backup bytes exist only in the temporary runner and are deleted. Restore targets an isolated database. Evidence stores aggregate counts and a truncated digest. Production rollback requires two explicit confirmations and protected environment approval. Credentials, URLs, response bodies and headers are not serialized.

## Rollback

Revert the manifest, contract registry, dispatcher, normalizer, child workflows, recovery scripts, tests and documentation together. Keep enterprise release `NO_GO` until equivalent exact-SHA evidence orchestration is restored.
