# Runbook: Enterprise Conversation Final Closeout

## Purpose

This workflow makes the final Enterprise completion decision for one exact commit at the current tip of `main`. It is a read-only assessor. It never creates runtime evidence, changes repository settings, promotes a deployment, or converts missing proof into a passing result.

## Preconditions

- all intended implementation PRs are merged;
- the exact target deployment is healthy;
- Stripe runtime proof is fresh for the target SHA;
- Enterprise runtime and production-final evidence are fresh for the target SHA;
- release Go/No-Go approval exists for the same SHA;
- the canonical scorecard artifact reports `100/100`, `GO`, and zero critical open or failed controls;
- the persistent execution state is fresh, exact-SHA, and records 100 percent official completion;
- the protected `production` environment has an authorized approver;
- every retained proof references the same current `main` SHA.

## Procedure

1. Obtain the current 40-character `main` SHA.
2. Confirm these protected workflows have successful `push` or `workflow_dispatch` runs for that SHA:
   - `enterprise-production-gate.yml`;
   - `enterprise-readiness-scorecard.yml`.
3. Open **Enterprise Conversation Final Closeout** in GitHub Actions.
4. Enter the exact current `main` SHA.
5. Enter `CLOSE_ENTERPRISE_CONVERSATION`.
6. Approve the protected `production` environment.
7. The workflow automatically discovers the newest successful exact-SHA run and exact-name artifact from each canonical workflow.
8. Review the uploaded artifact named `enterprise-conversation-final-closeout-<SHA>`.
9. Verify:
   - `retrieval-manifest.json` has `status=Complete`, `outcome=passed`, and no blockers;
   - every source has a numeric `runId` and `artifactId`;
   - every expected path is present exactly once in `extractedPaths`;
   - `result.json` has `status=Complete`;
   - `decision=CONVERSATION_COMPLETE`;
   - `completionPercentage=100`;
   - `SHA256SUMS` covers the retained JSON files.

## Diagnostic behavior

The workflow deliberately uploads diagnostics before enforcing the final decision. A failed workflow therefore still produces the closeout artifact whenever authorization and checkout succeeded.

Use these files:

- `retrieval-manifest.json`: identifies which canonical workflow run or artifact could not be retrieved;
- `result.json`: identifies which evidence validator kept the conversation open;
- `SHA256SUMS`: permits integrity verification of the retained JSON outputs.

A retrieval manifest with `status=Open` is not a partial pass. It means the closeout remains blocked.

## Common blockers

| Failure | Meaning | Correct action |
| --- | --- | --- |
| `exact_sha_workflow_run_missing` | No successful trusted event exists for the current `main` SHA. | Run the named protected workflow for that exact SHA. |
| `exact_sha_artifact_missing` | The successful run did not retain the exact canonical artifact name. | Correct the producer workflow and rerun it for the same SHA. |
| `artifact_json_extraction_failed` | A canonical JSON path was missing, duplicated, malformed, encrypted, symlinked, oversized, or suspiciously compressed. | Inspect the producer artifact; do not rename or hand-edit evidence to bypass the contract. |
| `github_api_403` | The closeout token could not read the required run or artifact. | Correct GitHub Actions/repository permissions without granting write access. |
| `retrievalManifest` blocker | Provenance did not prove all canonical sources. | Resolve the retrieval failure first. |
| `stripeRuntime`, `enterpriseRuntime`, `productionFinal`, or `releaseGoNoGo` blocker | Runtime/release evidence failed its canonical validator. | Rerun the responsible protected proof workflow. |
| `canonicalScorecard` blocker | The scorecard or persistent state was not exact-SHA 100/100 Enterprise GO. | Close the underlying controls and regenerate the scorecard. |

## Security boundary

- workflow permissions remain `actions: read` and `contents: read`;
- only `push` and `workflow_dispatch` runs on `main` are trusted;
- artifact names and evidence paths are fixed by code;
- arbitrary first-file selection is forbidden;
- expired artifacts are rejected;
- ZIP size, signature, entry count, total uncompressed size, symlink, encryption, compression ratio, JSON parsing, and exact-path constraints are enforced;
- raw API payloads, tokens, headers, cookies, and artifact URLs are not retained;
- run IDs, artifact IDs, trusted event enums, fixed names, fixed paths, and bounded failure codes are the only provider provenance retained.

## Failure handling

A failed run means the conversation remains open. Read `blockers` in `result.json` and `retrieval-manifest.json`. Regenerate only missing real evidence and rerun against the unchanged current `main` SHA. If `main` moves, regenerate every exact-SHA proof for the new commit.

Never edit an evidence file merely to change its status, SHA, run ID, artifact ID, or decision.

## Rollback

The workflow is read-only. Disable it if its contract is suspected to be wrong, preserve all prior artifacts, revert the closeout provenance changes through a reviewed PR, and rerun only after the corrected assessor is merged into `main`.
