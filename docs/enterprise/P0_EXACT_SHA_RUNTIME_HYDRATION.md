# P0 exact-SHA runtime evidence hydration

## Problem

The P0 Runtime Gap Report historically evaluated JSON snapshots present in the repository checkout. That was fail-closed, but it systematically under-reported runtime progress because successful protected proofs are intentionally retained as GitHub Actions artifacts instead of being committed back to the repository.

The Enterprise Readiness and Enterprise Production Gate pipelines already use exact-SHA retained evidence. The P0 report must observe the same runtime facts without creating a second source of truth or turning invalid artifacts into PASS.

## Exact-SHA hydration model

Before evaluating the P0 catalog, `.github/workflows/p0-runtime-gap-report.yml` now performs two read-only hydration stages.

### Dedicated retained producers

`scripts/release/hydrate-enterprise-retained-runtime-evidence.mjs` retrieves the existing allowlisted exact-SHA producer artifacts for:

- Auth/RBAC
- Supabase live RLS
- upload scanner
- audit chain
- production provider configuration
- branch protection
- step-up
- promoted Stripe runtime evidence

The release path remains strict. A new diagnostic-only mode allows an invalid optional producer artifact to be cleared and reported as missing so the P0 report can continue and show the rest of the gaps. Trigger-bound producers are never suppressible, and the diagnostic mode grants no PASS credit.

### Enterprise Production Gate evidence

`scripts/enterprise/fetch-production-gate-p0-evidence.mjs` reads the newest artifact-bearing completed Enterprise Production Gate run for the exact main SHA and attempts to hydrate only:

- `deployment-smoke-validation.json`
- `final-validation-runner.json`
- `observability-smoke-validation.json`
- `rollback-dry-run-validation.json`

The overall workflow conclusion does not grant credit. Each JSON document must independently:

1. come from the canonical Enterprise Production Gate workflow and exact SHA artifact name;
2. declare the exact assessed SHA in its evidence provenance;
3. pass its canonical P0 validator;
4. not declare sensitive values.

This allows a valid individual runtime proof to remain useful even when the overall Production Gate failed later for an unrelated control, without turning the failed gate itself into evidence of success.

## Fail-closed rules

- Repository snapshots for hydrated evidence paths are removed before retrieval.
- Missing artifacts remain missing.
- Invalid JSON remains missing.
- Stale SHA evidence remains missing.
- Ambiguous ZIP entries fail closed.
- Sensitive evidence is rejected.
- GitHub artifact/API reads are bounded and exact-workflow-path constrained.
- P0 workflow permissions are `contents: read` and `actions: read` only.
- No provider, database, Stripe, Vercel, Supabase, branch protection or production configuration is mutated.

## Reporting

The immutable P0 artifact now retains:

- `p0-runtime-gap-report.json`
- generated P0 register JSON/Markdown
- retained-producer hydration manifest
- Production Gate P0 hydration manifest
- SHA-256 checksums

Versioned Markdown remains advisory. Canonical validators plus exact-SHA artifact provenance determine whether a runtime control is satisfied.
