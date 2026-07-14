# Enterprise Readiness Scorecard

The RISCK COMPLY Enterprise Readiness Scorecard is an evidence-coverage system. It is not a marketing score and does not claim real-time production health.

## Contract

- The registry contains exactly 100 controls.
- The total available weight is exactly 100 points.
- Each of the 10 domains contributes 10 points.
- `PASS` earns full weight.
- `PARTIAL` earns half weight.
- `FAIL`, `BLOCKED`, and `NOT_VERIFIED` earn zero weight.
- `NOT_APPLICABLE` is excluded from the denominator only when formally justified in evidence.
- Missing, malformed, stale, or unrecognized evidence never becomes `PASS`.
- A named check must exist and explicitly pass when a control declares `evidence.check`.

## Release rules

`ENTERPRISE_GO` requires both:

1. 100% weighted evidence coverage; and
2. every critical control in `PASS`.

Anything below this threshold remains `NO_GO` for Enterprise Production. Depending on the score and absence of explicit critical failures, the generated recommendation may be `CONTROLLED_BETA` or `PRODUCTION_WITH_ENTERPRISE_LIMITATIONS`.

Those recommendations do not override release ownership, branch protection, provider configuration, legal review, or runtime validation.

## Files

- Registry: `docs/enterprise/controls.json`
- Generator: `scripts/enterprise/generate-readiness-scorecard.mjs`
- Tests: `tests/enterprise/enterprise-readiness-scorecard.test.ts`
- Workflow: `.github/workflows/enterprise-readiness-scorecard.yml`
- Generated JSON artifact: `artifacts/enterprise-readiness/enterprise-readiness-scorecard.json`
- Generated Markdown artifact: `artifacts/enterprise-readiness/enterprise-readiness-scorecard.md`

## Status derivation

Evidence is read from repository JSON artifacts. The generator accepts common explicit success states such as `Complete`, `passed`, and `success`. `Open` is treated as `NOT_VERIFIED`, not as partial success.

When a control references a named check, that check must appear in the evidence document's `checks` array and explicitly report success. A passing parent document cannot hide a missing or failed child check.

## Operational usage

Run:

```bash
node scripts/enterprise/generate-readiness-scorecard.mjs
```

The GitHub workflow runs the focused tests, generates both reports, publishes the Markdown to the job summary, and retains the artifact for 90 days.

## Evidence boundary

A high score means the expected evidence artifacts exist and satisfy the declared contract. It does not independently prove that a provider, deployment, customer login, tenant boundary, backup, rollback, or alert is healthy at the current moment. Fresh runtime evidence remains required.
