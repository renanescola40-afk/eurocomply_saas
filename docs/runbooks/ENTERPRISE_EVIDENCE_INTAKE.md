# Enterprise Evidence Intake Gateway

## Purpose

This gateway validates completed owner execution packets before they may be presented to the authoritative Enterprise Final Decision workflow.

It is a validation and handoff control. It does not create evidence, approve a release, execute migrations, deploy production, or grant Enterprise GO.

## Required inputs

- Exact current `main` SHA.
- Successful workflow run ID containing the `enterprise-owner-execution-packets` artifact.
- One completed packet for each of the ten mandatory Enterprise domains.

## Acceptance rules

Every packet must:

1. target the exact current `main` SHA;
2. use `status: COMPLETE` and `outcome: passed`;
3. contain genuine non-template evidence;
4. contain GitHub Actions workflow provenance;
5. include a reviewer distinct from the accountable owner;
6. include valid review and expiry timestamps;
7. use a unique evidence digest;
8. represent one of the ten required domains.

Missing, stale, expired, copied, synthetic, self-reviewed or mismatched evidence fails closed.

## Workflow

Run **Enterprise Evidence Intake Gateway** manually from GitHub Actions.

Provide:

- `release_sha`: the full 40-character SHA currently at `main`;
- `packets_artifact_run_id`: the successful run that produced `enterprise-owner-execution-packets`.

The workflow verifies the current `main`, checks out the exact SHA, validates source-run provenance, executes the intake validator and uploads `enterprise-evidence-intake-result` for 90 days.

## Result meanings

- `READY_FOR_ENTERPRISE_FINAL_DECISION`: all ten packet submissions passed intake validation. This is not Enterprise GO.
- `EVIDENCE_INTAKE_REJECTED`: at least one mandatory condition failed. The attached error list is the authoritative remediation queue for that intake attempt.

The result always contains:

```json
{
  "enterpriseGoGrantedByThisArtifact": false,
  "repositoryChecksAreRuntimeProof": false
}
```

## Final handoff

Only an accepted intake result should be supplied to the Enterprise Final Decision process. That final process must independently re-check the exact SHA, evidence validity, approval separation and unresolved risks.

Related tracking: #1032, #1395, #198 and #778.
