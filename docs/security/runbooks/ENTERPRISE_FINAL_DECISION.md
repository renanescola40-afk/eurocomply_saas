# Enterprise Final Decision

## Purpose

Compile one truthful, exact-SHA Enterprise GO or NO-GO decision from accepted evidence. This is the last decision layer, not an evidence generator.

## Mandatory controls

The input packet must contain PASS/passed evidence for repository gates, runtime closeout, migration post-execution, branch protection, backup/restore, independent external security review, qualified legal reviews, and separate Release, Security and Operations approvals.

Each control must include the exact release SHA, a unique SHA-256 evidence digest, evidence URL, observation timestamp and accountable owner. Approval controls must identify distinct approvers.

## Safety boundaries

- Missing, stale, copied, synthetic or self-attested evidence fails closed.
- Repository checks do not replace production evidence.
- An unresolved risk acceptance cannot be converted into Enterprise GO.
- This workflow does not execute production writes, deploy, repair migrations or declare legal compliance.
- The protected `enterprise-final-decision` environment must require human approval.

## Procedure

1. Freeze the exact current `main` SHA.
2. Complete the protected runtime closeout and migration post-execution attestation for that SHA.
3. Obtain current branch-protection and backup/restore evidence.
4. Attach genuine external security and qualified legal review evidence.
5. Obtain distinct Release, Security and Operations approvals.
6. Populate the template outside the runtime-evidence directory and upload it as `enterprise-final-decision-input-<SHA>` from a successful exact-SHA workflow.
7. Dispatch **Enterprise Final Decision** with the same SHA and source run ID.
8. Retain `enterprise-final-decision.json` and `summary.md` for 90 days.

## Interpretation

`ENTERPRISE_GO` is emitted only when every mandatory control passes without failures, blockers, duplicate evidence, stale SHA, expiry or unresolved risk acceptance. Any other state is `ENTERPRISE_NO_GO` with a machine-readable blocker list.

Relates to #1032, #1395, #198 and #778.
