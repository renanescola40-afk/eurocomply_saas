# Active work locks

Last reconciled: 2026-09-10

| Scope | Branch / PR / issue | Mode | Status |
| --- | --- | --- | --- |
| Supabase Production decision and forward promotion | #1631 / protected post-merge workflows | Runtime / human | Active protected authority. No Production database write is authorized by this file. Exact-current-release evidence, required review/approval and separate owner Production-write authorization remain mandatory. |
| PostgREST/audit-chain Production incident closeout | #1983 | Runtime / technical | Source retry-amplification remediation is present on current `main`; incident remains open until the corrected release is canonical Production and sustained runtime evidence closes the PGRST003/rollback-pressure gate. Historical caller attribution remains evidence debt and must not be invented. |
| Daily-maintenance Production revalidation | #1948 | Runtime / technical | Source remediation is merged. Finding remains open pending deployment of the corrected release and Production revalidation of the maintenance window without PGRST003, timeout fan-out or unexplained core-maintenance 5xx. |
| Assessor-neutral pre-pentest state reconciliation | `agent/2048-assessor-neutral-pre-pentest-state` / #2048 | Write / assurance docs | Active documentation/evidence-state refresh only. May reconcile current SHA/deployment, blockers, scope and handoff state. Must not select a provider, authorize testing, release credentials, change Production or claim pentest PASS. |
| Independent pentest external authority | #1692 / independent assessor | Human / external | Provider selection remains OPEN. 7ASecurity is `HOLD_NOT_SELECTED_BY_OWNER` and receives no terminal provider-selection credit from this lane. Active testing requires a separately accepted provider, due diligence, written ROE, exact target/release binding and explicit owner GO. |
| Enterprise 100 final evidence authority | #1032 / protected final authority | Protected authority transition | Do not create a competing final authority or substitute repository-only evidence for direct runtime/human producers. |
| Production evidence producers | protected workflows and independent external providers | Runtime / human | No repository-only substitution; execute only for the exact accepted release lineage and retain attributable evidence. |

## Superseded locks

- PR #1820 (`fix/external-assurance-provider-reconcile-v2`) is merged/closed and no longer holds an active write lock.
- PR #1822 (`agent/layer8-scoping-readiness-20260825-v2`) is merged/closed and no longer holds an active write lock.
- The historical Layer8 2026-08-25 scoping meeting is not a current execution lock or test authorization.
- Historical Beagle-specific preparation branches/workflows do not select Beagle as the terminal independent assessor and do not authorize active testing.
- Historical V17/V18/V19/V22/V23 release or migration approvals must not be reused as current exact-release authority.

## Coordination rules

- #2048 owns only the current assessor-neutral pentest state/documentation refresh. It must not alter runtime security behavior, Supabase migration authority, provider accounts, secrets or Production.
- #1692 remains the canonical independent-pentest external tracker. No provider is selected until attributable due diligence and scope evidence satisfy the current terminal contract.
- 7ASecurity remains on owner hold and must not be advanced or counted as the selected terminal assessor unless the owner later changes that direction explicitly.
- Supabase Production promotion remains exclusively under #1631/protected workflows and separate owner Production-write authorization.
- #1983 and #1948 cannot be closed from source/repository evidence alone; target-environment runtime evidence is required.
- Final merge remains a human owner action after branch protection, exact-head checks, qualified review and resolved conversations.

No lock authorizes bypassing required checks, environment protection, evidence provenance, security gates, NDA/ROE requirements, qualified human decisions, external assessor independence or the exact-SHA release boundary.
