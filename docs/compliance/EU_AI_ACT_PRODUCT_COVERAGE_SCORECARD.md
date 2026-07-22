# EU AI Act Product Coverage Scorecard

This document defines the human-readable entrypoint for product coverage. The live score is generated per exact Git SHA by:

```text
.github/workflows/eu-ai-act-product-coverage.yml
scripts/compliance/generate-eu-ai-act-product-coverage.mjs
docs/compliance/eu-ai-act-product-coverage-registry.json
```

## Why the old 50% score was retired

The previous assessment was last manually verified on 2026-07-17. It remained at 50% after substantial product work was merged, including operational Article 5, FRIA, AI literacy, high-risk data governance, regulatory control tower, enterprise identity and runtime evidence workflows.

A hand-maintained number could therefore become stale in either direction:

- it could understate merged implementation;
- or it could overstate runtime and qualified-review completion.

## Current scoring model

Every exact-SHA report contains four separate percentages:

1. **Implementation coverage** — required product files exist.
2. **CI-verified coverage** — required product files and automated tests exist.
3. **Runtime evidence coverage** — implementation and tests exist and required retained runtime evidence is present.
4. **Completed coverage** — all runtime evidence and any required qualified human review are present.

Only the fourth score may reach `EU_AI_ACT_PRODUCT_COVERAGE_GO`.

## State model

- `NOT_STARTED`
- `IMPLEMENTED`
- `CI_VERIFIED`
- `RUNTIME_VERIFIED`
- `HUMAN_REVIEW_REQUIRED`
- `COMPLETE`

Missing implementation prevents every downstream state. Missing runtime evidence or qualified review cannot be replaced by a checkbox, documentation claim or merged pull request.

## Where to read the exact score

For each pull request and `main` push, download the artifact:

```text
eu-ai-act-product-coverage-<full-sha>
```

It contains:

- `eu-ai-act-product-coverage.json`;
- `eu-ai-act-product-coverage.md`;
- exact SHA and branch;
- the four scores;
- missing evidence per workstream;
- integrity digest;
- final product-coverage decision.

## Truth boundary

This score measures product workflow and evidence coverage. It does not guarantee customer legal compliance, certify an AI system, replace qualified legal or fundamental-rights review, or represent regulator approval.
