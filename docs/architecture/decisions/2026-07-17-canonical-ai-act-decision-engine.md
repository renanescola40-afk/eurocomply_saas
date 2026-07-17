# ADR — Canonical EU AI Act decision engine

Date: 2026-07-17

## Status

Proposed in `agent/canonical-ai-act-decision-engine`.

## Context

RISCK COMPLY had two decision paths for the same AI-system payload:

- `src/server/ai-governance/classifier.ts` assigned risk level and obligations;
- `src/lib/ai-governance/role-wizard.ts` inferred the provider/deployer role and escalation steps.

Both paths maintained their own high-risk-domain lists and severe-risk signals. Neither path was directly bound to the versioned legal-rules registry introduced in PR #1170. A future change could therefore produce a role result, risk result and legal-rule result that disagreed while still passing unrelated tests.

## Decision

Create `src/server/ai-governance/decision-engine.ts` as the single owner of:

- supported product roles, lifecycle states and risk domains;
- role inference and confidence;
- prohibited, high-risk, transparency and minimal-risk routing;
- current, future and adopted-pending-effect legal-rule applicability;
- registry freshness and mandatory legal-review escalation;
- decision-engine and ruleset provenance.

The existing classifier and role wizard remain available as compatibility adapters. They delegate to the canonical engine and must not contain independent risk-domain sets, keyword inference or risk branching.

The AI inventory payload invokes the engine once and derives both the legacy classification view and role assessment from that result. The returned metadata is qualified decision-support evidence and explicitly is not a legal determination, certification or compliance guarantee.

## Fail-closed boundaries

- Structurally invalid legal-rule registries throw `ai_act_legal_registry_invalid`.
- Invalid assessment dates throw `ai_act_assessment_date_invalid`.
- Ambiguous role inference requires legal review.
- Registry review deadlines that have passed mark the result `review_due` and require refresh.
- Adopted rules pending Official Journal effect are tracked separately and are not counted as currently applicable.
- Future obligations remain implementation-planning evidence, not current-law claims.

## Consequences

### Positive

- One source of truth prevents contradictory product decisions.
- Every classification can identify the engine version, ruleset version and matched rule IDs.
- Article application dates can change an obligation from future to applicable without rewriting product heuristics.
- Compatibility is preserved for existing callers.

### Trade-offs

- The decision engine imports the in-repository registry and therefore must be kept current through scheduled legal review.
- Repository provenance does not prove production database persistence or legal correctness for a customer-specific fact pattern.
- Full persistence of decision provenance and organisation-scoped legal-rule history remains a separate workstream.

## Verification

- Unit tests cover prohibited signals, Annex-style domains, Article 50 dates, ambiguous roles, stale registry deadlines, malformed dates and compatibility adapters.
- A source-contract test rejects duplicated role/risk logic in compatibility files.
- The product coverage score increases only in the scope, role and classification workstream. No Enterprise Readiness control is promoted by this ADR alone.

## Rollback

Revert the decision engine, adapter refactors, shared payload metadata, tests, this ADR and the product coverage scorecard update. The product coverage score must return to 47%, and no decision generated after rollback may claim canonical-engine provenance.
