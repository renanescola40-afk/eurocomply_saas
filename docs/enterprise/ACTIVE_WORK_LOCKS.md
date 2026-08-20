# Active work locks

| Scope | Branch / PR | Mode | Status |
| --- | --- | --- | --- |
| Enterprise 100 final evidence authority and provenance closure | `agent/enterprise-final-evidence-authority-closure-20260819` / #1730 | Write | Active; exact-head checks/reviews pending |
| Canonical Enterprise final authority | #1730 | Protected authority transition | Do not create competing final authority or manual run-ID fan-in |
| Enterprise closure contract | #1730 | Shared contract | 16 unique controls; direct producer evidence must remain exact-SHA and fail-closed |
| Production evidence producers | protected post-merge workflows | Runtime / human | No repository-only substitution; execute only for exact current main |

Do not modify the authority/closure files from another branch while #1730 is
active unless the change is deliberately coordinated into this work package.
Read-only audit is permitted. No lock authorizes bypassing required checks,
branch protection, environment approval, evidence provenance, or security gates.
Final merge remains a human action.
