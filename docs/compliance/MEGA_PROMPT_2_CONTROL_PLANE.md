# Mega Prompt 2 — Billing, Product Enterprise and EU AI Act Control Plane

Baseline main SHA: `4e6cf8be99e43ad572206850623bcaa4580fde84`  
Assessment date: 2026-08-12  
Legal-rule authority: repository-controlled sources in `src/server/ai-governance/legal-rules.ts` and the versioned compliance registries.  
Legal rules version at implementation time: `2026-07-30.1`.

## Evidence boundary

This package deliberately separates repository implementation from runtime and legal evidence.

- Repository code, tests and registries can prove that workflows, guards and human-review boundaries exist.
- They cannot prove Stripe test/live configuration, production Supabase state, final Vercel deployment behavior, external security review, a customer's legal classification or a customer's compliance.
- `HUMAN_REVIEW_REQUIRED` remains mandatory for customer-specific facts, high-risk determination, legal exceptions, fundamental-rights analysis, adequacy, proportionality and real-deployment technical performance.
- Future-effective legal rules remain governed by the project's versioned legal-rule engine; this package does not change legal dates or obligations from assumptions.

## Billing changes in this Mega PR

The existing billing stack already had authentication, tenant context, `manage_billing`, trusted-origin mutation guards, fail-closed rate limiting, bounded inputs, step-up authentication, server-side prices, Stripe webhook signature verification, durable webhook event processing and entitlement reconciliation.

This package closes two concrete lifecycle gaps:

1. Checkout, Billing Portal and subscription lifecycle mutations now require a bounded `Idempotency-Key`. The browser creates one key per user action and reuses it across step-up retries. Raw client keys are never persisted; a tenant/actor/scope-bound SHA-256 digest is used instead.
2. `billing_lifecycle_requests` is now the durable serialization ledger for upgrade, downgrade, cancellation, reactivation and add-on replacement. It suppresses concurrent changes, detects payload reuse conflicts, supports stale-processing recovery and lets retries reuse the same Stripe idempotency key after a provider or audit failure.
3. Subscription mutations fail closed when the provider customer or organization metadata conflicts with the server-side tenant authority.
4. When the caller omits `interval`, lifecycle operations now preserve the Stripe subscription's current annual/monthly interval instead of silently defaulting an annual subscription to monthly.

No paid access is granted from a Checkout success redirect. Subscription/entitlement authority continues to come from the backend Stripe event path.

## EU AI Act functional control matrix

