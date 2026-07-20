# Active work locks

| Scope | Files or area | Branch / PR | Mode | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Production release authority and execution state | `vercel-production.yml`, release scanners/runbook and enterprise state files | #1221 | Write | Primary engineering agent | Rebase and exact-head validation in progress |
| CSV export authorization | Report CSV routes, step-up download UI and export scanners/evidence | #1227 | External PR lock | Primary engineering agent | Exact-head checks green; draft review |
| Governance backend-write boundary | AI Literacy/enterprise governance RLS migration, API contracts and ADR | #1228 | External PR lock | Primary engineering agent | Exact-head checks running |
| Protected rollback preflight | Protected rollback workflow, runner, provider contract and runbook | #1230 | External PR lock | Primary engineering agent | Exact-head checks running; no runtime mutation |
| Invitation creator tenant scope | Invitation creator-scope migration and contracts | #1229 | External PR lock | Concurrent repository agent | Draft; exact-head checks running |
| Enterprise AI-system tenant scope | Enterprise governance migrations/tests/ADR | #1218 | External PR lock | Existing PR author | Trigger design requires composite-FK reassessment |
| Assessment AI-system tenant scope | AI-assessment migration/test/ADR | #1219 | External PR lock | Existing PR author | Trigger design requires composite-FK reassessment |

Do not modify another branch's migration, release workflow or security module.
Read-only audit remains permitted. The next legacy-route block must use a separate
branch and avoid every locked file above.
