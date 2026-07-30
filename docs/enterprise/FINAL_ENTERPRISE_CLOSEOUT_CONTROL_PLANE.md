# Final Enterprise Closeout Control Plane

## Purpose

Provide one truthful dashboard for the final gap between implemented product controls and evidence-backed Enterprise GO. The dashboard separates four measurements that must not be conflated:

1. implementation coverage;
2. runtime evidence coverage;
3. qualified human-review coverage;
4. fully completed coverage.

The generator never awards runtime or human-review credit because code exists. Missing, invalid, sensitive, stale or SHA-mismatched evidence remains open.

## Current verified baseline

The canonical EU AI Act product registry has 100 total weight. The exact-SHA safe-runtime package currently demonstrates:

- implementation coverage: 100%;
- CI-verified coverage: 100%;
- safe runtime coverage: 84%;
- generated readiness and provider evidence: an additional 12 points;
- expected final promoted runtime coverage: 96% while platform proof remains blocked;
- final decision: NO-GO until protected platform evidence and qualified human-review evidence are accepted.

The remaining four runtime points belong to `PLATFORM-CONTROLS`. A GitHub API `403` is recorded as an external/runtime blocker and must not be converted into a passing software assertion.

## What this Mega PR closes

- one deterministic final-gap report instead of several disconnected percentages;
- evidence-root overlays for downloaded workflow artifacts;
- exact-SHA runtime evidence validation;
- explicit rejection of sensitive-value evidence;
- weighted prioritization by workstream;
- separate report and strict modes;
- retained JSON and Markdown artifacts;
- focused regression tests;
- a GitHub Actions summary suitable for release review;
- promotion of the generated readiness and provider evidence into the final product-coverage report.

## Evidence-root contract

`generate-eu-ai-act-product-coverage.mjs` accepts a comma-separated list in `EU_AI_ACT_RUNTIME_EVIDENCE_ROOTS`.

```bash
EU_AI_ACT_RUNTIME_EVIDENCE_ROOTS=artifacts/eu-ai-act-final-runtime/safe-evidence,artifacts/eu-ai-act-final-runtime/final-evidence
```

A colon-separated path list is not supported. Treating two roots as one path silently prevents the generated readiness and provider documents from being discovered. The workflow therefore enforces a minimum 96% final runtime score in pull-request report mode so this contract cannot regress unnoticed.

## Usage

Report mode:

```bash
ENTERPRISE_TARGET_SHA=<40-char-main-sha> \
node scripts/enterprise/generate-final-closeout-dashboard.mjs
```

With downloaded evidence bundles:

```bash
ENTERPRISE_EVIDENCE_ROOTS=artifacts/runtime-evidence,artifacts/qualified-reviews \
ENTERPRISE_TARGET_SHA=<40-char-main-sha> \
node scripts/enterprise/generate-final-closeout-dashboard.mjs
```

Strict promotion decision:

```bash
ENTERPRISE_TARGET_SHA=<40-char-main-sha> \
node scripts/enterprise/generate-final-closeout-dashboard.mjs --strict
```

Strict mode exits non-zero unless fully completed coverage is exactly 100%.

## Validation and retained evidence

For every exact SHA, retain the `eu-ai-act-final-runtime-closeout-<sha>` artifact. Confirm that:

1. the safe baseline is at least 84%;
2. `final-runtime-bundle.json` accepts `READINESS-SCORING` and `VENDOR-ASSURANCE` when their checks pass;
3. the final promoted report reaches at least 96%;
4. `PLATFORM-CONTROLS` remains open unless branch protection is read and verified;
5. the release decision remains `EU_AI_ACT_PRODUCT_COVERAGE_NO_GO` until qualified reviews are genuinely accepted.

## Rollback

If the final overlay promotion causes an unexpected regression:

1. revert the workflow commit that changes `EU_AI_ACT_RUNTIME_EVIDENCE_ROOTS`;
2. rerun the exact-SHA closeout in report mode;
3. retain both pre-rollback and post-rollback artifacts;
4. do not promote a lower score as complete;
5. restore the comma-separated multi-root contract only after the regression is reproduced and fixed by tests.

Rollback changes orchestration only. It must never rewrite, fabricate or relabel retained runtime or human-review evidence.

## Final remaining work

### Protected platform evidence

Execute the protected Enterprise Runtime Closeout for the exact integrated `main` SHA with GitHub permissions capable of reading branch protection. Required status checks, at least one approving review, force-push blocking and deletion blocking must all be observed. The evidence must be retained, sanitized and SHA-bound.

### Qualified independent reviews

Complete and accept the qualified-review campaign for legal rules, prohibited practices, Article 50 copy, FRIA methodology, deployer obligations, high-risk provider methodology, conformity and GPAI. Code cannot self-approve these reviews.

### Release sign-off

After all evidence is accepted, regenerate the canonical 100-control scorecard, confirm zero critical controls open, record rollback ownership and last-known-good deployment, then execute strict closeout.

## Truth boundary

This control plane improves orchestration and measurement. It does not claim certification, legal approval, penetration testing, provider health, production tenant isolation or customer acceptance unless independent exact-SHA evidence is supplied and accepted.
