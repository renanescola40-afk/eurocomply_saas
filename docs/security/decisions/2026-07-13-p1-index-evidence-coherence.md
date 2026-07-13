# Decision: require P1 index and final evidence coherence

- Date: 2026-07-13
- Status: Accepted
- Scope: P1 enterprise evidence governance

## Context

`P1_EVIDENCE_INDEX.json` is the canonical status source used by the generated P1 progress dashboard. Final control evidence is stored in one JSON file per control.

Before this decision, a control marked `Complete` had to reference an existing evidence file, and both files were validated independently. However, the gate did not require the review metadata in the index to match the referenced evidence file.

That allowed an internally inconsistent package in which the dashboard named one reviewer or review date while the final evidence artifact named another. Both files could still be structurally valid.

## Decision

For every P1 control marked `Complete`, the index validator must read the referenced final evidence JSON and fail closed unless these values match the canonical index exactly:

- `controlId`;
- `control`;
- `status`;
- `generatedFromRealEvidence`;
- `productionValidated`;
- `reviewedAt`;
- `reviewer`;
- `nextReviewDue`.

The rule applies in normal and strict modes. Open controls remain valid without final evidence files during ongoing evidence collection.

## Impact

This change affects evidence-governance tooling only. It does not change application runtime, databases, migrations, credentials, production configuration, customer data, or control status.

The existing P1-06 SBOM evidence and index metadata are expected to pass unchanged.

## Risks and mitigations

A legitimate evidence update will fail until the index and final evidence JSON are updated together. This is intentional and prevents partial evidence-package updates.

The validator compares only fields that must describe the same reviewed control state. Detailed artifact validation remains the responsibility of `check-p1-final-evidence-files.mjs`.

## Evidence boundaries

Passing this check proves internal consistency between committed evidence records. It does not prove that a control operates correctly in production, that an external audit occurred, or that missing P1 controls are complete.

## Rollback

Revert the commit or pull request that introduced the coherence check. No data, infrastructure, secret, deployment, or environment rollback is required.
