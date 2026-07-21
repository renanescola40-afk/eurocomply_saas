# Enterprise Release Decision Runbook

## Objective

Produce the final evidence-backed Go/No-Go decision for the exact current `main` commit without accepting stale, partial or cross-commit evidence.

## Preconditions

- All specialized protected runtime workflows have completed for the same full `main` SHA.
- Their canonical JSON files are present at the paths in `docs/security/evidence/enterprise-release-evidence-manifest.json`.
- The `production-release-decision` GitHub environment requires designated release/security approval.
- External security review evidence identifies an independent reviewer and review timestamp.

## Procedure

1. Confirm the candidate is the current full SHA of `origin/main`.
2. Review the manifest and verify that no P0 enterprise control was removed to obtain a passing result.
3. Run the `Enterprise Release Decision` workflow manually with the full lowercase 40-character SHA.
4. Download the `enterprise-release-decision-<sha>` artifact.
5. Review both JSON and Markdown outputs.
6. A release may proceed only when the decision is `Go`, every control is `Complete`, and the protected-environment approver accepts the bounded evidence.

## Expected No-Go reasons

- `evidence_missing`: required canonical evidence does not exist.
- `evidence_unreadable`: invalid JSON or inaccessible file.
- `outcome_not_passed`: no accepted passing status.
- `full_sha_missing`: evidence lacks a full 40-character SHA.
- `sha_mismatch`: evidence belongs to another commit.
- `branch_missing` or `branch_mismatch`: branch provenance is absent or incorrect.
- `timestamp_missing_or_invalid`: no parseable validation time.
- `timestamp_in_future`: clock/provenance anomaly.
- `evidence_stale`: validation exceeds the manifest freshness window.
- `sensitive_key_present`: evidence includes a key associated with secrets or credentials.
- `independent_review_missing`: external assurance lacks independent reviewer metadata.

## Remediation

Do not edit the aggregate decision artifact manually. Re-run the failing specialized proof for the exact candidate SHA, correct its canonical evidence contract, commit only redacted evidence where repository policy permits, and then rerun the decision workflow.

Never weaken the manifest, freshness window, SHA requirement or sensitive-key scan merely to produce `Go`.

## Incident handling

If a decision incorrectly emits `Go`, immediately stop release activity, preserve the workflow run and artifacts, open a security/release incident, identify the faulty evidence producer or acceptance rule, and restore `No-Go` until corrected evidence is independently reviewed.

## Rollback

Revert the complete evidence-promotion package. A rollback of this control plane does not authorize release; the enterprise decision remains No-Go until an equivalent reviewed process is restored.
