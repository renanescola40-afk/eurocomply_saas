# Active work locks

| Scope | Branch / PR | Mode | Status |
| --- | --- | --- | --- |
| Supabase V19 bounded forward rebase | `agent/p0-supabase-v19-forward-rebase-final` / #1768 | Write | Active P0; owns `config/supabase-forward-reconciliation.json`, V19 migration identities, reconciliation provenance and directly coupled Supabase tests/workflows until human merge or closure |
| Supabase Production decision and promotion | #1631 / protected post-merge workflows | Runtime / human | Blocked until #1768 is human-merged and a fresh exact-current-main V19/25 package is rehearsed, dry-run, reviewed and authorized |
| Enterprise 100 final evidence authority | #1032 / protected final authority | Protected authority transition | Do not create a competing final authority or substitute repository-only evidence for direct runtime/human producers |
| Production evidence producers | protected post-merge workflows and external providers | Runtime / human | No repository-only substitution; execute only for exact current main and retain exact-lineage evidence |

PR #1730 is merged and no longer holds an active repository write lock. PR #1767
is also merged on the synchronized baseline. Any new work that touches the V19
manifest, archived V18 provenance, production migration reconciliation, Decision
Gate or production promotion contract must coordinate with #1768/#1631 rather
than opening a competing authority lane.

No lock authorizes bypassing required checks, branch protection, environment
approval, evidence provenance, security gates or qualified human decisions. No
V17/V18 approval carries forward into V19. Final merge remains a human action.
