# EU AI Act Final Runtime Closeout

## Purpose

This workflow closes the final report-mode runtime-evidence points after product implementation and CI verification have reached 100%, while reserving deployed-only controls for strict closeout.

It covers:

- readiness-score coherence — 8 points;
- vendor/provider failure classification — 4 points;
- protected repository and branch controls — 4 points.

The versioned legal-rules registry is a separate 4-point workstream. It cannot be promoted by the synthetic safe bundle or this repository-only overlay; it requires the deployed exact-SHA legal-rules artifact.

## Modes

### Pull-request report mode

Pull requests regenerate the **80-point** safe runtime bundle. The 4 legal-rules points are deliberately excluded because only deployed proof is accepted.

The workflow then validates readiness coherence and provider-failure behavior and inspects GitHub branch protection. Readiness and provider evidence can promote the report to **92%** runtime coverage. Platform controls can raise it to **96%** only when required reviews and the other branch-policy checks are verifiably enabled.

If branch-protection metadata cannot be read or does not meet policy, the workflow retains a blocked report instead of fabricating evidence. The release decision remains `EU_AI_ACT_PRODUCT_COVERAGE_NO_GO`.

### Strict main closeout

Pushes to `main` and protected manual runs require all three final-overlay controls plus every independently required runtime artifact, including deployed exact-SHA legal-rules validation. Any missing, stale, cross-SHA or blocked proof fails the workflow.

A successful strict run must produce:

- implementation coverage: 100%;
- CI-verified coverage: 100%;
- runtime evidence coverage: 100%;
- product decision: `EU_AI_ACT_PRODUCT_COVERAGE_NO_GO` until qualified human reviews are accepted.

## Branch-protection checks

The workflow verifies:

- the GitHub branch-protection or effective-rules API is readable;
- required status checks are configured;
- at least one approving review is required;
- force pushes are blocked;
- branch deletion is blocked.

Evidence records the observation time and SHA but does not guarantee future administrator configuration.

## Truth boundary

The closeout does not create legal opinions, certifications, notified-body approval, regulator acceptance or customer compliance guarantees.

Eight qualified reviews remain independent human actions. Their evidence must be produced through the qualified-review assurance campaign and must identify the reviewer, qualifications, scope, decision, timestamp and exact evidence package reviewed.

## Rollback

Revert the workflow, generator, tests, runbook and ADR together. No customer data or production database mutation is performed by this package.
