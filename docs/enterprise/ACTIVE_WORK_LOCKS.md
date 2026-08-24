# Active work locks

| Scope | Branch / PR | Mode | Status |
| --- | --- | --- | --- |
| Supabase Production decision and forward promotion | #1631 / protected post-merge workflows | Runtime / human | Active protected authority. #1819 is merged and binds live RLS proof to the current governed forward-promotion artifact; no Production write is authorized or claimed. Exact-current-main evidence, required independent approval and explicit owner Production-write authorization remain mandatory. |
| External provider / procurement reconciliation | `fix/external-assurance-provider-reconcile-v2` / #1820 | Write / assurance docs | Active External Assurance provider/procurement reconciliation. Does not own pentest scope and must not claim legal/pentest acceptance. |
| Layer8 independent pentest handoff | `agent/layer8-scoping-readiness-20260825-v2` / #1822 | Write / assurance docs | Active until the 2026-08-25 Layer8 scoping handoff is merged/closed. Owns the current pentest scope/architecture refresh, meeting pack and synchronized Enterprise execution-state references only; no runtime/provider/schema mutation and no testing authorization. |
| Enterprise 100 final evidence authority | #1032 / protected final authority | Protected authority transition | Do not create a competing final authority or substitute repository-only evidence for direct runtime/human producers. |
| Production evidence producers | protected workflows and independent external providers | Runtime / human | No repository-only substitution; execute only for the exact accepted release lineage and retain attributable evidence. |

## Superseded locks

The old #1768 V19 bounded-forward-rebase lock is no longer active. Protected main has advanced through later governed reconciliation work and currently includes #1819. Historical V17/V18/V19 package approvals or PR-event evidence must not be reused as current Production authority.

## Coordination rules

- #1822 must not modify Supabase migration manifests, provider/account configuration, runtime security behavior or Production data.
- #1820 must not alter pentest acceptance, authorize testing or overwrite the independent-assurance scope owned by #1692/#1822.
- Supabase runtime promotion remains exclusively under #1631/protected workflows and separate owner Production-write authorization.
- Final merge remains a human owner action after branch protection, exact-head checks, qualified review and resolved conversations.

No lock authorizes bypassing required checks, environment protection, evidence provenance, security gates, NDA/ROE requirements or qualified human decisions.
