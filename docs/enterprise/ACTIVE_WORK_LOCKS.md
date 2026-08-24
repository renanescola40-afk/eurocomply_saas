# Active work locks

| Scope | Branch / PR / issue | Mode | Status |
| --- | --- | --- | --- |
| Vercel Production serving outage | #1814 | Account state / runtime | **Active P0**; current Production deployment is `READY` but project is `live=false` and canonical health is HTTP `402 DEPLOYMENT_DISABLED`. Zero-cost project unpause is the first documented remediation. No plan/payment change is authorized. |
| Production outage evidence synchronization | `agent/p0-vercel-disabled-evidence-rebind` / #1815 | Evidence / governance write | Active until review findings are corrected and exact-head checks complete. Owns only the provider/trust/persistent execution-state reconciliation for #1814; no runtime/billing/database mutation authority. |
| Supabase Production decision and promotion | #1631 / protected workflows | Runtime / human | Separate protected authority. `PRODUCTION_WRITE_AUTHORIZED=false`; no direct SQL/DDL, migration repair, unrestricted `db push` or stale approval carry-forward. Resume only on an exact serving release and after required protected prerequisites/authorization. |
| Enterprise 100 final evidence authority | #1032 / protected final authority | Protected authority transition | Do not create a competing final authority or substitute repository-only evidence, deployment `READY` metadata, or stale scorecard results for direct runtime/human producers. |
| External assurance producers | qualified counsel, independent pentest, provider/account evidence, real procurement counterparty | External / human | No repository-only substitution; no paid engagement or active Production pentest is authorized from this lane. |

## Superseded locks

- PR #1768 is merged and **no longer holds an active repository write lock**.
- PR #1767 is merged and no longer holds an active repository write lock.
- Issue #1778 is closed via merged #1780 and is not an active compatibility lock.

Any future work on Supabase governed promotion coordinates with #1631; it must not
revive #1768 as an active branch authority.

No lock authorizes bypassing required checks, branch protection, environment
approval, evidence provenance, security gates or qualified human decisions.
Final PR merge remains a human action under `AGENTS.md`.
