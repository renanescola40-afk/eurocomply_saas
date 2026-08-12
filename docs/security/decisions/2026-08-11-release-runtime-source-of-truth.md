# ADR: release gates derive runtime state from exact-SHA evidence, not policy Markdown

Date: 2026-08-11

## Context

`docs/security/P0_RUNTIME_EVIDENCE_REGISTER.md` is intentionally committed as policy metadata with all control rows `Open`. Current state is generated from immutable exact-SHA runtime evidence artifacts.

Two legacy release checks still required the committed Markdown row for Supabase live RLS to be manually changed to `Complete`. That created a contradiction: the protected live RLS proof for the release SHA could be `Complete/passed`, while the release gate still failed because the policy template correctly remained `Open`.

The enterprise runtime evidence writer also maintained its own SHA alias list. It did not recognize canonical nested bindings such as `runtimeContext.commitSha`, so exact-SHA evidence such as the upload-scanner proof could be rejected as unbound. The Enterprise 100 path already uses a shared conflict-aware resolver for these bindings.

## Decision

- Release Go/No-Go and the strict Supabase live RLS gate validate the runtime JSON evidence and its GitHub Actions provenance directly.
- They do not derive current runtime state from `P0_RUNTIME_EVIDENCE_REGISTER.md`.
- When `RELEASE_COMMIT_SHA` or `GITHUB_SHA` is a full SHA, the RLS evidence and its GitHub Actions provenance must match it exactly.
- The enterprise runtime evidence writer uses `scripts/release/evidence-sha-binding.mjs` for exact-SHA resolution.
- Nested canonical bindings such as `runtimeContext.commitSha` are accepted.
- Multiple distinct valid SHA bindings in one document are a hard conflict and remain No-Go.

## Consequences

- The committed P0 register remains stable policy metadata and never needs to be rewritten to manufacture a release PASS.
- Valid exact-SHA runtime evidence is no longer rejected because of a stale alias list or an intentionally Open policy template.
- Contradictory provenance is stricter than before: a matching top-level SHA cannot hide a conflicting nested SHA.
- This change does not make missing, Open, failed, stale or external evidence pass. Provider, Step-Up, Stripe, branch-protection, audit-chain and external-review blockers remain independent.