| Article / obligation | Role(s) | Product implementation | Test / evidence path | Runtime state | Human review | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Article 4 — AI literacy | provider, deployer | Persisted AI literacy programmes, assignments, completion/evidence workflow | `docs/compliance/article-function-evidence-registry.v1.json`; AI literacy API/tests | Exact-head runtime revalidation required | Required for adequacy/context | IMPLEMENTED — CI EVIDENCE REQUIRED PER SHA |
| Article 5 — prohibited practices | provider, deployer, importer, distributor, product manufacturer | Persisted review workflow, signals, evidence, escalation and decision support | compliance registry + prohibited-practices workflow/tests | Exact-head runtime revalidation required | `HUMAN_REVIEW_REQUIRED` | IMPLEMENTED — CI EVIDENCE REQUIRED PER SHA |
| High-risk classification / Annex III | provider/deployer and other applicable economic operators | Versioned scope/high-risk decision support represented in the legal/control registries | `src/server/ai-governance/legal-rules.ts`; product coverage registry | Customer-specific runtime facts not proven | `HUMAN_REVIEW_REQUIRED` | IMPLEMENTED DECISION SUPPORT — HUMAN DETERMINATION |
| Articles 9–10 — risk/data governance | provider, product manufacturer where applicable | Persisted provider-data/risk workflow with evidence and lifecycle state | `ai_provider_data_programs` workflow + compliance registries | Exact-head runtime revalidation required | `HUMAN_REVIEW_REQUIRED` | IMPLEMENTED — CI EVIDENCE REQUIRED PER SHA |
| Article 11 + Annex IV | provider, product manufacturer | Persisted Annex IV package/workspace with lifecycle state | `ai_annex_iv_packages`; `/dashboard/annex-iv` | Exact-head runtime revalidation required | Required for completeness/approval | IMPLEMENTED — CI EVIDENCE REQUIRED PER SHA |
| Articles 12–15 — records, instructions, oversight, performance, robustness/cybersecurity | provider/deployer as applicable | Cross-workflow evidence, audit/logging and incident support in existing control plane | article/function registry + evidence/audit/incident modules | Runtime technical performance remains deployment-specific | `HUMAN_REVIEW_REQUIRED` | IMPLEMENTED SUPPORT — RUNTIME EVIDENCE REQUIRED |
| Article 17 — QMS | provider | Persisted QMS system/workflow | `ai_qms_systems`; `/dashboard/qms` | Exact-head runtime revalidation required | Required for QMS approval | IMPLEMENTED — CI EVIDENCE REQUIRED PER SHA |
| Article 26 — deployer obligations | deployer | Repository control/workspace guidance and deployer decision model are registered as implementation-ready by the canonical product coverage registry | `docs/compliance/DEPLOYER_OBLIGATIONS_WORKSPACE.md`; `src/server/ai-governance/deployer-obligations.ts`; tests | Organization/runtime evidence still required | `HUMAN_REVIEW_REQUIRED` | IMPLEMENTED — RUNTIME + HUMAN EVIDENCE REQUIRED |
| Article 27 — FRIA | deployer/public bodies and applicable service providers | Persisted FRIA assessment lifecycle | `ai_fria_assessments`; `/dashboard/fria` | Exact-head runtime revalidation required | `HUMAN_REVIEW_REQUIRED` | IMPLEMENTED — CI EVIDENCE REQUIRED PER SHA |
| Article 50 — transparency | provider, deployer | Versioned assessments, evidence and event ledger in `ai_article50_*`; now surfaced by Regulatory Control Tower | `src/server/queries/article-50-workspace.ts`; `/dashboard/transparencia`; Control Tower tests | Exact-head runtime revalidation required | `HUMAN_REVIEW_REQUIRED` | IMPLEMENTED — CONTROL TOWER CONNECTED |
| Post-market monitoring / incident operations | provider/deployer as applicable | Incident operations API and audit-backed triage are registered as implementation-ready by the canonical product coverage registry | `/api/ai-incidents`; `/api/ai-incidents/[id]`; `tests/security/incident-operations-evidence.test.ts` | Release/runtime incident evidence still required | Human escalation remains contextual | IMPLEMENTED — RUNTIME EVIDENCE REQUIRED |

## Regulatory Control Tower behavior

The Control Tower now:

- includes Article 50 as a real persisted workstream and routes it to the existing transparency workspace;
- exposes legal roles, the repository legal-rules version and a human-review flag per workstream;
- surfaces Article 26 and post-market monitoring as repository controls whose implementation can be CI-verified but whose organization-specific readiness still requires runtime/evidence state;
- never counts repository implementation alone as tenant readiness;
- preserves the existing evidence disclaimer that a lifecycle state is not legal certification or proof of underlying evidence quality.

## Public claims

Dangerous public claims remain governed by the repository Public Claims Guard. A repository search on the baseline did not return the prohibited phrases `100% compliant`, `guaranteed compliant`, `EU approved`, `legally certified`, `replaces lawyers`, `pentested`, `SOC 2`, or `ISO 27001`; the exact-head workflow result remains authoritative.

## Verification required on the PR exact head

Run all applicable required checks, including at minimum:

```text
npm run lint
npm run typecheck
npm run test
npm run build
npm run security:ci
```

Focused checks added/updated by this package cover billing idempotency, durable lifecycle lease recovery, checkout hardening, tenant/provider binding, annual-interval preservation and Regulatory Control Tower legal/human-review boundaries.

The canonical `EU AI Act Product Coverage` workflow is the authority for implementation/CI/runtime/completed coverage on each exact SHA. Its categories must not be collapsed into a legal-compliance guarantee.

## Runtime work that must not be fabricated

The following remain external until a protected exact-SHA run produces evidence:

- Stripe TEST MODE checkout created;
- Billing Portal created;
- signed webhook delivered and invalid signature rejected;
- webhook event persisted, duplicate suppressed and stale recovery exercised;
- subscription mutation and entitlement reconciliation observed against the final deployment;
- live Supabase migrations/state for all referenced workflow tables;
- authenticated production E2E for onboarding and the complete role matrix;
- qualified legal review for the legal-decision boundaries above.

No runtime item above is marked PASS by a repository-only implementation commit.
