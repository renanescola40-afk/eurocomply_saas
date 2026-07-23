# EU AI Act Final Runtime Closeout

## Purpose

This workflow closes the final 16 runtime-evidence points after product implementation and CI verification have reached 100%.

It covers:

- readiness-score coherence — 8 points;
- vendor/provider failure classification — 4 points;
- protected repository and branch controls — 4 points.

## Modes

### Pull-request report mode

Pull requests regenerate the 84-point safe runtime bundle, validate readiness coherence and provider-failure behavior, then inspect GitHub branch protection.

If branch-protection metadata cannot be read or does not meet the policy, the workflow retains a blocked report instead of fabricating evidence. Readiness and provider evidence may still be promoted, producing at least 96% runtime coverage.

### Strict main closeout

Pushes to `main` and protected manual runs require all three controls. Any missing, stale, cross-SHA or blocked proof fails the workflow.

A successful strict run must produce:

- implementation coverage: 100%;
- CI-verified coverage: 100%;
- runtime evidence coverage: 100%;
- product decision: `EU_AI_ACT_PRODUCT_COVERAGE_NO_GO` until qualified human reviews are accepted.

## Branch-protection checks

The workflow verifies:

- the GitHub branch-protection API is readable;
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
