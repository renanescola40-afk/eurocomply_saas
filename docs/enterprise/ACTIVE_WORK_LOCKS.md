# Active work locks

| Scope | Files or area | Branch / PR | Mode | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Atomic member-removal action | `src/server/actions/members.ts` and removal contracts | #1123 | Review | Primary engineering agent | Exact-SHA gates green; awaiting owner merge |
| Canonical team-invitation lifecycle | team invite create/cancel routes and `src/server/queries/invites.ts` | #1124 | Review | Primary engineering agent | Exact-SHA gates green; awaiting owner merge |
| AI reassessment localization | AI system edit form, localized copy and UX contracts | `agent/localize-ai-reassessment` | Write | Primary engineering agent | Active |
| Atomic organization creation | organization action and atomic creation RPC | #1121 | Integrated | Human owner | Merged |
| Deterministic sales follow-up | Sales Console timestamp boundary | #1122 | Integrated | Human owner | Merged |

Do not modify the same invite routes, member action or AI reassessment component from another branch while these locks are active. Read-only audits may continue across all areas.
