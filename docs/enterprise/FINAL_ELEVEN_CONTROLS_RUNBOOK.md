# Final Eleven Controls Runbook

## Objective

Close the eleven controls that were outside the original ten-lane runtime campaign without inventing human or external evidence.

## New protected lanes

- **FINAL-TECHNICAL** — uploads and reads a disposable tenant-scoped object, proves outsider read/upload denial, removes the object, inserts a synthetic security incident and timeline event in an isolated database transaction, and rolls both rows back.
- **REPOSITORY** — validates exact-SHA main branch protection and required checks through the existing GitHub proof.
- **ASSURANCE** — validates sanitized independent-review metadata for external security, release approval, legal documents and edge protection.

The Platform lane additionally promotes OPS-06 because its protected proof sends a Sentry event and validates the exact release and source-map response.

## Preparing final assurance

1. Obtain the real external security report, legal review, release approval and edge-protection evidence.
2. Keep raw reports outside the repository in the approved evidence vault.
3. Calculate SHA-256 digests for each retained report or approval package.
4. Replace `evidence/enterprise-assurance/final-assurance.json` with sanitized metadata using this shape for each required item:

```json
{
  "id": "external-security-review",
  "status": "Complete",
  "outcome": "passed",
  "assessedSha": "40-character-reviewed-commit-sha",
  "artifactDigestSha256": "64-character-report-digest",
  "reviewedAt": "2026-07-01T00:00:00Z",
  "validUntil": "2027-01-01T00:00:00Z",
  "preparedBy": "security-owner",
  "reviewers": ["independent-reviewer-a", "independent-reviewer-b"],
  "assuranceProvider": "qualified-provider",
  "changeImpactReviewed": true,
  "checks": {
    "scopeReviewed": true,
    "criticalFindingsClosed": true,
    "highFindingsClosed": true,
    "remediationVerified": true
  }
}
```

5. Include all four required item IDs: `external-security-review`, `release-approval`, `legal-documents-review`, and `edge-protection-review`.
6. Use at least two reviewers per item, both distinct from the preparer.
7. Set `assessedSha` to the exact reviewed commit and confirm it is an ancestor of the release SHA.
8. Set realistic `reviewedAt` and `validUntil` timestamps.
9. Open a PR, obtain independent review and merge it.

## Executing closeout

1. Confirm the exact current `main` SHA.
2. Ensure all protected environments and secrets are configured.
3. Run **Enterprise Runtime Closeout** with the exact SHA and rollback confirmation.
4. Approve each protected environment only after checking its scope.
5. Download the retained closeout bundle.
6. Review preliminary score, rejected evidence, coherence flag and final score.

## Expected progression

- Last accepted baseline: 45% complete / 55% remaining.
- All runtime and assurance lanes accepted: 99% complete / 1% remaining.
- Deterministic final coherence accepted: 100% complete / 0% remaining and GO.

These values are capabilities, not automatic credit. The official score changes only after the exact-SHA workflow succeeds and its evidence is accepted.

## Fail-closed conditions

The closeout remains NO_GO for stale reports, non-ancestor assessed SHAs, self-review, fewer than two independent reviewers, unresolved security findings, incomplete legal checks, missing WAF/CDN/DDoS controls, storage cleanup failure, persisted synthetic security events, missing branch protection or any rejected evidence.
