# ADR: Decompose required status checks from broader branch governance evidence

- Date: 2026-08-12
- Status: Accepted
- Scope: P0 repository governance evidence

## Context

The P0 catalog contains two distinct controls:

1. branch protection applied on `main`;
2. required status checks configured.

Both previously consumed the same all-or-nothing evidence file and validator. On exact main SHA `4cd99d4077b8842767a312df2933edf36a0e4b89`, GitHub proves that the canonical required checks are enforced and the applicable ruleset uses a strict required-status-check policy, while broader review governance remains incomplete: at least one approving review is not required and stale approvals are not dismissed on push.

Treating both controls as one evidence contract therefore hid a passing technical subset behind an unrelated review-policy failure. Marking both complete would be equally incorrect.

## Decision

Required status checks receive an independent exact-SHA evidence contract:

- `docs/security/evidence/runtime/required-status-checks.json`;
- `scripts/enterprise/build-required-status-checks-runtime-evidence.mjs`;
- `scripts/security/validate-required-status-checks-runtime-evidence.mjs`.

The proof is generated read-only inside the existing P0 workflow. It requires:

- the assessed SHA to equal the current `main` SHA;
- `main` to be protected;
- required status checks to be enforced for everyone;
- every canonical required check to be present, including documented aliases;
- an active ruleset targeting `main` with strict required-status-check enforcement;
- exact GitHub Actions run provenance and redacted evidence.

The broader `Branch protection applied on main` control keeps its existing stricter evidence and validator. It continues to require approving reviews, CODEOWNERS, stale-review dismissal, conversation resolution, force-push/deletion protections and the other governance requirements.

## Safety boundary

The decomposed required-check proof explicitly sets `broaderBranchProtectionSatisfied: false`. It cannot be used to claim that review governance, bypass-actor policy, provider configuration, deployment correctness, external review or legal compliance passed.

No repository ruleset, provider configuration, secret or production deployment is mutated by this change.

## Consequences

This makes the P0 register more granular and truthful: a technically complete status-check control can close independently, while the genuine review-governance gap remains visible and blocking.
