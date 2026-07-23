# Final Enterprise Closeout Control Plane

## Purpose

Provide one truthful dashboard for the final gap between implemented product controls and evidence-backed Enterprise GO. The dashboard separates four measurements that must not be conflated:

1. implementation coverage;
2. runtime evidence coverage;
3. qualified human-review coverage;
4. fully completed coverage.

The generator never awards runtime or human-review credit because code exists. Missing, invalid, sensitive, stale or SHA-mismatched evidence remains open.

## Current verified baseline

The canonical EU AI Act product registry has 100 total weight. The latest merged safe-runtime promotion package states:

- implementation coverage: 100%;
- CI-verified coverage: 100%;
- isolated runtime coverage: at least 80% and below 100%;
- final decision: NO-GO until protected runtime, provider and qualified-review evidence is accepted.

The older official enterprise scorecard remains 46% complete / 54% remaining until the protected exact-SHA promotion workflow accepts newer evidence. Do not manually replace that official score with implementation coverage.

## What this Mega PR closes

- one deterministic final-gap report instead of several disconnected percentages;
- evidence-root overlays for downloaded workflow artifacts;
- exact-SHA runtime evidence validation;
- explicit rejection of sensitive-value evidence;
- weighted prioritization by workstream;
- separate report and strict modes;
- retained JSON and Markdown artifacts;
- focused regression tests;
- a GitHub Actions summary suitable for release review.

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

## Final remaining work

### Protected runtime and provider evidence

Execute the protected Enterprise Runtime Closeout for the exact integrated `main` SHA. The remaining runtime lanes include the canonical readiness scorecard, vendor/provider assurance and platform/branch-protection controls. Evidence must be retained, sanitized and SHA-bound.

### Qualified independent reviews

Complete and accept the qualified-review campaign for legal rules, prohibited practices, Article 50 copy, FRIA methodology, deployer obligations, high-risk provider methodology, conformity and GPAI. Code cannot self-approve these reviews.

### Release sign-off

After all evidence is accepted, regenerate the canonical 100-control scorecard, confirm zero critical controls open, record rollback ownership and last-known-good deployment, then execute strict closeout.

## Truth boundary

This control plane improves orchestration and measurement. It does not claim certification, legal approval, penetration testing, provider health, production tenant isolation or customer acceptance unless independent exact-SHA evidence is supplied and accepted.
