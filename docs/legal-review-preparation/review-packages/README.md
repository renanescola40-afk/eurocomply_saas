# Qualified Legal Review Packages

This directory prepares the eight qualified human-review workstreams registered in `docs/compliance/evidence/qualified-review-execution-registry.json`.

## Status boundary

Every package in this directory is **preparation material only** and remains `HUMAN_REVIEW_REQUIRED` until a qualified professional completes the review, supplies verifiable identity and professional-registration details, declares jurisdiction, scope, independence and conflicts, binds the decision to the exact product SHA and evidence digest, and provides a signed decision artifact with a validity period.

A package, checklist, generated memorandum, test result or AI-authored analysis is never legal acceptance.

## Package structure

Each workstream contains:

- `PACKAGE.md`: concise counsel-facing briefing, scope, questions, findings and handoff steps;
- `manifest.json`: machine-readable evidence index, acceptance criteria and status.

The shared decision format is `../QUALIFIED_REVIEW_DECISION_TEMPLATE.json`. Completed decisions belong in the registered `docs/compliance/evidence/accepted/*.json` paths only after the legal evidence gate passes. Confidential signed source documents must remain in the approved confidential evidence store and be referenced by immutable digest.

## Registered packages

| Package | Weight | Accepted decision path |
|---|---:|---|
| legal-rules | 4 | `docs/compliance/evidence/accepted/legal-rules-qualified-review.json` |
| prohibited-practices | 7 | `docs/compliance/evidence/accepted/prohibited-practices-legal-review.json` |
| article-50-copy | 8 | `docs/compliance/evidence/accepted/article-50-copy-review.json` |
| fria-methodology | 6 | `docs/compliance/evidence/accepted/fria-methodology-review.json` |
| deployer-obligations | 7 | `docs/compliance/evidence/accepted/deployer-obligations-legal-review.json` |
| high-risk-provider | 9 | `docs/compliance/evidence/accepted/high-risk-provider-methodology-review.json` |
| conformity | 5 | `docs/compliance/evidence/accepted/conformity-qualified-review.json` |
| gpai | 5 | `docs/compliance/evidence/accepted/gpai-legal-review.json` |

Total review-dependent weight: **51**.

## Required workflow

1. Freeze the product SHA and evidence-package digest.
2. Give counsel only the package relevant to the assigned scope.
3. Counsel records findings as accepted, change-required or not accepted.
4. Engineering resolves repository-controlled findings in a new PR.
5. Counsel rechecks the exact resulting SHA.
6. The signed decision reference and digest are entered into the accepted JSON record.
7. CI validates the record; it does not manufacture or infer acceptance.
